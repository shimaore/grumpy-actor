Design document functions for `reference` databases
===============================================

    windy_moon = require 'windy-moon'

    module.exports.validate_user_doc = windy_moon.main ->

      if @is_admin()
        return

      @forbid_deletion()

Build
-----

    module.exports.tags = (doc) ->

We're only interested in newer format (huge-play@27.0) documents.

      unless doc.type? and doc.timestamp?
        return
      {type,timestamp} = doc

      reference = doc._id if doc.type is 'reference'
      reference ?= doc.reference
      return unless reference

This is multiple indices in one.
The first part allows to locate all documents that are linked to a given reference.

      emit reference

The second part allows to lookup references based on tags, values, etc.

      date = timestamp[0...10]

Ensure a document is only included once for a given key.

      tags = {}
      add_tag = (type,value) ->
        tags[type] ?= {}
        if value not of tags[type]
          tags[type][value] = true
          emit [type,value,date,reference]

      parse_add_tag = (tag) ->
        if tag.match /:/
          id = tag.split ':'
          add_tag id...
        else
          add_tag 'tag', tag

      add_tag 'reference', reference              if reference?
      add_tag 'number_domain', doc.number_domain  if doc.number_domain?
      add_tag 'agent', doc.agent                  if doc.agent?
      parse_add_tag doc.tag                       if doc.tag?

      doc.tags?.forEach parse_add_tag
      doc.in?.forEach parse_add_tag
      return
