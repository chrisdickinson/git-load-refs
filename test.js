var ls = require('ls-stream')
  , refs = require('./index')

ls('.git')
  .pipe(refs('.git'))
  .on('data', function(entry) {
    console.log(entry)
  })
