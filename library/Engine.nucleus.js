"use strict";

/**
 * @fileOverview Define the Nucleus Engine class that is used to interface the action and event loop.
 *
 * @author Sebastien Filion
 */

const Promise = require('bluebird');
const childProcess = require('child_process');
const JSDocParser = require.resolve('jsdoc/jsdoc.js');
const uuid = require('node-uuid');
const path = require('path');

const NucleusAction = require('./Action.nucleus');
const NucleusDatastore = require('./Datastore.nucleus');
const NucleusError = require('./Error.nucleus');
const NucleusEvent = require('./Event.nucleus');
const NucleusResourceRelationshipDatastore = require('./ResourceRelationshipDatastore.nucleus');

const nucleusValidator = require('./validator.nucleus');

const ACTION_CONFIGURATION_BY_ACTION_NAME = 'ActionConfigurationByActionName';
const ACTION_QUEUE_NAME_BY_ACTION_NAME_ITEM_NAME = 'ActionQueueNameByActionName';
const ACTION_QUEUE_NAME_SET_ITEM_NAME = 'ActionQueueNameSet';

const NODE_ENVIRONMENT = process.env.NODE_ENV || 'development';
const DEVELOPMENT_ENVIRONMENT_NAME = 'development';
const TESTING_ENVIRONMENT_NAME = 'testing';
const PRODUCTION_ENVIRONMENT_NAME = 'production';

const $$complexDataTypeRegularExpression = new RegExp(/([a-z]+)\.<[A-Za-z]+>/);
const $$engineFileNameRegularExpression = new RegExp(/.*engine\.js$/);

