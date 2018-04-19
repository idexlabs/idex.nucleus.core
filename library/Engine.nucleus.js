"use strict";

/**
 * @fileOverview Define the Nucleus Engine class that is used to interface the action and event loop.
 *
 * @author Sebastien Filion
 *
 * @requires NPM:bluebird
 * @requires NPM:node-uuid
 * @requires ./Action.nucleus
 * @requires ./Datastore.nucleus
 * @requires ./Error.nucleus
 * @requires ./Event.nucleus
 * @requires ./validator.nucleus
 */

const Promise = require('bluebird');
const uuid = require('node-uuid');

const NucleusAction = require('./Action.nucleus');
const NucleusDatastore = require('./Datastore.nucleus');
const NucleusError = require('./Error.nucleus');
const NucleusEvent = require('./Event.nucleus');

const nucleusValidator = require('./validator.nucleus');

const ACTION_CONFIGURATION_BY_ACTION_NAME = 'ActionConfigurationByActionName';
const ACTION_QUEUE_NAME_BY_ACTION_NAME_ITEM_NAME = 'ActionQueueNameByActionName';
const ACTION_QUEUE_NAME_SET_ITEM_NAME = 'ActionQueueNameSet';

class NucleusEngine {

  /**
   * Creates a Nucleus engine. The constructor returns a Proxy that interfaces the class and a Promise that resolves once
   * the engine is ready. If no datastore is passed in the option, a default connection will be created.
   *
   * @argument {String} name
   * @argument {Object} options
   * @argument {NucleusDatastore} [options.$actionDatastore]
   * @argument {NucleusDatastore} [options.$engineDatastore]
   * @argument {NucleusDatastore} [options.$eventDatastore]
   *
   * @returns {Proxy}
   */
  constructor (engineName, options = {}) {
    const { $actionDatastore = new NucleusDatastore(), $engineDatastore = new NucleusDatastore(), $eventDatastore = new NucleusDatastore() } = options;

    /** @member {String} ID */
    Reflect.defineProperty(this, 'ID', { value: uuid.v1(), writable: false });
    /** @member {String} name */
    Reflect.defineProperty(this, 'name', { value: engineName, writable: false });

    this.$actionDatastore = $actionDatastore;
    this.$engineDatastore = this.$datastore = $engineDatastore;
    this.$eventDatastore = $eventDatastore;
    this.$eventSubscriberDatastore = this.$eventDatastore.duplicateConnection();

    this.$handlerDatastoreByName = {};
    this.$$handlerCallbackListByChannelName = {};

    this.actionTTL = 1000 * 60 * 60; // One hour
    this.eventTTL = 1000 * 60 * 5; // 5 minutes

    this.$$promise = Promise.all([ this.$actionDatastore, this.$engineDatastore, this.$eventDatastore, this.$eventSubscriberDatastore ]);

    // Make sure that the Action datastore is configured correctly.
    this.$actionDatastore
      .then(() => this.$actionDatastore.evaluateLUAScript(`return redis.call('CONFIG', 'GET', 'notify-keyspace-events');`))
      .then(([ configurationName, keyspaceNotificationActivated ]) => {
        if (keyspaceNotificationActivated !== 'AKE') {
          (this.$logger || console).error(`Redis' Keyspace Notification is not activated, please make sure to configure your Redis server correctly.
  # redis.conf
  # Check http://download.redis.io/redis-stable/redis.conf for more details.
  notify-keyspace-events AKE
  `);
          process.exit(699);
        }
      });

    // Make sure that the Engine datastore is configured correctly.
    this.$engineDatastore
      .then(() => this.$engineDatastore.evaluateLUAScript(`return redis.call('CONFIG', 'GET', 'save');`))
      .then(([ configurationName, saveActivated ]) => {
        if (nucleusValidator.isEmpty(saveActivated)) {
          (this.$logger || console).warn(`Redis' Save policy is not activated; because Redis is used a as main store in certain cases, please make sure to configure your Redis server correctly.
  # redis.conf
  # Check http://download.redis.io/redis-stable/redis.conf for more details.
  save 900 1
  `);
        }
      });

    const $$proxy = new Proxy(this, {
      get: function (object, property) {
        if (property in object) return (typeof object[property] === 'function') ? object[property].bind(object) : object[property];
        else if (property in object.$$promise) {
          return (typeof object.$$promise[property] === 'function') ? object.$$promise[property].bind(object.$$promise) : object.$$promise[property];
        }
        else undefined;
      }
    });

    Reflect.preventExtensions(this);

    this.$eventSubscriberDatastore.$$server.on('message', handleRedisEvent.bind({ $engine: this }));
    this.$eventSubscriberDatastore.$$server.on('pmessage', handleRedisEvent.bind({ $engine: this }));

    return $$proxy;
  }

