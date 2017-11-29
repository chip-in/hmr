var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var helmet = require('helmet');

var app = express();

var limit = '30mb';
app.use(logger('combined'));
app.use(bodyParser.json({limit}));
app.use(bodyParser.urlencoded({ extended: false, limit }));
app.use(bodyParser.raw({
  "type" : [
    "application/octet-stream",
    "text/xml",
    "text/xml; Charset=utf-8"
  ],
  limit}));
app.use(cookieParser());
app.use(helmet());

module.exports = app;
