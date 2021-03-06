    pkg = require './package.json'
    debug = (require 'debug') "#{pkg.name}:server"

    fs = require 'fs'
    path = require 'path'

    reject_tombstones = require 'reject-tombstones'

    modules = [
      'ruleset'
      'rate'
      'cdr'
      'trace'
    ]
    lib = {}
    for m in modules
      lib[m] = fs.readFileSync (path.join __dirname, "./#{m}.bundle.js"), 'utf-8'

    Replicator = require 'frantic-team'
    CouchDB = require 'most-couchdb/with-update'
    request = require 'superagent'
    assert = require 'assert'

    assert lib.ruleset?, 'No lib.ruleset'
    assert lib.rate?, 'No lib.rate'
    assert lib.cdr?, 'No lib.cdr'
    assert lib.trace?, 'No lib.trace'

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
                emit [doc.c,doc.A,doc.S], doc.a
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

    handler = (type,plural = true) ->
      ->
        if plural
          admin_role  = "#{type}s_admin"
          writer_role = "#{type}s_writer"
          reader_role = "#{type}s_reader"
        else
          admin_role  = "#{type}_admin"
          writer_role = "#{type}_writer"
          reader_role = "#{type}_reader"

        servers = @cfg["#{type}_servers"]
        unless servers?.length?
          @res.status 404
          @json error:"Not configured for #{type}_servers"
          @res.end()
          return

        extra_roles = @cfg["#{type}_members_roles"] ? []

        security =
          admins:
            names: []
            roles: [admin_role]
          members:
            names: []
            roles: [
              admin_role
              reader_role
              writer_role
              extra_roles...
            ]

        if @req.session?.couchdb_roles?
          is_admin = '_admin' in @req.session.couchdb_roles
          is_role_admin = is_admin or admin_role in @req.session.couchdb_roles

        unless is_role_admin
          @res.status 403
          @json error:"Must be #{admin_role}"
          @res.end()
          return

        db_name = @req.path.substr 1
        db_name = db_name.replace /\/$/, ''

        debug "create #{type} database", {db_name}

We will replicate to/from the first server in the list (partially because it's the first one where the database will be created).

        central = null
        central = servers[0] if servers.length > 1

        for server in servers

          db_uri = [server,db_name].join '/'

Create database

          db = new CouchDB db_uri
          await db.create() unless try await db.info()

Set revs-limit to 2

          await request
            .put "#{db_uri}/_revs_limit"
            .send '2'

Inject security document

          await request
            .put "#{db_uri}/_security"
            .send security

Inject design document

          await db.update design_document[type] if type of design_document

Inject reject-tombstones document

          await db.update reject_tombstones

Setup master-master replication
(between the first server in the list and the current server).

          if central and server isnt central

            await Replicator central, server, db_name, (doc) ->
              doc.owner = "admin"
              doc.user_ctx =
                name: "admin"
                roles: [
                  "_admin"
                  admin_role
                  writer_role
                ]
              return

            await Replicator server, central, db_name, (doc) ->
              doc.owner = "admin"
              doc.user_ctx =
                name: "admin"
                roles: [
                  "_admin"
                  admin_role
                  writer_role
                ]

        @json ok:true
        @res.end()
        return

    @include = ->

These are mapped from a ruleset ID to a database name in the `ruleset:` records in the provisioning database.
The `ruleset_` prefix is standard but not hard-coded.

      @put  /^\/ruleset_[a-z\d_-]+\/?$/, @auth, handler 'ruleset'

These are in the `table` fields in the `rating` objects and are used by e.g. entertaining-crib.
The `rates-` prefix is defined in `astonishing-competition`.

      @put  /^\/rates-[a-z\d_-]+\/?$/, @auth, handler 'rate'

The default prefixes for these are defined in `astonishing-competition` and `huge-play`.
(These are both currently unused; `astonishing-competition` still needs to be rewritten to properly aggregate upstream, while the trace code was never rewritten to use multiple databases.)

      @put  /^\/cdr-[a-z\d_-]+\/?$/, @auth, handler 'cdr'
      @put  /^\/trace-[a-z\d_-]+\/?$/, @auth, handler 'trace'

      @put  /^\/provisioning\/?$/, @auth, handler 'provisioning', false
      @put  /^\/logging\/?$/, @auth, handler 'logging', false
