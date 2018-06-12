"use strict";
// Core/Core.engine.js
const { NucleusEngine } = require('idex.nucleus');

class CoreEngine extends NucleusEngine {

  constructor () {

    super('Core', {
      automaticallyAutodiscover: true,
      automaticallyRetrievePendingActions: true
    });
  }

}

module.exports = CoreEngine;