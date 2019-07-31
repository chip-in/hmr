
export default class RegistryEntry {

  constructor(serviceName, instanceId, condition, inprocess, nodeId, option) {
    this.serviceName = serviceName;
    this.instanceId = instanceId;
    this.condition = condition;
    this.inprocess = inprocess;
    this.nodeId = nodeId;
    this.option = option || {};
  }

  getServiceName() {
    return this.serviceName;
  }

  getInstanceId() {
    return this.instanceId;
  }

  getNodeId() {
    return this.nodeId;
  }

  getCondition() {
    return this.condition;
  }

  isInprocess() {
    return this.inprocess;
  }

  getOption() {
    return this.option;
  }
}