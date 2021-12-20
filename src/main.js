import HMR from './hmr';
import Logger from './util/logger'

var logger = new Logger("Main");
process.on('unhandledRejection', (e)=>{
  logger.error("UnhandledRejection", e);
});

var hmr = new HMR();

var stop = ()=>{
  return hmr.stop()
    .then(()=> logger.info('stop chip-in corenode'));
};

var restart = ()=>{
  return stop()
    .then(()=>start());
};
var start = () =>{
  logger.info('start chip-in corenode');
  return hmr.start()
    .then(()=>{
      process.on('SIGINT', stop);
      process.on('SIGHUP', restart);
      process.on('SIGTERM', stop);
    });
};

start();