# git-load-refs

a stream to transform [entries from ls-stream](http://npm.im/ls-stream) into
objects representing references.

```javascript
var ls = require('ls-stream')
  , refs = require('git-load-refs')

ls('.git')
  .pipe(refs('.git'))
  .on('data', function(entry) {
    console.log(entry)
  })

```

## API (basically just data events)

```javascript
{ 'symbolic': true | false
, 'ref': null | 'refname'
, 'hash': null | 'git hash'
, 'type': 'ref' | 'root-ref'
, 'name': 'ref name' }  
```

## License

MIT
