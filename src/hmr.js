'use strict'
import uuidv4 from 'uuid/v4';
import Logger from './util/logger';
import WebServer from './www/webserver';
import Services from './service/services';

export default class HMR {
  constructor(app) {
    this.rNodeMap = {};
    this.logger = new Logger("HMR");
    this.app = app;
    this.nodeId = uuidv4();
  }

  registerRNode(opts) {
    this.logger.info("register resource node:%s", JSON.stringify(opts));
    var uuid = uuidv4();
    return Promise.resolve()
      .then(()=>{
        this.rNodeMap[uuid] = true;
        return {
          key : uuid
        }
      })
  }

  unregisterRNode(opts) {
    this.logger.info("unregister resource node", JSON.stringify(opts));
    var key = opts.key;
    return Promise.resolve()
      .then(()=>{
        if (this.rNodeMap[key]) {
          delete this.rNodeMap;
        }
        return {}
      })
  }

  start() {
    return Promise.resolve()
      .then(()=> this._startWebServer())
      .then(()=> this._startServices())
      .then(()=> this.webServer.setErrorHandler())
      .catch((e)=>{
        this.logger.error("Failed to start HMR", e);
      });
  }

  stop() {
    return Promise.resolve()
    .then(()=> this._stopServices())
    .then(()=> this._stopWebServer())
    .catch((e)=>{
      this.logger.error("Failed to stop HMR", e);
    });
  }

  _startWebServer() {
    if (!this.webServer) {
      this.webServer = new WebServer(this);
    }
    return this._startModule(this.webServer);
  }

  _startServices() {
    if (!this.services) {
      this.services = new Services(this);
    }
    return this._startModule(this.services);
  }

  _startModule(module) {
    if (module.isStarted()) {
      return Promise.resolve();
    }
    return module.start();
  }

  _stopWebServer() {
    return this._stopModule(this.webServer);
  }

  _stopServices() {
    return this._stopModule(this.services);
  }

  _stopModule(module) {
    if (!module || !module.isStarted()) {
      return Promise.resolve();
    }
    return module.stop();
  }

  getServices() {
    return this.services;
  }

  getWebServer() {
    return this.webServer;
  }

  getNodeId() {
    return this.nodeId;
  }
}