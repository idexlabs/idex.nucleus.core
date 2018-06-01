"use strict";

const Promise = require('bluebird');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const mocha = require('mocha');
const path = require('path');
const uuid = require('uuid');
const sinon = require('sinon');
chai.use(chaiAsPromised);

const NucleusAction = require('../library/Action.nucleus');
const NucleusDatastore = require('../library/Datastore.nucleus');
const NucleusPublisherEngine = require('../library/PublisherEngine.nucleus');
const NucleusError = require('../library/Error.nucleus');

const ACTION_QUEUE_NAME_BY_ACTION_NAME_ITEM_NAME_TABLE_NAME = 'ActionQueueNameByActionName';
const ACTION_QUEUE_NAME_SET_ITEM_NAME_TABLE_NAME = 'ActionQueueNameSet';

const DATASTORE_INDEX = 0;
const DATASTORE_URL = 'localhost';
const DATASTORE_PORT = 6379;

mocha.suite('Nucleus Publisher Engine', function () {

  mocha.suiteSetup(function () {
    const $actionDatastore = new NucleusDatastore('Action', {
      index: DATASTORE_INDEX,
      URL: DATASTORE_URL,
      port: DATASTORE_PORT
    });

    const $datastore = new NucleusDatastore('Test', {
      index: DATASTORE_INDEX,
      URL: DATASTORE_URL,
      port: DATASTORE_PORT
    });

    const $engine = new NucleusPublisherEngine('Test', {
      $actionDatastore
    });

    Reflect.defineProperty(this, '$datastore', {
      value: $datastore,
      writable: false
    });
    Reflect.defineProperty(this, '$engine', {
      value: $engine,
      writable: false
    });

    return Promise.all([
      $datastore,
      $engine
    ]);
  });

  mocha.suiteSetup(function () {
    const { $datastore } = this;

    return $datastore.$$server.flushallAsync();
  });

  mocha.suiteSetup(async function () {
    const { $datastore } = this;

    await $datastore.addItemToSetByName(ACTION_QUEUE_NAME_SET_ITEM_NAME_TABLE_NAME, 'Dummy');
    await $datastore.addItemToHashFieldByName(ACTION_QUEUE_NAME_BY_ACTION_NAME_ITEM_NAME_TABLE_NAME, 'ExecuteSimpleDummy', 'Dummy');

  });

  mocha.suiteTeardown(function () {
    const { $datastore } = this;

    return $datastore.$$server.flushallAsync();
  });

  mocha.suiteTeardown(function () {
    const { $datastore } = this;

    return $datastore.destroy();
  });

  mocha.suite("Actions", function () {

    mocha.suite("#publishActionByNameAndHandleResponse", function () {

      mocha.suiteSetup(async function () {
        const { $datastore } = this;
        const $handlerDatastore = this.$datastore.duplicateConnection();

        // Manually update the action's item's status and final message.
        // This will trigger the #publishActionByNameAndHandleResponse to resolve with the response;

        await $handlerDatastore.$$server.subscribe(`__keyspace@${DATASTORE_INDEX}__:Dummy`);

        $handlerDatastore.$$server.on('message', async (channelName, redisCommand) => {
          if (channelName !== `__keyspace@${DATASTORE_INDEX}__:Dummy` || redisCommand !== 'lpush') return;

          const actionItemKey = await $datastore.$$server.lpopAsync('Dummy');

          await $datastore.addItemToHashFieldByName(actionItemKey, 'finalMessage', { dummy: { ID: uuid.v4() } }, 'status', NucleusAction.CompletedActionStatus);

          await $handlerDatastore.$$server.unsubscribe(`__keyspace@${DATASTORE_INDEX}__:Dummy`);
        });

        return Promise.delay(1000);
      });

      mocha.test("The response is returned once the action has been fulfilled.", async function () {
        const { $engine } = this;
        const userID = uuid.v4();

        const { dummy } = await $engine.publishActionByNameAndHandleResponse('ExecuteSimpleDummy', { iam: 'special' }, userID);

        chai.expect(dummy).to.be.an('object');
      });

      mocha.test.skip("The response promise can be used like a bluebird promise.", function () {
        const { $engine } = this;
        const userID = uuid.v4();

        return $engine.publishActionByNameAndHandleResponse('ExecuteSimpleDummy', { iam: 'special' }, userID)
          .tap(console.log);
      });

    });

  });

});