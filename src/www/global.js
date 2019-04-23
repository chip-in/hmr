var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var helmet = require('helmet');
var compression = require('compression');
var compressible = require('compressible')

var app = express();

var limit = '30mb';
app.use(compression({
  filter : function(req, res) {
    var ret = false;
    var type = res.getHeader('Content-Type')
    if (typeof type === "string" && compressible(type)) {
      ret = true;
    } else if (Array.isArray(type) && typeof type[0] === "string" && compressible(type[0])) {
      ret = true;
    }
    return ret;
  }
}));
app.use(logger('combined'));
// app.use(bodyParser.json({limit}));
app.use(bodyParser.urlencoded({ extended: false, limit }));
app.use(bodyParser.raw({
  "type" : [
    "application/json",
    "application/octet-stream",
    "text/xml",
    "text/xml; Charset=utf-8"
  ],
  limit}));
app.use(cookieParser());
app.use(helmet());

module.exports = app;
