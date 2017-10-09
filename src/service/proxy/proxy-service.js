import AbstractService from '../abstract-service';
import uuidv4 from 'uuid/v4';
import url from 'url';

export default class ProxyService extends AbstractService {

  constructor(hmr) {
    super(hmr);
    this.appProxyPathPrefix = "/";
    this.proxyTree = {};
    this.pathMap = {};
    this.nodeId = hmr.getNodeId();
  }

  _startService() {
    return Promise.resolve()
      .then(()=> this._startProxyService())
      .then(()=> this._registerProxyService())
      .then(()=> this._registerBuiltinService())
  }
  _stopService() {
    return Promise.resolve()
    .then(()=> this._unregisterAllProxyService())
    .then(()=> this._stopProxyService())
  }

  _mountInprocService(serviceName, instanceId, path, condition, mode, instance) {
    return Promise.resolve()
    .then(()=>this._mount({
      r : {
        inprocess : true,
        src: this.nodeId
      },
      t : "mount",
      m : {
        mode : mode,
        path : path,
        instance : instance
      },
      s : serviceName
    }))
  }

  _startProxyService() {
    return Promise.resolve()
    .then(()=>{
      var app = this.hmr.getWebServer().getApplication();
      app.use(this.appProxyPathPrefix, (req, res)=>{
        this._requestFromHTTP(req, res);
      });
    })
  }
  _registerProxyService() {
    return Promise.resolve()
      .then(()=>this._mountInprocService(this.getServiceName(), this.instanceId, this.appProxyPathPrefix, {},
       "singletonMaster", this))
  }

  _registerBuiltinService() {
    return Promise.resolve()
  }


  _unregisterAllProxyService() {
    return Promise.resolve()
      .then(()=>Promise.all(Object.keys(this.pathMap).map((id)=>{
        var rule = this.pathMap[id];
        return this._unmount0(id, rule, rule.nodeId)
      })))
  }
  _stopProxyService() {
    return Promise.resolve()
  }

  _requestFromHTTP(req, res) {
    var path = req.path;
    return Promise.resolve()
    .then(()=>this._convertRequestMessage(req, path))
    .then((msg)=>this._proxy(path, msg))
    .then((respMsg)=>{
        if (respMsg.t !== "response") {
          this.logger.error("unexpected response format:%s", JSON.stringify(respMsg))
          res.sendStatus(500);
          return;
        }
        var respObj = respMsg.m;
        if (respObj.headers) {
          for (var k in respObj.headers) {
            res.setHeader(k, respObj.headers[k]);
          }
        }
        if (respObj.cookies) {
          respObj.cookies.forEach((o)=>{
            res.cookie(o.name, o.val, o.options);
          });
        }
        if (respObj.links) {
          res.links(respObj.links);
        }
        if (respObj.location) {
          res.location(respObj.location);
        }
        if (respObj.type) {
          res.type(respObj.type);
        }
        res.status(respObj.statusCode || 200);
        res.send(respObj.body);
    })
  }

  _convertRequestMessage(req, path) {
    var props = ["baseUrl", "body", "cookies",
    "headers", "hostname", "httpVersion", "httpVersionMajor",
    "httpVersionMinor", "ip", "ips", "method", "originalUrl",
    "params", "path", "protocol", "query", "rawHeaders", "url"];
    var reqMsg = {};
    props.forEach((p)=>{
      reqMsg[p] = req[p];
    })
    return {
      i : uuidv4(),
      a : true,
      s : this._createServiceName(path),
      t : "request",
      m : {
        req :reqMsg
      }
    }
  }

  _findBasePath(path) {
    if (path === "/") {
      //forbidden
      return null;
    }
    var names = path.substring(1).split("/");
    var dig = (entry, index, candl)=> {
      if (index === names.length) {
        return candl;
      }
      var name = names[index]
      if (name === "") {
        return dig(entry, index+1, candl);
      }
      var next = entry.children && entry.children[name];
      if (!next) {
        return candl;
      }
      if (next.instanceIdList && next.instanceIdList.length > 0) {
        candl = next;
      }
      return dig(next, index+1, candl);
    };
    var retObj = dig(this.proxyTree, 0);
    return retObj ? retObj.path : null;
  }

  _proxy(path, msg) {
    var basePath = this._findBasePath(path);
    if (!basePath) {
      this.logger.warn("service not found:%s", path);
      return Promise.resolve(this._createResponse(msg, 404));
    }
    var serviceName = this._createServiceName(basePath);
    return this.registry.lookup(serviceName)
    .then((entry)=>{
      if (!entry) {
        this.logger.warn("path is registered but service object is not found:%s", path);
        return Promise.resolve(this._createResponse(msg, 404));
      }
      var proxyRequest = {
        i : uuidv4(),
        s : serviceName,
        r : {
          src : msg.r && msg.r.src
        },
        t : msg.t,
        m : Object.assign({mountId : entry.getInstanceId()}, msg.m)
      };
      return this.router.ask(entry, proxyRequest)
    });
  }
  _requestFromNode(msg) {
    return Promise.resolve()
      .then(()=>this._proxy(msg.m.req.path, msg))
      .then((resp)=>this.router.answer(Object.assign(msg, {
        m : resp.m
      })))
  }
  _createResponse(msg, sc, body) {
    return Object.assign(msg, {
      t : "response",
      m : {
        statusCode : sc,
        body : body
      }
    });
  }

