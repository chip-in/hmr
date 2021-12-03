import Logger from '../../../util/logger';
import parser from 'mongo-parse';
import RegistryEntry from './registry-entry';
import EventEmitter from 'events';

export default class ServiceRegistry {

  constructor(clusterService) {
    this.logger = new Logger("ServiceRegistry");
    // current version is memory-based-map
    this.entries = {};
    this.clusterService = clusterService;
    this.em = new EventEmitter();
  }

  register(serviceName, instanceId, condition, inprocess, nodeId, option) {
    return Promise.resolve()
    .then(()=>{
      var serviceDef = this.entries[serviceName] = this.entries[serviceName] || {
        serviceName : serviceName,
        instanceList : []
      };
      //check duplication
      var instanceList = serviceDef.instanceList;
      for (var i = 0; i < instanceList.length; i++) {
        var entry = instanceList[i];
        if (entry.getInstanceId() === instanceId) {
          this.logger.error("Instance already registered(ServiceName: %s, InstanceId: %s). ", serviceName, instanceId);
          return Promise.reject("Instance already registered");
        }
      }
      //push entry
      instanceList.push(new RegistryEntry(serviceName, instanceId, condition, inprocess, nodeId, option))
      this.emit("register", {
        serviceName, instanceId
      });
    })
  }

  unregister(serviceName, instanceId) {
    return Promise.resolve()
    .then(()=>{
      var serviceDef = this.entries[serviceName];
      if (!serviceDef) {
        return Promise.resolve();
      }
      var removed = false;
      var instanceList = serviceDef.instanceList;
      for (var i = instanceList.length - 1; i >= 0; i--) {
        var d = instanceList[i];
        if (d.getInstanceId() === instanceId) {
          instanceList.splice(i, 1);
          removed = true;
        }
      }
      if (removed) {
        this.emit("unregister", {
          serviceName, instanceId
        });
      }
    })
  }

  unregisterByNodeId(nodeId) {
    return Promise.resolve()
      .then(()=>{
        for (var serviceName in this.entries) {
          var serviceDef = this.entries[serviceName];
          if (!serviceDef) {
            continue;
          }
          var instanceList = serviceDef.instanceList;
          for (var i = instanceList.length - 1; i >= 0; i--) {
            var d = instanceList[i];
            if (d.getNodeId() === nodeId) {
              instanceList.splice(i, 1);
              this.emit("unregister", {
                serviceName : d.getServiceName(), 
                instanceId : d.getInstanceId()
              });
            }
          }
        }
      })
  }

  lookup(service, filter) {
    return Promise.resolve()
      .then(()=>{
        var serviceDef = this.entries[service];
        if (!serviceDef) {
          return Promise.resolve();
        }
        var candl = null;
        var instanceList = serviceDef.instanceList;
        for (var i = 0; i < instanceList.length; i++) {
          var entry = instanceList[i];
          if (this._isMatch(entry, filter)) {
            candl = entry;
            break;
          }
        }
        if (candl) {
          return Promise.resolve(candl);
        }
        this.logger.warn("service not found. ServiceName:%s, Filter:%s", service, JSON.stringify(filter));
        return Promise.resolve();
      })
  }

  _isMatch(entry, filter) {
    if (!filter || Object.keys(filter).length === 0) {
      //all accept
      return true;
    }
    var condition = entry.getCondition();
    if (!condition || Object.keys(condition).length === 0) {
      //not match
      return false;
    }
    var ret = parser.parse(filter).matches(condition, false);
    return ret;
  }

  clearAll() {
    this.entries = {};
  }

  on() {
    //delegate
    this.em.on.apply(this.em, Array.prototype.slice.call(arguments));
  }

  emit() {
    this.em.emit.apply(this.em, Array.prototype.slice.call(arguments));
  }

  dump() {
    return JSON.parse(JSON.stringify(this.entries))
  }
}