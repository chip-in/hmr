import AbstractModule from '../abstract-module';

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

export default class WebServer extends AbstractModule {

  constructor(hmr) {
    super(hmr);
  }

  _startModule() {
    return Promise.resolve()
      .then(() => this._startServer())
  }

  _startServer() {
    return Promise.resolve()
      .then(()=>{
        return new Promise((resolve, reject)=>{
          var app = require('./global');
          var http = require('http');

          var port = normalizePort(process.env.PORT || '3000');
          this.logger.info("listen port %s", port);
          app.set('port', port);
          var server = http.createServer(app);
          server.listen(port);
          server.on('error', (error) => {
            if (error.syscall !== 'listen') {
              this.logger.error("Error detected at webserver ", error);
              reject(error);
              return;
            }

            var bind = typeof port === 'string'
              ? 'Pipe ' + port
              : 'Port ' + port;

            // handle specific listen errors with friendly messages
            switch (error.code) {
              case 'EACCES':
              this.logger.error(bind + ' requires elevated privileges');
                reject(error);
                return;
              case 'EADDRINUSE':
                this.logger.error(bind + ' is already in use');
                reject(error);
                return;
              default:
                this.logger.error("Error detected at webserver ", error);
                reject(error);
                return;
            }
          });
          server.on('listening', () => {
            var addr = server.address();
            var bind = typeof addr === 'string'
              ? 'pipe ' + addr
              : 'port ' + addr.port;
            this.logger.info('Listening on ' + bind);
            this.app = app;
            this.server = server;
            resolve();
          });
        })
      });
  }

  _stopModule() {
    return Promise.resolve()
      .then(()=> this._stopServer())
  }

  _stopServer() {
    return Promise.resolve()
      .then(()=>{
        if (this.server != null) {
          this.server.close();
          this.server = null;
        }
        if (this.app != null) {
          this.app = null;
        }
      });
  }

  getApplication() {
    return this.app;
  }

  getServer() {
    return this.server;
  }

  setErrorHandler() {
    var app = this.app;
    // catch 404 and forward to error handler
    app.use(function (req, res, next) {
      var err = new Error('Not Found');
      err.status = 404;
      next(err);
    });

    // error handler
    app.use((err, req, res, next) => {
      this.logger.error(`Error occured. res.headersSent=${res.headersSent}. req.timedout='${req.timedout}' req='${req.method.toUpperCase()} ${req.url}'`, err);

      if(!res.headersSent) {
        res.status(502).send({})
      }
    })
  }
}