import semaphore from 'semaphore';
import Logger from '../../util/logger';

export default class ProxyPath {
  constructor(path) {
    this.path = path;
    this.backends = [];
    this.currentMode = null;
    this.sem = semaphore(1);
    this.logger = new Logger("ProxyPath");
    this.availables = [];
    this.pqueue = [];
    this.pqueue[0] = {};
    this.counters = {};
  }

  addBackend(be) {
    return Promise.resolve()
      .then(()=>this.backends.push(be))
      .then(()=>this._ensureAvailable(be))
  }
  
  _ensureAvailable(be) {
    var enableBackend = (m,b)=>{
      this.currentMode = m;
      this.availables.push(b);
      this.pqueue[0][b.instanceId] = b;
    }
    return Promise.resolve()
    .then(()=>{
      return new Promise((resolve, reject)=>{
        var mode = be.mode;
        if (this.currentMode === "singletonMaster" || mode === "singletonMaster") {
          if (this.currentMode != null && this.currentMode !== mode) {
            this.logger.warn("Detect different mount mode on same path. path '%s' on %s mode by %s (currentMode: '%s')", be.path, mode, be.instanceId, this.currentMode);
          }
          this.sem.take(()=>{
            enableBackend(mode, be);
            this.logger.debug("Succeeded to take semaphore. path '%s' on %s mode by %s. (currentMode: '%s')", be.path, mode, be.instanceId, this.currentMode);
            resolve(be.instanceId);
          })
          this.logger.debug("Try to take semaphore. path '%s' on %s mode by %s. (currentMode: '%s')", be.path, mode, be.instanceId, this.currentMode);
          return;
        } else if (mode !== "loadBalancing") {
          this.logger.error("Unknown mode specified: %s", mode);
          reject(new Error("Unknown mode specified."))
          return;
        } 
        if (this.availables.length === 0) {
          this.sem.take(()=>{
            this.logger.debug("Succeeded to take semaphore. path '%s' on %s mode by %s. (currentMode: '%s')", be.path, mode, be.instanceId, this.currentMode);
          });
        }
        enableBackend(mode, be);
        this.logger.debug("Succeeded to mount path '%s' on %s mode by %s", be.path, mode, be.instanceId);
        resolve(be.instanceId);
      })
    })
  }

  removeBackend(instanceId) {
    var removeFromArray = (a, id) =>{
      var target = null;
      for (var i = 0; i < a.length; i++) {
        if (a[i].instanceId === id) {
          target = a[i];
          a.splice(i, 1);
          break;
        }
      }
      return target;
    }
    removeFromArray(this.backends, instanceId);
    var activeInstance = removeFromArray(this.availables, instanceId);
    //remove counter
    var count = this.counters[instanceId];
    delete this.counters[instanceId];
    //remove from pqueue
    if (this.pqueue[count] && this.pqueue[count][instanceId]) {
      delete this.pqueue[count][instanceId];
    } else {
      //remove from all
      for (var i = 0; i < this.pqueue.length; i++) {
        if (this.pqueue[i]) {
          delete this.pqueue[i][instanceId];
        }
      }
    }
    if (activeInstance != null && this.availables.length == 0) {
      //release lock
      this.sem.leave();
    }
    return Promise.resolve();
  }

  isEmpty() {
    return this.backends.length === 0;
  }

  select(path, msg) {
    return Promise.resolve()
      .then(()=>{
        var count = null;
        for (var i = 0; i < this.pqueue.length; i++) {
          if (!this.pqueue[i]) {
            continue;
          }
          if (Object.keys(this.pqueue[i]).length !== 0) {
            count = i;
            break;
          }
        }
        if (count == null) {
          this.logger.warn("There are no available backend:%s", path);
          return null;
        }
        var next = null;
        for (var k in this.pqueue[count]) {
          next = this.pqueue[count][k];
          break;
        }
        var nextInstanceId = next.instanceId;
        var nextCount = count + 1;
        delete this.pqueue[count][nextInstanceId];
        this.pqueue[nextCount] = this.pqueue[nextCount] || {};
        this.pqueue[nextCount][nextInstanceId] = next;
        this.counters[nextInstanceId] = nextCount;
        this.logger.debug("Increment counter for backend :%s => %s", nextInstanceId, nextCount)
        return nextInstanceId;
      })
  }

  decrement(instanceId) {
    return Promise.resolve()
      .then(()=>{
        var count = this.counters[instanceId];
        if (count == null) {
            this.logger.warn("Failed to decrement running count. Unknown instanceId %s", instanceId);
            return;
        }
        var current = this.pqueue[count][instanceId];
        delete this.pqueue[count][instanceId];

        var nextCount = count -1 ;
        this.pqueue[nextCount] = this.pqueue[nextCount] || {};
        this.pqueue[nextCount][instanceId] = current;
        this.counters[instanceId] = nextCount;
        this.logger.debug("Decrement counter for backend :%s => %s", instanceId, nextCount)
      })
  }
}