// NOTE: It seems like the system slows downs processing requests when there's a very high load (100+ requests under 25ms)
// The issue is caused mostly by how the requests get parallelized,
// One way to resolve this might be to create more redis connection on the fly.

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
   * @argument {NucleusResourceRelationshipDatastore} [options.$resourceRelationshipDatastore]
   * @argument {NucleusDatastore} [options.$logger]
   * @argument {Boolean} [options.automaticallyAutodiscover=false]
   * @argument {Boolean} [options.automaticallyManageResourceRelationship=false]
   * @argument {Boolean} [options.automaticallyRetrievePendingActions=false]
   * @argument {String} [options.defaultActionQueueName=<Engine's name>]
   *
   * @returns {Proxy}
   */
  constructor (engineName, options = {}) {
    const {
      $actionDatastore = new NucleusDatastore(),
      $engineDatastore = new NucleusDatastore(),
      $eventDatastore = new NucleusDatastore(),
      $resourceRelationshipDatastore = new NucleusResourceRelationshipDatastore(),
      $logger = console,
      automaticallyAutodiscover = false,
      automaticallyManageResourceRelationship = false,
      automaticallyRetrievePendingActions = false,
      defaultActionQueueName = engineName
    } = options;

    /** @member {String} ID */
    Reflect.defineProperty(this, 'ID', { value: uuid.v1(), writable: false });
    /** @member {String} name */
    Reflect.defineProperty(this, 'name', { value: engineName, writable: false });

    this.defaultActionQueueName = defaultActionQueueName;

    this.$actionDatastore = $actionDatastore;
    this.$engineDatastore = this.$datastore = $engineDatastore;
    this.$eventDatastore = $eventDatastore;
    this.$eventSubscriberDatastore = this.$eventDatastore.duplicateConnection();

    if (automaticallyManageResourceRelationship) this.$resourceRelationshipDatastore = $resourceRelationshipDatastore;

    this.$handlerDatastoreByName = {};

    this.$logger = $logger;

    this.actionTTL = 1000 * 60 * 60; // One hour
    this.eventTTL = 1000 * 60 * 5; // 5 minutes

    this.$logger.info(`Initializing the ${this.name} engine...`);

    // Execute everything needed during the initialization phase of the engine.
    this.$$promise = Promise.all([ this.$actionDatastore, this.$engineDatastore, this.$eventDatastore, this.$eventSubscriberDatastore ])
      .then(this.verifyRedisConfiguration.bind(this))
      .then(() => { return this.$datastore.addItemToSetByName(ACTION_QUEUE_NAME_SET_ITEM_NAME, this.defaultActionQueueName); })
      .then(() => { if (automaticallyAutodiscover) return this.autodiscover(); })
      .then(() => { if (automaticallyRetrievePendingActions) return this.subscribeToActionQueueUpdate(this.defaultActionQueueName); })
      .then(() => {
        this.$logger.info(`The ${this.name} engine has successfully initialized.`);
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

    return $$proxy;
  }

  /**
   * Autodiscovers the module's actions.
   *
   * @returns {Promise<{actionConfigurationList: Object}>}
   */
  async autodiscover () {
    const engineDirectoryPath = NucleusEngine.retrieveModuleDirectoryPath(this.name);
    // Retrieve all of the modules doclets using the JSDoc parser.
    const docletList = await new Promise((resolve, reject) => {
      const chunkList = [];
      const $$childProcess = childProcess.spawn(JSDocParser, [ '-X', '-r', engineDirectoryPath ], { cwd: process.cwd() });

      $$childProcess.stdout.setEncoding('utf8');
      $$childProcess.stderr.setEncoding('utf8');

      $$childProcess.stdout.on('data', chunkList.push.bind(chunkList));
      $$childProcess.stderr.on('data', reject);

      $$childProcess.on('close', () => {
        const docletList = JSON.parse(chunkList.join(""));

        resolve(docletList);
      });
      $$childProcess.on('error', reject);
    });

    // Filter out doclets that does not have a "Nucleus" tag.
    const filteredDocletList = docletList
      .filter((doclet) => {

        return (nucleusValidator.isArray(doclet.tags)) ? doclet.tags[0].title === 'nucleus' : false;
      });

    // Collect all relevant data from the filtered doclet.
    const actionConfigurationList = filteredDocletList
      .filter(({ kind }) => {

        return kind === 'function';
      })
      .map((doclet) => {
        const nucleusTagsByName = doclet.tags
          .reduce((accumulator, { value }) => {
            const [ nucleusTagName, ...nucleusTagOptionList ] = value.split(" ");

            accumulator[nucleusValidator.shiftFirstLetterToLowerCase(nucleusTagName)] = (
              (nucleusTagOptionList.length === 1) ?
              nucleusTagOptionList[0] :
              nucleusTagOptionList
            );

            return accumulator;
          }, {});

        const argumentConfigurationByArgumentName = (doclet.params || [])
          .reduce((accumulator, { name: argumentName, optional: argumentIsOptional, type: { names: argumentTypeList } }) => {
            const cleanedArgumentType = nucleusValidator.shiftFirstLetterToLowerCase(argumentTypeList.join('|')).replace($$complexDataTypeRegularExpression, "$1");
            accumulator[argumentName] = (!!argumentIsOptional) ? `${cleanedArgumentType}?` : cleanedArgumentType;

            return accumulator;
          }, {});

        return Object.assign({
          actionSignature: doclet.meta.code.paramnames,
          argumentConfigurationByArgumentName,
          contextName: (doclet.memberof === `${this.name}Engine`) ? 'Self' : doclet.memberof,
          fileName: doclet.meta.filename,
          filePath: path.join(doclet.meta.path, doclet.meta.filename),
          methodName: doclet.name
        }, nucleusTagsByName);
      });

    await Promise.all(actionConfigurationList
      .map((actionConfiguration) => {
        const { actionName } = actionConfiguration;

        return Promise.all([
          this.$datastore.addItemToHashFieldByName(ACTION_CONFIGURATION_BY_ACTION_NAME, actionName, actionConfiguration),
          this.$datastore.addItemToHashFieldByName(ACTION_QUEUE_NAME_BY_ACTION_NAME_ITEM_NAME, actionName, this.defaultActionQueueName)
        ]);
      }));

    /**
     * @namespace {Object} actionConfiguration
     * @property {String} [actionEvent]
     * @property {String} actionName
     * @property {String[]} [alternativeActionSignature]
     * @property {String[]} [actionSignature]
     * @property {String} contextName=Self
     * @property {String} fileName
     * @property {String} filePath
     * @property {String} methodName
     */
    return { actionConfigurationList };
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

    this.$logger.info(`Destroying the ${this.name} engine and ${$datastoreList.length} datastore connection${($datastoreList.length > 1) ? 's' : ''}...`);

    return Promise.all($datastoreList
      .map(($datastore) => {

        return $datastore.destroy();
      }))
      .then(() => {
        this.$logger.info(`The ${this.name} engine has been destroyed.`);
      });
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
      const actionConfiguration = await this.$datastore.retrieveItemFromHashFieldByName(ACTION_CONFIGURATION_BY_ACTION_NAME, actionName);

      if (nucleusValidator.isEmpty(actionConfiguration)) throw new NucleusError.UndefinedContextNucleusError(`Could not retrieve the configuration for action "${actionName}".`, { actionID, actionName });

      this.$logger.debug(`Executing action "${actionName} (${actionID})"...`, { actionID, actionName });

      $action.updateStatus(NucleusAction.ProcessingActionStatus);
      await this.$datastore.addItemToHashFieldByName(actionItemKey, 'meta', $action.meta.toString(), 'status', $action.status);

      const { contextName = '', filePath = '', argumentConfigurationByArgumentName = {}, methodName = '', actionSignature = [], actionAlternativeSignatureList } = actionConfiguration;

      // 2. Validate the action message.
      const actionMessageArgumentList = Object.keys(actionMessage);

      // Make sure that the message meets one of the proposed signature criteria.
      const fulfilledActionSignature = [ actionSignature ]
        .filter((argumentNameList) => {

          return argumentNameList
            .reduce((accumulator, argumentName) => {
              if (argumentName === 'options') accumulator.push(argumentName);
              if (argumentName === 'originUserID') accumulator.push(argumentName);
              else if (actionMessageArgumentList.includes(argumentName)) accumulator.push(argumentName);

              return accumulator;
            }, []).length === argumentNameList.length;
        })[0];

      if (!fulfilledActionSignature) throw new NucleusError.UndefinedContextNucleusError("Can't execute the action because one or more argument is missing");

      if (!nucleusValidator.isEmpty(argumentConfigurationByArgumentName)) {
        if (!argumentConfigurationByArgumentName.hasOwnProperty('originUserID')) argumentConfigurationByArgumentName.originUserID = 'string';

        // User the argument configuration object to validate the action's message.
        const Signature = nucleusValidator.struct(argumentConfigurationByArgumentName);

        Signature(Object.assign({}, actionMessage, { originUserID: $action.originUserID }));
      }

      const argumentList = fulfilledActionSignature
        .reduce((accumulator, argumentName) => {
          if (argumentName === 'options') accumulator.push(actionMessage);
          if (argumentName === 'originUserID') accumulator.push($action.originUserID);
          else accumulator.push(actionMessage[argumentName]);

          return accumulator;
        }, []);

      // 3. Retrieve the execution context of the method to execute.
      const $executionContext = ((contextName === 'Self')) ? this : require(filePath);

      // 4. Execute action.
      const actionResponse = await $executionContext[methodName].apply((
        // If the action is part of the current engine, the context of the method to execute will be `this`...
        (contextName === 'Self')) ?
          this :
          // If the action is part of an external API file, the context will be either:
          // The local datastore or...
          // The local datastore and a relationship datastore if available.
          (this.$resourceRelationshipDatastore) ?
            { $datastore: this.$datastore, $resourceRelationshipDatastore: this.$resourceRelationshipDatastore } :
            { $datastore: this.$datastore }, argumentList);

      $action.updateStatus(NucleusAction.CompletedActionStatus);
      $action.updateMessage(actionResponse);
      await this.$datastore.addItemToHashFieldByName(actionItemKey, 'meta', $action.meta.toString(), 'status', $action.status, 'finalMessage', $action.finalMessage);

      // 5. Send event to action channel.
      const $event = new NucleusEvent('ActionStatusUpdated', {
        actionFinalMessage: actionResponse,
        actionID,
        actionName,
        actionStatus: 'Completed'
      });

      await this.publishEventToChannelByName(`Action:${actionID}`, $event);

      this.$logger.debug(`The action "${actionName} (${actionID})" has been successfully executed.`, { actionID, actionName });

      return Promise.resolve($action);
    } catch (error) {
      if (!(error instanceof NucleusError)) error = new NucleusError(`The execution of the action "${actionName}" failed because of an external error: ${error}.`, error);

      $action.updateStatus(NucleusAction.FailedActionStatus);
      $action.updateMessage({ error });
      await this.$datastore.addItemToHashFieldByName(actionItemKey, 'meta', $action.meta.toString(), 'status', $action.status, 'finalMessage', $action.finalMessage);

      return Promise.reject(error);
    }
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
    const { ID: actionID, name: actionName } = $action;

    const { isMember: actionQueueNameRegistered } = await this.$actionDatastore.itemIsMemberOfSet(ACTION_QUEUE_NAME_SET_ITEM_NAME, actionQueueName);

    if (!actionQueueNameRegistered) throw new NucleusError.UndefinedContextNucleusError(`The action queue name ${actionQueueName} doesn't exist or has not been properly registered.`);

    this.$logger.debug(`Publishing action "${actionName} (${actionID})" to action queue "${actionQueueName}"...`, { actionID, actionName, actionQueueName });

    const actionKeyName = $action.generateOwnItemKey();

    $action.updateStatus(NucleusAction.PendingActionStatus);

    return this.$actionDatastore.$$server.multi()
      // Store the action as a hash item.
      .hmset(actionKeyName, 'ID', actionID, 'meta', $action.meta.toString(), 'name', actionName, 'status', $action.status, 'originalMessage', $action.originalMessage.toString(), 'originUserID', $action.originUserID)
      // Add the action key name into the appropriate action queue.
      .lpush(actionQueueName, actionKeyName)
      // Expire the action in a set TTL, the action should be kept a little while for debugging but not for too long to
      // prevent unnecessary memory bulk-up.
      .pexpire(actionKeyName, this.actionTTL)
      .execAsync()
      .tap(() => {
        this.$logger.debug(`The action "${actionName} (${actionID})" has been successfully published.`, { actionID, actionName, actionQueueName });
      })
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

    const actionQueueName = await this.$actionDatastore.retrieveItemFromHashFieldByName(ACTION_QUEUE_NAME_BY_ACTION_NAME_ITEM_NAME, actionName);

    const $action = new NucleusAction(actionName, actionMessage, { originEngineID: this.ID, originEngineName: this.name, originProcessID: process.pid, originUserID });

    return new Promise(async (resolve, reject) => {
      const actionItemKey = $action.generateOwnItemKey();

      const actionDatastoreIndex = this.$actionDatastore.index;
      const $actionSubscriberDatastore = (this.$handlerDatastoreByName.hasOwnProperty('ActionSubscriber')) ?
        this.$handlerDatastoreByName['ActionSubscriber'] : (this.$handlerDatastoreByName['ActionSubscriber'] = this.$actionDatastore.duplicateConnection());

      await $actionSubscriberDatastore;

      const channelName = `__keyspace@${actionDatastoreIndex}__:${actionItemKey}`;
      await $actionSubscriberDatastore.subscribeToChannelName(channelName);

      $actionSubscriberDatastore.handleEventByChannelName(channelName, async (channelPattern, redisCommand) => {
        if (redisCommand !== 'hset' && redisCommand !== 'hmset') return;

        const [ keyspace, itemType, actionName, actionID ] = channelPattern.split(':');
        const actionItemKey = `${itemType}:${actionName}:${actionID}`;

        try {
          const [ actionFinalMessage, actionStatus ] = await this.$actionDatastore.retrieveItemFromHashFieldByName(actionItemKey, 'finalMessage', 'status');

          if (actionStatus === NucleusAction.CompletedActionStatus || actionStatus === NucleusAction.FailedActionStatus) {
            this.$logger.debug(`The action "${actionName} (${actionID})" status has been updated to "${actionStatus}".`);
            // Resolve or reject the promise with the final message base on the action's status.
            ((actionStatus === NucleusAction.CompletedActionStatus) ? resolve : reject)(actionFinalMessage);

            $actionSubscriberDatastore.unsubscribeFromChannelName(channelName);
          }
        } catch (error) {

          reject(new NucleusError(`Could not handle the action's response because of an external error: ${error}`, { error }));
        }

      });

      try {
        await this.publishActionToQueueByName(actionQueueName, $action);
      } catch (error) {

        reject(new NucleusError(`Could not publish the action because of an external error: ${error}`, { error }));
      }
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
    const { ID: eventID, name: eventName } = $event;

    this.$logger.debug(`Publishing event "${eventName} (${eventID})" to channel "${channelName}"...`, { channelName, eventID, eventName });

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
      .tap(() => {
        this.$logger.debug(`The event "${eventName} (${eventID})" has been successfully published.`, { channelName, eventID, eventName });
      })
      .return({ channelName, $event });
  }

  async retrievePendingAction (actionQueueName) {
    const $handlerDatastore = (this.$handlerDatastoreByName.hasOwnProperty(`${actionQueueName}Handler`)) ?
      this.$handlerDatastoreByName[`${actionQueueName}Handler`] :
      (this.$handlerDatastoreByName[`${actionQueueName}Handler`] = this.$actionDatastore.duplicateConnection());

    try {
      this.$logger.debug(`Retrieving a pending action from action queue "${actionQueueName}"...`, { actionQueueName });

      const actionItemKey = (await $handlerDatastore.$$server.brpopAsync(actionQueueName, 0))[1];

      const $action = new NucleusAction(await (this.$actionDatastore.retrieveAllItemsFromHashByName(actionItemKey)));
      const { ID: actionID, name: actionName } = $action;

      this.$logger.debug(`Retrieved a pending action "${actionName} (${actionID})" from action queue "${actionQueueName}".`, { actionID, actionName, actionQueueName });
      // if (NODE_ENVIRONMENT === DEVELOPMENT_ENVIRONMENT_NAME) {
      //   try {
      //     const actionQueueItemCount = await $handlerDatastore.$$server.llenAsync(actionQueueName);
      //     this.$logger.debug(`${actionQueueName} action queue has ${actionQueueItemCount} pending action${(actionQueueItemCount > 1) ? 's' : ''} left.`);
      //
      //   } catch (e) {
      //     console.error(e);
      //   }
      // }

      process.nextTick(this.executeAction.bind(this, $action));
    } catch (error) {
      this.$logger.warn(`In progress: ${error}`);
    }
  }

  /**
   * Subscribe to the action queue updates given its name.
   *
   * @argument {String} actionQueueName
   *
   * @returns {Promise<void>}
   */
  subscribeToActionQueueUpdate (actionQueueName) {
    if (!nucleusValidator.isString(actionQueueName)) throw new NucleusError.UnexpectedValueTypeNucleusError("The action queue name must be a string.");

    const actionDatastoreIndex = this.$actionDatastore.index;
    const $actionQueueSubscriberDatastore = (this.$handlerDatastoreByName.hasOwnProperty(`${actionQueueName}Subscriber`)) ?
      this.$handlerDatastoreByName[`${actionQueueName}Subscriber`] :
      (this.$handlerDatastoreByName[`${actionQueueName}Subscriber`] = this.$actionDatastore.duplicateConnection());

    try {
      const channelName = `__keyspace@${actionDatastoreIndex}__:${actionQueueName}`;

      $actionQueueSubscriberDatastore.subscribeToChannelName(channelName);
      $actionQueueSubscriberDatastore.handleEventByChannelName(channelName, () => {

        process.nextTick(this.retrievePendingAction.bind(this, actionQueueName));
      });

      return Promise.resolve();
    } catch (error) {

      return Promise.reject(error);
    }
  }

  /**
   * Subscribes to a channel given its name.
   *
   * @argument {String} channelName
   *
   * @returns {Promise<void>}
   */
  subscribeToEventChannelByName (channelName) {

    return this.$eventSubscriberDatastore.subscribeToChannelName(channelName);
  }

  /**
   * Unsubscribes to a channel given its name.
   *
   * @argument {String} channelName
   *
   * @returns {Promise<void>}
   */
  async unsubscribeFromEventChannelByName (channelName) {

    return this.$eventSubscriberDatastore.unsubscribeFromChannelName(channelName);
  }

  /**
   * Verifies that the Redises connection are configured correctly.
   *
   * @returns {Promise<void>}
   */
  async verifyRedisConfiguration () {
    // Make sure that the Action datastore is configured correctly.
    // The process will exit if the Keyspace notification configuration is not properly set.
    const redisConnectionVerified = !!(await this.$actionDatastore.evaluateLUAScript(`
    local engineID = ARGV[1]
    local verificationTTL = ARGV[2]
          
    local redisConnectionVerified = redis.call('GET', 'RedisConnectionVerified')
    if (not redisConnectionVerified) then
      redis.call('SETEX', 'RedisConnectionVerified', verificationTTL, engineID)
     
       return 0
    end
 
   return 1
    `, this.ID, 60 * 60 * 7));

    if (redisConnectionVerified) return;

    this.$logger.debug(`Verifying the ${this.name} engine's action datastore connection.`);

    const keyspaceNotificationActivated = (await this.$actionDatastore.evaluateLUAScript(`return redis.call('CONFIG', 'GET', 'notify-keyspace-events');`))[1];

    if (keyspaceNotificationActivated !== 'AKE') {
      this.$logger.error(`Redis' Keyspace Notification is not activated, please make sure to configure your Redis server correctly.
  # redis.conf
  # Check http://download.redis.io/redis-stable/redis.conf for more details.
  notify-keyspace-events AKE
  `);
      process.exit(699);
    }

    this.$logger.debug(`The ${this.name} engine's action datastore connection has been verified, all is good.`);

    // Make sure that the Engine datastore is configured correctly;
    // To avoid any surprise, there should be a save policy.
    const savePolicyActivated = (await this.$engineDatastore.evaluateLUAScript(`return redis.call('CONFIG', 'GET', 'save');`))[1];

    if (nucleusValidator.isEmpty(savePolicyActivated)) {
      this.$logger.warn(`Redis' Save policy is not activated; because Redis is used a as main store in certain cases, please make sure to configure your Redis server correctly.
  # redis.conf
  # Check http://download.redis.io/redis-stable/redis.conf for more details.
  save 900 1
  save 300 10
  save 60 10000
  `);
    }
  }

  /**
   * Retrieves the current module directory path.
   *
   * @argument {Object} [moduleNode=module.parent] - Used for recursion.
   * @argument {Object} [moduleDirectoryPath] - Used for recursion.
   *
   * @returns {String}
   */
  static retrieveModuleDirectoryPath (moduleName, moduleNode = module.parent) {
    if (nucleusValidator.isEmpty(moduleNode)) throw new NucleusError.UndefinedContextNucleusError(`Could not find any engine for the module "${moduleName}".`);

    if (!new RegExp(`.*${moduleName}.*`).test(moduleNode.filename)) return NucleusEngine.retrieveModuleDirectoryPath(moduleName, moduleNode.parent);
    else return path.dirname(moduleNode.filename);
  }

}

module.exports = NucleusEngine;