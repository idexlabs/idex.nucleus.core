"use strict";

const uuid = require('uuid');

const NucleusDatastore = require('./Datastore.nucleus');
const NucleusEngine = require('./Engine.nucleus');

class PublisherEngine {

  constructor (engineName, options = {}) {
    const {
      $actionDatastore = new NucleusDatastore(),
      $logger = console,
    } = options;

    /** @member {String} ID */
    Reflect.defineProperty(this, 'ID', { value: uuid.v1(), writable: false });
    /** @member {String} name */
    Reflect.defineProperty(this, 'name', { value: engineName, writable: false });

    this.$actionDatastore = $actionDatastore;
    this.$logger = $logger;

    this.$handlerDatastoreByName = {};

    this.actionTTL = 1000 * 60 * 60; // One hour

    this.$$promise = Promise.all([this.$actionDatastore]);

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

}

PublisherEngine.prototype.handleActionChannelRedisEvent = NucleusEngine.prototype.handleActionChannelRedisEvent;
PublisherEngine.prototype.handleActionStatusUpdated = NucleusEngine.prototype.handleActionStatusUpdated;
PublisherEngine.prototype.publishActionByNameAndHandleResponse = NucleusEngine.prototype.publishActionByNameAndHandleResponse;
PublisherEngine.prototype.publishActionToQueueByName = NucleusEngine.prototype.publishActionToQueueByName;

module.exports = PublisherEngine;