  /**
   * Destroys the engine and the related datastores.
   *
   * @returns {Promise}
   */
  async destroy () {
    const $datastoreList = [this.$actionDatastore, this.$engineDatastore, this.$eventDatastore, this.$eventSubscriberDatastore];

    Object.keys(this.$handlerDatastoreByName)
      .forEach((datastoreName) => {

        $datastoreList.push(this.$handlerDatastoreByName[datastoreName]);
      });

    return Promise.all($datastoreList
      .map(($datastore) => {

        return $datastore.destroy();
      }));
  }

  /**
   * Executes all handler callback for a given channel name.
   *
   * @argument {String} channelName
   * @argument {NucleusEvent} $event
   *
   * @returns {Promise}
   */
  executeHandlerCallbackForChannelName (channelName, $event) {
    const $$handlerCallbackList = this.$$handlerCallbackListByChannelName[channelName] || [];

    return Promise.all($$handlerCallbackList
      .map(($$handlerCallback) => {

        return Promise.resolve($$handlerCallback.call(this, $event));
      }));
  }

  /**
   * Executes a pending action.
   *
   * @argument {NucleusAction} $action
   *
   * @returns {Promise<NucleusAction>}
   */
  async executeAction ($action) {
    const { ID: actionID, name: actionName, originalMessage: actionMessage, } = $action;
    const actionItemKey = $action.generateOwnItemKey();

    try {
      // 1. Retrieve the action configuration.
      const actionConfiguration = await this.$datastore.retrieveItemFromFieldByName(ACTION_CONFIGURATION_BY_ACTION_NAME, actionName);

      if (nucleusValidator.isEmpty(actionConfiguration)) throw new NucleusError.UndefinedContextNucleusError(`Could not retrieve the configuration for action "${actionName}".`, { actionID, actionName });

      $action.updateStatus(NucleusAction.ProcessingActionStatus);
      await this.$datastore.addItemToHashByName(actionItemKey, 'status', $action.status);

      const { fileName = '', fileType = '', argumentConfigurationByArgumentName = {}, methodName = '', actionSignature = [], actionAlternativeSignatureList } = actionConfiguration;

      // 2. Validate the action message.
      const actionMessageArgumentList = Object.keys(actionMessage);

      // Make sure that the message meets one of the proposed signature criteria.
      const fulfilledActionSignature = [ actionSignature ]
        .filter((argumentNameList) => {

          return argumentNameList
            .reduce((accumulator, argumentName) => {
              if (argumentName === 'options') accumulator.push(argumentName);
              else if (actionMessageArgumentList.includes(argumentName)) accumulator.push(argumentName);

              return accumulator;
            }, []).length === argumentNameList.length;
        })[0];

      if (!fulfilledActionSignature) throw new NucleusError.UndefinedContextNucleusError("Can't execute the action because one or more argument is missing");

      if (!nucleusValidator.isEmpty(argumentConfigurationByArgumentName)) {
        const Signature = nucleusValidator.struct(argumentConfigurationByArgumentName);

        Signature(actionMessage);
      }

      const argumentList = fulfilledActionSignature
        .reduce((accumulator, argumentName) => {
          if (argumentName === 'options') accumulator.push(actionMessage);
          else accumulator.push(actionMessage[argumentName]);

          return accumulator;
        }, []);

      // 3. Retrieve the execution context and method.
      const $executionContext = this;

      // 4. Execute action.
      const actionResponse = await $executionContext[methodName].apply($executionContext, argumentList);

      $action.updateStatus(NucleusAction.CompletedActionStatus);
      $action.updateMessage(actionResponse);
      await this.$datastore.addItemToHashByName(actionItemKey, 'status', $action.status, 'finalMessage', $action.finalMessage);

      // 5. Send event to action channel.

      const $event = new NucleusEvent('ActionStatusUpdated', {
        actionFinalMessage: actionResponse,
        actionID,
        actionName,
        actionStatus: 'Completed'
      });

      await this.publishEventToChannelByName(`Action:${actionID}`, $event);

      return Promise.resolve($action);
    } catch (error) {
      if (!(error instanceof NucleusError)) error = new NucleusError(`The execution of the action "${actionName}" failed because of an external error: ${error}.`, error);

      $action.updateStatus(NucleusAction.FailedActionStatus);
      $action.updateMessage({ error });
      await this.$datastore.addItemToHashByName(actionItemKey, 'status', $action.status, 'finalMessage', $action.finalMessage);

      return Promise.reject(error);
    }
  }

