import commandLineArgs from "command-line-args";
import commandLineUsage from "command-line-usage";
import * as impl from './impl'
import fs from 'fs'
import path from 'path'

const optionDef = [
  { name: "src", alias: "s", defaultValue: "-", description: "input filepath or '-'(stdin)"},
  { name: "dest", alias: "d", defaultValue: "-", description: "output filepath or '-'(stdout)"},
  { name: "format", alias: "f", defaultValue: "text", description: "output format. supported values are <json|text>"},
  { name: 'verbose', alias: 'v', defaultValue: false, description: 'verbose output',type: Boolean}
]

const usage = () => {
  const sections = [
    {
      header: "Synopsis",
      content: "$ hmradmin <command> <subcommand> [<options>]",
    },
    {
      header: "Command List",
      content: [
        { name: "node", summary: "Management resource-node" },
        { name: "service", summary: "Management services" },
      ],
    },
    {
      header: "Subcommand List(node)",
      content: [
        { name: "ls", summary: "list resouce-nodes" },
      ],
    },
    {
      header: "Subcommand List(service)",
      content: [
        { name: "mount-ls", summary: "list mount paths" },
        { name: "mount-diff", summary: "diff all mounted path" },
        { name: "mount-ensure", summary: "ensure specified path is mounted" },
      ],
    },
    {
      header: "options",
      optionList: optionDef
    },
  ];
  const usage = commandLineUsage(sections);
  console.info(usage);
};

const parseCommonOption = (argv) => {
  try {
    const options = commandLineArgs(optionDef, { argv});
    if (options.format !== "json" && options.format !== "text") {
      console.error(`Unknown format ${options.format}`)
      return null
    }
    if (options.src !== "-" && 
        !fs.existsSync(path.basename(options.src))) {
      console.error(`source not found ${options.src}`)
      return null
    }
    if (options.dest !== "-" && 
        !fs.existsSync(path.basename(path.dirname(options.dest)))) {
      console.error(`directory not found ${options.dest}`)
      return null
    }
    return options
  } catch (e) {
    console.error(e.message)
    return null
  }
}

const parseNodeArgv = (argv) => {
  const subcommandDefinitions = [
    { name: "subcommand", defaultOption: true},
  ]
  const subOptions = commandLineArgs(subcommandDefinitions, { argv, stopAtFirstUnknown: true });
  if (subOptions.subcommand !== "ls") {
    console.error(`Unexpected subcommand:${subOptions.subcommand}`)
    return null
  }
  argv = subOptions._unknown || [];
  const options = parseCommonOption(argv)
  if (options == null) {
    console.error(`Invalid option`)
    return null
  }
  return {
    subcommand: subOptions.subcommand,
    options
  }
}

const parseServiceArgv = (argv) => {
  const subcommandDefinitions = [
    { name: "subcommand", defaultOption: true},
  ]
  const subcommandList = ["mount-ls", "mount-diff", "mount-ensure"]
  const subOptions = commandLineArgs(subcommandDefinitions, { argv, stopAtFirstUnknown: true });
  if (subcommandList.indexOf(subOptions.subcommand) === -1) {
    console.error(`Unexpected subcommand:${subOptions.subcommand}`)
    return null
  }
  argv = subOptions._unknown || [];
  const options = parseCommonOption(argv)
  if (options == null) {
    console.error(`Invalid option`)
    return null
  }
  return {
    subcommand: subOptions.subcommand,
    options
  }
}

export default function parseArgv(args){ /*eslint-disable-line no-unused-vars*/
  const mainDefinitions = [
    { name: "command", defaultOption: true },
  ];
  const mainOptions = commandLineArgs(mainDefinitions, { stopAtFirstUnknown: true });
  let argv = mainOptions._unknown || [];
  let commandImpl = null
  let option = null
  if (mainOptions.command === "node") {
    commandImpl = impl.node
    option = parseNodeArgv(argv)
  } else if (mainOptions.command === "service") {
    commandImpl = impl.service
    option = parseServiceArgv(argv)
  } else {
    console.error(`Unknown command:${mainOptions.command}`)
  }

  if (commandImpl == null || option == null) {
    console.error("Invalid arguments")
    usage()
    return null
  }
  return {
    func : async () => {
      await commandImpl.execute(option)
    }
  }
}