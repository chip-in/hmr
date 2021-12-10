import util from 'util';

var logging = function() {
  var msgs = [new Date().toISOString()
    ,(arguments[0] + "   ").substr(0, 5)
    ,"["+ (arguments[1] + " ".repeat(20)).substr(0, 20) + "]"
    ,util.format.apply(util, Array.prototype.slice.apply(arguments, [2]))];

  console.log(msgs.join(" "));
}

export default class Logger {
  constructor(category) {
    this.category = category || "";
  }
  
  debug() {
    logging.apply(null, ["DEBUG", this.category].concat(Array.prototype.slice.call(arguments)));
  }

  info() {
    logging.apply(null, ["INFO", this.category].concat(Array.prototype.slice.call(arguments)));
  }

  warn() {
    logging.apply(null, ["WARN", this.category].concat(Array.prototype.slice.call(arguments)));
  }

  error() {
    logging.apply(null, ["ERROR", this.category].concat(Array.prototype.slice.call(arguments)));
  }

  crit() {
    logging.apply(null, ["CRIT", this.category].concat(Array.prototype.slice.call(arguments)));
  }

  
}