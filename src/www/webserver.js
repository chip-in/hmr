import AbstractModule from '../abstract-module';
var http = require('http'),
  globalOpts = require('./global');

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

class AbstractWebServer extends AbstractModule {

  constructor(hmr, port, address) {
    super(hmr);
    if (!port) {
      throw new Error("port not specified")
    }
    this.port = port
    this.address = address || "0.0.0.0"
  }

  _startModule() {
    return Promise.resolve()
      .then(() => this._startServer())
  }

  createApplication(){
    throw new Error("Do not call abstract method createApplication")
  }
  
  _startServer() {
    return Promise.resolve()
      .then(()=>{
        return new Promise((resolve, reject)=>{
          var app = this.createApplication();

          var port = normalizePort(this.port);
          this.logger.info("listen port %s", port);
          app.set('port', port);
          var server = http.createServer(app);
          server.listen(port, this.address);
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
class WebServer extends AbstractWebServer {
  constructor(hmr) {
    super(hmr, process.env.PORT || '3000')
  }
  createApplication() {
    return globalOpts()
  }
}

class ManagementWebServer extends AbstractWebServer {
  constructor(hmr) {
    super(hmr, process.env.MANAGE_PORT || '9000', '127.0.0.1')
  }
  createApplication() {
    var ret = globalOpts()
    ret.use("/api/:service/:property", (req, res)=>{
      const {service, property} = req.params
      const services = this.hmr.getServices()
      const instance = services.getService(service)
      if (!instance) {
        res.status(400).send({"message": `Unknown service ${service}`})
        return
      }
      try {
        instance.getProperty(property)
        .then((ret) => {
          var body = {}
          body[property] = ret
          res.status(200).send(body)
        })
        .catch((e) => {
          this.logger.error("Error detected at management webserver ", e);
          res.status(500).send({"message": "ServerError"})
        })
      } catch(e) {
        this.logger.error("Error detected at management webserver ", e);
        res.status(500).send({"message": "ServerError"})
      }
    });
    return ret
  }
}

export {WebServer, ManagementWebServer}
