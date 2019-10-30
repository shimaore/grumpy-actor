    (require 'chai').should()

    describe 'The modules', ->
      for name in 'cdr rate reference ruleset server trace'.split ' '
        it "should load #{name}", -> require "../#{name}"

    describe 'With CouchDB', ->
      zappa = require 'core-zappa'
      user = process.env.COUCHDB_USER ? 'admin'
      pass = process.env.COUCHDB_PASSWORD ? 'password'
      cfg =
        provisioning_servers: [ "http://#{user}:#{pass}@couchdb:5984/" ]
        provisioning_members_roles: ['host']
        cdr_servers: [ "http://#{user}:#{pass}@couchdb:5984/" ]
      app = zappa.app ->
        @helper {cfg}
        @auth = (req,res,next) ->
          req.session = couchdb_roles: ['provisioning_admin','cdrs_admin']
          next()
        @include require '../server'
        return

      before ->
        app.server.listen 3030

      after ->
        app.server.close()

      it 'should create provisioning', ->
        request = require 'superagent'
        {body} = await request.put 'http://127.0.0.1:3030/provisioning'
        body.should.have.property 'ok', true
        {body} = await request.get cfg.provisioning_servers[0]+'/provisioning/_security'
        body.should.have.property 'members'
        body.members.should.have.property 'roles'
        body.members.roles.should.include 'host'
        body.members.roles.should.include 'provisioning_reader'
        body.members.roles.should.include 'provisioning_writer'
        return

      it 'should create cdr-2019-12', ->
        request = require 'superagent'
        {body} = await request.put 'http://127.0.0.1:3030/cdr-2019-12'
        body.should.have.property 'ok', true
        {body} = await request.get cfg.provisioning_servers[0]+'/cdr-2019-12/_security'
        body.should.have.property 'members'
        body.members.should.have.property 'roles'
        body.members.roles.should.not.include 'host'
        body.members.roles.should.include 'cdrs_reader'
        body.members.roles.should.include 'cdrs_writer'
        return
