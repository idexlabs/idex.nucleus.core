"use strict";

const CoreEngine = require("./Core.engine");

const $coreEngine = new CoreEngine();

if (require.main === module) {
  $coreEngine.catch(console.error);
} else module.exports = $coreEngine;