(function() {
  var CouchDB, Replicator, assert, debug, design_document, fs, handler, i, len, lib, m, modules, path, pkg, reject_tombstones, request,
    indexOf = [].indexOf;

  pkg = require('./package.json');

  debug = (require('debug'))(`${pkg.name}:server`);

  fs = require('fs');

  path = require('path');

  reject_tombstones = require('reject-tombstones');

  modules = ['ruleset', 'rate', 'cdr', 'trace'];

  lib = {};

  for (i = 0, len = modules.length; i < len; i++) {
    m = modules[i];
    lib[m] = fs.readFileSync(path.join(__dirname, `./${m}.bundle.js`), 'utf-8');
  }

  Replicator = require('frantic-team');

  CouchDB = require('most-couchdb/with-update');

  request = require('superagent');

  assert = require('assert');

  assert(lib.ruleset != null, 'No lib.ruleset');

  assert(lib.rate != null, 'No lib.rate');

  assert(lib.cdr != null, 'No lib.cdr');

  assert(lib.trace != null, 'No lib.trace');

  design_document = {
    ruleset: {
      _id: `_design/${pkg.name}`,
      version: pkg.version,
      language: 'coffeescript',
      views: {
        lib: {
          ruleset: lib.ruleset
        }
      },
      validate_doc_update: '-> require(\'views/lib/ruleset\').validate_user_doc.apply this, arguments'
    },
    rate: {
      _id: `_design/${pkg.name}`,
      version: pkg.version,
      language: 'coffeescript',
      views: {
        lib: {
          rate: lib.rate
        }
      },
      validate_doc_update: '-> require(\'views/lib/rate\').validate_user_doc.apply this, arguments'
    },
    cdr: {
      _id: `_design/${pkg.name}`,
      version: pkg.version,
      language: 'coffeescript',
      views: {
        lib: {
          cdr: lib.cdr
        },
        summarize: {
          reduce: '_stats',
          map: '(doc) ->\n  emit [doc.c,doc.A,doc.S], doc.a'
        }
      },
      validate_doc_update: '-> require(\'views/lib/cdr\').validate_user_doc.apply this, arguments'
    },
    trace: {
      _id: `_design/${pkg.name}`,
      version: pkg.version,
      language: 'coffeescript',
      views: {
        lib: {
          trace: lib.trace
        }
      },
      validate_doc_update: '-> require(\'views/lib/trace\').validate_user_doc.apply this, arguments'
    }
  };

  handler = function(type, plural = true) {
    return async function() {
      var admin_role, central, db, db_name, db_uri, extra_roles, is_admin, is_role_admin, j, len1, reader_role, ref, ref1, security, server, servers, writer_role;
      if (plural) {
        admin_role = `${type}s_admin`;
        writer_role = `${type}s_writer`;
        reader_role = `${type}s_reader`;
      } else {
        admin_role = `${type}_admin`;
        writer_role = `${type}_writer`;
        reader_role = `${type}_reader`;
      }
      servers = this.cfg[`${type}_servers`];
      if ((servers != null ? servers.length : void 0) == null) {
        this.res.status(404);
        this.json({
          error: `Not configured for ${type}_servers`
        });
        this.res.end();
        return;
      }
      extra_roles = (ref = this.cfg[`${type}_members_roles`]) != null ? ref : [];
      security = {
        admins: {
          names: [],
          roles: [admin_role]
        },
        members: {
          names: [],
          roles: [admin_role, reader_role, writer_role, ...extra_roles]
        }
      };
      if (((ref1 = this.req.session) != null ? ref1.couchdb_roles : void 0) != null) {
        is_admin = indexOf.call(this.req.session.couchdb_roles, '_admin') >= 0;
        is_role_admin = is_admin || indexOf.call(this.req.session.couchdb_roles, admin_role) >= 0;
      }
      if (!is_role_admin) {
        this.res.status(403);
        this.json({
          error: `Must be ${admin_role}`
        });
        this.res.end();
        return;
      }
      db_name = this.req.path.substr(1);
      db_name = db_name.replace(/\/$/, '');
      debug(`create ${type} database`, {db_name});
      // We will replicate to/from the first server in the list (partially because it's the first one where the database will be created).
      central = null;
      if (servers.length > 1) {
        central = servers[0];
      }
      for (j = 0, len1 = servers.length; j < len1; j++) {
        server = servers[j];
        db_uri = [server, db_name].join('/');
        // Create database
        db = new CouchDB(db_uri);
        if (!(await (async function() {
          try {
            return (await db.info());
          } catch (error) {}
        })())) {
          await db.create();
        }
        // Inject security document
        await request.put(`${db_uri}/_security`).send(security);
        if (type in design_document) {
          // Inject design document
          await db.update(design_document[type]);
        }
        // Inject reject-tombstones document
        await db.update(reject_tombstones);
        // Setup master-master replication
        // (between the first server in the list and the current server).
        if (central && server !== central) {
          await Replicator(central, server, db_name, function(doc) {
            doc.owner = "admin";
            doc.user_ctx = {
              name: "admin",
              roles: ["_admin", admin_role, writer_role]
            };
          });
          await Replicator(server, central, db_name, function(doc) {
            doc.owner = "admin";
            return doc.user_ctx = {
              name: "admin",
              roles: ["_admin", admin_role, writer_role]
            };
          });
        }
      }
      this.json({
        ok: true
      });
      this.res.end();
    };
  };

  this.include = function() {
    // These are mapped from a ruleset ID to a database name in the `ruleset:` records in the provisioning database.
    // The `ruleset_` prefix is standard but not hard-coded.
    this.put(/^\/ruleset_[a-z\d_-]+\/?$/, this.auth, handler('ruleset'));
    // These are in the `table` fields in the `rating` objects and are used by e.g. entertaining-crib.
    // The `rates-` prefix is defined in `astonishing-competition`.
    this.put(/^\/rates-[a-z\d_-]+\/?$/, this.auth, handler('rate'));
    // The default prefixes for these are defined in `astonishing-competition` and `huge-play`.
    // (These are both currently unused; `astonishing-competition` still needs to be rewritten to properly aggregate upstream, while the trace code was never rewritten to use multiple databases.)
    this.put(/^\/cdr-[a-z\d_-]+\/?$/, this.auth, handler('cdr'));
    this.put(/^\/trace-[a-z\d_-]+\/?$/, this.auth, handler('trace'));
    this.put(/^\/provisioning\/?$/, this.auth, handler('provisioning', false));
    return this.put(/^\/logging\/?$/, this.auth, handler('logging', false));
  };

}).call(this);
