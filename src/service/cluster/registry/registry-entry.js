
export default class RegistryEntry {

  constructor(serviceName, instanceId, condition, inprocess, nodeId) {
    this.serviceName = serviceName;
    this.instanceId = instanceId;
    this.condition = condition;
    this.inprocess = inprocess;
    this.nodeId = nodeId;
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
}