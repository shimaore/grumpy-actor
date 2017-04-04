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
      var central, db, db_name, db_uri, is_admin, is_role_admin, j, len1, role, security, server, servers, update;
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
      is_admin = indexOf.call(this.session.couchdb_roles, '_admin') >= 0;
      is_role_admin = is_admin || indexOf.call(this.session.couchdb_roles, role) >= 0;
      if (!((this.session.couchdb_roles != null) && is_role_admin)) {
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2VydmVyLmNvZmZlZS5tZCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBSTtBQUFBLE1BQUEsc0lBQUE7SUFBQTs7RUFBQSxHQUFBLEdBQU0sT0FBQSxDQUFRLGdCQUFSOztFQUNOLEtBQUEsR0FBUSxDQUFDLE9BQUEsQ0FBUSxPQUFSLENBQUQsQ0FBQSxDQUFxQixHQUFHLENBQUMsSUFBTCxHQUFVLFNBQTlCOztFQUNSLElBQUEsR0FBTyxPQUFBLENBQVEsTUFBUjs7RUFFUCxFQUFBLEdBQUssT0FBQSxDQUFRLElBQVI7O0VBQ0wsSUFBQSxHQUFPLE9BQUEsQ0FBUSxNQUFSOztFQUVQLGlCQUFBLEdBQW9CLE9BQUEsQ0FBUSxtQkFBUjs7RUFFcEIsT0FBQSxHQUFVLENBQ1IsU0FEUSxFQUVSLE1BRlEsRUFHUixLQUhRLEVBSVIsT0FKUSxFQUtSLFdBTFE7O0VBT1YsR0FBQSxHQUFNOztBQUNOLE9BQUEseUNBQUE7O0lBQ0UsR0FBSSxDQUFBLENBQUEsQ0FBSixHQUFTLEVBQUUsQ0FBQyxZQUFILENBQWlCLElBQUksQ0FBQyxJQUFMLENBQVUsU0FBVixFQUFxQixJQUFBLEdBQUssQ0FBTCxHQUFPLFlBQTVCLENBQWpCLEVBQTJELE9BQTNEO0FBRFg7O0VBR0EsVUFBQSxHQUFhLE9BQUEsQ0FBUSxjQUFSOztFQUNiLE9BQUEsR0FBVSxPQUFBLENBQVEsa0JBQVI7O0VBQ1YsT0FBQSxHQUFVLE9BQUEsQ0FBUSxZQUFSOztFQUNWLE1BQUEsR0FBUyxPQUFBLENBQVEsUUFBUjs7RUFFVCxNQUFBLENBQU8sbUJBQVAsRUFBcUIsZ0JBQXJCOztFQUNBLE1BQUEsQ0FBTyxnQkFBUCxFQUFrQixhQUFsQjs7RUFDQSxNQUFBLENBQU8sZUFBUCxFQUFpQixZQUFqQjs7RUFDQSxNQUFBLENBQU8saUJBQVAsRUFBbUIsY0FBbkI7O0VBQ0EsTUFBQSxDQUFPLHFCQUFQLEVBQXVCLGtCQUF2Qjs7RUFFQSxl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RUFBNEMsT0FBQSxDQUFRLFdBQVIsQ0FBNUM7RUFoQlM7QUE3TFgiLCJzb3VyY2VzQ29udGVudCI6WyIgICAgcGtnID0gcmVxdWlyZSAnLi9wYWNrYWdlLmpzb24nXG4gICAgZGVidWcgPSAocmVxdWlyZSAnZGVidWcnKSBcIiN7cGtnLm5hbWV9OnNlcnZlclwiXG4gICAgc2VlbSA9IHJlcXVpcmUgJ3NlZW0nXG5cbiAgICBmcyA9IHJlcXVpcmUgJ2ZzJ1xuICAgIHBhdGggPSByZXF1aXJlICdwYXRoJ1xuXG4gICAgcmVqZWN0X3RvbWJzdG9uZXMgPSByZXF1aXJlICdyZWplY3QtdG9tYnN0b25lcydcblxuICAgIG1vZHVsZXMgPSBbXG4gICAgICAncnVsZXNldCdcbiAgICAgICdyYXRlJ1xuICAgICAgJ2NkcidcbiAgICAgICd0cmFjZSdcbiAgICAgICdyZWZlcmVuY2UnXG4gICAgXVxuICAgIGxpYiA9IHt9XG4gICAgZm9yIG0gaW4gbW9kdWxlc1xuICAgICAgbGliW21dID0gZnMucmVhZEZpbGVTeW5jIChwYXRoLmpvaW4gX19kaXJuYW1lLCBcIi4vI3ttfS5idW5kbGUuanNcIiksICd1dGYtOCdcblxuICAgIFJlcGxpY2F0b3IgPSByZXF1aXJlICdmcmFudGljLXRlYW0nXG4gICAgUG91Y2hEQiA9IHJlcXVpcmUgJ3NoaW1hb3JlLXBvdWNoZGInXG4gICAgcmVxdWVzdCA9IHJlcXVpcmUgJ3N1cGVyYWdlbnQnXG4gICAgYXNzZXJ0ID0gcmVxdWlyZSAnYXNzZXJ0J1xuXG4gICAgYXNzZXJ0IGxpYi5ydWxlc2V0PywgJ05vIGxpYi5ydWxlc2V0J1xuICAgIGFzc2VydCBsaWIucmF0ZT8sICdObyBsaWIucmF0ZSdcbiAgICBhc3NlcnQgbGliLmNkcj8sICdObyBsaWIuY2RyJ1xuICAgIGFzc2VydCBsaWIudHJhY2U/LCAnTm8gbGliLnRyYWNlJ1xuICAgIGFzc2VydCBsaWIucmVmZXJlbmNlPywgJ05vIGxpYi5yZWZlcmVuY2UnXG5cbiAgICBkZXNpZ25fZG9jdW1lbnQgPVxuICAgICAgcnVsZXNldDpcbiAgICAgICAgX2lkOiBcIl9kZXNpZ24vI3twa2cubmFtZX1cIlxuICAgICAgICB2ZXJzaW9uOiBwa2cudmVyc2lvblxuICAgICAgICBsYW5ndWFnZTogJ2NvZmZlZXNjcmlwdCdcbiAgICAgICAgdmlld3M6XG4gICAgICAgICAgbGliOlxuICAgICAgICAgICAgcnVsZXNldDogbGliLnJ1bGVzZXRcbiAgICAgICAgdmFsaWRhdGVfZG9jX3VwZGF0ZTogJycnXG4gICAgICAgICAgLT4gcmVxdWlyZSgndmlld3MvbGliL3J1bGVzZXQnKS52YWxpZGF0ZV91c2VyX2RvYy5hcHBseSB0aGlzLCBhcmd1bWVudHNcbiAgICAgICAgJycnXG5cbiAgICAgIHJhdGU6XG4gICAgICAgIF9pZDogXCJfZGVzaWduLyN7cGtnLm5hbWV9XCJcbiAgICAgICAgdmVyc2lvbjogcGtnLnZlcnNpb25cbiAgICAgICAgbGFuZ3VhZ2U6ICdjb2ZmZWVzY3JpcHQnXG4gICAgICAgIHZpZXdzOlxuICAgICAgICAgIGxpYjpcbiAgICAgICAgICAgIHJhdGU6IGxpYi5yYXRlXG4gICAgICAgIHZhbGlkYXRlX2RvY191cGRhdGU6ICcnJ1xuICAgICAgICAgIC0+IHJlcXVpcmUoJ3ZpZXdzL2xpYi9yYXRlJykudmFsaWRhdGVfdXNlcl9kb2MuYXBwbHkgdGhpcywgYXJndW1lbnRzXG4gICAgICAgICcnJ1xuXG4gICAgICBjZHI6XG4gICAgICAgIF9pZDogXCJfZGVzaWduLyN7cGtnLm5hbWV9XCJcbiAgICAgICAgdmVyc2lvbjogcGtnLnZlcnNpb25cbiAgICAgICAgbGFuZ3VhZ2U6ICdjb2ZmZWVzY3JpcHQnXG4gICAgICAgIHZpZXdzOlxuICAgICAgICAgIGxpYjpcbiAgICAgICAgICAgIGNkcjogbGliLmNkclxuICAgICAgICAgIHN1bW1hcml6ZTpcbiAgICAgICAgICAgIHJlZHVjZTogJ19zdGF0cydcbiAgICAgICAgICAgIG1hcDogJycnXG4gICAgICAgICAgICAgIChkb2MpIC0+XG4gICAgICAgICAgICAgICAgZW1pdCBbZG9jLmNsaWVudC5hY2NvdW50LGRvYy5jbGllbnQuc3ViX2FjY291bnRdLCBkb2MuYWN0dWFsX2Ftb3VudFxuICAgICAgICAgICAgJycnXG4gICAgICAgIHZhbGlkYXRlX2RvY191cGRhdGU6ICcnJ1xuICAgICAgICAgIC0+IHJlcXVpcmUoJ3ZpZXdzL2xpYi9jZHInKS52YWxpZGF0ZV91c2VyX2RvYy5hcHBseSB0aGlzLCBhcmd1bWVudHNcbiAgICAgICAgJycnXG5cbiAgICAgIHRyYWNlOlxuICAgICAgICBfaWQ6IFwiX2Rlc2lnbi8je3BrZy5uYW1lfVwiXG4gICAgICAgIHZlcnNpb246IHBrZy52ZXJzaW9uXG4gICAgICAgIGxhbmd1YWdlOiAnY29mZmVlc2NyaXB0J1xuICAgICAgICB2aWV3czpcbiAgICAgICAgICBsaWI6XG4gICAgICAgICAgICB0cmFjZTogbGliLnRyYWNlXG4gICAgICAgIHZhbGlkYXRlX2RvY191cGRhdGU6ICcnJ1xuICAgICAgICAgIC0+IHJlcXVpcmUoJ3ZpZXdzL2xpYi90cmFjZScpLnZhbGlkYXRlX3VzZXJfZG9jLmFwcGx5IHRoaXMsIGFyZ3VtZW50c1xuICAgICAgICAnJydcblxuICAgICAgcmVmZXJlbmNlOlxuICAgICAgICBfaWQ6IFwiX2Rlc2lnbi8je3BrZy5uYW1lfVwiXG4gICAgICAgIHZlcnNpb246IHBrZy52ZXJzaW9uXG4gICAgICAgIGxhbmd1YWdlOiAnY29mZmVlc2NyaXB0J1xuICAgICAgICB2aWV3czpcbiAgICAgICAgICBsaWI6XG4gICAgICAgICAgICByZWZlcmVuY2U6IGxpYi5yZWZlcmVuY2VcbiAgICAgICAgICB0YWdzOlxuICAgICAgICAgICAgcmVkdWNlOiAnX3N0YXRzJ1xuICAgICAgICAgICAgbWFwOiAnJydcbiAgICAgICAgICAgICAgLT4gcmVxdWlyZSgndmlld3MvbGliL3JlZmVyZW5jZScpLnRhZ3MuYXBwbHkgdGhpcywgYXJndW1lbnRzXG4gICAgICAgICAgICAnJydcbiAgICAgICAgdmFsaWRhdGVfZG9jX3VwZGF0ZTogJycnXG4gICAgICAgICAgLT4gcmVxdWlyZSgndmlld3MvbGliL3JlZmVyZW5jZScpLnZhbGlkYXRlX3VzZXJfZG9jLmFwcGx5IHRoaXMsIGFyZ3VtZW50c1xuICAgICAgICAnJydcblxuICAgIGhhbmRsZXIgPSAodHlwZSkgLT5cbiAgICAgIHNlZW0gLT5cbiAgICAgICAgcm9sZSA9IFwiI3t0eXBlfXNfYWRtaW5cIlxuICAgICAgICBzZXJ2ZXJzID0gQGNmZ1tcIiN7dHlwZX1fc2VydmVyc1wiXVxuXG4gICAgICAgIHNlY3VyaXR5ID1cbiAgICAgICAgICBhZG1pbnM6XG4gICAgICAgICAgICBuYW1lczogW11cbiAgICAgICAgICAgIHJvbGVzOiBbcm9sZV1cbiAgICAgICAgICBtZW1iZXJzOlxuICAgICAgICAgICAgbmFtZXM6IFtdXG4gICAgICAgICAgICByb2xlczogW3JvbGUsXCIje3R5cGV9c19yZWFkZXJcIixcIiN7dHlwZX1zX3dyaXRlclwiXVxuXG4gICAgICAgIGlzX2FkbWluID0gJ19hZG1pbicgaW4gQHNlc3Npb24uY291Y2hkYl9yb2xlc1xuICAgICAgICBpc19yb2xlX2FkbWluID0gaXNfYWRtaW4gb3Igcm9sZSBpbiBAc2Vzc2lvbi5jb3VjaGRiX3JvbGVzXG5cbiAgICAgICAgdW5sZXNzIEBzZXNzaW9uLmNvdWNoZGJfcm9sZXM/IGFuZCBpc19yb2xlX2FkbWluXG4gICAgICAgICAgQHJlcy5zdGF0dXMgNDAzXG4gICAgICAgICAgQGpzb24gZXJyb3I6XCJNdXN0IGJlICN7cm9sZX1cIlxuICAgICAgICAgIEByZXMuZW5kKClcbiAgICAgICAgICByZXR1cm5cblxuICAgICAgICBkYl9uYW1lID0gQHJlcS5wYXRoLnN1YnN0ciAxXG4gICAgICAgIGRiX25hbWUgPSBkYl9uYW1lLnJlcGxhY2UgL1xcLyQvLCAnJ1xuXG4gICAgICAgIGRlYnVnIFwiY3JlYXRlXyN7dHlwZX1fZGF0YWJhc2VcIiwge2RiX25hbWV9XG5cbldlIHdpbGwgcmVwbGljYXRlIHRvL2Zyb20gdGhlIGZpcnN0IHNlcnZlciBpbiB0aGUgbGlzdCAocGFydGlhbGx5IGJlY2F1c2UgaXQncyB0aGUgZmlyc3Qgb25lIHdoZXJlIHRoZSBkYXRhYmFzZSB3aWxsIGJlIGNyZWF0ZWQpLlxuXG4gICAgICAgIGNlbnRyYWwgPSBudWxsXG4gICAgICAgIGNlbnRyYWwgPSBzZXJ2ZXJzWzBdIGlmIHNlcnZlcnMubGVuZ3RoID4gMVxuXG4gICAgICAgIGZvciBzZXJ2ZXIgaW4gc2VydmVyc1xuXG4gICAgICAgICAgZGJfdXJpID0gW3NlcnZlcixkYl9uYW1lXS5qb2luICcvJ1xuXG5DcmVhdGUgZGF0YWJhc2VcblxuICAgICAgICAgIGRiID0gbmV3IFBvdWNoREIgZGJfdXJpXG4gICAgICAgICAgeWllbGQgZGIuaW5mbygpXG5cbiAgICAgICAgICB1cGRhdGUgPSBzZWVtIChkb2MpIC0+XG4gICAgICAgICAgICB7X3Jldn0gPSB5aWVsZCBkYlxuICAgICAgICAgICAgICAuZ2V0IGRvYy5faWRcbiAgICAgICAgICAgICAgLmNhdGNoIC0+IF9yZXY6IG51bGxcbiAgICAgICAgICAgIGRlbGV0ZSBkb2MuX3JldlxuICAgICAgICAgICAgZG9jLl9yZXYgPSBfcmV2IGlmIF9yZXY/XG4gICAgICAgICAgICB5aWVsZCBkYi5wdXQgZG9jXG5cbkluamVjdCBzZWN1cml0eSBkb2N1bWVudFxuXG4gICAgICAgICAgeWllbGQgcmVxdWVzdFxuICAgICAgICAgICAgLnB1dCBcIiN7ZGJfdXJpfS9fc2VjdXJpdHlcIlxuICAgICAgICAgICAgLnNlbmQgc2VjdXJpdHlcblxuSW5qZWN0IGRlc2lnbiBkb2N1bWVudFxuXG4gICAgICAgICAgeWllbGQgdXBkYXRlIGRlc2lnbl9kb2N1bWVudFt0eXBlXVxuXG5JbmplY3QgcmVqZWN0LXRvbWJzdG9uZXMgZG9jdW1lbnRcblxuICAgICAgICAgIHlpZWxkIHVwZGF0ZSByZWplY3RfdG9tYnN0b25lc1xuXG5TZXR1cCBtYXN0ZXItbWFzdGVyIHJlcGxpY2F0aW9uXG4oYmV0d2VlbiB0aGUgZmlyc3Qgc2VydmVyIGluIHRoZSBsaXN0IGFuZCB0aGUgY3VycmVudCBzZXJ2ZXIpLlxuXG4gICAgICAgICAgaWYgY2VudHJhbCBhbmQgc2VydmVyIGlzbnQgY2VudHJhbFxuXG4gICAgICAgICAgICB5aWVsZCBSZXBsaWNhdG9yIGNlbnRyYWwsIHNlcnZlciwgZGJfbmFtZSwgKGRvYykgLT5cbiAgICAgICAgICAgICAgZG9jLm93bmVyID0gXCJhZG1pblwiXG4gICAgICAgICAgICAgIGRvYy51c2VyX2N0eCA9XG4gICAgICAgICAgICAgICAgbmFtZTogXCJhZG1pblwiXG4gICAgICAgICAgICAgICAgcm9sZXM6IFtcbiAgICAgICAgICAgICAgICAgIFwiX2FkbWluXCJcbiAgICAgICAgICAgICAgICAgIHJvbGVcbiAgICAgICAgICAgICAgICAgIFwiI3t0eXBlfXNfd3JpdGVyXCJcbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgIHJldHVyblxuXG4gICAgICAgICAgICB5aWVsZCBSZXBsaWNhdG9yIHNlcnZlciwgY2VudHJhbCwgZGJfbmFtZSwgKGRvYykgLT5cbiAgICAgICAgICAgICAgZG9jLm93bmVyID0gXCJhZG1pblwiXG4gICAgICAgICAgICAgIGRvYy51c2VyX2N0eCA9XG4gICAgICAgICAgICAgICAgbmFtZTogXCJhZG1pblwiXG4gICAgICAgICAgICAgICAgcm9sZXM6IFtcbiAgICAgICAgICAgICAgICAgIFwiX2FkbWluXCJcbiAgICAgICAgICAgICAgICAgIHJvbGVcbiAgICAgICAgICAgICAgICAgIFwiI3t0eXBlfXNfd3JpdGVyXCJcbiAgICAgICAgICAgICAgICBdXG5cbiAgICAgICAgQGpzb24gb2s6dHJ1ZVxuXG4gICAgQGluY2x1ZGUgPSAtPlxuXG5UaGVzZSBhcmUgbWFwcGVkIGZyb20gYSBydWxlc2V0IElEIHRvIGEgZGF0YWJhc2UgbmFtZSBpbiB0aGUgYHJ1bGVzZXQ6YCByZWNvcmRzIGluIHRoZSBwcm92aXNpb25pbmcgZGF0YWJhc2UuXG5UaGUgYHJ1bGVzZXRfYCBwcmVmaXggaXMgc3RhbmRhcmQgYnV0IG5vdCBoYXJkLWNvZGVkLlxuXG4gICAgICBAcHV0ICAvXlxcL3J1bGVzZXRfW2EtelxcZF8tXStcXC8/JC8sIEBhdXRoLCBoYW5kbGVyICdydWxlc2V0J1xuXG5UaGVzZSBhcmUgaW4gdGhlIGB0YWJsZWAgZmllbGRzIGluIHRoZSBgcmF0aW5nYCBvYmplY3RzIGFuZCBhcmUgdXNlZCBieSBlLmcuIGVudGVydGFpbmluZy1jcmliLlxuVGhlIGByYXRlcy1gIHByZWZpeCBpcyBzdGFuZGFyZCBidXQgbm90IGRlZmluZWQgc3BlY2lmaWNhbGx5IGFueXdoZXJlLlxuXG4gICAgICBAcHV0ICAvXlxcL3JhdGVzLVthLXpcXGRfLV0rXFwvPyQvLCBAYXV0aCwgaGFuZGxlciAncmF0ZSdcblxuVGhlIGRlZmF1bHQgcHJlZml4ZXMgZm9yIHRoZXNlIGFyZSBkZWZpbmVkIGluIGBhc3RvbmlzaGluZy1jb21wZXRpdGlvbmAgYW5kIGBodWdlLXBsYXlgLlxuXG4gICAgICBAcHV0ICAvXlxcL2Nkci1bYS16XFxkXy1dK1xcLz8kLywgQGF1dGgsIGhhbmRsZXIgJ2NkcidcbiAgICAgIEBwdXQgIC9eXFwvdHJhY2UtW2EtelxcZF8tXStcXC8/JC8sIEBhdXRoLCBoYW5kbGVyICd0cmFjZSdcbiAgICAgIEBwdXQgIC9eXFwvcmVmZXJlbmNlLVthLXpcXGRfLV0rXFwvPyQvLCBAYXV0aCwgaGFuZGxlciAncmVmZXJlbmNlJ1xuIl19
//# sourceURL=/srv/home/stephane/Artisan/Managed/Telecoms/grumpy-actor/server.coffee.md