  _setupOperations() {
    this.operations = {
      "mount" : (msg) => this._mount(msg)
        .then((instanceId)=>this._replyResponse(msg, 0, {mountId : instanceId})),
      "unmount" : (msg) => this._unmount(msg)
        .then(()=>this._replySuccessResponse(msg)),
      "request" : (msg) => this._requestFromNode(msg)
    }
  }

  _createServiceName(path) {
    if (path[path.length - 1] !== "/") {
      path = path + "/";
    }
    return path === this.appProxyPathPrefix ? this.getServiceName() : this.getServiceName() + ":" + path;
  }

  _createAddServiceRequestMessage(msg, instanceId) {
    var inprocess = msg.r.src === this.nodeId;
    return {
      i : uuidv4(),
      a : true,
      s : "ClusterService",
      t : "registerService",
      r : {
        inprocess : inprocess,
        src : inprocess ? this.nodeId : msg.r.src
      },
      m : {
        instanceId : instanceId,
        mode : msg.m.mode,
        condition : msg.m.condition,
        serviceName : this._createServiceName(msg.m.path)
      }
    };
  }
  _createDelServiceRequestMessage(instanceId, path, inprocess, nodeId) {
    return {
      i : uuidv4(),
      a : true,
      s : "ClusterService",
      t : "unregisterService",
      r : {
        inprocess : inprocess,
        src : nodeId
      },
      m : {
        serviceName : this._createServiceName(path),
        instanceId : instanceId
      }
    };  
  }
  _findClusterService() {
    return Promise.resolve()
    .then(()=>this.registry.lookup("ClusterService"))
    .then((entry)=>{
      if (!entry) {
        this.logger.error("ClusterService not found");
        throw new Error("ClusterService not found");
      }
      return entry;
    })
  }
  _mount(msg) {
    var instanceId = uuidv4();
    var addRequest = this._createAddServiceRequestMessage(msg, instanceId);
    return Promise.resolve()
      .then(()=>this._findClusterService())
      .then((entry)=>this.router.ask(entry, addRequest))
      .then(()=>{
        if(msg.r.inprocess) this.router.addRoute(instanceId, msg.m.instance)
      })
      .then(()=>this._addProxyRule(msg.m.path, instanceId, msg.r.inprocess, msg.r.src))
      .then(()=>instanceId)
  }

  _unmount(msg) {
    var instanceId = msg.m.mountId;
    var rule = this._removeProxyRule(instanceId);
    if (!rule) {
      this.logger.warn("Mountinformation is not registered:%s", instanceId);
      return Promise.resolve();
    }
    return this._unmount0(instanceId, rule, msg.r.src)
  }
  _unmount0(instanceId, rule, nodeId) {
    var delRequest = this._createDelServiceRequestMessage(instanceId, rule.path, 
      rule.inprocess, rule.inprocess ? this.nodeId : nodeId);
    
    return Promise.resolve()
      .then(()=>this._findClusterService())
      .then((entry)=>this.router.ask(entry, delRequest))
      .then(()=>{
        if(rule.inprocess) this.router.deleteRoute(instanceId)
      })
  }

  _addProxyRule(path, instanceId, inprocess, nodeId) {
    var normalizedPath = url.parse(path).path;
    if (normalizedPath === "/") {
      //root
      this.proxyTree.root = {
        instanceId : instanceId 
      };
    } else {
      var names = normalizedPath.substring(1).split("/");
      var find = (current, idx, path)=> {
        if (names.length === idx) {
          return current;
        }
        var name = names[idx];
        if (name === "") {
          // a//b
          return find(current, idx+1, path);
        }
        current.children = current.children || {};
        var next = current.children[name] = current.children[name] || {};
        next.name = name;
        next.path = path + "/" + name;
        next.parent = current;
        return find(next, idx+1,  next.path);
      }
      var dst = find(this.proxyTree, 0, "");
      this.pathMap[instanceId] = {
        path : dst.path,
        inprocess : inprocess,
        nodeId : inprocess ? this.nodeId : nodeId
      };
      dst.instanceIdList = dst.instanceIdList || [];
      dst.instanceIdList.push(instanceId);
    }
  }

  _removeProxyRule(instanceId) {
    var rule = this.pathMap[instanceId];
    if (!rule) {
      this.logger.warn("rule not found");
      return null;
    }
    var names = rule.path.substring(1).split("/");
    var target = this.proxyTree;
    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      target = target.children[name];
      if (!target) {
        break;
      }
    }
    if (!target) {
      this.logger.warn("path is not registered. something go wrong....");
    } else {
      for (var i = 0; i < target.instanceIdList.length; i++) {
        if (target.instanceIdList[i] === instanceId) {
          target.instanceIdList.splice(i, 1);
          break;
        }
      }
      if (target.instanceIdList.length === 0) {
        delete target.parent.children[target.name];
      }
    }
    return rule;
  }
  
}