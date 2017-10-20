import AbstractService from '../abstract-service';
import uuidv4 from 'uuid/v4';
import url from 'url';
import DirectoryService from './directory-service';

export default class ProxyService extends AbstractService {

  constructor(hmr) {
    super(hmr);
    this.appProxyPathPrefix = "/";
    this.proxyTree = {};
    this.allProxyDefinition = {};
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
      .then(()=>Promise.all(Object.keys(this.allProxyDefinition).map((id)=>{
        var def = this.allProxyDefinition[id];
        return this._unmount0(id, def, def.nodeId)
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

  _proxy(path, msg) {
    if (path === "/") {
      //forbidden
      this.logger.warn("forbidden root directry access");
      return Promise.resolve(this._createResponse(msg, 404));
    }
    var pathObj = this.dirService.lookup(path);
    var basePath = pathObj.path;
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
      .then(()=>{
        this.allProxyDefinition[instanceId] = {
          inprocess : msg.r.inprocess,
          nodeId : msg.r.inprocess ? this.nodeId : msg.r.src,
          instanceId : instanceId,
          path : msg.m.path
        };
        //register dirService
        var normalizedPath = url.parse(msg.m.path).path;
        var dst = this.dirService.lookup(normalizedPath);
        if (dst == null || dst.path !== normalizedPath) {
          dst = {
            path : normalizedPath,
            instanceIdList : []
          }
          this.dirService.bind(normalizedPath, dst);
        }
        dst.instanceIdList.push(instanceId);
      })
      .then(()=>instanceId)
  }

  _unmount(msg) {
    var instanceId = msg.m.mountId;
    var def = this.allProxyDefinition[instanceId];
    if (!def) {
      this.logger.warn("Mountinformation is not registered:%s", instanceId);
      return Promise.resolve();
    }
    var pathObj = this.dirService.lookup(def.path);
    if (pathObj == null) {
      this.logger.warn("path is not registered(%s, %s). something go wrong....", instanceId, pathObj.path);
      return Promise.resolve();
    }
    for (var i = 0; i < pathObj.instanceIdList.length; i++) {
      if (pathObj.instanceIdList[i] === instanceId) {
        pathObj.instanceIdList.splice(i, 1);
        break;
      }
    }
    if (pathObj.instanceIdList.length === 0) {
      this.dirService.unbind(pathObj.path);
    }
    return this._unmount0(instanceId, def, def.nodeId)
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