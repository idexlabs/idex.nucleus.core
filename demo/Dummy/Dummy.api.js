"use strict";

/**
 * @fileOverview Automatically generates the persistent storage API for the Dummy resource.
 * @see NucleusResourceAPI
 *
 * @author Sebastien Filion <sebastien@sofdesk.com>
 */

const resourceType = 'Dummy';

/**
 * @Nucleus ResourceAPIName DummyAPI
 *
 * @typedef {Object} Dummy
 * @property {String} [catalogItemID]
 * @property {String|Object} description
 * @property {String|Object} name
 * @property {String|Object} title
 */

/**
 * @Nucleus ActionNameToExtend CreateResource
 *
 * @argument {Object} dummyAttributes
 * @argument {String} originDummyID
 *
 * @memberOf DummyAPI
 * @function create
 */

/**
 * @Nucleus ActionNameToExtend RemoveResourceByID
 *
 * @argument {String} dummyID
 * @argument {String} originDummyID
 *
 * @memberOf DummyAPI
 * @function removeByID
 */

/**
 * @Nucleus ActionNameToExtend RetrieveResourceByID
 *
 * @argument {String} dummyID
 * @argument {String} originDummyID
 *
 * @memberOf DummyAPI
 * @function retrieveByID
 */

/**
 * @Nucleus ActionNameToExtend UpdateResourceByID
 *
 * @argument {String} dummyID
 * @argument {Object} dummyAttributes
 * @argument {String} originDummyID
 *
 * @memberOf DummyAPI
 * @function updateByID
 */

/**
 * @class DummyAPI
 */
module.exports = {
  resourceType
};