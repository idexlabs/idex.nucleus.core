"use strict";

/**
 * @fileOverview Define the Nucleus Resource class that is used to create a resource.
 *
 * @author Sebastien Filion
 */

const uuid = require('uuid');

const NucleusError = require('./Error.nucleus');

const nucleusValidator = require('./validator.nucleus');

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
   * @argument {Object resourceStructure
   * @argument {Object} resourceAttributes
   * @argument {Object} resourceMeta
   * @argument {String} authorUserID
   *
   * @returns {NucleusResource}
   */
  constructor (resourceType = 'Undefined', resourceStructure, resourceAttributes, authorUserID) {
    // resourceAttributes, resourceMeta = {}, authorUserID = 'Unknown'

    if (nucleusValidator.isString(resourceAttributes.ID) && nucleusValidator.isObject(resourceAttributes.meta)) {
      Object.assign(this, resourceAttributes);

      Reflect.defineProperty(this, 'ID', { enumerable: true, writable: false });

      Reflect.defineProperty(this, 'type', { enumerable: true, value: resourceType, writable: false });

      Reflect.defineProperty(this, 'meta', {
        enumerable: true,
        value: Object.assign(NucleusResource.generateAttributeProxy(), (resourceAttributes.meta || {}), {
          [Symbol.toPrimitive] () {

            return `${resourceType} created on ${this.createdISOTime} by ${this.authorUserID || this.originUserID}.`;
          }
        }),
        writable: true
      });

    } else {
      const resourceMeta = resourceAttributes.meta || {};

      Reflect.deleteProperty(resourceAttributes, 'meta');

      /** @member {String} ID */
      Reflect.defineProperty(this, 'ID', { enumerable: true, value: uuid.v1(), writable: false });

      /** @member {String} ID */
      Reflect.defineProperty(this, 'type', { enumerable: true, value: resourceType, writable: false });

      /** @member {Object} meta */
      Reflect.defineProperty(this, 'meta', {
        enumerable: true,
        value: Object.assign(NucleusResource.generateAttributeProxy(), resourceMeta, {
          createdISOTime: new Date().toISOString(),
          authorUserID,
          [Symbol.toPrimitive] () {

            return `${resourceType} created on ${this.createdISOTime} by ${this.authorUserID || this.originUserID}.`;
          }
        }),
        writable: true
      });

      new nucleusValidator.struct(resourceStructure)(resourceAttributes);

      Object.assign(this, resourceAttributes);
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

    return NucleusResource.generateItemKey(this.type, this.ID);
  }

  static generateItemKey (...attributeList) {

    return attributeList.join(':');
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