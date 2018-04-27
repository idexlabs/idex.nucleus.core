"use strict";

/**
 * @fileOverview Define the Nucleus Action class that is used to create an action.
 *
 * @author Sebastien Filion
 */

const NucleusError = require('./Error.nucleus');
const NucleusResource = require('./Resource.nucleus');

const nucleusValidator = require('./validator.nucleus');

const CompletedActionStatus = 'Completed';
const FailedActionStatus = 'Failed';
const PendingActionStatus = 'Pending';
const ProcessingActionStatus = 'Processing';

/**
 * The list of available action status.
 * @enum {Object}
 */
const NucleusActionStatusWeightList = [
  PendingActionStatus,
  ProcessingActionStatus,
  FailedActionStatus,
  CompletedActionStatus
];

/**
 * @module NucleusAction
 * @typedef NucleusAction
 * @property {String} ID
 * @property {Object} [finalMessage]
 * @property {Object} meta
 * @property {String} meta.createdISOTime
 * @property {String} [meta.modifiedISOTime]
 * @property {String} meta.originEngineID
 * @property {String} meta.originEngineName
 * @property {String} meta.originProcessID
 * @property {String} meta.originUserID
 * @property {String} name
 * @property {Object} originalMessage
 * @property {String} originUserID
 * @property {String} status
 */

class NucleusAction extends NucleusResource {

  /**
   * Creates a Nucleus Action.
   * @example
   * const $action = new NucleusAction(actionName, actionMessage, options);
   * const $action = new NucleusAction({ meta: { ... }, name: actionName, originalMessage: actionMessage,... });
   *
   * @argument {String} actionName
   * @argument {Object} actionMessage
   * @argument {Object} [options]
   * @argument {String} [options.originEngineID]
   * @argument {String} [options.originEngineName]
   * @argument {String} [options.originProcessID]
   * @argument {String} [options.originUserID]
   *
   * @returns {NucleusAction}
   *
   * @throws Will throw an error if the action name is missing or an empty string.
   */
  constructor (actionName, actionMessage = {}, options = {}) {
    if (arguments.length === 1 && arguments[0] instanceof NucleusAction) return arguments[0];

    if (arguments.length === 1 && nucleusValidator.isObject(arguments[0])) {
      const action = arguments[0];

      super('NucleusAction', action);

      Reflect.defineProperty(this, 'name', { writable: false });

      Reflect.defineProperty(this, 'originalMessage', {
        value: Object.assign(NucleusAction.generateAttributeProxy(), this.originalMessage),
        writable: false
      });

      Object.freeze(this.originalMessage);
    }
    else {
      if (!nucleusValidator.isString(actionName) || nucleusValidator.isEmpty(actionName)) throw new NucleusError.UndefinedValueNucleusError("The action name is mandatory.");

      const { originEngineID = 'Unknown', originEngineName = 'Unknown', originProcessID = process.pid, originUserID = 'Unknown' } = options;

      super('NucleusAction', { originEngineID, originEngineName, originProcessID }, originUserID);

      /** @member {String} name */
      Reflect.defineProperty(this, 'name', { value: actionName, writable: false });

      /** @member {Object} originalMessage */
      Reflect.defineProperty(this, 'originalMessage', {
        value: Object.assign(NucleusAction.generateAttributeProxy(), actionMessage),
        writable: false
      });

      Object.freeze(this.originalMessage);

      /** @member {String} originUserID */
      this.originUserID = originUserID;

      this.finalMessage = undefined;
      this.status = undefined;
    }

    // Reflect.preventExtensions(this);
  }


  [Symbol.toPrimitive] (primitiveType) {
    // If forced to a String, it will return a summary of the action that could be used as a Key.
    if (primitiveType === 'string') return `NucleusAction:${this.name}:${this.ID}`;
    // If forced to a Number, it will return the status weight.
    if (primitiveType === 'number') return NucleusActionStatusWeightList.indexOf(this.status);
  }

  /**
   * Updates the Nucleus Action final message.
   *
   * @argument {Object} actionMessage
   *
   * @throws Will throw an error if the action message is not an object.
   */
  updateMessage (actionMessage = {}) {
    if (!nucleusValidator.isObject(actionMessage)) throw new NucleusError.UnexpectedValueTypeNucleusError("The action message is not an object as expected.");

    this.meta.modifiedISOTime = new Date().toISOString();

    Reflect.defineProperty(this, 'finalMessage', {
      value: Object.assign(NucleusAction.generateAttributeProxy(), actionMessage),
      writable: false
    });
  }

  /**
   * Updates the Nucleus Action status.
   * @example
   * $action.updateStatus(NucleusAction.CompletedActionStatus);
   *
   * @argument {String} actionStatus
   */
  updateStatus (actionStatus) {
    if (!~NucleusActionStatusWeightList.indexOf(actionStatus)) throw new NucleusError.UnexpectedValueNucleusError(`The action status '${actionStatus}' is not a valid status.`);

    this.status = actionStatus;

    const $$currentTime = new Date();

    this.meta[`markedAs${actionStatus}ISOTime`] = $$currentTime.toISOString();
    this.meta[`markedAs${actionStatus}Timestamp`] = $$currentTime.valueOf();

    if (actionStatus === CompletedActionStatus) this.meta.completedInMillisecondTime = $$currentTime.valueOf() - this.meta[`markedAs${PendingActionStatus}Timestamp`];
  }

}

/** @memberOf NucleusAction */
NucleusAction.CompletedActionStatus = CompletedActionStatus;
/** @memberOf NucleusAction */
NucleusAction.FailedActionStatus = FailedActionStatus;
/** @memberOf NucleusAction */
NucleusAction.PendingActionStatus = PendingActionStatus;
/** @memberOf NucleusAction */
NucleusAction.ProcessingActionStatus = ProcessingActionStatus;
/** @memberOf NucleusAction */
NucleusAction.NucleusActionStatusWeightList = NucleusActionStatusWeightList;

module.exports = NucleusAction;