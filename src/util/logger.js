import util from 'util';

var pmap = {
  "DEBUG" : 10,
  "INFO" : 20,
  "WARN" : 30,
  "ERROR" : 40
}

var priority = pmap[process.env.CNODE_LOG_LEVEL] || pmap["DEBUG"];

var logging = function() {
  var msgs = [new Date().toISOString()
    ,(arguments[0] + "   ").substr(0, 5)
    ,"["+ (arguments[1] + " ".repeat(20)).substr(0, 20) + "]"
    ,util.format.apply(util, Array.prototype.slice.apply(arguments, [2]))];

  console.log(msgs.join(" "));
}

/**
 * @desc  ロガークラス
 */
class Logger {
  constructor(category) {
    this.category = category || "";
  }
  
  _isEnabled(level) {
    var p = pmap[level] || 0;
    return p >= priority;
  }
  
  debug() {
    var level = "DEBUG";
    if(this._isEnabled(level)) logging.apply(null, [level, this.category].concat(Array.prototype.slice.call(arguments)));
  }

  info() {
    var level = "INFO";
    if(this._isEnabled(level)) logging.apply(null, [level, this.category].concat(Array.prototype.slice.call(arguments)));
  }

  warn() {
    var level = "WARN";
    if(this._isEnabled(level)) logging.apply(null, [level, this.category].concat(Array.prototype.slice.call(arguments)));
  }

  error() {
    var level = "ERROR";
    if(this._isEnabled(level)) logging.apply(null, [level, this.category].concat(Array.prototype.slice.call(arguments)));
  }

}
export default Logger