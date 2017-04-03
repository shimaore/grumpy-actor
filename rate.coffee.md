Design document functions for `rates` databases
===============================================

    windy_moon = require 'windy-moon'

    module.exports.validate_user_doc = windy_moon.main ->

      if @is_admin()
        return

      @forbid_deletion()
