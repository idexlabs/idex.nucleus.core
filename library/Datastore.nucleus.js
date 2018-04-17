"use strict";

/**
 * @fileOverview Define the Nucleus Datastore class that wraps a Redis client.
 *
 * @author Sebastien Filion
 *
 * @requires NPM:bluebird
 * @requires NPM:redis
 * @requires ./Error.nucleus
 */

const Promise = require('bluebird');
const redis = require('redis');

const NucleusError = require('./Error.nucleus');

Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);

const $$predicateRegularExpression = new RegExp('SOP\\:[A-Za-z0-9\\-]+\\:[A-Za-z0-9\\-]+\\:([A-Za-z0-9\\-]+)');

class NucleusDatastore {

  /**
   * Creates a Redis client. The constructor returns a Proxy that interfaces the class and a Promise that resolves once
   * the server is connected.
   *
   * @argument {String} name
   * @argument {Object} options
   * @argument {Number} [options.index]
   * @argument {Number} [options.port]
   * @argument {String} [options.URL]
   *
   * @returns {Proxy}
   */
  constructor (name = 'Untitled', options = {}) {
    const { index: datastoreIndex = 0, port: datastorePort = 6379, URL: datastoreURL = 'localhost' } = options;

    this.name = name;
    this.datastoreIndex = datastoreIndex;

    this.$$server = redis.createClient({
      db: datastoreIndex,
      host: datastoreURL,
      port: datastorePort
    });

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

    return $$proxy;
  }

  /**
   * Adds an item to a hash given a field. `HMSET key field value`
   *
   * @argument {String} itemKey
   * @argument {String} itemField
   * @argument {*} item
   *
   * @returns {Promise<void>}
   *
   * @throws Will throw an error if the item key is missing or an empty string.
   * @throws Will throw an error if the item field is missing or an empty string.
   * @throws Will throw an error if an inconsistent list of item field and item is passed.
   */
  addItemToHashByName (itemKey, ...hashList) {
    if (typeof itemKey !== 'string') return Promise.reject(new NucleusError.UnexpectedValueTypeNucleusError("The item name must be a string."));

    if (hashList.length === 2) {
      const [ itemField, item ] = hashList;

      if (typeof itemField !== 'string') return Promise.reject(new NucleusError.UnexpectedValueTypeNucleusError("The item field must be a string."));

      const stringifiedItem = NucleusDatastore.stringifyItem(item);

      return this.$$server.hsetAsync(itemKey, itemField, stringifiedItem)
        .return(item);
    } else if (hashList.length % 2 === 0) {
      hashList = hashList
        .map((item, index) => {
          if (index % 2 === 0) return item;
          else return NucleusDatastore.stringifyItem(item);
        });

      return this.$$server.hmsetAsync(itemKey, hashList);
    } else return Promise.reject(new NucleusError.UndefinedContextNucleusError("The number of item field and item provided is inconsistent"));
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
  addItemToSet (itemKey, item) {
    if (typeof itemKey !== 'string') return Promise.reject(new NucleusError.UnexpectedValueTypeNucleusError("The item name must be a string."));
    if (typeof item !== 'string') return Promise.reject(new NucleusError.UnexpectedValueTypeNucleusError("The item must be a string."));

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
    if (typeof itemKey !== 'string') return Promise.reject(new NucleusError.UnexpectedValueTypeNucleusError("The item name must be a string."));
    if (typeof subject !== 'string') return Promise.reject(new NucleusError.UnexpectedValueTypeNucleusError("The subject must be a string."));
    if (typeof predicate !== 'string') return Promise.reject(new NucleusError.UnexpectedValueTypeNucleusError("The predicate must be a string."));
    if (typeof object !== 'string') return Promise.reject(new NucleusError.UnexpectedValueTypeNucleusError("The object must be a string."));

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
    if (typeof itemKey !== 'string') return Promise.reject(new NucleusError.UnexpectedValueTypeNucleusError("The item key must be a string."));

    const stringifiedItem = NucleusDatastore.stringifyItem(item);

    return this.$$server.setAsync(itemKey, stringifiedItem)
      .return(item);
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
    if (typeof itemKey !== 'string') return Promise.reject(new NucleusError.UnexpectedValueTypeNucleusError("The item key must be a string."));
    if (typeof item !== 'string') return Promise.reject(new NucleusError.UnexpectedValueTypeNucleusError("The item to retrieve must be a string."));

    const stringifiedItem = NucleusDatastore.stringifyItem(item);

    return this.$$server.sismemberAsync(itemKey, stringifiedItem)
      .then((isMemberCode) => {

        return { isMember: !!isMemberCode };
      });
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
    if (typeof itemKey !== 'string') return Promise.reject(new NucleusError.UnexpectedValueTypeNucleusError("The item key must be a string."));

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
    if (typeof itemKey !== 'string') return Promise.reject(new NucleusError.UnexpectedValueTypeNucleusError("The item name must be a string."));
    if (typeof itemField !== 'string') return Promise.reject(new NucleusError.UnexpectedValueTypeNucleusError("The item field must be a string."));

    return this.$$server.hdelAsync(itemKey, itemField)
      .return(null);
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
    if (typeof itemKey !== 'string') return Promise.reject(new NucleusError.UnexpectedValueTypeNucleusError("The item key must be a string."));

    return this.$$server.getAsync(itemKey)
      .then(NucleusDatastore.parseItem);
    }

  /**
   * Remove an item from a hash given an item field. `HMDEL key field`
   *
   * @argument {String} itemKey
   * @argument {String} itemField
   *
   * @returns {Promise<*>}
   *
   * @throws Will throw an error if the item key is missing or an empty string.
   * @throws Will throw an error if the item field is missing or an empty string.
   */
  retrieveItemFromFieldByName (itemKey, itemField) {
    if (typeof itemKey !== 'string') return Promise.reject(new NucleusError.UnexpectedValueTypeNucleusError("The item name must be a string."));
    if (typeof itemField !== 'string') return Promise.reject(new NucleusError.UnexpectedValueTypeNucleusError("The item field must be a string."));

    return this.$$server.hgetAsync(itemKey, itemField)
      .then(NucleusDatastore.parseItem);
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
   * Parse an item to a native data type.
   *
   * @argument {String} item
   *
   * @returns {*}
   */
  static parseItem (item) {
    try {

      return JSON.parse(item);
    } catch (error) {

      return item;
    }
  }

  /**
   * Stringify a native data type.
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