export default class ProxyPath {
  constructor(path) {
    this.path = path;
    this.instanceIdList = [];
  }

  addBackend(be) {
    this.instanceIdList.push(be);
    return Promise.resolve()
  }

  removeBackend(instanceId) {
    for (var i = 0; i < this.instanceIdList.length; i++) {
      if (this.instanceIdList[i].instanceId === instanceId) {
        this.instanceIdList.splice(i, 1);
        break;
      }
    }
    return Promise.resolve();
  }

  isEmpty() {
    return this.instanceIdList.length === 0;
  }

  select(path, msg) {
    return Promise.resolve()
      .then(()=>{
        //TODO    
        for (var i = 0; i < this.instanceIdList.length; i++) {
          if (this.instanceIdList[i] != null) {
            return this.instanceIdList[i].instanceId;
          }
        }
      })
  }
}