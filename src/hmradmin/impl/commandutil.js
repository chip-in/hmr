import http from 'http'
import table3 from 'cli-table3'
import fs from 'fs'
import readline from 'readline'

class CommandUtil {
  async getSockets(){
    const apiResult = await this.get("RouterService", "sockets")
    return apiResult.sockets
  }

  async getPaths(){
    const apiResult = await this.get("ProxyService", "paths")
    return apiResult.paths
  }
  
  async get(service, property){
    return new Promise((resolve, reject) => {
      try {
        http.get(`http://127.0.0.1:${process.env.MANAGE_PORT || '9000'}/api/${service}/${property}`, resp => {
          let data = ''
          resp.on('data', (chunk) => { 
            data += chunk; 
          }); 
          resp.on('end', () => { 
            resolve(JSON.parse(data))
          }); 
        })
        .on("error", (err) => { 
          reject(err)
        })
      } catch(e) {
        reject(e)
      }
    })
  }

  async read(src)  {
    if (src === "-") {
      return new Promise((resolve, reject) => {
        var lines = []; 
        var reader = readline.createInterface({
          input: process.stdin,
          terminal: false
        });
        reader.on("line", (line) => {
          lines.push(line);
        });
        reader.on("close", () => {
          try {
            resolve(JSON.parse(lines.join("")))
          } catch (e) {
            reject(e)
          }
        });
      })
    } else {
      return JSON.parse(fs.readFileSync(src).toString())
    }
  }

  format(contents, format, properties) {
    if (format === "json") {
      if (properties) {
        contents = contents.map(c=> {
          var ret = {}
          properties.map(p=>ret[p] = c[p])
          return ret
        })
      }
      return JSON.stringify(contents)
    } else {
      let headers = []
      if (properties) {
        headers = properties
      } else {
        contents.map(c=> {
          Object.keys(c).map(k => {
            if (headers.indexOf(k) === -1) {
              headers.push(k)
            }
          })
        })
      }
      const table = new table3({head:headers})
      contents.map(c => {
        table.push(headers.map(h=>c[h]))
      })
      return table.toString()
    }
  }
  
async write(contents, dest) {
    if (dest === "-") {
      console.info(contents)
    } else {
      fs.writeFileSync(dest, contents)
    }
  }
}
const instance = new CommandUtil()
export default instance