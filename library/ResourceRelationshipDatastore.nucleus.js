"use strict";

const NucleusDatastore = require('./Datastore.nucleus');

class NucleusResourceRelationshipDatastore {

  /**
   * Creates a resource relationship datastore. The constructor returns a Proxy that interfaces the class and a Promise that resolves once
   * the server is connected.
   *
   * @argument {NucleusDatastore} $datastore
   *
   * @returns {Proxy}
   */
  constructor ($datastore = new NucleusDatastore()) {
    Reflect.defineProperty(this, '$datastore', {
      configurable: false,
      enumerable: false,
      value: $datastore,
      writable: false
    });

    const $$proxy = new Proxy(this, {
      get: function (object, property) {
        if (property in object) return (typeof object[property] === 'function') ? object[property].bind(object) : object[property];
        else if (property in object.$datastore.$$promise) {
          return (typeof object.$datastore.$$promise[property] === 'function') ? object.$datastore.$$promise[property].bind(object.$datastore.$$promise) : object.$datastore.$$promise[property];
        }
        else undefined;
      }
    });

    return $$proxy;
  }

  /**
   * Creates a relationship between the subject and the object.
   *
   * @argument {String} subject
   * @argument {String} predicate
   * @argument {String} object
   *
   * @returns {Promise<void>}
   */
  createRelationshipBetweenSubjectAndObject (subject, predicate, object) {

    return this.$datastore.addTripleToHexastore('ResourceRelationship', subject, predicate, object);
  }

  /**
   * Removes all relationship to the vector.
   *
   * @argument {String} vector
   *
   * @returns {Promise<void>}
   */
  removeAllRelationshipsToVector (vector) {

    return this.$datastore.removeAllTriplesFromHexastoreByVector('ResourceRelationship', vector);
  }

  /**
   * Retrieves the object of a subject's relationship.
   *
   * @argument {String} subject
   * @argument {String} predicate
   *
   * @returns {Promise<Array>}
   */
  retrieveObjectOfRelationshipWithSubject (subject, predicate) {

    return this.$datastore.retrieveVectorByIndexSchemeFromHexastore('ResourceRelationship', 'SPO', subject, predicate);
  }

  /**
   * Retrieves the subject of an object's relationship.
   *
   * @argument {String} object
   * @argument {String} predicate
   *
   * @returns {Promise<Array>}
   */
  retrieveSubjectOfRelationshipWithObject (object, predicate) {

    return this.$datastore.retrieveVectorByIndexSchemeFromHexastore('ResourceRelationship', 'OPS', object, predicate);
  }

}

module.exports = NucleusResourceRelationshipDatastore;