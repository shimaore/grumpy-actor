Design document functions for `reference` databases
===============================================

    windy_moon = require 'windy-moon'

    module.exports.validate_user_doc = windy_moon.main ->

      if @is_admin()
        return

      @forbid_deletion()

    module.exports.tags = (doc) ->

We're only interested in newer format (huge-play@27.0) documents.

      unless doc.type? and doc.timestamp?
        return
      {type,timestamp} = doc

Build
-----

Lookup a reference based on tags, fields, etc.

      tags = {}

Ensure a document is only included once for a given key.

      add_tag = (tag) ->
        tags[tag] = true

      add_tag "reference:#{doc.reference}"          if doc.reference?
      add_tag "number_domain:#{doc.number_domain}"  if doc.number_domain?
      add_tag "agent:#{doc.agent}"                  if doc.agent?
      add_tag doc.tag                               if doc.tag?

      doc.tags?.forEach add_tag
      doc.in?.forEach add_tag

Emit
----

      emit_tag = (tag) ->
        if tag.match /:/
          id = tag.split ':'
          emit [id...,timestamp], {type}
        else
          emit ['tag',tag,timestamp], {type}

      Object.getOwnPropertyNames(tags).forEach emit_tag
