var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var helmet = require('helmet');
var timeout = require('connect-timeout'); 

module.exports = () => {
  var app = express();

  var limit = process.env.CNODE_HTTP_MAX_BODY_SIZE || '30mb';
  var timeoutSecond = process.env.CNODE_HTTP_TIMEOUT || '600';
  var helmetOptsStr = process.env.CNODE_HMR_HELMET_OPTS || null;

  function haltOnTimedout (req, res, next) {
    if (!req.timedout) next()
  }

  app.use(timeout(String(Number(timeoutSecond) * 1000)))
  app.use(logger('combined'));
  // app.use(bodyParser.json({limit}));
  app.use(bodyParser.urlencoded({ extended: false, limit }));
  app.use(haltOnTimedout)
  app.use(bodyParser.raw({
    "type" : [
      "application/json",
      "application/octet-stream",
      "text/xml",
      "text/xml; Charset=utf-8",
      "multipart/form-data"
    ],
    limit}));
  app.use(haltOnTimedout)
  app.use(cookieParser());
  app.use(haltOnTimedout)
  var helmetOpts = {hsts:false,contentSecurityPolicy:false}
  if (helmetOptsStr) {
    try {
      helmetOpts = JSON.parse(helmetOptsStr)
    } catch (e) {
      console.error("Failed to parse helmet option", e)
      //CONTINUE
    }
  }
  app.use(helmet(helmetOpts));
  app.use(haltOnTimedout)
  return app
}