  /**
   * Handles event published to a specific channel given a handler callback.
   *
   * @argument {String} channelName
   * @argument {Function} handlerCallback
   *
   * @returns {Promise<Object>}
   */
  handleEventByChannelName (channelName, handlerCallback) {
    if (!this.$$handlerCallbackListByChannelName.hasOwnProperty(channelName)) this.$$handlerCallbackListByChannelName[channelName] = [];

    this.$$handlerCallbackListByChannelName[channelName].push(handlerCallback);

    return Promise.resolve({ channelName, handlerCallback });
  }

  /**
   * Publishes an action given a queue name.
   * @example
   * const queueName = 'Dummy';
   * const $action = new NucleusAction('DummyAction', {});
   *
   * $engine.publishActionToQueueByName(queueName, $action);
   *
   * @argument {String} actionQueueName
   * @argument {NucleusAction} $action
   *
   * @returns {Promise<Object>}
   */
  async publishActionToQueueByName (actionQueueName, $action) {
    if (!nucleusValidator.isString(actionQueueName)) throw new NucleusError.UnexpectedValueTypeNucleusError("The action queue name must be a string.");
    if (!($action instanceof NucleusAction)) throw new NucleusError.UnexpectedValueTypeNucleusError("The action is not a valid Nucleus action.");

    const { isMember: actionQueueNameRegistered } = await this.$actionDatastore.itemIsMemberOfSet(ACTION_QUEUE_NAME_SET_ITEM_NAME, actionQueueName);

    if (!actionQueueNameRegistered) throw new NucleusError.UndefinedContextNucleusError(`The action queue name ${actionQueueName} doesn't exist or has not been properly registered.`);

    const actionKeyName = $action.generateOwnItemKey();

    $action.updateStatus(NucleusAction.PendingActionStatus);

    return this.$actionDatastore.$$server.multi()
      // Store the action as a hash item.
      .hmset(actionKeyName, 'ID', $action.ID, 'meta', $action.meta.toString(), 'name', $action.name, 'status', $action.status, 'originalMessage', $action.originalMessage.toString(), 'originUserID', $action.originUserID)
      // Add the action key name into the appropriate action queue.
      .lpush(actionQueueName, `${$action}`)
      // Expire the action in a set TTL, the action should be kept a little while for debugging but not for too long to
      // prevent unnecessary memory bulk-up.
      .pexpire(actionKeyName, this.actionTTL)
      .execAsync()
      .return({ actionQueueName, $action });
  }

