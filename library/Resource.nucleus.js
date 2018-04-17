"use strict";

/**
 * @fileOverview Define the Nucleus Resource class that is used to create a resource.
 *
 * @author Sebastien Filion
 *
 * @requires NPM:node-uuid
 * @requires ./Error.nucleus
 */

const uuid = require('node-uuid');

const NucleusError = require('./Error.nucleus');

/**
 * @module NucleusResource
 * @typedef NucleusResource
 * @property {String} ID
 * @property {Object} meta
 * @property {String} meta.createdISOTime
 * @property {String} [meta.modifiedISOTime]
 * @property {String} [meta.originUserID]
 */

class NucleusResource {

  /**
   * Creates a Nucleus Resource.
   * @example
   * const $resource = new NucleusResource();
   *
   * @argument {String} resourceType
   * @argument {String} resourceMeta
   * @argument {String} originUserID
   *
   * @returns {NucleusResource}
   */
  constructor (resourceType = 'Undefined', resourceMeta = {}, originUserID = 'Unknown') {
    if (arguments.length === 1 && arguments[0] instanceof this.constructor) Object.assign(this, arguments[0]);
    else {
      /** @member {String} ID */
      Reflect.defineProperty(this, 'ID', { value: uuid.v1(), writable: false });

      /** @member {String} ID */
      Reflect.defineProperty(this, 'type', { value: resourceType, writable: false });

      /** @member {Object} meta */
      Reflect.defineProperty(this, 'meta', {
        value: Object.assign(NucleusResource.generateAttributeProxy(), resourceMeta, {
          createdISOTime: new Date().toISOString(),
          originUserID,
          [Symbol.toPrimitive] () {

            return `${resourceType} created on ${this.createdISOTime} by ${this.originUserID}.`;
          }
        }),
        writable: true
      });

      /** @member {String} originUserID */
      this.originUserID = originUserID;
    }
  }

  [Symbol.toPrimitive] (primitiveType) {
    // If forced to a String, it will return a summary of the resource.
    if (primitiveType === 'string') return this.generateOwnItemKey();
  }

  get [Symbol.toStringTag] () {

    return this.type;
  }

  generateOwnItemKey () {

    return NucleusResource.generateItemKey(this.type, this.ID, this.name);
  }

  static generateItemKey (resourceType, resourceID, resourceName) {

    return `${resourceType}:${resourceName}:${resourceID}`;
  }

  /**
   * Generates an attribute proxy, it will ensure that any property gets stringify as JSON.
   *
   * @param {Object} object
   *
   * @returns {Proxy}
   */
  static generateAttributeProxy (object = {}) {
    const $proxy = new Proxy(object, {
      get: function (object, property) {
        if (property === 'toString' || property === Symbol.toStringTag) return JSON.stringify.bind(JSON, object);
        else return object[property];
      }
    });

    return $proxy;
  }

}

module.exports = NucleusResource;