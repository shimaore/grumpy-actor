(function() {
  var PouchDB, Replicator, assert, debug, design_document, fs, handler, i, len, lib, m, modules, path, pkg, reject_tombstones, request, seem,
    indexOf = [].indexOf;

  pkg = require('./package.json');

  debug = (require('debug'))(`${pkg.name}:server`);

  seem = require('seem');

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

  PouchDB = require('ccnq4-pouchdb');

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
          map: '(doc) ->\n  emit [doc.A,doc.S], doc.a'
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

  handler = function(type) {
    return seem(function*() {
      var central, db, db_name, db_uri, is_admin, is_role_admin, j, len1, role, security, server, servers, update;
      role = `${type}s_admin`;
      servers = this.cfg[`${type}_servers`];
      security = {
        admins: {
          names: [],
          roles: [role]
        },
        members: {
          names: [],
          roles: [role, `${type}s_reader`, `${type}s_writer`]
        }
      };
      is_admin = indexOf.call(this.req.session.couchdb_roles, '_admin') >= 0;
      is_role_admin = is_admin || indexOf.call(this.req.session.couchdb_roles, role) >= 0;
      if (!((this.req.session.couchdb_roles != null) && is_role_admin)) {
        this.res.status(403);
        this.json({
          error: `Must be ${role}`
        });
        this.res.end();
        return;
      }
      db_name = this.req.path.substr(1);
      db_name = db_name.replace(/\/$/, '');
      debug(`create_${type}_database`, {db_name});
      // We will replicate to/from the first server in the list (partially because it's the first one where the database will be created).
      central = null;
      if (servers.length > 1) {
        central = servers[0];
      }
      for (j = 0, len1 = servers.length; j < len1; j++) {
        server = servers[j];
        db_uri = [server, db_name].join('/');
        // Create database
        db = new PouchDB(db_uri);
        yield db.info();
        update = seem(function*(doc) {
          var _rev;
          ({_rev} = (yield db.get(doc._id).catch(function() {
            return {
              _rev: null
            };
          })));
          delete doc._rev;
          if (_rev != null) {
            doc._rev = _rev;
          }
          return (yield db.put(doc));
        });
        // Inject security document
        yield request.put(`${db_uri}/_security`).send(security);
        // Inject design document
        yield update(design_document[type]);
        // Inject reject-tombstones document
        yield update(reject_tombstones);
        // Setup master-master replication
        // (between the first server in the list and the current server).
        if (central && server !== central) {
          yield Replicator(central, server, db_name, function(doc) {
            doc.owner = "admin";
            doc.user_ctx = {
              name: "admin",
              roles: ["_admin", role, `${type}s_writer`]
            };
          });
          yield Replicator(server, central, db_name, function(doc) {
            doc.owner = "admin";
            return doc.user_ctx = {
              name: "admin",
              roles: ["_admin", role, `${type}s_writer`]
            };
          });
        }
      }
      return this.json({
        ok: true
      });
    });
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
    return this.put(/^\/trace-[a-z\d_-]+\/?$/, this.auth, handler('trace'));
  };

}).call(this);