  /**
   * Publishes an action given its name and a message, then handle the response.
   * @example
   * const { dummy } = await $engine.publishActionByNameAndHandleResponse('RetrieveDummyByID', { dummyID }, originUserID);
   *
   * @argument {String} actionName
   * @argument {Object} actionMessage
   * @argument {String} originUserID
   *
   * @returns {Promise<Object>}
   */
  async publishActionByNameAndHandleResponse (actionName, actionMessage = {}, originUserID) {
    if (!nucleusValidator.isString(actionName)) throw new NucleusError.UnexpectedValueTypeNucleusError("The action name must be a string.");
    if (!nucleusValidator.isObject(actionMessage)) throw new NucleusError.UnexpectedValueTypeNucleusError("The action message must be an object.");
    if (!originUserID) throw new NucleusError.UndefinedValueNucleusError("The origin user ID must be defined.");

    const actionQueueName = await this.$actionDatastore.retrieveItemFromFieldByName(ACTION_QUEUE_NAME_BY_ACTION_NAME_ITEM_NAME, actionName);

    const $action = new NucleusAction(actionName, actionMessage, { originEngineID: this.ID, originEngineName: this.name, originProcessID: process.pid, originUserID });

    await this.publishActionToQueueByName(actionQueueName, $action);

    return new Promise((resolve, reject) => {
      const { ID: actionID } = $action;

      this.subscribeToChannelName(`Action:${actionID}`);

      this.handleEventByChannelName(`Action:${actionID}`, async ($event) => {
        const { name: eventName, message: eventMessage } = $event;

        switch (eventName) {
          case 'ActionStatusUpdated':
            const { actionFinalMessage, actionID, actionName, actionStatus } = eventMessage;
            const actionKeyName = NucleusAction.generateItemKey('NucleusAction', actionID,  actionName);

            switch (actionStatus) {
              case 'Completed':
              case 'Failed':
                await this.$actionDatastore.addItemToHashByName(actionKeyName, 'finalMessage', actionFinalMessage, 'status', actionStatus);

                ((actionStatus === 'Completed') ? resolve : reject)(actionFinalMessage);

                this.unsubscribeFromChannelName(`Action:${actionID}`);
                break;

              default:
                await this.$actionDatastore.addItemToHashByName(actionFinalMessage, 'status', actionStatus);
            }

            break;
          default:
            // NOTE: Implement event pipe
        }
      });
    });
  }

  /**
   * Publishes an event given a channel name.
   * @example
   * const channelName = 'Dummy';
   * const $event = new NucleusEvent('DummyEvent', {});
   *
   * $engine.publishEventToChannelByName(channelName, $event);
   *
   * @argument {String} channelName
   * @argument {NucleusEvent} $event
   *
   * @returns {Promise<Object>}
   */
  publishEventToChannelByName (channelName, $event) {
    if (!nucleusValidator.isString(channelName)) throw new NucleusError.UnexpectedValueTypeNucleusError("The event channel name must be a string.");
    if (!($event instanceof NucleusEvent)) throw new NucleusError.UnexpectedValueTypeNucleusError("The event is not a valid Nucleus event.");

    const timestamp = Date.now();

    const eventKeyName = $event.generateOwnItemKey();

    return this.$eventDatastore.$$server.multi()
      // Store the event as a hash item.
      .hmset(eventKeyName, 'ID', $event.ID, 'message', $event.message.toString(), 'meta', $event.meta.toString(), 'name', $event.name)
      // Add the event key name to a local set.
      .zadd(channelName, timestamp + this.eventTTL, eventKeyName)
      // Remove older events from the set.
      .zremrangebyscore(channelName, 0, timestamp)
      // Expire the event in a set TTL.
      .pexpire(eventKeyName, this.eventTTL)
      // Publish the event through Redis for other engine.
      .publish(channelName, JSON.stringify($event))
      .execAsync()
      .return({ channelName, $event });
  }

  /**
   * Subscribes to a channel given its name.
   *
   * @argument {String} channelName
   *
   * @returns {Promise<void>}
   */
  async subscribeToChannelName (channelName) {
    await this.$eventSubscriberDatastore.$$server.subscribe(channelName);

    return Promise.resolve();
  }

  /**
   * Unsubscribes to a channel given its name.
   *
   * @argument {String} channelName
   *
   * @returns {Promise<void>}
   */
  async unsubscribeFromChannelName (channelName) {
    await this.$eventSubscriberDatastore.$$server.unsubscribe(channelName);

    return Promise.resolve();
  }

}

module.exports = NucleusEngine;

function handleRedisEvent (...argumentList) {
  const { $engine } = this;

  if (argumentList.length === 3) {
    const channelPattern = arguments[0];
    const channelName = arguments[1];
    const data = arguments[2];

    // NOTE: Implement handling of pattern channel
  } else if (argumentList.length === 2) {
    const channelName = arguments[0];
    const data = arguments[1];

    const parsedData = NucleusDatastore.parseItem(data);

    if (parsedData.hasOwnProperty('name') && parsedData.hasOwnProperty('message')) {
      const { meta, message, name } = parsedData;
      const $event = new NucleusEvent(name, message, meta);

      // NOTE: Should log any error thrown by the handler.
      $engine.executeHandlerCallbackForChannelName(channelName, $event)
        .catch(console.error);
    }
  }
}