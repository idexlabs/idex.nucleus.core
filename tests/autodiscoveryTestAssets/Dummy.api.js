"use strict";

/**
 * @Nucleus ResourceAPIName DummyAPI
 *
 * @typedef {Object} Dummy
 * @property {String} string
 * @property {Number} number
 * @property {Boolean} boolean
 *
 * @memberOf DummyAPI
 */

const resourceType = 'Dummy';

/**
 * @Nucleus ActionNameToExtend CreateResource
 *
 * @memberOf DummyAPI
 */

/**
 * Is an extendable dummy method.
 *
 * @Nucleus ActionName ExtendResource
 * @Nucleus ExtendableActionName `Extend{resourceType}`
 * @Nucleus ExtendableEventName `${resourceType}Extended`
 * @Nucleus ExtendableActionAlternativeSignature AID2 AID3
 * @Nucleus ActionArgumentDefault AID1 '85b4a289-8a31-428b-9c7a-dea7538cb117'
 *
 * @argument {String} AID1
 * @argument {String} AID2
 * @argument {String} AID3
 *
 * @returns {Promise<Object>}
 */
function extendResource (AID1, AID2, AID3) {

  return Promise.resolve({ AID1, AID2, AID3 });
}

module.exports = {
  resourceType,
  extendResource
};