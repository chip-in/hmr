import AbstractService from '../abstract-service';
import io from 'socket.io';
import uuidv4 from 'uuid/v4';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';
import UAParser from 'ua-parser-js';

export default class RouterService extends AbstractService {
  constructor(hmr) {
    super(hmr);
    this.webSocketPath = process.env.CNODE_WSOCKET_PATH || '/r';
    this.pingInterval =  process.env.CNODE_WSOCKET_PING_INTERVAL ? Number(process.env.CNODE_WSOCKET_PING_INTERVAL) : 10000;
    this.pingTimeout = process.env.CNODE_WSOCKET_PING_TIMEOUT ? Number(process.env.CNODE_WSOCKET_PING_TIMEOUT) : 30000;
    this.webSocketMsgName = process.env.CNODE_WSOCKET_MSG_NAME || 'ci-msg';

    this.socketMap = {};
    this.sessionTable = {};
    this.routes = {};
    
    this.tokenCookieValue = "access_token"
  }

  _startService() {
    return Promise.resolve()
      .then(() => this._startWebSocket())
  }

  _startWebSocket() {
    return Promise.resolve()
      .then(() => {
        var hmr = this.hmr;
        var server = hmr.getWebServer().getServer();
        var handle = io(server, {
          path: this.webSocketPath,
          pingInterval: this.v,
          pingTimeout: this.pingTimeout
        });
        handle.on('connect', (socket) => {
          var nodeId = uuidv4();
          this.logger.info('ResourceNode connected from %s', socket.request.socket.remoteAddress);
          this.socketMap[nodeId] = socket;
          var userInformation = this._createUserInformation(socket);
          socket.on(this.webSocketMsgName, (msg)=> {
            msg.u = userInformation;
            return this._receive(nodeId, socket, msg)
          });
          socket.on('disconnect', (reason) => this._notifyDisconnect(nodeId, socket, reason));
        });
        this.logger.info("Start Websocket (path:%s)", this.webSocketPath);
      });
  }

  _addRouteInformation(msg, inprocess, nodeId) {
    msg.r = Object.assign({}, msg.r, {
      inprocess : inprocess,
      nodeId : nodeId
    });
  }

  _receive(nodeId, socket, msg) {
    return Promise.resolve()
      .then(()=>{
        var isAsk = msg.a;
        if (isAsk && this.sessionTable[msg.i]) {
          //reply from remote server
          var session = this.sessionTable[msg.i];
          delete this.sessionTable[msg.i];
          return session.end(msg);
        }
        if (isAsk) {
          //request from remote server
          this.sessionTable[msg.i] = this._createRemoteSessionObject(msg, nodeId);
        }
        msg.r = msg.r || {};
        msg.r.src = nodeId;
        return this.registry.lookup(msg.s, msg.c)
          .then((entry)=>{
            if (!entry) {
              this.logger.info("ServiceNotFound:%s(%s)", msg.s, JSON.stringify(msg.c));
              if (!isAsk) {
                return;
              }
              return this._emitMessage(nodeId, {
                i : msg.i,
                a : true,
                s : msg.s,
                c : msg.c,
                m : {
                  rc : 404
                }
              });
            }
            return this._handleMessage(entry, msg);
          })
      })
  }

  _handleMessage(entry, msg) {
    var next = this._addRouteInformation(msg, entry.isInprocess(), entry.nodeId);
    return Promise.resolve()
      .then(()=>{
        if (entry.isInprocess()) {
          var service = this.routes[entry.getInstanceId()];
          if (!service) {
            this.logger.error("No route to service:%s", entry.getInstanceId());
            throw new Error("No route to service");
          }
          return service.onReceiveCIMessage(msg);
        } else {
          return  this._emitMessage(entry.getNodeId(), msg);
        }
      })
  }

  _createRemoteSessionObject(msg, nodeId) {
    return {
      sessionId : msg.c,
      nodeId : nodeId,
      end : (resp) =>{
        return Promise.resolve()
          .then(()=>{
            if (resp.a) this._emitMessage(nodeId, resp);
          })
      }
    }
  }
  
  _createInternalSessionObject(msg, cb){ 
    return {
      sessionId : msg.c,
      nodeId : this.hmr.getNodeId(),
      end : (resp) =>{
        return Promise.resolve()
          .then(()=>{
            if (resp.a) cb(resp);
          })
      }
    }
  }

  _emitMessage(nodeId, msg) {
    var socket = this.socketMap[nodeId];
    if (!socket) {
      this.logger.error("Socket is not found:%s", uuid);
      //ignore
      return Promise.reject("Socket not found");
    }
    return Promise.resolve()
      .then(()=>{
        var ret = Object.assign({}, msg);
        delete ret.r;
        socket.emit(this.webSocketMsgName, ret);
      });
  }

  _notifyDisconnect(uuid, socket, reason) {
    var serviceName = "ClusterService";
    return this.registry.lookup(serviceName)
      .then((entry)=>{
        if (!entry) {
          //ignore
          return;
        }
        return this.ask(entry, {
          i : uuidv4(),
          s : serviceName,
          t : "disconnect",
          r : {
            src : uuid
          },
          m : {
            reason : reason
          }
        })
        .then(()=>delete this.socketMap[uuid])
      })
  }

  send(entry, msg) {
    return Promise.resolve()
      .then(()=>this._handleMessage(entry, msg))
  }

  answer(msg) {
    return Promise.resolve()
      .then(()=>{
        var session = this.sessionTable[msg.i];
        if (!session) {
          this.logger.error("Answer is specified but session not found.");
          throw new Error("Answer is specified but session not found");
        }
        delete this.sessionTable[msg.i];
        return session.end(msg);
      })
  }

  ask(entry, msg) {
    return Promise.resolve()
      .then(()=>{
        return new Promise((resolve, reject)=>{
          this.sessionTable[msg.i] = this._createInternalSessionObject(msg, (resp)=>{
            resolve(resp);
          });
          this.send(entry, Object.assign({a:true}, msg));
          //wait response
        })
    })
  }
  _stopService() {
    return Promise.resolve()
      .then(()=>{
        this.sessionTable = {};
        this.socketMap = {};
        this.routes = {};
      });
  }
  addRoute(instanceId, instance) {
    this.routes[instanceId] = instance;
    this.logger.info("Add route for inprocess-service(instanceId:%s)", instanceId)
  }
  deleteRoute(instanceId) {
    delete this.routes[instanceId];
    this.logger.info("Delete route for inprocess-service(instanceId:%s)", instanceId)
  }
  _createUserInformation(socket) {
    var ret = {};
    if (socket.request == null) {
      return ret;
    }
    var headers = socket.request.headers;
    //jwt token
    var obj = cookie.parse(headers["cookie"] || "");
    var token = obj && obj[this.tokenCookieValue];
    if (token != null) {
      try {
        var decoded = jwt.decode(token, {complete: true})
        ret.token = decoded.payload;
      } catch (e) {
        this.logger.warn("Failed to parse jwt", e);
        //IGNORE
      }
    }
    //user agent
    var ua = headers["user-agent"];
    if (ua != null) {
      ret.ua = UAParser(ua);
    }
    //TODO rule-based device detection
    if ("node-XMLHttpRequest" === ua) {
      ret.device = "server";
    } else {
      ret.device = "browser";
    }
    return ret;
  }
}