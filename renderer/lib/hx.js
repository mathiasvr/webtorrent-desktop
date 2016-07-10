var h = require('virtual-dom/h')
var hyperx = require('hyperx')

// never append strings such as 'null' or 'undefined'
var opts = { 'concat': (a, b) => a + (b != null ? b : '') }
var hx = hyperx(h, opts)

module.exports = hx
