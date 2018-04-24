"use strict";

const Promise = require('bluebird');
const chai = require('chai');
const mocha = require('mocha');
const uuid = require('node-uuid');
const redis = require('redis');

const NucleusDatastore = require('../library/Datastore.nucleus');
const NucleusError = require('../library/Error.nucleus');

const DATASTORE_INDEX = 0;
const DATASTORE_URL = 'localhost';
const DATASTORE_PORT = 6379;

mocha.suite("Nucleus Datastore", function () {

  mocha.teardown(function () {
    const { $$redisTestClient } = this;

    return Promise.promisify($$redisTestClient.flushall, { context: $$redisTestClient })();
  });

  mocha.suiteSetup(function (done) {
    const $$redisTestClient = redis.createClient({
      db: DATASTORE_INDEX,
      host: DATASTORE_URL,
      port: DATASTORE_PORT
    });

    if ($$redisTestClient.connected) done();
    else {
      $$redisTestClient.on('connect', done);
      $$redisTestClient.once('error', done);
    }

    Object.defineProperty(this, '$$redisTestClient', {
      value: $$redisTestClient,
      writable: false
    });
  });

  mocha.suiteSetup(function () {
    const $datastore = new NucleusDatastore('Test', {
      index: DATASTORE_INDEX,
      URL: DATASTORE_URL,
      port: DATASTORE_PORT
    });

    Object.defineProperty(this, '$datastore', {
      value: $datastore,
      writable: false
    });

    return $datastore;
  });

  mocha.suiteTeardown(async function () {
    const { $datastore, $$redisTestClient } = this;

    await $datastore.destroy();
    await $$redisTestClient.quitAsync();

    return Promise.resolve();
  });

  mocha.suite("#addItemToHashByName", function () {

    mocha.test("Items of type string is correctly added to the hash.", function () {
      const { $datastore, $$redisTestClient } = this;

      const itemID = uuid.v1();
      const itemName = `Item`;
      const itemHashKey = `Hash:${itemID}`;
      const item = itemID;

      return $datastore.addItemToHashFieldByName(itemName, itemHashKey, item)
        .then(() => {

          return Promise.promisify($$redisTestClient.hget, { context: $$redisTestClient })(itemName, itemHashKey);
        })
        .then(NucleusDatastore.parseItem)
        .then((result) => {
          chai.expect(result).to.equal(item);
        });
    });

    mocha.test("Items of type object is correctly added to the hash.", function () {
      const { $datastore, $$redisTestClient } = this;

      const itemID = uuid.v1();
      const itemName = `Item`;
      const itemHashKey = `Hash:${itemID}`;
      const item = { ID: itemID };

      return $datastore.addItemToHashFieldByName(itemName, itemHashKey, item)
        .then(() => {

          return Promise.promisify($$redisTestClient.hget, { context: $$redisTestClient })(itemName, itemHashKey);
        })
        .then((result) => {
          chai.expect(result).to.equal(JSON.stringify(item));
        });
    });

    mocha.test("Items of type array is correctly added to the hash.", function () {
      const { $datastore, $$redisTestClient } = this;

      const itemID = uuid.v1();
      const itemName = `Item`;
      const itemHashKey = `Hash:${itemID}`;
      const item = [ itemID ];

      return $datastore.addItemToHashFieldByName(itemName, itemHashKey, item)
        .then(() => {

          return Promise.promisify($$redisTestClient.hget, { context: $$redisTestClient })(itemName, itemHashKey);
        })
        .then((result) => {
          chai.expect(result).to.equal(JSON.stringify(item));
        });
    });

    mocha.test("Items of type number is correctly added to the hash.", function () {
      const { $datastore, $$redisTestClient } = this;

      const itemID = uuid.v1();
      const itemName = `Item`;
      const itemHashKey = `Hash:${itemID}`;
      const item = 1;

      return $datastore.addItemToHashFieldByName(itemName, itemHashKey, item)
        .then(() => {

          return Promise.promisify($$redisTestClient.hget, { context: $$redisTestClient })(itemName, itemHashKey);
        })
        .then((result) => {
          chai.expect(result).to.equal(JSON.stringify(item));
        });
    });

    mocha.test("A list of item is correctly added to the hash.", function () {
      const { $datastore, $$redisTestClient } = this;

      const itemName = 'Item';
      const itemIDList = Array.apply(null, { length: 5 })
        .map(() => {

          return uuid.v1();
        });

      const hashList = itemIDList
        .reduce((accumulator, itemID) => {
          accumulator.push(`Hash:${itemID}`);
          accumulator.push(itemID);

          return accumulator;
        }, [itemName]);

      return $datastore.addItemToHashFieldByName.apply($datastore, hashList)
        .then(() => {
          const HMGETArgumentList = itemIDList
            .reduce((accumulator, itemID) => {
              accumulator.push(`Hash:${itemID}`);

              return accumulator;
            }, [itemName]);

          return Promise.promisify($$redisTestClient.hmget, { context:$$redisTestClient }).apply(Promise, HMGETArgumentList);
        })
        .then((itemIDList) => {
          chai.expect(itemIDList).to.be.an('array');
          chai.expect(itemIDList).to.have.length(5);
        });
    });

    mocha.test("Using an undefined item name throws an error.", function () {
      const { $datastore } = this;

      const itemID = uuid.v1();
      const itemHashKey = `Hash:${itemID}`;
      const item = itemID;

      chai.expect(() => { $datastore.addItemToHashFieldByName(undefined, itemHashKey, item); }).to.throw(NucleusError);
    });

    mocha.test("Using an undefined hash key throws an error.", function () {
      const { $datastore } = this;

      const itemID = uuid.v1();
      const itemName = `Item`;
      const item = itemID;

      chai.expect(() => { $datastore.addItemToHashFieldByName(itemName, undefined, item); }).to.throw(NucleusError);
    });

  });

  mocha.suite("#addItemToListByName", function () {

    mocha.test("Items of type string is correctly added to the list.", function () {
      const { $datastore, $$redisTestClient } = this;

      const itemID = uuid.v1();
      const itemName = `ItemList`;
      const item = itemID;

      return $datastore.addItemToListByName(itemName, item)
        .then(() => {

          return Promise.promisify($$redisTestClient.lpop, { context: $$redisTestClient })(itemName);
        })
        .then(NucleusDatastore.parseItem)
        .then((result) => {
          chai.expect(result).to.equal(item);
        });
    });

    mocha.test("Items of type object is correctly added to the list.", function () {
      const { $datastore, $$redisTestClient } = this;

      const itemID = uuid.v1();
      const itemName = `Item`;
      const item = { ID: itemID };

      return $datastore.addItemToListByName(itemName, item)
        .then(() => {

          return Promise.promisify($$redisTestClient.lpop, { context: $$redisTestClient })(itemName);
        })
        .then(NucleusDatastore.parseItem)
        .then((result) => {
          chai.expect(result).to.deep.equal(item);
        });
    });

    mocha.test("Items of type number is correctly added to the list.", function () {
      const { $datastore, $$redisTestClient } = this;

      const itemName = `Item`;
      const item = 1;

      return $datastore.addItemToListByName(itemName, item)
        .then(() => {

          return Promise.promisify($$redisTestClient.lpop, { context: $$redisTestClient })(itemName);
        })
        .then(NucleusDatastore.parseItem)
        .then((result) => {
          chai.expect(result).to.equal(item);
        });
    });

    mocha.test.skip("A list of item is correctly added to the (Redis) list.", function () {
      const { $datastore, $$redisTestClient } = this;

      const itemName = 'Item';
      const itemIDList = Array.apply(null, { length: 5 })
        .map(() => {

          return uuid.v1();
        });

      return $datastore.addItemToListByName(itemName, itemIDList)
        .then(() => {

          return Promise.promisify($$redisTestClient.lrange, { context:$$redisTestClient })(itemName, 0, -1);
        })
        .then((itemIDList) => {
          chai.expect(itemIDList).to.equal('array');
          chai.expect(itemIDList).to.have.length(5);
        });
    });

    mocha.test("Using an undefined item name throws an error.", function () {
      const { $datastore } = this;

      const itemID = uuid.v1();
      const item = itemID;

      chai.expect(() => { $datastore.addItemToListByName(undefined, item); }).to.throw(NucleusError);
    });

  });

  mocha.suite("#createItem", function () {

    mocha.test("An item of type string is correctly created.", function () {
      const { $datastore, $$redisTestClient } = this;

      const itemID = uuid.v1();
      const itemName = `Item:${itemID}`;
      const item = itemID;

      return $datastore.createItem(itemName, item)
        .then(() => {

          return Promise.promisify($$redisTestClient.get, { context: $$redisTestClient })(itemName);
        })
        .then(NucleusDatastore.parseItem)
        .then((result) => {
          chai.expect(result).to.equal(item);
        });
    });

    mocha.test("An item of type object is correctly created.", function () {
      const { $datastore, $$redisTestClient } = this;

      const itemID = uuid.v1();
      const itemName = `Item:${itemID}`;
      const item = { ID: itemID };

      return $datastore.createItem(itemName, item)
        .then(() => {

          return Promise.promisify($$redisTestClient.get, { context: $$redisTestClient })(itemName);
        })
        .then((result) => {
          chai.expect(result).to.equal(JSON.stringify(item));
        });
    });

    mocha.test("An item of type array is correctly created.", function () {
      const { $datastore, $$redisTestClient } = this;

      const itemID = uuid.v1();
      const itemName = `Item:${itemID}`;
      const item = [ itemID ];

      return $datastore.createItem(itemName, item)
        .then(() => {

          return Promise.promisify($$redisTestClient.get, { context: $$redisTestClient })(itemName);
        })
        .then((result) => {
          chai.expect(result).to.equal(JSON.stringify(item));
        });
    });

    mocha.test("An item of type number is correctly created.", function () {
      const { $datastore, $$redisTestClient } = this;

      const itemID = uuid.v1();
      const itemName = `Item:${itemID}`;
      const item = 1;

      return $datastore.createItem(itemName, item)
        .then(() => {

          return Promise.promisify($$redisTestClient.get, { context: $$redisTestClient })(itemName);
        })
        .then((result) => {
          chai.expect(result).to.equal(JSON.stringify(1));
        });
    });

    mocha.test("Using an undefined item name throws an error.", function () {
      const { $datastore } = this;

      const itemID = uuid.v1();
      const item = itemID;

      chai.expect(() => { $datastore.createItem(undefined, item) }).to.throw(NucleusError);
    });

  });

  mocha.suite("#evaluateLUAScript", function () {

    mocha.test("As per the LUA script, the item is set.", function () {
      const { $datastore, $$redisTestClient } = this;

      const itemID = uuid.v1();
      const itemName = `Item:${itemID}`;
      const item = itemID;

      return $datastore.evaluateLUAScript(`
local itemName = ARGV[1]
local item = ARGV[2]

return redis.call('SET', itemName, item) 
      `, itemName, item)
        .then(() => {

          return Promise.promisify($$redisTestClient.get, { context: $$redisTestClient })(itemName);
        })
        .then(NucleusDatastore.parseItem)
        .then((result) => {
          chai.expect(result).to.equal(item);
        });
    });

    mocha.test("After the LUA script is executed, an array is returned.", function () {
      const { $datastore } = this;

      const itemIDA = uuid.v1();
      const itemIDB = uuid.v1();
      const itemIDC = uuid.v1();

      return $datastore.evaluateLUAScript(`
local itemIDA = ARGV[1]
local itemIDB = ARGV[2]
local itemIDC = ARGV[3]

return { itemIDA, itemIDB, itemIDC }
      `, itemIDA, itemIDB, itemIDC)
        .then((itemIDList) => {
          chai.expect(itemIDList).to.be.an('array');
          chai.expect(itemIDList).to.have.length(3);
        });
    });

  });

  mocha.suite("#removeItemByName", function () {

    mocha.test("Given its name, the item is removed.", function () {
      const { $datastore, $$redisTestClient } = this;

      const itemID = uuid.v1();
      const itemName = `Item`;
      const item = itemID;

      return $datastore.createItem(itemName, item)
        .then(() => {

          return $datastore.removeItemByName(itemName);
        })
        .then(() => {

          return Promise.promisify($$redisTestClient.get, { context: $$redisTestClient })(itemName);
        })
        .then((result) => {
          chai.expect(result).to.be.null;
        });
    });

    mocha.test("Using an undefined item name throws an error.", function () {
      const { $datastore } = this;

      chai.expect(() => { $datastore.removeItemByName(undefined); }).to.throw(NucleusError);
    });

  });

  mocha.suite("#removeItemFromHashByName", function () {

    mocha.test("Given its hash key, the item is removed.", function () {
      const { $datastore, $$redisTestClient } = this;

      const itemID = uuid.v1();
      const itemName = `Item`;
      const itemHashKey = `Hash:${itemID}`;
      const item = itemID;

      return $datastore.addItemToHashFieldByName(itemName, itemHashKey, item)
        .then(() => {

          return $datastore.removeItemFromFieldByName(itemName, itemHashKey);
        })
        .then(() => {

          return Promise.promisify($$redisTestClient.hget, { context: $$redisTestClient })(itemName, itemHashKey);
        })
        .then((result) => {
          chai.expect(result).to.be.null;
        });
    });

    mocha.test("Using an undefined item name throws an error.", function () {
      const { $datastore } = this;

      const itemID = uuid.v1();
      const itemHashKey = `Hash:${itemID}`;
      const item = itemID;

      chai.expect(() => { $datastore.removeItemFromFieldByName(undefined, itemHashKey, item); }).to.throw(NucleusError);
    });

    mocha.test("Using an undefined hash key throws an error.", function () {
      const { $datastore } = this;

      const itemID = uuid.v1();
      const itemName = `Item`;
      const item = itemID;

      chai.expect(() => { $datastore.removeItemFromFieldByName(itemName, undefined, item); }).to.throw(NucleusError);
    });

  });

  mocha.suite("#retrieveItemFromListDeferred", function () {

    mocha.test("The item is returned once another client pushes to the list.", function () {
      const { $datastore } = this;
      const $handlerDatastore = $datastore.duplicateConnection();
      const listName = 'DummyList';

      setTimeout($datastore.addItemToListByName, 1000, listName, uuid.v1());

      return $handlerDatastore.retrieveItemFromListDeferred(listName)
        .then((item) => {
          chai.expect(item).to.be.a('string');
        });
    });

  });
  
  mocha.suite("#retrieveItemByName", function () {
    
    mocha.test("Given its hash key, the item of type string is retrieved.", function () {
      const { $datastore } = this;

      const itemID = uuid.v1();
      const itemName = `Item:${itemID}`;
      const item = itemID;

      return $datastore.createItem(itemName, item)
        .then(() => {

          return $datastore.retrieveItemByName(itemName);
        })
        .then((result) => {
          chai.expect(result).to.equal(item);
        });
    });

    mocha.test("Given its hash key, the item of type object is retrieved.", function () {
      const { $datastore } = this;

      const itemID = uuid.v1();
      const itemName = `Item:${itemID}`;
      const item = { ID: itemID };

      return $datastore.createItem(itemName, item)
        .then(() => {

          return $datastore.retrieveItemByName(itemName);
        })
        .then((result) => {
          chai.expect(result).to.deep.equal(item);
        });
    });

    mocha.test("Given its hash key, the item of type array is retrieved.", function () {
      const { $datastore } = this;

      const itemID = uuid.v1();
      const itemName = `Item:${itemID}`;
      const item = [ itemID ];

      return $datastore.createItem(itemName, item)
        .then(() => {

          return $datastore.retrieveItemByName(itemName);
        })
        .then((result) => {
          chai.expect(result).to.deep.equal(item);
        });
    });

    mocha.test("Given its hash key, the item of type number is retrieved.", function () {
      const { $datastore } = this;

      const itemID = uuid.v1();
      const itemName = `Item:${itemID}`;
      const item = 1;

      return $datastore.createItem(itemName, item)
        .then(() => {

          return $datastore.retrieveItemByName(itemName);
        })
        .then((result) => {
          chai.expect(result).to.deep.equal(item);
        });
    });

    mocha.test("Using an undefined hash key throws an error.", function () {
      const { $datastore } = this;

      chai.expect(() => { $datastore.retrieveItemByName(undefined); }).to.throw(NucleusError);
    });

  });

  mocha.suite("#retrieveItemFromHashByName", function () {

    mocha.test("Given its hash key, the item of type string is retrieved.", function () {
      const { $datastore } = this;

      const itemID = uuid.v1();
      const itemName = `Item`;
      const itemHashKey = `Hash:${itemID}`;
      const item = itemID;

      return $datastore.addItemToHashFieldByName(itemName, itemHashKey, item)
        .then(() => {

          return $datastore.retrieveItemFromHashFieldByName(itemName, itemHashKey);
        })
        .then((result) => {
          chai.expect(result).to.equal(item);
        });
    });

    mocha.test("Given its hash key, the item of type object is retrieved.", function () {
      const { $datastore } = this;

      const itemID = uuid.v1();
      const itemName = `Item`;
      const itemHashKey = `Hash:${itemID}`;
      const item = { ID: itemID };

      return $datastore.addItemToHashFieldByName(itemName, itemHashKey, item)
        .then(() => {

          return $datastore.retrieveItemFromHashFieldByName(itemName, itemHashKey);
        })
        .then((result) => {
          chai.expect(result).to.deep.equal(item);
        });
    });

    mocha.test("Given its hash key, the item of type array is retrieved.", function () {
      const { $datastore } = this;

      const itemID = uuid.v1();
      const itemName = `Item`;
      const itemHashKey = `Hash:${itemID}`;
      const item = [ itemID ];

      return $datastore.addItemToHashFieldByName(itemName, itemHashKey, item)
        .then(() => {

          return $datastore.retrieveItemFromHashFieldByName(itemName, itemHashKey);
        })
        .then((result) => {
          chai.expect(result).to.deep.equal(item);
        });
    });

    mocha.test("Given its hash key, the item of type number is retrieved.", function () {
      const { $datastore } = this;

      const itemID = uuid.v1();
      const itemName = `Item`;
      const itemHashKey = `Hash:${itemID}`;
      const item = 1;

      return $datastore.addItemToHashFieldByName(itemName, itemHashKey, item)
        .then(() => {

          return $datastore.retrieveItemFromHashFieldByName(itemName, itemHashKey);
        })
        .then((result) => {
          chai.expect(result).to.deep.equal(item);
        });
    });

    mocha.test("Using an undefined name throws an error.", function () {
      const { $datastore } = this;

      const itemID = uuid.v1();
      const itemHashKey = `Hash:${itemID}`;
      const item = itemID;

      chai.expect(() => { $datastore.retrieveItemFromHashFieldByName(undefined, itemHashKey); }).to.throw(NucleusError);
    });

    mocha.test("Using an undefined hash key throws an error.", function () {
      const { $datastore } = this;

      const itemID = uuid.v1();
      const itemName = `Item`;
      const item = itemID;

      chai.expect(() => { $datastore.retrieveItemFromHashFieldByName(itemName, undefined); }).to.throw(NucleusError);
    });

  });

  mocha.suite("Hexastore", function () {

    mocha.suite("#addTripleToHexastore", function () {

      mocha.test("A set representing the six possible relationship is created.", function () {
        const { $datastore, $$redisTestClient } = this;

        const itemKey = 'ItemHexastore';
        const subject = uuid.v1();
        const predicate = 'isMember';
        const object = uuid.v1();

        return $datastore.addTripleToHexastore(itemKey, subject, predicate, object)
          .then(() => {

            return Promise.promisify($$redisTestClient.zrange, { context: $$redisTestClient })(itemKey, 0, -1)
              .then((memberList) => {
                chai.expect(memberList).to.have.length(6);
              });
          });
      });

    });

    mocha.suite("#retrieveRelationshipListFromHexastore", function () {

      mocha.test("The relationship between two elements is retrieved.", function () {
        const { $datastore } = this;

        const itemKey = 'ItemHexastore';
        const subject = uuid.v1();
        const predicate = 'isMember';
        const object = uuid.v1();

        return $datastore.addTripleToHexastore(itemKey, subject, predicate, object)
          .then(() => {

            return $datastore.retrieveRelationshipListFromHexastore(itemKey, subject, object);
          })
          .then(({ relationshipList }) => {
            chai.expect(relationshipList).to.have.length(1);
            chai.expect(relationshipList[0]).to.equal(predicate);
          });
      });

    });

  });

});