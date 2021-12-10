import util from './commandutil'

const ls = async (opts) => {
  const {verbose, format, dest} = opts.options
  const sockets = await util.getSockets()
  if (verbose) {
    var dst = sockets.reduce((ret, s)=>{
      ret[s.nodeId] = s
      return ret
    },{})
    const paths = await util.getPaths()
    paths.map(path=> {
      if (Array.isArray(path.object.backend)) {
        path.object.backend.filter(b=>b.available).map(b=>{
          if (dst[b.nodeId]) {
            dst[b.nodeId].mountPath = dst[b.nodeId].mountPath || []
            dst[b.nodeId].mountPath.push(path.path)
          }
        })
      }
    })
    sockets.filter(s=>s.mountPath).map(s=>s.mountPath=s.mountPath.join("\n"))
  }
  const result = util.format(sockets, format)
  await util.write(result, dest)
}

export default {
  execute: async (option) => {
    switch(option.subcommand) {
      case "ls":
        await ls(option)
        break
    }
  }
}