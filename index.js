module.exports = discover_loose

var packedrefs = require('git-packed-ref-parse')
  , Buffer = require('buffer').Buffer
  , through = require('through')
  , base_fs = require('./fs')
  , path = require('path')

function discover_loose(basepath, fs) {
  fs = fs || base_fs

  var stream = through(write, end)
    , ended = false
    , inflight = 0
    , refs = []

  return stream

  function write(entry) {
    if(!entry.stat.isFile()) {
      return
    }

    var relpath = entry.path.replace(basepath+'/', '')
      , basename = path.basename(relpath)
      , bits

    ++inflight
    if(basename === 'packed-refs') {
      return do_packed_refs(entry.path)
    }

    if(relpath === 'HEAD' || relpath === 'ORIG_HEAD' || relpath === 'FETCH_HEAD') {
      return read_ref(entry.path, 'root-ref', basename)
    }

    if(relpath.indexOf('refs/') === 0) {
      return read_ref(entry.path, 'ref', relpath)
    }
    --inflight
  }

  function end() {
    ended = true
    if(!inflight) {
      stream.queue(null)
    }
  }

  function maybe_end() {
    --inflight
    if(ended && !inflight) {
      stream.queue(null)
    }
  }

  function do_packed_refs(relpath) {
    fs.createReadStream(relpath)
      .pipe(packedrefs())
      .pipe(through(transform_packed_ref))
      .on('data', format_type(stream, 'packed-ref'))
      .on('error', maybe_end) 
      .on('end', maybe_end) 
  }

  function read_ref(relpath, type, name) {
    fs.createReadStream(relpath)
      .pipe(accum())
      .pipe(through(transform_plain_ref))
      .on('data', format_type(stream, type, name))
      .on('error', maybe_end) 
      .on('end', maybe_end) 
  }
}

function transform_packed_ref(packed_entry) {
  return this.queue({
    symbolic: false
  , ref: null
  , hash: packed_entry.commit || packed_entry.hash
  , type: null
  , name: packed_entry.name
  })
}

function transform_plain_ref(buf) {
  // "ref:" as a big endian integer
  if(buf.readUInt32BE(0) === 0x7265663a) {
    return this.queue({
      symbolic: true
    , ref: buf.slice(5).toString('utf8').replace(/\n$/, '')
    , hash: null
    , type: null
    , name: null
    })  
  }

  this.queue({
    symbolic: false
  , ref: null
  , hash: buf.toString('utf8').slice(0, 40)
  , type: null
  , name: null
  })
}

function format_type(stream, typename, optional_name) {
  return function receive_data(buf) {
    buf.type = typename
    if(!buf.name) {
      buf.name = optional_name
    }
    stream.queue(buf)
  }
}

function accum() {
  var stream = through(write, end)
    , acc = []
    , size = 0

  return stream

  function write(buf) {
    acc.push(buf)
    size += buf.length
  }

  function end() {
    acc = Buffer.concat(acc, size)
    stream.queue(acc)
    stream.queue(null)
  }
}
