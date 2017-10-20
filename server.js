(function() {
  var PouchDB, Replicator, assert, debug, design_document, fs, handler, i, len, lib, m, modules, path, pkg, reject_tombstones, request, seem,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  pkg = require('./package.json');

  debug = (require('debug'))(pkg.name + ":server");

  seem = require('seem');

  fs = require('fs');

  path = require('path');

  reject_tombstones = require('reject-tombstones');

  modules = ['ruleset', 'rate', 'cdr', 'trace'];

  lib = {};

  for (i = 0, len = modules.length; i < len; i++) {
    m = modules[i];
    lib[m] = fs.readFileSync(path.join(__dirname, "./" + m + ".bundle.js"), 'utf-8');
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
    return this.put(/^\/trace-[a-z\d_-]+\/?$/, this.auth, handler('trace'));
  };

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2VydmVyLmNvZmZlZS5tZCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBSTtBQUFBLE1BQUEsc0lBQUE7SUFBQTs7RUFBQSxHQUFBLEdBQU0sT0FBQSxDQUFRLGdCQUFSOztFQUNOLEtBQUEsR0FBUSxDQUFDLE9BQUEsQ0FBUSxPQUFSLENBQUQsQ0FBQSxDQUFxQixHQUFHLENBQUMsSUFBTCxHQUFVLFNBQTlCOztFQUNSLElBQUEsR0FBTyxPQUFBLENBQVEsTUFBUjs7RUFFUCxFQUFBLEdBQUssT0FBQSxDQUFRLElBQVI7O0VBQ0wsSUFBQSxHQUFPLE9BQUEsQ0FBUSxNQUFSOztFQUVQLGlCQUFBLEdBQW9CLE9BQUEsQ0FBUSxtQkFBUjs7RUFFcEIsT0FBQSxHQUFVLENBQ1IsU0FEUSxFQUVSLE1BRlEsRUFHUixLQUhRLEVBSVIsT0FKUTs7RUFNVixHQUFBLEdBQU07O0FBQ04sT0FBQSx5Q0FBQTs7SUFDRSxHQUFJLENBQUEsQ0FBQSxDQUFKLEdBQVMsRUFBRSxDQUFDLFlBQUgsQ0FBaUIsSUFBSSxDQUFDLElBQUwsQ0FBVSxTQUFWLEVBQXFCLElBQUEsR0FBSyxDQUFMLEdBQU8sWUFBNUIsQ0FBakIsRUFBMkQsT0FBM0Q7QUFEWDs7RUFHQSxVQUFBLEdBQWEsT0FBQSxDQUFRLGNBQVI7O0VBQ2IsT0FBQSxHQUFVLE9BQUEsQ0FBUSxlQUFSOztFQUNWLE9BQUEsR0FBVSxPQUFBLENBQVEsWUFBUjs7RUFDVixNQUFBLEdBQVMsT0FBQSxDQUFRLFFBQVI7O0VBRVQsTUFBQSxDQUFPLG1CQUFQLEVBQXFCLGdCQUFyQjs7RUFDQSxNQUFBLENBQU8sZ0JBQVAsRUFBa0IsYUFBbEI7O0VBQ0EsTUFBQSxDQUFPLGVBQVAsRUFBaUIsWUFBakI7O0VBQ0EsTUFBQSxDQUFPLGlCQUFQLEVBQW1CLGNBQW5COztFQUVBLGVBQUEsR0FDRTtJQUFBLE9BQUEsRUFDRTtNQUFBLEdBQUEsRUFBSyxVQUFBLEdB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QUFKLEdBQ0U7Y0FBQSxJQUFBLEVBQU0sT0FBTjtjQUNBLEtBQUEsRUFBTyxDQUNMLFFBREssRUFFTCxJQUZLLEVBR0YsSUFBRCxHQUFNLFVBSEgsQ0FEUDs7VUFIdUMsQ0FBckMsRUFiUjs7QUFsQ0Y7YUF5REEsSUFBQyxDQUFBLElBQUQsQ0FBTTtRQUFBLEVBQUEsRUFBRyxJQUFIO09BQU47SUF4RkcsQ0FBTDtFQURROztFQTJGVixJQUFDLENBQUEsT0FBRCxHQUFXLFNBQUE7SUFLVCxJQUFDLENBQUEsR0FBRCxDQUFNLDJCQUFOLEVBQW1DLElBQUMsQ0FBQSxJQUFwQyxFQUEwQyxPQUFBLENBQVEsU0FBUixDQUExQztJQUtBLElBQUMsQ0FBQSxHQUFELENBQU0seUJBQU4sRUFBaUMsSUFBQyxDQUFBLElBQWxDLEVBQXdDLE9BQUEsQ0FBUSxNQUFSLENBQXhDO0lBSUEsSUFBQyxDQUFBLEdBQUQsQ0FBTSx1QkFBTixFQUErQixJQUFDLENBQUEsSUFBaEMsRUFBc0MsT0FBQSxDQUFRLEtBQVIsQ0FBdEM7V0FDQSxJQUFDLENBQUEsR0FBRCxDQUFNLHlCQUFOLEVBQWlDLElBQUMsQ0FBQSxJQUFsQyxFQUF3QyxPQUFBLENBQVEsT0FBUixDQUF4QztFQWZTO0FBM0tYIiwic291cmNlc0NvbnRlbnQiOlsiICAgIHBrZyA9IHJlcXVpcmUgJy4vcGFja2FnZS5qc29uJ1xuICAgIGRlYnVnID0gKHJlcXVpcmUgJ2RlYnVnJykgXCIje3BrZy5uYW1lfTpzZXJ2ZXJcIlxuICAgIHNlZW0gPSByZXF1aXJlICdzZWVtJ1xuXG4gICAgZnMgPSByZXF1aXJlICdmcydcbiAgICBwYXRoID0gcmVxdWlyZSAncGF0aCdcblxuICAgIHJlamVjdF90b21ic3RvbmVzID0gcmVxdWlyZSAncmVqZWN0LXRvbWJzdG9uZXMnXG5cbiAgICBtb2R1bGVzID0gW1xuICAgICAgJ3J1bGVzZXQnXG4gICAgICAncmF0ZSdcbiAgICAgICdjZHInXG4gICAgICAndHJhY2UnXG4gICAgXVxuICAgIGxpYiA9IHt9XG4gICAgZm9yIG0gaW4gbW9kdWxlc1xuICAgICAgbGliW21dID0gZnMucmVhZEZpbGVTeW5jIChwYXRoLmpvaW4gX19kaXJuYW1lLCBcIi4vI3ttfS5idW5kbGUuanNcIiksICd1dGYtOCdcblxuICAgIFJlcGxpY2F0b3IgPSByZXF1aXJlICdmcmFudGljLXRlYW0nXG4gICAgUG91Y2hEQiA9IHJlcXVpcmUgJ2NjbnE0LXBvdWNoZGInXG4gICAgcmVxdWVzdCA9IHJlcXVpcmUgJ3N1cGVyYWdlbnQnXG4gICAgYXNzZXJ0ID0gcmVxdWlyZSAnYXNzZXJ0J1xuXG4gICAgYXNzZXJ0IGxpYi5ydWxlc2V0PywgJ05vIGxpYi5ydWxlc2V0J1xuICAgIGFzc2VydCBsaWIucmF0ZT8sICdObyBsaWIucmF0ZSdcbiAgICBhc3NlcnQgbGliLmNkcj8sICdObyBsaWIuY2RyJ1xuICAgIGFzc2VydCBsaWIudHJhY2U/LCAnTm8gbGliLnRyYWNlJ1xuXG4gICAgZGVzaWduX2RvY3VtZW50ID1cbiAgICAgIHJ1bGVzZXQ6XG4gICAgICAgIF9pZDogXCJfZGVzaWduLyN7cGtnLm5hbWV9XCJcbiAgICAgICAgdmVyc2lvbjogcGtnLnZlcnNpb25cbiAgICAgICAgbGFuZ3VhZ2U6ICdjb2ZmZWVzY3JpcHQnXG4gICAgICAgIHZpZXdzOlxuICAgICAgICAgIGxpYjpcbiAgICAgICAgICAgIHJ1bGVzZXQ6IGxpYi5ydWxlc2V0XG4gICAgICAgIHZhbGlkYXRlX2RvY191cGRhdGU6ICcnJ1xuICAgICAgICAgIC0+IHJlcXVpcmUoJ3ZpZXdzL2xpYi9ydWxlc2V0JykudmFsaWRhdGVfdXNlcl9kb2MuYXBwbHkgdGhpcywgYXJndW1lbnRzXG4gICAgICAgICcnJ1xuXG4gICAgICByYXRlOlxuICAgICAgICBfaWQ6IFwiX2Rlc2lnbi8je3BrZy5uYW1lfVwiXG4gICAgICAgIHZlcnNpb246IHBrZy52ZXJzaW9uXG4gICAgICAgIGxhbmd1YWdlOiAnY29mZmVlc2NyaXB0J1xuICAgICAgICB2aWV3czpcbiAgICAgICAgICBsaWI6XG4gICAgICAgICAgICByYXRlOiBsaWIucmF0ZVxuICAgICAgICB2YWxpZGF0ZV9kb2NfdXBkYXRlOiAnJydcbiAgICAgICAgICAtPiByZXF1aXJlKCd2aWV3cy9saWIvcmF0ZScpLnZhbGlkYXRlX3VzZXJfZG9jLmFwcGx5IHRoaXMsIGFyZ3VtZW50c1xuICAgICAgICAnJydcblxuICAgICAgY2RyOlxuICAgICAgICBfaWQ6IFwiX2Rlc2lnbi8je3BrZy5uYW1lfVwiXG4gICAgICAgIHZlcnNpb246IHBrZy52ZXJzaW9uXG4gICAgICAgIGxhbmd1YWdlOiAnY29mZmVlc2NyaXB0J1xuICAgICAgICB2aWV3czpcbiAgICAgICAgICBsaWI6XG4gICAgICAgICAgICBjZHI6IGxpYi5jZHJcbiAgICAgICAgICBzdW1tYXJpemU6XG4gICAgICAgICAgICByZWR1Y2U6ICdfc3RhdHMnXG4gICAgICAgICAgICBtYXA6ICcnJ1xuICAgICAgICAgICAgICAoZG9jKSAtPlxuICAgICAgICAgICAgICAgIGVtaXQgW2RvYy5jbGllbnQuYWNjb3VudCxkb2MuY2xpZW50LnN1Yl9hY2NvdW50XSwgZG9jLmFjdHVhbF9hbW91bnRcbiAgICAgICAgICAgICcnJ1xuICAgICAgICB2YWxpZGF0ZV9kb2NfdXBkYXRlOiAnJydcbiAgICAgICAgICAtPiByZXF1aXJlKCd2aWV3cy9saWIvY2RyJykudmFsaWRhdGVfdXNlcl9kb2MuYXBwbHkgdGhpcywgYXJndW1lbnRzXG4gICAgICAgICcnJ1xuXG4gICAgICB0cmFjZTpcbiAgICAgICAgX2lkOiBcIl9kZXNpZ24vI3twa2cubmFtZX1cIlxuICAgICAgICB2ZXJzaW9uOiBwa2cudmVyc2lvblxuICAgICAgICBsYW5ndWFnZTogJ2NvZmZlZXNjcmlwdCdcbiAgICAgICAgdmlld3M6XG4gICAgICAgICAgbGliOlxuICAgICAgICAgICAgdHJhY2U6IGxpYi50cmFjZVxuICAgICAgICB2YWxpZGF0ZV9kb2NfdXBkYXRlOiAnJydcbiAgICAgICAgICAtPiByZXF1aXJlKCd2aWV3cy9saWIvdHJhY2UnKS52YWxpZGF0ZV91c2VyX2RvYy5hcHBseSB0aGlzLCBhcmd1bWVudHNcbiAgICAgICAgJycnXG5cbiAgICBoYW5kbGVyID0gKHR5cGUpIC0+XG4gICAgICBzZWVtIC0+XG4gICAgICAgIHJvbGUgPSBcIiN7dHlwZX1zX2FkbWluXCJcbiAgICAgICAgc2VydmVycyA9IEBjZmdbXCIje3R5cGV9X3NlcnZlcnNcIl1cblxuICAgICAgICBzZWN1cml0eSA9XG4gICAgICAgICAgYWRtaW5zOlxuICAgICAgICAgICAgbmFtZXM6IFtdXG4gICAgICAgICAgICByb2xlczogW3JvbGVdXG4gICAgICAgICAgbWVtYmVyczpcbiAgICAgICAgICAgIG5hbWVzOiBbXVxuICAgICAgICAgICAgcm9sZXM6IFtyb2xlLFwiI3t0eXBlfXNfcmVhZGVyXCIsXCIje3R5cGV9c193cml0ZXJcIl1cblxuICAgICAgICBpc19hZG1pbiA9ICdfYWRtaW4nIGluIEBzZXNzaW9uLmNvdWNoZGJfcm9sZXNcbiAgICAgICAgaXNfcm9sZV9hZG1pbiA9IGlzX2FkbWluIG9yIHJvbGUgaW4gQHNlc3Npb24uY291Y2hkYl9yb2xlc1xuXG4gICAgICAgIHVubGVzcyBAc2Vzc2lvbi5jb3VjaGRiX3JvbGVzPyBhbmQgaXNfcm9sZV9hZG1pblxuICAgICAgICAgIEByZXMuc3RhdHVzIDQwM1xuICAgICAgICAgIEBqc29uIGVycm9yOlwiTXVzdCBiZSAje3JvbGV9XCJcbiAgICAgICAgICBAcmVzLmVuZCgpXG4gICAgICAgICAgcmV0dXJuXG5cbiAgICAgICAgZGJfbmFtZSA9IEByZXEucGF0aC5zdWJzdHIgMVxuICAgICAgICBkYl9uYW1lID0gZGJfbmFtZS5yZXBsYWNlIC9cXC8kLywgJydcblxuICAgICAgICBkZWJ1ZyBcImNyZWF0ZV8je3R5cGV9X2RhdGFiYXNlXCIsIHtkYl9uYW1lfVxuXG5XZSB3aWxsIHJlcGxpY2F0ZSB0by9mcm9tIHRoZSBmaXJzdCBzZXJ2ZXIgaW4gdGhlIGxpc3QgKHBhcnRpYWxseSBiZWNhdXNlIGl0J3MgdGhlIGZpcnN0IG9uZSB3aGVyZSB0aGUgZGF0YWJhc2Ugd2lsbCBiZSBjcmVhdGVkKS5cblxuICAgICAgICBjZW50cmFsID0gbnVsbFxuICAgICAgICBjZW50cmFsID0gc2VydmVyc1swXSBpZiBzZXJ2ZXJzLmxlbmd0aCA+IDFcblxuICAgICAgICBmb3Igc2VydmVyIGluIHNlcnZlcnNcblxuICAgICAgICAgIGRiX3VyaSA9IFtzZXJ2ZXIsZGJfbmFtZV0uam9pbiAnLydcblxuQ3JlYXRlIGRhdGFiYXNlXG5cbiAgICAgICAgICBkYiA9IG5ldyBQb3VjaERCIGRiX3VyaVxuICAgICAgICAgIHlpZWxkIGRiLmluZm8oKVxuXG4gICAgICAgICAgdXBkYXRlID0gc2VlbSAoZG9jKSAtPlxuICAgICAgICAgICAge19yZXZ9ID0geWllbGQgZGJcbiAgICAgICAgICAgICAgLmdldCBkb2MuX2lkXG4gICAgICAgICAgICAgIC5jYXRjaCAtPiBfcmV2OiBudWxsXG4gICAgICAgICAgICBkZWxldGUgZG9jLl9yZXZcbiAgICAgICAgICAgIGRvYy5fcmV2ID0gX3JldiBpZiBfcmV2P1xuICAgICAgICAgICAgeWllbGQgZGIucHV0IGRvY1xuXG5JbmplY3Qgc2VjdXJpdHkgZG9jdW1lbnRcblxuICAgICAgICAgIHlpZWxkIHJlcXVlc3RcbiAgICAgICAgICAgIC5wdXQgXCIje2RiX3VyaX0vX3NlY3VyaXR5XCJcbiAgICAgICAgICAgIC5zZW5kIHNlY3VyaXR5XG5cbkluamVjdCBkZXNpZ24gZG9jdW1lbnRcblxuICAgICAgICAgIHlpZWxkIHVwZGF0ZSBkZXNpZ25fZG9jdW1lbnRbdHlwZV1cblxuSW5qZWN0IHJlamVjdC10b21ic3RvbmVzIGRvY3VtZW50XG5cbiAgICAgICAgICB5aWVsZCB1cGRhdGUgcmVqZWN0X3RvbWJzdG9uZXNcblxuU2V0dXAgbWFzdGVyLW1hc3RlciByZXBsaWNhdGlvblxuKGJldHdlZW4gdGhlIGZpcnN0IHNlcnZlciBpbiB0aGUgbGlzdCBhbmQgdGhlIGN1cnJlbnQgc2VydmVyKS5cblxuICAgICAgICAgIGlmIGNlbnRyYWwgYW5kIHNlcnZlciBpc250IGNlbnRyYWxcblxuICAgICAgICAgICAgeWllbGQgUmVwbGljYXRvciBjZW50cmFsLCBzZXJ2ZXIsIGRiX25hbWUsIChkb2MpIC0+XG4gICAgICAgICAgICAgIGRvYy5vd25lciA9IFwiYWRtaW5cIlxuICAgICAgICAgICAgICBkb2MudXNlcl9jdHggPVxuICAgICAgICAgICAgICAgIG5hbWU6IFwiYWRtaW5cIlxuICAgICAgICAgICAgICAgIHJvbGVzOiBbXG4gICAgICAgICAgICAgICAgICBcIl9hZG1pblwiXG4gICAgICAgICAgICAgICAgICByb2xlXG4gICAgICAgICAgICAgICAgICBcIiN7dHlwZX1zX3dyaXRlclwiXG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICByZXR1cm5cblxuICAgICAgICAgICAgeWllbGQgUmVwbGljYXRvciBzZXJ2ZXIsIGNlbnRyYWwsIGRiX25hbWUsIChkb2MpIC0+XG4gICAgICAgICAgICAgIGRvYy5vd25lciA9IFwiYWRtaW5cIlxuICAgICAgICAgICAgICBkb2MudXNlcl9jdHggPVxuICAgICAgICAgICAgICAgIG5hbWU6IFwiYWRtaW5cIlxuICAgICAgICAgICAgICAgIHJvbGVzOiBbXG4gICAgICAgICAgICAgICAgICBcIl9hZG1pblwiXG4gICAgICAgICAgICAgICAgICByb2xlXG4gICAgICAgICAgICAgICAgICBcIiN7dHlwZX1zX3dyaXRlclwiXG4gICAgICAgICAgICAgICAgXVxuXG4gICAgICAgIEBqc29uIG9rOnRydWVcblxuICAgIEBpbmNsdWRlID0gLT5cblxuVGhlc2UgYXJlIG1hcHBlZCBmcm9tIGEgcnVsZXNldCBJRCB0byBhIGRhdGFiYXNlIG5hbWUgaW4gdGhlIGBydWxlc2V0OmAgcmVjb3JkcyBpbiB0aGUgcHJvdmlzaW9uaW5nIGRhdGFiYXNlLlxuVGhlIGBydWxlc2V0X2AgcHJlZml4IGlzIHN0YW5kYXJkIGJ1dCBub3QgaGFyZC1jb2RlZC5cblxuICAgICAgQHB1dCAgL15cXC9ydWxlc2V0X1thLXpcXGRfLV0rXFwvPyQvLCBAYXV0aCwgaGFuZGxlciAncnVsZXNldCdcblxuVGhlc2UgYXJlIGluIHRoZSBgdGFibGVgIGZpZWxkcyBpbiB0aGUgYHJhdGluZ2Agb2JqZWN0cyBhbmQgYXJlIHVzZWQgYnkgZS5nLiBlbnRlcnRhaW5pbmctY3JpYi5cblRoZSBgcmF0ZXMtYCBwcmVmaXggaXMgc3RhbmRhcmQgYnV0IG5vdCBkZWZpbmVkIHNwZWNpZmljYWxseSBhbnl3aGVyZS5cblxuICAgICAgQHB1dCAgL15cXC9yYXRlcy1bYS16XFxkXy1dK1xcLz8kLywgQGF1dGgsIGhhbmRsZXIgJ3JhdGUnXG5cblRoZSBkZWZhdWx0IHByZWZpeGVzIGZvciB0aGVzZSBhcmUgZGVmaW5lZCBpbiBgYXN0b25pc2hpbmctY29tcGV0aXRpb25gIGFuZCBgaHVnZS1wbGF5YC5cblxuICAgICAgQHB1dCAgL15cXC9jZHItW2EtelxcZF8tXStcXC8/JC8sIEBhdXRoLCBoYW5kbGVyICdjZHInXG4gICAgICBAcHV0ICAvXlxcL3RyYWNlLVthLXpcXGRfLV0rXFwvPyQvLCBAYXV0aCwgaGFuZGxlciAndHJhY2UnXG4iXX0=
//# sourceURL=/srv/home/stephane/Artisan/Managed/Telecoms/grumpy-actor/server.coffee.md