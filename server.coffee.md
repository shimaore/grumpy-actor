    pkg = require './package.json'
    debug = (require 'debug') "#{pkg.name}:server"
    seem = require 'seem'

    fs = require 'fs'
    path = require 'path'

    reject_tombstones = require 'reject-tombstones'

    modules = [
      'ruleset'
      'rate'
      'cdr'
      'trace'
      'reference'
    ]
    lib = {}
    for m in modules
      lib[m] = fs.readFileSync (path.join __dirname, "./#{m}.bundle.js"), 'utf-8'

    Replicator = require 'frantic-team'
    PouchDB = require 'shimaore-pouchdb'
    request = require 'superagent'
    assert = require 'assert'

    assert lib.ruleset?, 'No lib.ruleset'
    assert lib.rate?, 'No lib.rate'
    assert lib.cdr?, 'No lib.cdr'
    assert lib.trace?, 'No lib.trace'
    assert lib.reference?, 'No lib.reference'

    design_document =
      ruleset:
        _id: "_design/#{pkg.name}"
        version: pkg.version
        language: 'coffeescript'
        views:
          lib:
            ruleset: lib.ruleset
        validate_doc_update: '''
          -> require('views/lib/ruleset').validate_user_doc.apply this, arguments
        '''

      rate:
        _id: "_design/#{pkg.name}"
        version: pkg.version
        language: 'coffeescript'
        views:
          lib:
            rate: lib.rate
        validate_doc_update: '''
          -> require('views/lib/rate').validate_user_doc.apply this, arguments
        '''

      cdr:
        _id: "_design/#{pkg.name}"
        version: pkg.version
        language: 'coffeescript'
        views:
          lib:
            cdr: lib.cdr
          summarize:
            reduce: '_stats'
            map: '''
              (doc) ->
                emit [doc.client.account,doc.client.sub_account], doc.actual_amount
            '''
        validate_doc_update: '''
          -> require('views/lib/cdr').validate_user_doc.apply this, arguments
        '''

      trace:
        _id: "_design/#{pkg.name}"
        version: pkg.version
        language: 'coffeescript'
        views:
          lib:
            trace: lib.trace
        validate_doc_update: '''
          -> require('views/lib/trace').validate_user_doc.apply this, arguments
        '''

      reference:
        _id: "_design/#{pkg.name}"
        version: pkg.version
        language: 'coffeescript'
        views:
          lib:
            reference: lib.reference
          tags:
            reduce: '_stats'
            map: '''
              -> require('views/lib/reference').tags.apply this, arguments
            '''
        validate_doc_update: '''
          -> require('views/lib/reference').validate_user_doc.apply this, arguments
        '''

    handler = (type) ->
      seem ->
        role = "#{type}s_admin"
        servers = @cfg["#{type}_servers"]

        security =
          admins:
            names: []
            roles: [role]
          members:
            names: []
            roles: [role,"#{type}s_reader","#{type}s_writer"]

        is_admin = '_admin' in @session.couchdb_roles
        is_role_admin = is_admin or role in @session.couchdb_roles

        unless @session.couchdb_roles? and is_role_admin
          @res.status 403
          @json error:"Must be #{role}"
          @res.end()
          return

        db_name = @req.path.substr 1
        db_name = db_name.replace /\/$/, ''

        debug "create_#{type}_database", {db_name}

We will replicate to/from the first server in the list (partially because it's the first one where the database will be created).

        central = null
        central = servers[0] if servers.length > 1

        for server in servers

          db_uri = [server,db_name].join '/'

Create database

          db = new PouchDB db_uri
          yield db.info()

          update = seem (doc) ->
            {_rev} = yield db
              .get doc._id
              .catch -> _rev: null
            delete doc._rev
            doc._rev = _rev if _rev?
            yield db.put doc

Inject security document

          yield request
            .put "#{db_uri}/_security"
            .send security

Inject design document

          yield update design_document[type]

Inject reject-tombstones document

          yield update reject_tombstones

Setup master-master replication
(between the first server in the list and the current server).

          if central and server isnt central

            yield Replicator central, server, db_name, (doc) ->
              doc.owner = "admin"
              doc.user_ctx =
                name: "admin"
                roles: [
                  "_admin"
                  role
                  "#{type}s_writer"
                ]
              return

            yield Replicator server, central, db_name, (doc) ->
              doc.owner = "admin"
              doc.user_ctx =
                name: "admin"
                roles: [
                  "_admin"
                  role
                  "#{type}s_writer"
                ]

        @json ok:true

    @include = ->

These are mapped from a ruleset ID to a database name in the `ruleset:` records in the provisioning database.
The `ruleset_` prefix is standard but not hard-coded.

      @put  /^\/ruleset_[a-z\d_-]+\/?$/, @auth, handler 'ruleset'

These are in the `table` fields in the `rating` objects and are used by e.g. entertaining-crib.
The `rates-` prefix is standard but not defined specifically anywhere.

      @put  /^\/rates-[a-z\d_-]+\/?$/, @auth, handler 'rate'

The default prefixes for these are defined in `astonishing-competition` and `huge-play`.

      @put  /^\/cdr-[a-z\d_-]+\/?$/, @auth, handler 'cdr'
      @put  /^\/trace-[a-z\d_-]+\/?$/, @auth, handler 'trace'
      @put  /^\/reference-[a-z\d_-]+\/?$/, @auth, handler 'reference'
