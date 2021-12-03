import AbstractService from '../abstract-service';
import io from 'socket.io';
import ServiceRegistry from './registry/service-registry';
import uuidv4 from 'uuid/v4'

export default class ClusterService extends AbstractService {

  constructor(hmr) {
    super(hmr);
    this.nodeMap = {};
    this.nodeMap[hmr.getNodeId()] = true;
    this.registry = new ServiceRegistry(this);
  }

  getServiceRegistry() {
    return this.registry;
  }

  _startService() {
    return Promise.resolve()
      .then(()=>this.nodeMap[this.hmr.getNodeId()] = true)
      .then(()=>this.logger.info("This node's ID is %s", this.hmr.getNodeId()))
      .then(()=>this.registry.register("ClusterService", 
        this.instanceId, 
        {},
        true,
        this.hmr.getNodeId(),
        {}))
      .then(()=>this.router.addRoute(this.instanceId, this))
  }

  _stopService() {
    return Promise.resolve()
      .then(()=> this.nodeMap = {})
      .then(()=> this.registry.clearAll());
  }

  _setupOperations() {
    this.operations = {
      "register" : (msg) => this._registerNode(msg),
      "unregister" : (msg) => this._unregisterNode(msg),
      "registerService" : (msg) => this._registerService(msg),
      "unregisterService" : (msg) => this._unregisterService(msg),
      "disconnect" : (msg) => this._unregisterNode(msg)
    }
  }

  _registerNode(msg) {
    var nodeId = msg.r && msg.r.src;
    if (this.nodeMap[nodeId]) {
      this.logger.warn("nodeId has already been registered:%s", nodeId);
      return this._replyResponse(msg, 400);
    }
    return Promise.resolve()
      .then(()=>{
        this.nodeMap[nodeId] = msg;
        this.logger.info("register node:%s", nodeId);
      })
      .then(()=>this._replySuccessResponse(msg))
  }

  _unregisterNode(msg) {
    var nodeId = msg.r && msg.r.src;
    if (!this.nodeMap[nodeId]) {
      this.logger.debug("nodeId has already been unregistered:%s", nodeId);
      return this._replySuccessResponse(msg);
    }
    return Promise.resolve()
      .then(()=>this.registry.unregisterByNodeId(nodeId))
      .then(()=>{
        delete this.nodeMap[nodeId];
        this.logger.info("unregister node:%s", nodeId);
      })
      .then(()=>this._replySuccessResponse(msg))
  }
  
  _registerService(msg) {
    var nodeId = msg.r.src;
    if (!this.nodeMap[nodeId]) {
      this.logger.warn("Unknown nodeId is specified(op=registerService, nodeId=%s, serviceName=%s).", nodeId, msg.m.serviceName);
      return this._replyResponse(msg, 400);
    }

    return this.registry.register(msg.m.serviceName,
      msg.m.instanceId, 
      msg.m.condition, 
      nodeId === this.hmr.getNodeId(), 
      nodeId,
      msg.m.option)
      .then(()=>this.logger.info("Succeeded to register service:%s(instanceId:%s) via %s", msg.m.serviceName, msg.m.instanceId, nodeId))
      .then(()=>this._replySuccessResponse(msg))
  }

  _unregisterService(msg) {
    var nodeId = msg.r.src;
    if (!this.nodeMap[nodeId]) {
      this.logger.warn("Unknown nodeId is specified(op=unregisterService). We ignore it");
      return this._replySuccessResponse(msg);
    }
    return this.registry.unregister(msg.m.serviceName,
      msg.m.instanceId)
      .then(()=>this.logger.info("Succeeded to unregister service:%s-%s via %s", msg.m.serviceName, msg.m.instanceId, nodeId))
      .then(()=>this._replySuccessResponse(msg))
  }

  async getProperty(name) {
    let result = null
    switch(name) {
      case "nodes":
        result = JSON.parse(JSON.stringify(Object.keys(this.nodeMap)))
        break
      case "services":
        result = this.registry.dump()
        break
    }
    return result
  }
}