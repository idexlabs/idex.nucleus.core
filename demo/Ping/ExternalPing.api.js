"use strict";

const ExternalPing = {

  /**
   * Pings
   *
   * @Nucleus ActionName ExternalPing
   *
   * @returns {Promise<Object>}
   */
  externalPing () {

    return Promise.resolve({ ping: 'ExternalPing' });
  }
};

module.exports = ExternalPing;