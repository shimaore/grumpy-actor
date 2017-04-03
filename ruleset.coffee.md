Design document functions for `ruleset` databases
===============================================

    windy_moon = require 'windy-moon'

    module.exports.validate_user_doc = windy_moon.main ->

      if @is_admin()
        return
