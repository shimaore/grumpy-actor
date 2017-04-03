Design document functions for `reference` databases
===============================================

    windy_moon = require 'windy-moon'

    module.exports.validate_user_doc = windy_moon.main ->

      if @is_admin()
        return

      @forbid_deletion()

    sum = (acc,val) -> acc + val

    module.exports.tags = (doc) ->
      return unless doc.tags? and doc.calls?

      if 'emergency' in doc.tags
        return
      unless 'client-side' in doc.tags
        return

      duration = doc.calls
        .map (call) ->
          billable = parseInt call.report?.billable
          if isNaN billable
            0
          else
            billable / 1000
        .reduce sum, 0

      keys = doc.tags
        .filter (tag) -> tag.match /:/

      answered = 'answered' in doc.tags
      ingress = 'ingress' in doc.tags
      egress = 'egress' in doc.tags

      tag = switch
        when ingress and answered
          'ingress-answered'
        when ingress
          'ingress-unanswered'
        when egress
          'egress'
        else
          'other' # should be empty

      start_time = doc.calls[0]?.tz_start_time ? doc.calls[0]?.start_time
      date = start_time[0...10]

      for key in keys
        id = key.split ':'
        full_id = id.concat [date,tag]
        emit full_id, duration
