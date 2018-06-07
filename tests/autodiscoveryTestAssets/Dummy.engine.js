"use strict";

const uuid = require('uuid');

const NucleusEngine = require('../../library/Engine.nucleus');

class DummyEngine extends NucleusEngine {

  constructor () {
    super('Dummy');
  }

  /**
   * Executes a simple dummy.
   *
   * @Nucleus ActionName ExecuteSimpleDummy
   *
   * @returns {Promise<void>}
   */
  executeSimpleDummy () {

    return Promise.resolve({ AID: uuid.v1() });
  }

  /**
   * Executes a simple dummy.
   *
   * @Nucleus ActionName ExecuteSimpleDummyWithArguments
   *
   * @argument {String} AID1
   * @argument {String} AID2
   *
   * @returns {Promise<{ AID1: String, AID2: String }>}
   */
  executeSimpleDummyWithArguments (AID1, AID2) {

    return Promise.resolve({ AID1, AID2 });
  }

  /**
   * Executes a simple dummy and broadcast an event after completion.
   *
   * @Nucleus ActionName ExecuteSimpleDummyWithEvent
   * @Nucleus EventName SimpleDummyWithEventExecuted
   *
   * @returns {Promise<void>}
   */
  executeSimpleDummyWithEvent () {

    return Promise.resolve();
  }

  /**
   * @Nucleus ActionName ExecuteSimpleDummyWithOptions
   *
   * @argument {String} AID1
   * @argument {Object} [options]
   * @argument {String} [options.AID2]
   * @argument {String} [options.AID3]
   * @argument {String} originUserID
   *
   * @return {Promise<Object>}
   */
  executeSimpleDummyWithOptions (AID1, options, originUserID) {
    const { AID2 = uuid.v4(), AID3 = uuid.v4() } = options;

    return Promise.resolve({ AID1, AID2, AID3 });
  }

  /**
   * Executes a simple dummy which has a complex signature.
   *
   * @Nucleus ActionName ExecuteSimpleDummyWithComplexSignature
   * @Nucleus ActionAlternativeSignature AID1 AID3
   *
   * @argument {String} AID1
   * @argument {Number} [AID2]
   * @argument {Boolean[]} [AID3]
   *
   * @returns {Promise<void>}
   */
  executeSimpleDummyWithComplexSignature (AID1, AID2) {

    return Promise.resolve();
  }

  /**
   * Executes a simple dummy.
   *
   * @Nucleus ActionName ExecuteSimpleDummyWithRandomExecutionTime
   *
   * @returns {Promise<void>}
   */
  executeSimpleDummyWithRandomExecutionTime () {

    return new Promise(resolve => {
      setTimeout(resolve.bind(null, { AID: uuid.v1() }), Math.floor(Math.random() * 1000 - 100 + 1) + 100);
    });
  }

}

module.exports = DummyEngine;