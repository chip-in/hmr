import util from './commandutil'

const loadPaths = async(verbose) => {
  const apiResult = await util.getPaths()
  let ret = []
  apiResult.map(p=> {
    let path = p.path
    if (Array.isArray(p.object.backend)) {
      p.object.backend.map(b=> {
        if (verbose || b.available) {
          ret.push({
            path,
            nodeId: b.nodeId,
            mode: p.object.mode,
            available: b.available
          })
        }
      })
    }
  })
  ret.sort((a,b)=>{
    let result = 0
    if ((result = a.path.localeCompare(b.path)) !== 0) {
      return result
    }
    if (a.available != b.available) {
      return a.available ? -1 : 1
    }
    return a.nodeId.localeCompare(b.nodeId)
  })
  return ret
}

const diffPaths = async(src, verbose) => {
  const expect = await util.read(src)
  if (!Array.isArray(expect)) {
    throw new Error("input object must be an array.")
  }
  const expectMap = expect.filter(p=>p.available).reduce((dst, p) => {
    dst[p.path] = p
    return dst
  }, {}) 
  const deployed = await loadPaths(verbose)
  const deployedMap = deployed.filter(p=>p.available).reduce((dst, p) => {
    dst[p.path] = p
    return dst
  }, {}) 
  expect.map(p => {
    if (deployedMap[p.path]) {
      delete expectMap[p.path]
      delete deployedMap[p.path]
    }
  })
  var ret = {}
  if (Object.keys(expectMap).length !== 0) {
    ret["<"] = Object.keys(expectMap)
  }
  if (Object.keys(deployedMap).length !== 0) {
    ret[">"] = Object.keys(deployedMap)
  }
  return ret
}

const mountLs = async (opts) => {
  try {
    const {verbose, format, dest} = opts.options
    const paths = await loadPaths(verbose)
    const result = util.format(paths, format)
    await util.write(result, dest)
  } catch (e) {
    console.error(`command failed by error`, e)
    throw e
  }
}

const mountDiff = async(opts) => {
  let diffResult = false
  try {
    const {verbose, format, src, dest} = opts.options
    const ret = await diffPaths(src, verbose)

    diffResult = Object.keys(ret).length === 0
    const diffDetail = JSON.stringify(ret)
    const result = util.format([{diffResult, diffDetail}], format)
    await util.write(result, dest)
  } catch (e) {
    console.error(`command failed by error`, e)
    throw e
  }
  if (!diffResult) throw new Error("There are configuration difference")
}

const mountEnsure = async(opts) => {
  let ensureResult = false
  try {
    const {verbose, format, src, dest} = opts.options
    const ret = await diffPaths(src, verbose)

    ensureResult = ret["<"] == null
    const ensureDetail = ensureResult ? undefined : JSON.stringify(ret["<"])
    const result = util.format([{ensureResult, ensureDetail}], format)
    await util.write(result, dest)
  } catch (e) {
    console.error(`command failed by error`, e)
    throw e
  }
  if (!ensureResult) throw new Error("Expected path is not mounted")
}

export default {
  execute: async (option) => {
    switch(option.subcommand) {
      case "mount-ls":
        await mountLs(option)
        break
      case "mount-diff":
        await mountDiff(option)
        break
      case "mount-ensure":
        await mountEnsure(option)
        break
    }
  }
}