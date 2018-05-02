"use strict";

const { NucleusEngine } = require('../../');

class DummyEngine extends NucleusEngine {

  constructor () {
    super('Dummy', {
      automaticallyAutodiscover: true,
      automaticallyManageResourceRelationship: true,
      automaticallyRetrievePendingActions: true
    });
  }

}

module.exports = DummyEngine;