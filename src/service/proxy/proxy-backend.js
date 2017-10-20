export default class ProxyBackend {
  constructor(path, mode, nodeId, instanceId, inprocess) {
    this.path = path;
    this.mode = mode;
    this.nodeId = nodeId;
    this.instanceId = instanceId;
    this.inprocess = inprocess;
  }
}