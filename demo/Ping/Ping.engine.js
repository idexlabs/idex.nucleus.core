"use strict";

const { NucleusEngine } = require('../../');

class PingEngine extends NucleusEngine {

  constructor () {
    super('Ping', {
      automaticallyAutodiscover: true,
      automaticallyRetrievePendingActions: true
    });
  }

  /**
   * Pings
   *
   * @Nucleus ActionName Ping
   *
   * @returns {Promise<Object>}
   */
  ping () {
    // Every action is expected to return a Promise that resolves to an object.

    return Promise.resolve({ ping: "Ping" });
  }

}

module.exports = PingEngine;