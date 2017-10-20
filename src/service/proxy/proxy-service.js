import AbstractService from '../abstract-service';
import uuidv4 from 'uuid/v4';
import url from 'url';
import DirectoryService from './directory-service';
import ProxyPath from './proxy-path';
import ProxyBackend from './proxy-backend';

export default class ProxyService extends AbstractService {

  constructor(hmr) {
    super(hmr);
    this.appProxyPathPrefix = "/";
    this.allBackendDef = {};
    this.nodeId = hmr.getNodeId();
    this.dirService = new DirectoryService();
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

  _mountInprocService(serviceName, instanceId, path, condition, instance) {
    return Promise.resolve()
    .then(()=>this._mount({
      r : {
        inprocess : true,
        src: this.nodeId
      },
      t : "mount",
      m : {
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
      .then(()=>this._mountInprocService(this.getServiceName(), this.instanceId, this.appProxyPathPrefix, {}, this))
  }

  _registerBuiltinService() {
    return Promise.resolve()
  }

  _unregisterAllProxyService() {
    return Promise.resolve()
      .then(()=>Promise.all(Object.keys(this.allBackendDef).map((id)=>{
        var def = this.allBackendDef[id];
        return this._unmount0(id, def, def.nodeId)
      })))
      .then(()=>{
        this.dirService.clear();
        this.allBackendDef = {};
      })
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
      s : this.getServiceName(),
      t : "request",
      m : {
        req :reqMsg
      }
    }
  }

  _proxy(path, msg) {
    if (path === "/") {
      //forbidden
      this.logger.warn("forbidden root directry access");
      return Promise.resolve(this._createResponse(msg, 404));
    }
    var pathObj = this.dirService.lookup(path);
    if (pathObj == null) {
      this.logger.warn("service not found:%s", path);
      return Promise.resolve(this._createResponse(msg, 404));
    }
    return pathObj.select(path, msg)
      .then((instanceId)=>{
        if (instanceId == null) {
          this.logger.warn("service found but executable instance is not found:%s", path);
          return Promise.resolve(this._createResponse(msg, 404));
        }
        var serviceName = this._createServiceName(pathObj.path, instanceId);
        return this.registry.lookup(serviceName)
          .then((entry)=>{
            if (!entry) {
              this.logger.warn("path is registered but service object is not found. Path:%s, instanceId:%s", path, instanceId);
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
          })
      })
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

  _createServiceName(path, instanceId) {
    if (path == null || instanceId == null) {
      throw new Error("path and instanceId required")
    }
    if (path[path.length - 1] !== "/") {
      path = path + "/";
    }
    if (path === this.appProxyPathPrefix) {
      return this.getServiceName();
    }
    return this.getServiceName() + ":" + path + ":" + instanceId;
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
        condition : msg.m.condition,
        serviceName : this._createServiceName(msg.m.path, instanceId)
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
        serviceName : this._createServiceName(path, instanceId),
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
      .then(()=>{
        var backEnd = new ProxyBackend(msg.m.path, msg.m.mode, msg.r.inprocess ? this.nodeId : msg.r.src, instanceId, msg.r.inprocess);
        this.allBackendDef[instanceId] = backEnd;
        //register dirService
        var normalizedPath = url.parse(msg.m.path).path;
        var pathObj = this.dirService.lookup(normalizedPath);
        if (pathObj == null || pathObj.path !== normalizedPath) {
          pathObj = new ProxyPath(msg.m.path);
          this.dirService.bind(normalizedPath, pathObj);
        }
        return pathObj.addBackend(backEnd);
      })
      .then(()=>instanceId)
  }

  _unmount(msg) {
    var instanceId = msg.m.mountId;
    var def = this.allBackendDef[instanceId];
    if (!def) {
      this.logger.warn("Mountinformation is not registered:%s", instanceId);
      return Promise.resolve();
    }
    delete this.allBackendDef[instanceId];
    var pathObj = this.dirService.lookup(def.path);
    if (pathObj == null) {
      this.logger.warn("path is not registered(%s, %s). something go wrong....", instanceId, pathObj.path);
      return Promise.resolve();
    }
    return pathObj.removeBackend(instanceId)
      .then(()=>{
        if (pathObj.isEmpty()) {
          this.dirService.unbind(def.path);
        }
      })
      .then(()=>this._unmount0(instanceId, def, def.nodeId))
    
  }

  _unmount0(instanceId, def, nodeId) {
    var delRequest = this._createDelServiceRequestMessage(instanceId, def.path, 
      def.inprocess, def.inprocess ? this.nodeId : nodeId);
    
    return Promise.resolve()
      .then(()=>this._findClusterService())
      .then((entry)=>this.router.ask(entry, delRequest))
      .then(()=>{
        if(def.inprocess) this.router.deleteRoute(instanceId)
      })
  }
  
}