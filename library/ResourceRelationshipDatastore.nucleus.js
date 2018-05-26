"use strict";

const NucleusDatastore = require('./Datastore.nucleus');
const NucleusError = require('./Error.nucleus');
const nucleusValidator = require('./validator.nucleus');

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
    if (!nucleusValidator.isString(subject) || !this.validateVectorFormat(subject)) throw new NucleusError(`The object must have the form "resource type + resource ID" but got "${subject}"`);
    if (!nucleusValidator.isString(object) || !this.validateVectorFormat(object)) throw new NucleusError(`The subject must have the form "resource type + resource ID" but got "${object}"`);

    return this.$datastore.addTripleToHexastore('ResourceRelationship', subject, predicate, object);
  }

  /**
   * Removes all relationship to the vector.
   *
   * @argument {String} vector
   *
   * @returns {Promise<Object[]>}
   */
  removeAllRelationshipsToVector (vector) {

    return this.$datastore.removeAllTriplesFromHexastoreByVector('ResourceRelationship', vector);
  }

  /**
   * Retrieves all the relationship for a given subject node.
   *
   * @argument {String|Node|String[]|Node[]} subject
   *
   * @returns {Promise<{ predicate: String, object: Node }>}
   */
  retrieveAllRelationshipsForSubject (subject) {
    if (nucleusValidator.isObject(subject)) {
      const stringifiedAnchorNode = `${subject.type}-${subject.ID}`;

      return this.retrieveAllRelationshipsForSubject(stringifiedAnchorNode);
    }

    if (nucleusValidator.isArray(subject)) {
      const subjectList = subject;

      const rangeByLexicalSearchDatastoreRequestList = subjectList
        .map((subject) => {
          const stringifiedAnchorNode = (nucleusValidator.isObject(subject)) ? `${subject.type}-${subject.ID}` : subject;

          return ['zrangebylex', 'ResourceRelationship', `[SPO:${stringifiedAnchorNode}:`, `[SPO:${stringifiedAnchorNode}:\xff`];
        });

      return this.$datastore.$$server.multi(rangeByLexicalSearchDatastoreRequestList).execAsync()
        .then((itemList) => {

          return itemList.map(this.parseItem.bind(this));
        });
    }

    return this.$datastore.$$server.zrangebylexAsync('ResourceRelationship', `[SPO:${subject}:`, `[SPO:${subject}:\xff`)
      .then(this.parseItem.call(this));
  }

  /**
   * Retrieves all nodes by type for an anchor node given its ID.
   *
   * @argument {String} nodeType
   * @argument {String|Node} anchorNode
   *
   * @returns {Promise<Node[]>}
   */
  retrieveAllNodesByTypeForAnchorNode (nodeType, anchorNode) {
    if (nucleusValidator.isObject(anchorNode)) {
      const stringifiedAnchorNode = `${anchorNode.type}-${anchorNode.ID}`;

      return this.retrieveAllNodesByTypeForAnchorNode(nodeType, stringifiedAnchorNode);
    }

    return this.$datastore.$$server.zrangebylexAsync('ResourceRelationship', `[OPS:${anchorNode}:is-member-of:${nodeType}-`, `[OPS:${anchorNode}:is-member-of:${nodeType}-\xff`)
      .then((itemList = []) => {

        return itemList
          .map((item) => {
            const [ indexScheme, vectorA, vectorB, vectorC ] = item.split(':');

            return vectorC;
          });
      })
      .then(this.parseNode.bind(this));
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
    if (nucleusValidator.isObject(subject)) {
      const stringifiedSubject = `${subject.type}-${subject.ID}`;

      return this.retrieveObjectOfRelationshipWithSubject(stringifiedSubject, predicate);
    }

    if (!nucleusValidator.isString(subject) || !this.validateVectorFormat(subject)) throw new NucleusError(`The subject must have the form "resource type + resource ID" but got "${subject}"`);

    return this.$datastore.retrieveVectorByIndexSchemeFromHexastore('ResourceRelationship', 'SPO', subject, predicate)
      .then(this.parseNode.bind(this));
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
    if (nucleusValidator.isObject(object)) {
      const stringifiedObject = `${object.type}-${object.ID}`;

      return this.retrieveSubjectOfRelationshipWithObject(stringifiedObject, predicate);
    }

    if (!nucleusValidator.isString(object) || !this.validateVectorFormat(object)) throw new NucleusError(`The object must have the form "resource type + resource ID" but got "${object}"`);

    return this.$datastore.retrieveVectorByIndexSchemeFromHexastore('ResourceRelationship', 'OPS', object, predicate)
      .then(this.parseNode.bind(this));
  }

  parseItem (item) {
    if (nucleusValidator.isArray(item)) {
      const itemList = item;

      return itemList.map(this.parseItem.bind(this));
    }

    const [ indexScheme, subject, predicate, object ] = item.split(':');

    return {
      subject: this.parseNode(subject),
      predicate,
      object: this.parseNode(object)
    };
  }

  /**
   * Parses a string node to an object node.
   *
   * @argument {String} node
   *
   * @returns {{ type: String, ID: string }}
   */
  parseNode (node) {
    if (nucleusValidator.isArray(node)) {
      const nodeList = node;

      return nodeList.map(this.parseNode.bind(this));
    }
    if (node === 'SYSTEM') return node;
    if (nucleusValidator.isObject(node)) return node;

    const $$nodeTypeNodeIDRegularExpression = new RegExp(`^(${nucleusValidator.pascalCaseRegularExpression})-(${nucleusValidator.UUIDRegularExpression})|SYSTEM$`);
    const [ matchedString, nodeType, nodeID ] = node.match($$nodeTypeNodeIDRegularExpression);

    return { type: nodeType, ID: nodeID };
  }

  /**
   * Validates that a vector is a resource type and a resource ID.
   *
   * @argument {String} vector
   *
   * @returns {Boolean}
   */
  validateVectorFormat (vector) {
    const $$pascalCaseAndUUIDRegularExpression = new RegExp(`^(${nucleusValidator.pascalCaseRegularExpression}-${nucleusValidator.UUIDRegularExpression})|SYSTEM$`);

    return $$pascalCaseAndUUIDRegularExpression.test(vector);
  }

}

module.exports = NucleusResourceRelationshipDatastore;