import fs from 'fs';
import Logger from './logger';

var logger = new Logger("acl");

const ACL_FILE_PATH = process.env.ACL_FILE_PATH || "/etc/mosquitto/acl.json";
const ACL_FILE_CHECK_INTERVAL = process.env.ACL_FILE_CHECK_INTERVAL || 60 * 1000;

const ACL_POLICY_OPERATION_ANY = "*";
const DISABLE_HMR_ACL = process.env.DISABLE_HMR_ACL || false;

class ACLLoader {
  
  constructor(filePath, interval) {
    this.filePath = filePath || ACL_FILE_PATH;
    this.interval = interval || ACL_FILE_CHECK_INTERVAL;
    this.updated = 0;
    this.fileModified = 0;
    this.reloading = false;
  }

  start(cb) {
    var listener = (event, filename)=>{
      logger.info("ACL file has changed(eventType:" + event + ")");
      if (event === "change") {
        var now = Date.now();
        this.fileModified = now;
        this._reload(now);
      } else if (event === "rename") {
        if (this.watcher != null) {
          this.watcher.close();
        }
        setTimeout(()=>{
          registerListener();
          this._reload();
        }, 500)
      }
    }
    var registerListener = ()=>{
      if (fs.existsSync(this.filePath)) {
        this.watcher = fs.watch(this.filePath, listener);
      } else {
        setTimeout(()=>{
          registerListener();
        }, this.interval);
      }
    }
    return new Promise((res, rej)=>{
      this.cb = (acl)=>{
        //init
        cb(acl);
        this.cb = cb;
        registerListener();
        res();
      };
      this._reload();
    })
  }

  async stop() {
    if (this.watcher != null) {
      try {
        this.watcher.close();
        this.watcher = null;
      } catch (e) {
        logger.warn("Failed to stop watcher", e);
      }
    }
  }

  _isRegExpObj(val) {
    return val != null && 
          typeof val === "object" &&
            typeof val.regex === "string";
  }
  _escapeRegex(val) {
    return val.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  }
  _toRegex4Dadget(val) {
    const dbPath = "/d/:database";
    const subsetPath = dbPath + "/(subset|updator)/:subset"
    var parts = [];
    if (this._isRegExpObj(val)) {
      parts = val.regex.split("/")
        .filter(v=>v.length>0)
        .map(v=>"("+ v +")")
    } else if (typeof val === "string") {
      parts = val.split("/")
              .filter(v=>v.length>0)
              .map(v=>this._escapeRegex(v))
    }
    var regexStr = "";  
    switch(parts.length) {
      case 1:
        regexStr = dbPath.replace(":database", parts[0]); break;
      case 2:
        regexStr = subsetPath.replace(":database", parts[0])
                      .replace(":subset", parts[1]); break;
    }
    return new RegExp(regexStr);
  }
  
  _toRegex(val, resType) {
    if ("dadget" === resType) {
      return this._toRegex4Dadget(val);
    }
    if (this._isRegExpObj(val)) {
      return new RegExp(val.regex);
    } else if (typeof val === "string") {
      return new RegExp("^" + this._escapeRegex(val) + "$")
    }
  }

  _parseACL(aclConfig) {
    var ret = [];
    [].concat(aclConfig.acl || []).forEach((entry)=>{
      if (typeof entry !== "object") {
        logger.warn("ACL format error. Property 'acl' must be a list of object.")
        return ;
      }
      var name = entry.name;
      var res = entry.resource;
      var resType = res.type;
      var resPath = null;
      if (res.path != null) {
        resPath = this._toRegex(res.path, resType);
        if (resPath == null) {
          logger.warn("ACL format error. Type of 'path' value must be a string or an object which contains 'regex' property")
          return ;
        }
      }
      var policies = [];
      [].concat(entry.accesses||[]).forEach((a)=>{
        if (typeof a !== "object") {
          logger.warn("ACL format error.Property 'accesses' must be a list of object.")
          return ;
        }
        var subject = null;
        if (a.subject != null) {
          if (typeof a.subject !== "object") {
            logger.warn("ACL format error.Property 'subject' must be an object.")
            return ;
          }
          subject = {};
          for (var k in a.subject) {
            subject[k] = this._toRegex(a.subject[k]);
          }
        }
        var operation = a.operation;
        policies.push({subject, operation})
      })
      var ace = new ACE(name, resType, resPath, policies);
      ret.push(ace);
    })
    return ret;
  }

