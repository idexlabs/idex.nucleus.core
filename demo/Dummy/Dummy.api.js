"use strict";

const { NucleusResource, NucleusResourceAPI } = require('../../');

class DummyResourceModel extends NucleusResource {

  constructor (resourceAttributes, authorUserID) {
    super('Dummy', { name: 'string' }, resourceAttributes, authorUserID);
  }

}

/**
 * @Nucleus ActionName CreateDummy
 *
 * @argument {Object} dummy
 * @argument {String} originUserID
 *
 * @returns {Promise<{ dummy: Dummy }>}
 * @memberOf DummyAPI
 */
function create (dummy, originUserID) {

  return NucleusResourceAPI.create.call(this, 'Dummy', DummyResourceModel, dummy, originUserID);
}

const DummyAPI = {
  create
};

module.exports = DummyAPI;