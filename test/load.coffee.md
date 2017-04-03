    describe 'The modules', ->
      for name in 'cdr rate reference ruleset server trace'.split ' '
        it "should load #{name}", -> require "../#{name}"
