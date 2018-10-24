import cookie from 'cookie';
import Logger from './logger';
import jwt from 'jsonwebtoken';
const AUTH_TYPE_NAME_BEARER = "Bearer";
const COOKIE_NAME_TOKEN =  "access_token";

var logger = new Logger("util");
class CIUtil {

  static findTokenFromHeaders(headers) {
    //jwt token
    var obj = cookie.parse(headers["cookie"] || "");
    var token = obj && obj[COOKIE_NAME_TOKEN];
    if (token == null && headers["authorization"] != null) {
      //check authorization header
      var authorizationVal = headers["authorization"];
      var parts = authorizationVal.split(' ');
      if (parts.length === 2 && parts[0] === AUTH_TYPE_NAME_BEARER) {
        token = parts[1];
      }
    }
    var ret = null;
    if (token != null) {
      try {
        ret = jwt.decode(token, {complete: true}).payload
      } catch (e) {
        logger.warn("Failed to parse jwt", e);
        //IGNORE
      }
    }
    return ret;
  }
}

export default CIUtil;