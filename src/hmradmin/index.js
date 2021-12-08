#!/usr/bin/env node

import parseArgv from "./options";

const opts = parseArgv(process.argv);

if (opts) {
  const fn = opts.func;
  fn().catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
} else {
  process.exitCode = 2;
}