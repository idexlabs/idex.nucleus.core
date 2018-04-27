"use strict";

/**
 * @fileOverview Define the Nucleus Event class that is used to create an event.
 *
 * @author Sebastien Filion
 */

const NucleusError = require('./Error.nucleus');
const NucleusResource = require('./Resource.nucleus');

const nucleusValidator = require('./validator.nucleus');

/**
 * @module NucleusEvent
 * @typedef NucleusEvent
 * @property {String} ID
 * @property {Object} meta
 * @property {String} meta.createdISOTime
 * @property {String} meta.originEngineID
 * @property {String} meta.originEngineName
 * @property {String} meta.originProcessID
 * @property {String} name
 * @property {Object} message
 */

class NucleusEvent extends NucleusResource {

  /**
   * Creates a Nucleus Event.
   * @example
   * const event = new NucleusEvent(eventName, eventMessage, options);
   *
   * @argument {String} eventName
   * @argument {Object} eventMessage
   * @argument {Object} [options]
   * @argument {String} [options.originEngineID]
   * @argument {String} [options.originEngineName]
   * @argument {String} [options.originProcessID]
   *
   * @throws Will throw an error if the event name is missing or an empty string.
   */
  constructor (eventName, eventMessage = {}, options = {}) {
    if (arguments.length === 1 && arguments[0] instanceof NucleusEvent) return arguments[0];
    else {
      if (!nucleusValidator.isString(eventName) || nucleusValidator.isEmpty(eventName)) throw new NucleusError.UndefinedValueNucleusError("The event name is mandatory.");

      const { originEngineID = 'Unknown', originEngineName = 'Unknown', originProcessID = process.pid, originUserID = 'Unknown' } = options;

      super('NucleusEvent', { originEngineID, originEngineName, originProcessID }, originUserID);

      /** @member {String} name */
      Reflect.defineProperty(this, 'name', { value: eventName, writable: false, enumerable: true });

      /** @member {Object} message */
      Reflect.defineProperty(this, 'message', {
        value: Object.assign(NucleusEvent.generateAttributeProxy(), eventMessage),
        writable: false,
        enumerable: true
      });

      Object.freeze(this.message);
    }

    Reflect.preventExtensions(this);
  }

}

module.exports = NucleusEvent;