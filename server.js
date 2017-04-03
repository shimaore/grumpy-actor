(function() {
  var PouchDB, Replicator, assert, debug, design_document, fs, handler, i, len, lib, m, modules, path, pkg, reject_tombstones, request, seem,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  pkg = require('./package.json');

  debug = (require('debug'))(pkg.name + ":server");

  seem = require('seem');

  fs = require('fs');

  path = require('path');

  reject_tombstones = require('reject-tombstones');

  modules = ['ruleset', 'rate', 'cdr', 'trace', 'reference'];

  lib = {};

  for (i = 0, len = modules.length; i < len; i++) {
    m = modules[i];
    lib[m] = fs.readFileSync(path.join(__dirname, "./" + m + ".bundle.js"), 'utf-8');
  }

  Replicator = require('frantic-team');

  PouchDB = require('shimaore-pouchdb');

  request = require('superagent');

  assert = require('assert');

  assert(lib.ruleset != null, 'No lib.ruleset');

  assert(lib.rate != null, 'No lib.rate');

  assert(lib.cdr != null, 'No lib.cdr');

  assert(lib.trace != null, 'No lib.trace');

  assert(lib.reference != null, 'No lib.reference');

  design_document = {
    ruleset: {
      _id: "_design/" + pkg.name,
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
      _id: "_design/" + pkg.name,
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
      _id: "_design/" + pkg.name,
      version: pkg.version,
      language: 'coffeescript',
      views: {
        lib: {
          cdr: lib.cdr
        },
        summarize: {
          reduce: '_stats',
          map: '(doc) ->\n  emit [doc.client.account,doc.client.sub_account], doc.actual_amount'
        }
      },
      validate_doc_update: '-> require(\'views/lib/cdr\').validate_user_doc.apply this, arguments'
    },
    trace: {
      _id: "_design/" + pkg.name,
      version: pkg.version,
      language: 'coffeescript',
      views: {
        lib: {
          trace: lib.trace
        }
      },
      validate_doc_update: '-> require(\'views/lib/trace\').validate_user_doc.apply this, arguments'
    },
    reference: {
      _id: "_design/" + pkg.name,
      version: pkg.version,
      language: 'coffeescript',
      views: {
        lib: {
          reference: lib.reference
        },
        tags: {
          reduce: '_stats',
          map: '-> require(\'views/lib/reference\').tags.apply this, arguments'
        }
      },
      validate_doc_update: '-> require(\'views/lib/reference\').validate_user_doc.apply this, arguments'
    }
  };

  handler = function(type) {
    return seem(function*() {
      var central, db, db_name, db_uri, j, len1, role, security, server, servers, update;
      role = type + "s_admin";
      servers = this.cfg[type + "_servers"];
      security = {
        admins: {
          names: [],
          roles: [role]
        },
        members: {
          names: [],
          roles: [role, type + "s_reader", type + "s_writer"]
        }
      };
      if (!((this.session.couchdb_roles != null) && indexOf.call(this.session.couchdb_roles, role) >= 0)) {
        this.res.status(403);
        this.json({
          error: "Must be " + role
        });
        this.res.end();
        return;
      }
      db_name = this.req.path.substr(1);
      db_name = db_name.replace(/\/$/, '');
      debug("create_" + type + "_database", {
        db_name: db_name
      });
      central = null;
      if (servers.length > 1) {
        central = servers[0];
      }
      for (j = 0, len1 = servers.length; j < len1; j++) {
        server = servers[j];
        db_uri = [server, db_name].join('/');
        db = new PouchDB(db_uri);
        yield db.info();
        update = seem(function*(doc) {
          var _rev;
          _rev = (yield db.get(doc._id)["catch"](function() {
            return {
              _rev: null
            };
          }))._rev;
          delete doc._rev;
          if (_rev != null) {
            doc._rev = _rev;
          }
          return (yield db.put(doc));
        });
        yield request.put(db_uri + "/_security").send(security);
        yield update(design_document[type]);
        yield update(reject_tombstones);
        if (central && server !== central) {
          yield Replicator(central, server, db_name, function(doc) {
            doc.owner = "admin";
            doc.user_ctx = {
              name: "admin",
              roles: ["_admin", role, type + "s_writer"]
            };
          });
          yield Replicator(server, central, db_name, function(doc) {
            doc.owner = "admin";
            return doc.user_ctx = {
              name: "admin",
              roles: ["_admin", role, type + "s_writer"]
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
    this.put(/^\/ruleset_[a-z\d_-]+\/?$/, this.auth, handler('ruleset'));
    this.put(/^\/rates-[a-z\d_-]+\/?$/, this.auth, handler('rate'));
    this.put(/^\/cdr-[a-z\d_-]+\/?$/, this.auth, handler('cdr'));
    this.put(/^\/trace-[a-z\d_-]+\/?$/, this.auth, handler('trace'));
    return this.put(/^\/reference-[a-z\d_-]+\/?$/, this.auth, handler('reference'));
  };

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2VydmVyLmNvZmZlZS5tZCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBSTtBQUFBLE1BQUEsc0lBQUE7SUFBQTs7RUFBQSxHQUFBLEdBQU0sT0FBQSxDQUFRLGdCQUFSOztFQUNOLEtBQUEsR0FBUSxDQUFDLE9BQUEsQ0FBUSxPQUFSLENBQUQsQ0FBQSxDQUFxQixHQUFHLENBQUMsSUFBTCxHQUFVLFNBQTlCOztFQUNSLElBQUEsR0FBTyxPQUFBLENBQVEsTUFBUjs7RUFFUCxFQUFBLEdBQUssT0FBQSxDQUFRLElBQVI7O0VBQ0wsSUFBQSxHQUFPLE9BQUEsQ0FBUSxNQUFSOztFQUVQLGlCQUFBLEdBQW9CLE9BQUEsQ0FBUSxtQkFBUjs7RUFFcEIsT0FBQSxHQUFVLENBQ1IsU0FEUSxFQUVSLE1BRlEsRUFHUixLQUhRLEVBSVIsT0FKUSxFQUtSLFdBTFE7O0VBT1YsR0FBQSxHQUFNOztBQUNOLE9BQUEseUNBQUE7O0lBQ0UsR0FBSSxDQUFBLENBQUEsQ0FBSixHQUFTLEVBQUUsQ0FBQyxZQUFILENBQWlCLElBQUksQ0FBQyxJQUFMLENBQVUsU0FBVixFQUFxQixJQUFBLEdBQUssQ0FBTCxHQUFPLFlBQTVCLENBQWpCLEVBQTJELE9BQTNEO0FBRFg7O0VBR0EsVUFBQSxHQUFhLE9BQUEsQ0FBUSxjQUFSOztFQUNiLE9BQUEsR0FBVSxPQUFBLENBQVEsa0JBQVI7O0VBQ1YsT0FBQSxHQUFVLE9BQUEsQ0FBUSxZQUFSOztFQUNWLE1BQUEsR0FBUyxPQUFBLENBQVEsUUFBUjs7RUFFVCxNQUFBLENBQU8sbUJBQVAsRUFBcUIsZ0JBQXJCOztFQUNBLE1BQUEsQ0FBTyxnQkFBUCxFQUFrQixhQUFsQjs7RUFDQSxNQUFBLENBQU8sZUFBUCxFQUFpQixZQUFqQjs7RUFDQSxNQUFBLENBQU8saUJBQVAsRUFBbUIsY0FBbkI7O0VBQ0EsTUFBQSxDQUFPLHFCQUFQLEVBQXVCLGtCQUF2Qjs7RUFFQSxl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a2FnZS5qc29uJ1xuICAgIGRlYnVnID0gKHJlcXVpcmUgJ2RlYnVnJykgXCIje3BrZy5uYW1lfTpzZXJ2ZXJcIlxuICAgIHNlZW0gPSByZXF1aXJlICdzZWVtJ1xuXG4gICAgZnMgPSByZXF1aXJlICdmcydcbiAgICBwYXRoID0gcmVxdWlyZSAncGF0aCdcblxuICAgIHJlamVjdF90b21ic3RvbmVzID0gcmVxdWlyZSAncmVqZWN0LXRvbWJzdG9uZXMnXG5cbiAgICBtb2R1bGVzID0gW1xuICAgICAgJ3J1bGVzZXQnXG4gICAgICAncmF0ZSdcbiAgICAgICdjZHInXG4gICAgICAndHJhY2UnXG4gICAgICAncmVmZXJlbmNlJ1xuICAgIF1cbiAgICBsaWIgPSB7fVxuICAgIGZvciBtIGluIG1vZHVsZXNcbiAgICAgIGxpYlttXSA9IGZzLnJlYWRGaWxlU3luYyAocGF0aC5qb2luIF9fZGlybmFtZSwgXCIuLyN7bX0uYnVuZGxlLmpzXCIpLCAndXRmLTgnXG5cbiAgICBSZXBsaWNhdG9yID0gcmVxdWlyZSAnZnJhbnRpYy10ZWFtJ1xuICAgIFBvdWNoREIgPSByZXF1aXJlICdzaGltYW9yZS1wb3VjaGRiJ1xuICAgIHJlcXVlc3QgPSByZXF1aXJlICdzdXBlcmFnZW50J1xuICAgIGFzc2VydCA9IHJlcXVpcmUgJ2Fzc2VydCdcblxuICAgIGFzc2VydCBsaWIucnVsZXNldD8sICdObyBsaWIucnVsZXNldCdcbiAgICBhc3NlcnQgbGliLnJhdGU/LCAnTm8gbGliLnJhdGUnXG4gICAgYXNzZXJ0IGxpYi5jZHI/LCAnTm8gbGliLmNkcidcbiAgICBhc3NlcnQgbGliLnRyYWNlPywgJ05vIGxpYi50cmFjZSdcbiAgICBhc3NlcnQgbGliLnJlZmVyZW5jZT8sICdObyBsaWIucmVmZXJlbmNlJ1xuXG4gICAgZGVzaWduX2RvY3VtZW50ID1cbiAgICAgIHJ1bGVzZXQ6XG4gICAgICAgIF9pZDogXCJfZGVzaWduLyN7cGtnLm5hbWV9XCJcbiAgICAgICAgdmVyc2lvbjogcGtnLnZlcnNpb25cbiAgICAgICAgbGFuZ3VhZ2U6ICdjb2ZmZWVzY3JpcHQnXG4gICAgICAgIHZpZXdzOlxuICAgICAgICAgIGxpYjpcbiAgICAgICAgICAgIHJ1bGVzZXQ6IGxpYi5ydWxlc2V0XG4gICAgICAgIHZhbGlkYXRlX2RvY191cGRhdGU6ICcnJ1xuICAgICAgICAgIC0+IHJlcXVpcmUoJ3ZpZXdzL2xpYi9ydWxlc2V0JykudmFsaWRhdGVfdXNlcl9kb2MuYXBwbHkgdGhpcywgYXJndW1lbnRzXG4gICAgICAgICcnJ1xuXG4gICAgICByYXRlOlxuICAgICAgICBfaWQ6IFwiX2Rlc2lnbi8je3BrZy5uYW1lfVwiXG4gICAgICAgIHZlcnNpb246IHBrZy52ZXJzaW9uXG4gICAgICAgIGxhbmd1YWdlOiAnY29mZmVlc2NyaXB0J1xuICAgICAgICB2aWV3czpcbiAgICAgICAgICBsaWI6XG4gICAgICAgICAgICByYXRlOiBsaWIucmF0ZVxuICAgICAgICB2YWxpZGF0ZV9kb2NfdXBkYXRlOiAnJydcbiAgICAgICAgICAtPiByZXF1aXJlKCd2aWV3cy9saWIvcmF0ZScpLnZhbGlkYXRlX3VzZXJfZG9jLmFwcGx5IHRoaXMsIGFyZ3VtZW50c1xuICAgICAgICAnJydcblxuICAgICAgY2RyOlxuICAgICAgICBfaWQ6IFwiX2Rlc2lnbi8je3BrZy5uYW1lfVwiXG4gICAgICAgIHZlcnNpb246IHBrZy52ZXJzaW9uXG4gICAgICAgIGxhbmd1YWdlOiAnY29mZmVlc2NyaXB0J1xuICAgICAgICB2aWV3czpcbiAgICAgICAgICBsaWI6XG4gICAgICAgICAgICBjZHI6IGxpYi5jZHJcbiAgICAgICAgICBzdW1tYXJpemU6XG4gICAgICAgICAgICByZWR1Y2U6ICdfc3RhdHMnXG4gICAgICAgICAgICBtYXA6ICcnJ1xuICAgICAgICAgICAgICAoZG9jKSAtPlxuICAgICAgICAgICAgICAgIGVtaXQgW2RvYy5jbGllbnQuYWNjb3VudCxkb2MuY2xpZW50LnN1Yl9hY2NvdW50XSwgZG9jLmFjdHVhbF9hbW91bnRcbiAgICAgICAgICAgICcnJ1xuICAgICAgICB2YWxpZGF0ZV9kb2NfdXBkYXRlOiAnJydcbiAgICAgICAgICAtPiByZXF1aXJlKCd2aWV3cy9saWIvY2RyJykudmFsaWRhdGVfdXNlcl9kb2MuYXBwbHkgdGhpcywgYXJndW1lbnRzXG4gICAgICAgICcnJ1xuXG4gICAgICB0cmFjZTpcbiAgICAgICAgX2lkOiBcIl9kZXNpZ24vI3twa2cubmFtZX1cIlxuICAgICAgICB2ZXJzaW9uOiBwa2cudmVyc2lvblxuICAgICAgICBsYW5ndWFnZTogJ2NvZmZlZXNjcmlwdCdcbiAgICAgICAgdmlld3M6XG4gICAgICAgICAgbGliOlxuICAgICAgICAgICAgdHJhY2U6IGxpYi50cmFjZVxuICAgICAgICB2YWxpZGF0ZV9kb2NfdXBkYXRlOiAnJydcbiAgICAgICAgICAtPiByZXF1aXJlKCd2aWV3cy9saWIvdHJhY2UnKS52YWxpZGF0ZV91c2VyX2RvYy5hcHBseSB0aGlzLCBhcmd1bWVudHNcbiAgICAgICAgJycnXG5cbiAgICAgIHJlZmVyZW5jZTpcbiAgICAgICAgX2lkOiBcIl9kZXNpZ24vI3twa2cubmFtZX1cIlxuICAgICAgICB2ZXJzaW9uOiBwa2cudmVyc2lvblxuICAgICAgICBsYW5ndWFnZTogJ2NvZmZlZXNjcmlwdCdcbiAgICAgICAgdmlld3M6XG4gICAgICAgICAgbGliOlxuICAgICAgICAgICAgcmVmZXJlbmNlOiBsaWIucmVmZXJlbmNlXG4gICAgICAgICAgdGFnczpcbiAgICAgICAgICAgIHJlZHVjZTogJ19zdGF0cydcbiAgICAgICAgICAgIG1hcDogJycnXG4gICAgICAgICAgICAgIC0+IHJlcXVpcmUoJ3ZpZXdzL2xpYi9yZWZlcmVuY2UnKS50YWdzLmFwcGx5IHRoaXMsIGFyZ3VtZW50c1xuICAgICAgICAgICAgJycnXG4gICAgICAgIHZhbGlkYXRlX2RvY191cGRhdGU6ICcnJ1xuICAgICAgICAgIC0+IHJlcXVpcmUoJ3ZpZXdzL2xpYi9yZWZlcmVuY2UnKS52YWxpZGF0ZV91c2VyX2RvYy5hcHBseSB0aGlzLCBhcmd1bWVudHNcbiAgICAgICAgJycnXG5cbiAgICBoYW5kbGVyID0gKHR5cGUpIC0+XG4gICAgICBzZWVtIC0+XG4gICAgICAgIHJvbGUgPSBcIiN7dHlwZX1zX2FkbWluXCJcbiAgICAgICAgc2VydmVycyA9IEBjZmdbXCIje3R5cGV9X3NlcnZlcnNcIl1cblxuICAgICAgICBzZWN1cml0eSA9XG4gICAgICAgICAgYWRtaW5zOlxuICAgICAgICAgICAgbmFtZXM6IFtdXG4gICAgICAgICAgICByb2xlczogW3JvbGVdXG4gICAgICAgICAgbWVtYmVyczpcbiAgICAgICAgICAgIG5hbWVzOiBbXVxuICAgICAgICAgICAgcm9sZXM6IFtyb2xlLFwiI3t0eXBlfXNfcmVhZGVyXCIsXCIje3R5cGV9c193cml0ZXJcIl1cblxuICAgICAgICB1bmxlc3MgQHNlc3Npb24uY291Y2hkYl9yb2xlcz8gYW5kIHJvbGUgaW4gQHNlc3Npb24uY291Y2hkYl9yb2xlc1xuICAgICAgICAgIEByZXMuc3RhdHVzIDQwM1xuICAgICAgICAgIEBqc29uIGVycm9yOlwiTXVzdCBiZSAje3JvbGV9XCJcbiAgICAgICAgICBAcmVzLmVuZCgpXG4gICAgICAgICAgcmV0dXJuXG5cbiAgICAgICAgZGJfbmFtZSA9IEByZXEucGF0aC5zdWJzdHIgMVxuICAgICAgICBkYl9uYW1lID0gZGJfbmFtZS5yZXBsYWNlIC9cXC8kLywgJydcblxuICAgICAgICBkZWJ1ZyBcImNyZWF0ZV8je3R5cGV9X2RhdGFiYXNlXCIsIHtkYl9uYW1lfVxuXG5XZSB3aWxsIHJlcGxpY2F0ZSB0by9mcm9tIHRoZSBmaXJzdCBzZXJ2ZXIgaW4gdGhlIGxpc3QgKHBhcnRpYWxseSBiZWNhdXNlIGl0J3MgdGhlIGZpcnN0IG9uZSB3aGVyZSB0aGUgZGF0YWJhc2Ugd2lsbCBiZSBjcmVhdGVkKS5cblxuICAgICAgICBjZW50cmFsID0gbnVsbFxuICAgICAgICBjZW50cmFsID0gc2VydmVyc1swXSBpZiBzZXJ2ZXJzLmxlbmd0aCA+IDFcblxuICAgICAgICBmb3Igc2VydmVyIGluIHNlcnZlcnNcblxuICAgICAgICAgIGRiX3VyaSA9IFtzZXJ2ZXIsZGJfbmFtZV0uam9pbiAnLydcblxuQ3JlYXRlIGRhdGFiYXNlXG5cbiAgICAgICAgICBkYiA9IG5ldyBQb3VjaERCIGRiX3VyaVxuICAgICAgICAgIHlpZWxkIGRiLmluZm8oKVxuXG4gICAgICAgICAgdXBkYXRlID0gc2VlbSAoZG9jKSAtPlxuICAgICAgICAgICAge19yZXZ9ID0geWllbGQgZGJcbiAgICAgICAgICAgICAgLmdldCBkb2MuX2lkXG4gICAgICAgICAgICAgIC5jYXRjaCAtPiBfcmV2OiBudWxsXG4gICAgICAgICAgICBkZWxldGUgZG9jLl9yZXZcbiAgICAgICAgICAgIGRvYy5fcmV2ID0gX3JldiBpZiBfcmV2P1xuICAgICAgICAgICAgeWllbGQgZGIucHV0IGRvY1xuXG5JbmplY3Qgc2VjdXJpdHkgZG9jdW1lbnRcblxuICAgICAgICAgIHlpZWxkIHJlcXVlc3RcbiAgICAgICAgICAgIC5wdXQgXCIje2RiX3VyaX0vX3NlY3VyaXR5XCJcbiAgICAgICAgICAgIC5zZW5kIHNlY3VyaXR5XG5cbkluamVjdCBkZXNpZ24gZG9jdW1lbnRcblxuICAgICAgICAgIHlpZWxkIHVwZGF0ZSBkZXNpZ25fZG9jdW1lbnRbdHlwZV1cblxuSW5qZWN0IHJlamVjdC10b21ic3RvbmVzIGRvY3VtZW50XG5cbiAgICAgICAgICB5aWVsZCB1cGRhdGUgcmVqZWN0X3RvbWJzdG9uZXNcblxuU2V0dXAgbWFzdGVyLW1hc3RlciByZXBsaWNhdGlvblxuKGJldHdlZW4gdGhlIGZpcnN0IHNlcnZlciBpbiB0aGUgbGlzdCBhbmQgdGhlIGN1cnJlbnQgc2VydmVyKS5cblxuICAgICAgICAgIGlmIGNlbnRyYWwgYW5kIHNlcnZlciBpc250IGNlbnRyYWxcblxuICAgICAgICAgICAgeWllbGQgUmVwbGljYXRvciBjZW50cmFsLCBzZXJ2ZXIsIGRiX25hbWUsIChkb2MpIC0+XG4gICAgICAgICAgICAgIGRvYy5vd25lciA9IFwiYWRtaW5cIlxuICAgICAgICAgICAgICBkb2MudXNlcl9jdHggPVxuICAgICAgICAgICAgICAgIG5hbWU6IFwiYWRtaW5cIlxuICAgICAgICAgICAgICAgIHJvbGVzOiBbXG4gICAgICAgICAgICAgICAgICBcIl9hZG1pblwiXG4gICAgICAgICAgICAgICAgICByb2xlXG4gICAgICAgICAgICAgICAgICBcIiN7dHlwZX1zX3dyaXRlclwiXG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICByZXR1cm5cblxuICAgICAgICAgICAgeWllbGQgUmVwbGljYXRvciBzZXJ2ZXIsIGNlbnRyYWwsIGRiX25hbWUsIChkb2MpIC0+XG4gICAgICAgICAgICAgIGRvYy5vd25lciA9IFwiYWRtaW5cIlxuICAgICAgICAgICAgICBkb2MudXNlcl9jdHggPVxuICAgICAgICAgICAgICAgIG5hbWU6IFwiYWRtaW5cIlxuICAgICAgICAgICAgICAgIHJvbGVzOiBbXG4gICAgICAgICAgICAgICAgICBcIl9hZG1pblwiXG4gICAgICAgICAgICAgICAgICByb2xlXG4gICAgICAgICAgICAgICAgICBcIiN7dHlwZX1zX3dyaXRlclwiXG4gICAgICAgICAgICAgICAgXVxuXG4gICAgICAgIEBqc29uIG9rOnRydWVcblxuICAgIEBpbmNsdWRlID0gLT5cblxuVGhlc2UgYXJlIG1hcHBlZCBmcm9tIGEgcnVsZXNldCBJRCB0byBhIGRhdGFiYXNlIG5hbWUgaW4gdGhlIGBydWxlc2V0OmAgcmVjb3JkcyBpbiB0aGUgcHJvdmlzaW9uaW5nIGRhdGFiYXNlLlxuVGhlIGBydWxlc2V0X2AgcHJlZml4IGlzIHN0YW5kYXJkIGJ1dCBub3QgaGFyZC1jb2RlZC5cblxuICAgICAgQHB1dCAgL15cXC9ydWxlc2V0X1thLXpcXGRfLV0rXFwvPyQvLCBAYXV0aCwgaGFuZGxlciAncnVsZXNldCdcblxuVGhlc2UgYXJlIGluIHRoZSBgdGFibGVgIGZpZWxkcyBpbiB0aGUgYHJhdGluZ2Agb2JqZWN0cyBhbmQgYXJlIHVzZWQgYnkgZS5nLiBlbnRlcnRhaW5pbmctY3JpYi5cblRoZSBgcmF0ZXMtYCBwcmVmaXggaXMgc3RhbmRhcmQgYnV0IG5vdCBkZWZpbmVkIHNwZWNpZmljYWxseSBhbnl3aGVyZS5cblxuICAgICAgQHB1dCAgL15cXC9yYXRlcy1bYS16XFxkXy1dK1xcLz8kLywgQGF1dGgsIGhhbmRsZXIgJ3JhdGUnXG5cblRoZSBkZWZhdWx0IHByZWZpeGVzIGZvciB0aGVzZSBhcmUgZGVmaW5lZCBpbiBgYXN0b25pc2hpbmctY29tcGV0aXRpb25gIGFuZCBgaHVnZS1wbGF5YC5cblxuICAgICAgQHB1dCAgL15cXC9jZHItW2EtelxcZF8tXStcXC8/JC8sIEBhdXRoLCBoYW5kbGVyICdjZHInXG4gICAgICBAcHV0ICAvXlxcL3RyYWNlLVthLXpcXGRfLV0rXFwvPyQvLCBAYXV0aCwgaGFuZGxlciAndHJhY2UnXG4gICAgICBAcHV0ICAvXlxcL3JlZmVyZW5jZS1bYS16XFxkXy1dK1xcLz8kLywgQGF1dGgsIGhhbmRsZXIgJ3JlZmVyZW5jZSdcbiJdfQ==
//# sourceURL=/srv/home/stephane/Artisan/Managed/Telecoms/grumpy-actor/server.coffee.md