  _load() {
    return new Promise((resolve, reject)=>{
      if (!fs.existsSync(this.filePath)) {
        logger.warn("ACL file('" + this.filePath + "') not exists");
        resolve([]);
        return;
      }
      fs.readFile(this.filePath, "utf-8", (e, data)=>{
        if (e) {
          logger.error("Failed to read acl file", e);
          reject(e);
          return;
        }
        var aclConfig = JSON.parse(data);
        var ret = this._parseACL(aclConfig);
        resolve(ret);
      })
    })
  }

  async _reload(fileModified) {
    if (this.reloading) {
      return;
    }
    var now = Date.now();
    var duration = now - this.updated;
    if ( duration < this.interval) {
      if (this.waiter != null) {
        return;
      }
      this.waiter = setTimeout(()=>{
        this.waiter = null;
        this._reload(this.fileModified);
      }, this.interval - duration);
      return;
    }
    this.reloading = true;

    var acl = null;
    try {
      acl = await this._load();
    } catch (e) {
      logger.error("Failed to reload acl file. So we use empty acl and it will deny all requests.", e)
      acl = [];
    }
    this.reloading = false;
    this.updated = now;
    this.cb(acl);
    logger.info("ACL file(" + this.filePath + ") is loaded");

    if (this.fileModified > fileModified) {
      setImmediate(()=>{
        this._reload(this.fileModified);
      });
    }
  }

}

class ACE {
  constructor(name, resourceType, resourcePath, policies) {
    this.name = name;
    this.resourceType = resourceType;
    this.resourcePath = (resourcePath instanceof RegExp) ? resourcePath : new RegExp("^" + resourcePath + "$");
    this.policies = policies;
  }

  matchResource(resourceType, resourcePath) {
    return (this.resourceType === resourceType) &&
      this.resourcePath.test(resourcePath);
  }

  check(subject, operation) {
    var ret = false;
    for(var i = 0; i < this.policies.length; i++) {
      var policy = this.policies[i];
      if (policy.operation != null) {
        var opPermit = false;
        switch(policy.operation) {
          case ACL_POLICY_OPERATION_ANY:
          opPermit = true; break;
          case "READ":
          opPermit = operation === "READ"; break;
          case "WRITE":
          opPermit = operation === "READ" || operation === "WRITE"; break;
          default:
          logger.warn("Unknown operation (" + policy.operation + ") was found in acl. We deny it.");
          opPermit = false; break;
        }
        if (!opPermit) {
          continue;
        }
      }
      if (policy.subject != null) {
        var subjectMatched = true;
        for (var k in policy.subject) {
          var matcher = policy.subject[k];
          //treat null as empty string
          if (!matcher.test((subject && subject[k]) || "")) {
            subjectMatched = false;
            break;
          }
        }
        if (!subjectMatched) {
          continue;
        }
      }
      ret = true;
      break;
    }
    return ret;
  }
  
}

class ACL {
    constructor(filePath, interval) {
      this.ace = [];
      this.filePath = filePath;
      this.interval = interval;
    }

    async initialize() {
      var loader = new ACLLoader(this.filePath, this.interval);
      await loader.start((latest) => {
        this.ace = latest;
      });
      this.loader = loader;
    }

    async finallize() {
      if (this.loader) {
        this.loader.stop();
      }
    }

    authorize(subject, resourceType, resourcePath, operation) {
      if (DISABLE_HMR_ACL) {
        return true;
      }
      var ret = false;
      for (var i = 0; i < this.ace.length; i++) {
        var entry = this.ace[i];
        if (entry.matchResource(resourceType, resourcePath) && 
          entry.check(subject, operation)) {
          ret = true;
          break;
        }
      }
      return ret;
    }
}
export default ACL;