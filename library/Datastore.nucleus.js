"use strict";

/**
 * @fileOverview Define the Nucleus Datastore class that wraps a Redis client.
 *
 * @author Sebastien Filion
 */

const Promise = require('bluebird');
const redis = require('redis');

const NucleusError = require('./Error.nucleus')
const NucleusEvent = require('./Event.nucleus');

const nucleusValidator = require('./validator.nucleus');

Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);

const $$keyspaceNotificationChannelNameRegularExpression = new RegExp('__keyspace@[0-9]__:.*|__keyevent@[0-9]__:.*');
const $$predicateRegularExpression = new RegExp('SOP\\:[A-Za-z0-9\\-]+\\:[A-Za-z0-9\\-]+\\:([A-Za-z0-9\\-]+)');

class NucleusDatastore {

  /**
   * Creates a Redis client. The constructor returns a Proxy that interfaces the class and a Promise that resolves once
   * the server is connected.
   *
   * @argument {String} datastoreName
   * @argument {Object} options
   * @argument {Number} [options.index=0]
   * @argument {Number} [options.port=6379]
   * @argument {String} [options.URL="localhost"]
   *
   * @returns {Proxy}
   */
  constructor (datastoreName = 'Untitled', options = {}) {
    const {
      $logger = console,
      index: datastoreIndex = 0,
      port: datastorePort = 6379,
      URL: datastoreURL = 'localhost'
    } = options;

    this.name = datastoreName;
    this.index = datastoreIndex;

    this.$$handlerCallbackListByChannelName = {};

    this.$$server = redis.createClient({
      db: datastoreIndex,
      host: datastoreURL,
      port: datastorePort
    });

    this.$logger = $logger;

    this.$$promise = new Promise((resolve, reject) => {
      if (this.$$server.connectedAsync) resolve();
      else {
        this.$$server.onAsync('connect', resolve);
        this.$$server.onceAsync('error', reject);
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

    this.$$server.on('message', this.handleRedisEvent.bind(this));
    this.$$server.on('pmessage', this.handleRedisEvent.bind(this));

    return $$proxy;
  }

  /**
   * Adds an item to a hash given a field and its key. `HMSET key field value`
   *
   * @argument {String} itemKey
   * @argument {String} [itemField]
   * @argument {*} [item]
   * @argument {*[]} [hashList]
   *
   * @returns {Promise<*>}
   *
   * @throws Will throw an error if the item key is missing or an empty string.
   * @throws Will throw an error if the item field is missing or an empty string.
   * @throws Will throw an error if an inconsistent list of item field and item is passed.
   */
  addItemToHashFieldByName (itemKey, ...hashList) {
    if (!nucleusValidator.isString(itemKey)) throw new NucleusError.UnexpectedValueTypeNucleusError("The item name must be a string.");

    if (hashList.length === 2) {
      const [ itemField, item ] = hashList;

      if (typeof itemField !== 'string') throw new NucleusError.UnexpectedValueTypeNucleusError("The item field must be a string.");

      const stringifiedItem = NucleusDatastore.stringifyItem(item);

      return this.$$server.hsetAsync(itemKey, itemField, stringifiedItem)
        .return(item);
    } else if (hashList.length % 2 === 0) {
      hashList = hashList
        .map((item, index) => {
          if (index % 2 === 0) return item;
          else return NucleusDatastore.stringifyItem(item);
        });

      return this.$$server.hmsetAsync(itemKey, hashList)
        .return(hashList);
    } else throw new NucleusError.UndefinedContextNucleusError("The number of item field and item provided is inconsistent");
  }

  /**
   * Adds an item to a list given its key. `LPUSH key value`
   *
   * @argument {String} itemKey
   * @argument {*} item
   * @argument {*[]} [itemList]
   *
   * @returns {Promise<*>}
   *
   * @throws Will throw an error if the item key is missing or an empty string.
   */
  addItemToListByName (itemKey, item) {
    if (!nucleusValidator.isString(itemKey)) throw new NucleusError.UnexpectedValueTypeNucleusError("The item name must be a string.");

    if (nucleusValidator.isArray(item)) throw new NucleusError.UnexpectedValueTypeNucleusError("The item should not be an array.");

    const stringifiedItem = NucleusDatastore.stringifyItem(item);

    return this.$$server.lpushAsync(itemKey, stringifiedItem)
      .return(item);
  }

  /**
   * Adds an item to a set. `SADD key value`
   *
   * @argument {String} itemKey
   * @argument {String} item
   *
   * @returns {Promise<*>}
   *
   * @throws Will throw an error if the item key is missing or an empty string.
   * @throws Will throw an error if the item is not a string.
   */
  addItemToSetByName (itemKey, item) {
    if (!nucleusValidator.isString(itemKey)) throw new NucleusError.UnexpectedValueTypeNucleusError("The item name must be a string.");
    if (!nucleusValidator.isString(item)) throw new NucleusError.UnexpectedValueTypeNucleusError("The item must be a string.");

    const stringifiedItem = NucleusDatastore.stringifyItem(item);

    return this.$$server.saddAsync(itemKey, stringifiedItem);
  }

  /**
   * Adds a triple to a hexastore.
   * @see http://www.vldb.org/pvldb/1/1453965.pdf
   *
   * @argument {String} itemKey
   * @argument {String} subject
   * @argument {String} predicate
   * @argument {String} object
   *
   * @returns {Promise<void>}
   *
   * @throws Will throw an error if the item key is missing or an empty string.
   * @throws Will throw an error if the subject is not a string.
   * @throws Will throw an error if the predicate is not a string.
   * @throws Will throw an error if the object is not a string.
   */
  addTripleToHexastore (itemKey, subject, predicate, object) {
    if (!nucleusValidator.isString(itemKey)) throw new NucleusError.UnexpectedValueTypeNucleusError("The item name must be a string.");
    if (!nucleusValidator.isString(subject)) throw new NucleusError.UnexpectedValueTypeNucleusError("The subject must be a string.");
    if (!nucleusValidator.isString(predicate)) throw new NucleusError.UnexpectedValueTypeNucleusError("The predicate must be a string.");
    if (!nucleusValidator.isString(object)) throw new NucleusError.UnexpectedValueTypeNucleusError("The object must be a string.");

    /*
    ZADD myindex 0 spo:antirez:is-friend-of:matteocollina
    ZADD myindex 0 sop:antirez:matteocollina:is-friend-of
    ZADD myindex 0 ops:matteocollina:is-friend-of:antirez
    ZADD myindex 0 osp:matteocollina:antirez:is-friend-of
    ZADD myindex 0 pso:is-friend-of:antirez:matteocollina
    ZADD myindex 0 pos:is-friend-of:matteocollina:antirez
     */

    return this.$$server.multi()
      .zadd(itemKey, 0, `SPO:${subject}:${predicate}:${object}`)
      .zadd(itemKey, 0, `SOP:${subject}:${object}:${predicate}`)
      .zadd(itemKey, 0, `OPS:${object}:${predicate}:${subject}`)
      .zadd(itemKey, 0, `OSP:${object}:${subject}:${predicate}`)
      .zadd(itemKey, 0, `PSO:${predicate}:${subject}:${object}`)
      .zadd(itemKey, 0, `POS:${predicate}:${object}:${subject}`)
      .execAsync();
  }

  /**
   * Creates an item. `SET key value`
   *
   * @argument {String} itemKey
   * @argument {*} item
   *
   * @returns {Promise<*>}
   *
   * @throws Will throw an error if the item key is missing or an empty string.
   */
  createItem (itemKey, item) {
    if (!nucleusValidator.isString(itemKey)) throw new NucleusError.UnexpectedValueTypeNucleusError("The item key must be a string.");

    const stringifiedItem = NucleusDatastore.stringifyItem(item);

    return this.$$server.setAsync(itemKey, stringifiedItem)
      .return(item);
  }

  /**
   * Destroys the Redis connection.
   *
   * @returns {Promise}
   */
  destroy () {

    return this.$$server.quitAsync();
  }

  /**
   * Duplicates the connection.
   *
   * @argument {String} [datastoreName=`${this.name}Duplicate`]
   *
   * @returns {NucleusDatastore}
   */
  duplicateConnection (datastoreName = `${this.name}Duplicate`) {
    const { db: index, host: URL, port } = this.$$server;

    return new NucleusDatastore(datastoreName, { index, URL, port });
  }

  /**
   * Evaluates a LUA script.
   *
   * @argument {String} LUAscript
   * @argument {Array} argumentList
   *
   * @returns {Promise<*>}
   */
  evaluateLUAScript (LUAscript, ...argumentList) {
    const augmentedArgumentList = [argumentList.length].concat(Array.apply(null, { length: argumentList.length }).map((empty, index) => index), argumentList);

    return this.$$server.evalAsync(LUAscript, augmentedArgumentList)
      .then(NucleusDatastore.parseItem);
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
    const $$handlerCallbackList = this.$$handlerCallbackListByChannelName[channelName];

    if (nucleusValidator.isEmpty($$handlerCallbackList)) return Promise.resolve();

    if ($$keyspaceNotificationChannelNameRegularExpression.test(channelName)) {
      this.$logger.debug(`Executing ${$$handlerCallbackList.length} handler callback${($$handlerCallbackList.length > 1) ? 's' : ''} for the channel "${channelName}".`, { channelName, command: $event });

      return Promise.all($$handlerCallbackList
        .map(($$handlerCallback) => {

          return Promise.resolve($$handlerCallback.call(this, channelName, $event));
        }));
    } else {
      this.$logger.debug(`Executing ${$$handlerCallbackList.length} handler callback${($$handlerCallbackList.length > 1) ? 's' : ''} for the channel "${channelName}".`, { channelName, eventID: $event.ID, eventName: $event.name });

      return Promise.all($$handlerCallbackList
        .map(($$handlerCallback) => {

          return Promise.resolve($$handlerCallback.call(this, $event));
        }));
    }
  }

  /**
   * Verifies if an item is part of a given item set.
   *
   * @argument {String} itemKey
   * @argument {String} item
   *
   * @returns {Promise<Object>}
   *
   * @throws Will throw an error if the item key is missing or an empty string.
   * @throws Will throw an error if the item is not a string.
   */
  itemIsMemberOfSet (itemKey, item) {
    if (!nucleusValidator.isString(itemKey)) throw new NucleusError.UnexpectedValueTypeNucleusError("The item key must be a string.");
    if (!nucleusValidator.isString(item)) throw new NucleusError.UnexpectedValueTypeNucleusError("The item to retrieve must be a string.");

    const stringifiedItem = NucleusDatastore.stringifyItem(item);

    return this.$$server.sismemberAsync(itemKey, stringifiedItem)
      .then((isMemberCode) => {

        return { isMember: !!isMemberCode };
      });
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
   * Handles Redis event.
   *
   * @argument {String[]} argumentList
   */
  handleRedisEvent (...argumentList) {
    if (argumentList.length === 3) {
      const channelPattern = arguments[0];
      const channelName = arguments[1];
      const data = arguments[2];

      // NOTE: Implement handling of pattern channel
    } else if (argumentList.length === 2) {
      const channelName = arguments[0];
      const data = arguments[1];

      if ($$keyspaceNotificationChannelNameRegularExpression.test(channelName)) {

        this.executeHandlerCallbackForChannelName(channelName, data)
          .catch(this.$logger.error);
      } else {
        const parsedData = NucleusDatastore.parseItem(data);

        if (parsedData.hasOwnProperty('name') && parsedData.hasOwnProperty('message')) {
          const { meta, message, name } = parsedData;
          const $event = new NucleusEvent(name, message, meta);

          this.executeHandlerCallbackForChannelName(channelName, $event)
            .catch(this.$logger.error);
        }
      }
    }
  }

  /**
   * Removes an item given its key. `DEL key`
   *
   * @argument {String} itemKey
   *
   * @returns {Promise<null>}
   *
   * @throws Will throw an error if the item key is missing or an empty string.
   */
  removeItemByName (itemKey) {
    if (!nucleusValidator.isString(itemKey)) throw new NucleusError.UnexpectedValueTypeNucleusError("The item key must be a string.");

    return this.$$server.delAsync(itemKey)
      .return(null);
  }

  /**
   * Removes an item from a hash given a field. `HMDEL key field`
   *
   * @argument {String} itemKey
   * @argument {String} itemField
   *
   * @returns {Promise<null>}
   *
   * @throws Will throw an error if the item key is missing or an empty string.
   * @throws Will throw an error if the item field is missing or an empty string.
   */
  removeItemFromFieldByName (itemKey, itemField) {
    if (!nucleusValidator.isString(itemKey)) throw new NucleusError.UnexpectedValueTypeNucleusError("The item name must be a string.");
    if (!nucleusValidator.isString(itemField)) throw new NucleusError.UnexpectedValueTypeNucleusError("The item field must be a string.");

    return this.$$server.hdelAsync(itemKey, itemField)
      .return(null);
  }

  retrieveAllItemsFromHashByName (itemKey) {
    if (!nucleusValidator.isString(itemKey)) throw new NucleusError.UnexpectedValueTypeNucleusError("The item key must be a string.");

    return this.$$server.hgetallAsync(itemKey)
      .then(NucleusDatastore.parseHashItem);
  }

  /**
   * Retrieves an item given its key. `GET key`
   *
   * @argument {String} itemKey
   *
   * @returns {Promise<*>}
   *
   * @throws Will throw an error if the item key is missing or an empty string.
   */
  retrieveItemByName (itemKey) {
    if (!nucleusValidator.isString(itemKey)) throw new NucleusError.UnexpectedValueTypeNucleusError("The item key must be a string.");

    return this.$$server.getAsync(itemKey)
      .then(NucleusDatastore.parseItem);
    }

  /**
   * Remove an item from a hash given an item field. `HMDEL key field`
   *
   * @argument {String} itemKey
   * @argument {String} [itemField]
   * @argument {String[]} [itemFieldList]
   *
   * @returns {Promise<*>}
   *
   * @throws Will throw an error if the item key is missing or an empty string.
   * @throws Will throw an error if the item field is missing or an empty string.
   */
  retrieveItemFromHashFieldByName (itemKey, ...itemFieldList) {
    if (!nucleusValidator.isString(itemKey)) throw new NucleusError.UnexpectedValueTypeNucleusError("The item name must be a string.");

    if (itemFieldList.length === 1) {
      const itemField = itemFieldList[0];

      if (!nucleusValidator.isString(itemField)) throw new NucleusError.UnexpectedValueTypeNucleusError("The item field must be a string.");

      return this.$$server.hgetAsync(itemKey, itemField)
        .then(NucleusDatastore.parseItem);
    }

    return this.$$server.hmgetAsync(itemKey, itemFieldList)
      .then(NucleusDatastore.parseItem);
  }

  /**
   * Retrieves an item from a list but blocks the client if the list is empty. `BRPOP key timeout`
   *
   * @argument {String} itemKey
   *
   * @returns {Promise}
   */
  retrieveItemFromListDeferred (itemKey) {
    if (!nucleusValidator.isString(itemKey)) throw new NucleusError.UnexpectedValueTypeNucleusError("The item name must be a string.");

    return (new Promise((resolve, reject) => {
      try {
        this.$$server.brpop(itemKey, 0, function (error, [ itemKey, item ]) {
          if (!!error) {
            reject(error);

            return;
          }

          if (nucleusValidator.isObject(itemKey)) {
            const { code: redisErrorCode, message: redisErrorMessage } = itemKey;

            if (redisErrorCode === 'ERR') reject(new NucleusError(`Could not retrieve the item from the list because of an external error: ${redisErrorCode}`));
          }

          resolve(item);
        });
      } catch (error) {

        reject(new NucleusError(`Could not retrieve the item from the list because of an external error: ${error}`, { error }));
      }
    }));
  }

  /**
   * Retrieves the relationship between a subject and an object from a hexastore.
   *
   * @argument {String} itemName
   * @argument {String} subject
   * @argument {String} object
   *
   * @returns {Promise<String[]>}
   */
  retrieveRelationshipListFromHexastore (itemName, subject, object) {

    return this.retrieveVectorByIndexSchemeFromHexastore(itemName, 'SOP', subject, object)
      .then((memberList) => {
        const relationshipList = memberList
          .map((member) => {

            return member.match($$predicateRegularExpression)[1];
          });

        return { relationshipList };
      });
  }

  /**
   * Retrieves the any vector from any triple given the index scheme from a hexastore.
   * @see http://www.vldb.org/pvldb/1/1453965.pdf
   * @example
   * async $datastore.addTripleToHexastore('ResourceRelationship', userID, 'isMember', userGroupID);
   * const relationshipList = async $datastore.retrieveVectorByIndexSchemeFromHexastore('ResourceRelationship', 'SOP', userID, userGroupID);
   *
   * @argument {String} itemName
   * @argument {String} indexingScheme=SPO,SOP,OPS,OSP,PSO,POS
   * @argument {String} vectorA
   * @argument {String} vectorB
   *
   * @returns {Promise<String[]>}
   */
  retrieveVectorByIndexSchemeFromHexastore (itemName, indexingScheme, vectorA, vectorB) {

    return this.$$server.zrangebylexAsync(itemName, `[${indexingScheme}:${vectorA}:${vectorB}:`, `[${indexingScheme}:${vectorA}:${vectorB}:\xff`);
  }

  /**
   * Subscribes the client to a channel given its name.
   *
   * @argument {String} channelName
   *
   * @returns {Promise}
   */
  subscribeToChannelName (channelName) {

    return this.$$server.subscribeAsync(channelName);
  }

  /**
   * Unsubscribes the client from a channel given its name.
   *
   * @argument {String} channelName
   *
   * @returns {Promise}
   */
  unsubscribeFromChannelName (channelName) {

    return this.$$server.unsubscribeAsync(channelName);
  }

  /**
   * Parses a hash item list into an object.
   *
   * @argument {Array} itemList
   *
   * @returns {Object}
   */
  static parseHashItem (itemList = []) {
    // The most recent version of NPM redis returns an object as expected.
    if (nucleusValidator.isObject(itemList)) return NucleusDatastore.parseItem(itemList);

    return itemList
      .reduce((accumulator, item, index, list) => {
        if (index % 2 === 0) return accumulator;
        else {
          accumulator[list[index - 1]] = item;

          return accumulator;
        }
      }, {});
  }

  /**
   * Parses an item to a native data type.
   *
   * @argument {String} item
   *
   * @returns {*}
   */
  static parseItem (item) {
    if (nucleusValidator.isArray(item)) {

      return item.map(NucleusDatastore.parseItem);
    }

    if (nucleusValidator.isObject(item)) {

      return Object.keys(item)
        .reduce((accumulator, key) => {
          const parsedValue = NucleusDatastore.parseItem(item[key]);

          accumulator[key] = parsedValue;

          return accumulator;
        }, {});
    }

    try {

      return JSON.parse(item);
    } catch (error) {

      return item;
    }
  }

  /**
   * Stringifies a native data type.
   *
   * @argument {*} item
   *
   * @returns {String}
   */
  static stringifyItem (item) {

    return JSON.stringify(item);
  }

}

module.exports = NucleusDatastore;