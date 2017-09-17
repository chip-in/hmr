import Logger  from '../util/logger';
import uuidv4 from 'uuid/v4'

export default class AbstractService {

  constructor(hmr) {
    this.started = false;
    this.logger = new Logger(this.getServiceName());
    this.hmr = hmr;
    this.resolver = null;
    this.router = null;
    this.operations = {};
    this.instanceId = uuidv4();
  }

  start() {
    if (this.isStarted()) {
      return Promise.resolve();
    }
    this._setupOperations();
    return Promise.resolve()
      .then(()=>this.logger.info("Starting service:%s", this.getServiceName()))
      .then(()=>this._startService())
      .then(()=>this.started = true)
      .then(()=>this.logger.info("Started service:%s", this.getServiceName()))
  }

  /**
   * @abstract
   */
  _startService() {
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
    .then(()=>this.logger.info("Stopping module:%s", this.getServiceName()))
    .then(()=>this._stopService())
    .then(()=>this.started = false)
    .then(()=>this.logger.info("Stopped module:%s", this.getServiceName()))
  }

  /**
   * @abstract
   */
  _stopService() {
    return Promise.resolve();
  }

  getServiceName() {
    return this.constructor.name;
  }

  onReceiveCIMessage(msg) {
    return Promise.resolve()
      .then(()=>this._filterCIMessage(msg))
      .then((msg)=>{
        if (!msg) {
          return Promise.resolve();
        }
        return Promise.resolve()
          .then(()=> this.operations[msg.t](msg));
      });
  }

  _filterCIMessage(msg) {
    var ret = msg;
    var serviceName = this.getServiceName();
    if (msg.s != null && msg.s !== serviceName) {
      ret = null;
    }
    if (this.operations[msg.t] == null) {
      ret = null;
    }
    return Promise.resolve(ret);
  }

  _setupOperations() {

  }

  setRouter(router) {
    this.router = router;
  }
  
  setServiceRegistry(registry) {
    this.registry = registry;
  }
  
  _replySuccessResponse(req) {
    return this._replyResponse(req, 0);
  }

  _replyResponse(req, rc, values) {
    return Promise.resolve()
      .then(()=>{
        var ret = Object.assign({}, req, {
          t : req.t + "Response",
          m : {
            rc : rc
          }
        });
        if (values) {
          for (var k in values) {
            ret.m[k] = values[k];
          }
        }
        return ret;
      })
      .then((msg)=>this.router.answer(msg))
  }
}