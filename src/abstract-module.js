import Logger  from './util/logger';

export default class AbstractModule {

  constructor(hmr) {
    this.started = false;
    this.hmr = hmr;
    this.logger = new Logger(this._getModuleName());
  }

  start() {
    if (this.isStarted()) {
      return Promise.resolve();
    }
    return Promise.resolve()
      .then(()=>this.logger.info("Starting module:%s", this._getModuleName()))
      .then(()=>this._startModule())
      .then(()=>this.started = true)
      .then(()=>this.logger.info("Started module:%s", this._getModuleName()))
  }

  _startModule() {
    return Promise.resolve();
  }

  isStarted() {
    return this.started;
  }

  stop() {
    if (!this.isStarted()) {
      return Promise.resolve();
    }
    return Promise.resolve()
    .then(()=>this.logger.info("Stopping module:%s", this._getModuleName()))
    .then(()=>this._stopModule())
    .then(()=>this.started = false)
    .then(()=>this.logger.info("Stopped module:%s", this._getModuleName()))
  }

  _stopModule() {
    return Promise.resolve();
  }

  _getModuleName() {
    return this.constructor.name;
  }
}