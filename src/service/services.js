import AbstractModule from '../abstract-module';
import ClusterService from './cluster/cluster-service';
import ProxyService from './proxy/proxy-service';
import RouterService from './router/router-service';

export default class Services extends AbstractModule{
  constructor(hmr) {
    super(hmr);
    this._initializeBuiltinServices();
  }

  _initializeBuiltinServices() {
    var routerService = new RouterService(this.hmr);
    var clusterService = new ClusterService(this.hmr);
    var proxyService = new ProxyService(this.hmr);

    this.services = [
      routerService,
      clusterService,
      proxyService
    ];
    this.services.map((s)=>s.setServiceRegistry(clusterService.getServiceRegistry()));
    this.services.map((s)=>s.setRouter(routerService));
    this.serviceMap = this.services.reduce((dst, svc)=> {
      dst[svc.getServiceName()] = svc
      return dst
    }, {})
  }

  _startModule() {
    return Promise.resolve()
      .then(()=>this.services.reduce((prev, current)=>prev.then(()=>current.start()), Promise.resolve()))
  }

  _stopModule() {
    return Promise.resolve()
      .then(()=>Array.prototype.slice.call(this.services).reverse().reduce((prev, current)=>prev.then(()=>current.stop()), Promise.resolve()))
  }

  getService(name) {
    return this.serviceMap[name]
  }
}