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
const NucleusEngine = require('../library/Engine.nucleus');
const NucleusError = require('../library/Error.nucleus');
const NucleusEvent = require('../library/Event.nucleus');

const DummyEngine = require('./autodiscoveryTestAssets/Dummy.engine');

const ACTION_QUEUE_NAME_BY_ACTION_NAME_ITEM_NAME_TABLE_NAME = 'ActionQueueNameByActionName';
const ACTION_QUEUE_NAME_SET_ITEM_NAME_TABLE_NAME = 'ActionQueueNameSet';

const DATASTORE_INDEX = 0;
const DATASTORE_URL = 'localhost';
const DATASTORE_PORT = 6379;

mocha.suite('Nucleus Engine', function () {

  mocha.suiteSetup(function () {
    const $dummyEngine = new DummyEngine();

    Reflect.defineProperty(this, '$dummyEngine', {
      value: $dummyEngine,
      writable: false
    });

    return $dummyEngine;
  });

  mocha.suiteSetup(function () {
    const $actionDatastore = new NucleusDatastore('Action', {
      index: DATASTORE_INDEX,
      URL: DATASTORE_URL,
      port: DATASTORE_PORT
    });

    const $engineDatastore = new NucleusDatastore('Engine', {
      index: DATASTORE_INDEX,
      URL: DATASTORE_URL,
      port: DATASTORE_PORT
    });

    const $eventDatastore = new NucleusDatastore('Event', {
      index: DATASTORE_INDEX,
      URL: DATASTORE_URL,
      port: DATASTORE_PORT
    });

    const $datastore = new NucleusDatastore('Test', {
      index: DATASTORE_INDEX,
      URL: DATASTORE_URL,
      port: DATASTORE_PORT
    });

    const $engine = new NucleusEngine('Test', {
      $actionDatastore,
      $engineDatastore,
      $eventDatastore
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

  mocha.suite("Parsing template strings", function () {

    mocha.test("Simple template strings are parsed as expected.", function () {

      chai.expect(NucleusEngine.parseTemplateString({ world: "World" }, "`Hello ${world}!`")).to.equal("Hello World!");
      chai.expect(NucleusEngine.parseTemplateString({ hello: "Hello", world: "World" }, "`${hello} ${world}!`")).to.equal("Hello World!");
      chai.expect(NucleusEngine.parseTemplateString({ hello: "Hello", world: "World" }, "`${Nucleus.shiftFirstLetterToLowerCase(hello)} ${Nucleus.shiftFirstLetterToLowerCase(world)}!`")).to.equal("hello world!");
      chai.expect(NucleusEngine.parseTemplateString({}, "`${2 + 2}`")).to.equal("4");
    });

    mocha.test("When required, the template string will be parsed as a promise.", function () {
      const { $dummyEngine } = this;

      chai.expect(NucleusEngine.parseTemplateString.call($dummyEngine, { resourceType: 'Dummy' }, "Nucleus.generateResourceModelFromResourceStructureByResourceType(`${resourceType}`)"))
        .to.eventually.be.a('function');
    });

    mocha.test("Using a JavaScript reserved word in the template string will throw an error.", function () {

      chai.expect(() => { NucleusEngine.parseTemplateString({}, "process.exit(69)"); }).to.throw(NucleusError);
    });

  });

  mocha.suite("#generateResourceModelFromResourceStructureByResourceType", function () {

    mocha.setup(function () {
      const { $dummyEngine } = this;

      return $dummyEngine.storeResourceStructure({
        resourceType: 'Dummy',
        propertiesByArgumentName: {
          name: 'string'
        }
      });
    });

    mocha.test("The Nucleus Resource Model will be bound with the correct resource structure.", async function () {
      const { $dummyEngine } = this;
      const resourceType = 'Dummy';
      const dummyAttributes = { name: `Dummy ${uuid.v4()}` };
      const authorUserID = uuid.v4();

      const NucleusResourceModel = await $dummyEngine.generateResourceModelFromResourceStructureByResourceType(resourceType);

      const $dummy = new NucleusResourceModel(dummyAttributes, authorUserID);

      chai.expect($dummy).to.have.ownProperty('ID');
      chai.expect($dummy).to.have.ownProperty('meta');
      chai.expect($dummy).to.have.ownProperty('name');
      chai.expect($dummy.name).to.equal(dummyAttributes.name);
      chai.expect($dummy.meta.authorUserID).to.equal(authorUserID);
    });

  });

  mocha.suite("Actions", function () {

    mocha.suiteSetup(async function () {
      const { $dummyEngine } = this;

      await $dummyEngine.storeActionConfiguration({
        actionName: 'ExecuteSimpleDummy',
        contextName: 'Self',
        methodName: 'executeSimpleDummy'
      });

      await $dummyEngine.storeActionConfiguration({
        actionName: 'ExecuteSimpleDummyWithArguments',
        actionSignature: [ 'AID1', 'AID2' ],
        argumentConfigurationByArgumentName: {
          AID1: 'string',
          AID2: 'string'
        },
        contextName: 'Self',
        methodName: 'executeSimpleDummyWithArguments'
      });

    });

    mocha.suiteTeardown(async function () {
      const { $dummyEngine } = this;

      await $dummyEngine.destroy();

      Reflect.deleteProperty(this, '$dummyEngine');

      return Promise.resolve();
    });

    mocha.suite("#executeAction", function () {

      mocha.test("The executed action is returned containing the final message.", async function () {
        const { $dummyEngine } = this;

        const $action = new NucleusAction('ExecuteSimpleDummy', {});

        const { finalMessage: { AID } } = await $dummyEngine.executeAction($action);

        chai.expect(AID).to.be.a('string');
      });

      mocha.test("The action message is returned as the final message.", async function () {
        const { $dummyEngine } = this;
        const AID1 = uuid.v1();
        const AID2 = uuid.v1();

        const $action = new NucleusAction('ExecuteSimpleDummyWithArguments', { AID1, AID2 });

        const { finalMessage } = await $dummyEngine.executeAction($action);

        chai.expect(finalMessage).to.deep.equal({ AID1, AID2 });
      });

      mocha.test("Using an action name that was not configured throws an error.", function () {
        const { $dummyEngine } = this;

        const $action = new NucleusAction('UnknownAction', {});

        return chai.expect($dummyEngine.executeAction.call($dummyEngine, $action))
          .to.be.rejectedWith(NucleusError.UndefinedContextNucleusError);
      });

      mocha.test("Passing a message that does not validate because its empty throws an error.", function () {
        const { $dummyEngine } = this;

        const $action = new NucleusAction('ExecuteSimpleDummyWithArguments', {});


        return chai.expect($dummyEngine.executeAction.call($dummyEngine, $action))
          .to.be.rejectedWith(NucleusError);
      });

      mocha.test("Passing a message that does not validate because its properties have the wrong type throws an error.", function () {
        const { $dummyEngine } = this;

        const $action = new NucleusAction('ExecuteSimpleDummyWithArguments', {
          AID1: 1,
          AID2: 2
        });

        return chai.expect($dummyEngine.executeAction.call($dummyEngine, $action))
          .to.be.rejectedWith(NucleusError);
      });

      mocha.suite("Extendable action", function () {

        mocha.suiteSetup(async function () {
          const { $dummyEngine } = this;

          await $dummyEngine.storeActionConfiguration({
            actionNameToExtend: 'ExtendResource',
            actionName: 'ExtendDummy',
            argumentConfigurationByArgumentName: {
              AID4: 'string'
            },
            filePath: path.join(__dirname, './autodiscoveryTestAssets/Dummy.api.js'),
          });

          await $dummyEngine.storeExtendableActionConfiguration({
            extendableActionArgumentDefault: {
              AID1: '\'85b4a289-8a31-428b-9c7a-dea7538cb116\''
            },
            actionName: 'ExtendResource',
            extendableActionName: '`Extend${resourceType}`',
            extendableEventName: '`${resourceType}Extended`',
            extendableActionAlternativeSignature: [ '\'AID1\'', '\'AID4\'', '\'AID3\'' ],
            actionSignature: [ 'AID1', 'AID2', 'AID3' ],
            argumentConfigurationByArgumentName: {
              AID1: 'string',
              AID2: 'string',
              AID3: 'string'
            },
            contextName: 'DummyAPI',
            filePath: path.join(__dirname, './autodiscoveryTestAssets/Dummy.api.js'),
            methodName: 'extendResource'
          });

        });

        mocha.test("The action's request message is correctly extended using the extendable argument defaults.", async function () {
          const { $dummyEngine } = this;
          const AID4 = uuid.v4();
          const AID3 = uuid.v4();

          const $action = new NucleusAction('ExtendDummy', { AID4, AID3 });

          const { finalMessage } = await $dummyEngine.executeAction($action);

          chai.expect(finalMessage).to.deep.equal({ AID1: '85b4a289-8a31-428b-9c7a-dea7538cb116', AID2: AID4, AID3 });
        });

      });

    });

    mocha.suite("#publishActionToQueueByName", function () {

      mocha.test("The action is stored and its key name is pushed to the appropriate action queue", async function () {
        const { $datastore, $engine } = this;

        const $action = new NucleusAction('DummyAction', {});

        $action.updateStatus(NucleusAction.PendingActionStatus);

        await $engine.publishActionToQueueByName('Dummy', $action);

        return Promise.all([
          $datastore.$$server.llenAsync('Dummy')
            .then((actionQueueMemberCount) => {
              chai.expect(actionQueueMemberCount, "The `Dummy` action queue has one member.").to.equal(1);
            }),
          $datastore.$$server.existsAsync($action.generateOwnItemKey())
            .then((keyNameExist) => {
              chai.expect(!!keyNameExist, "The item for the `DummyAction` has been created.").to.be.true;
            })
        ]);
      });

    });

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

    });

    mocha.suite.skip("Load testing", function () {
      // NOTE: Test aren't satisfactory. There is a clear degradation as the number of request increase.
      // 50, 100 or more requests made under a second is an unusual load, but the process needs to be optimized.

      mocha.teardown(function () {
        const { $datastore } = this;

        return $datastore.removeItemByName('Dummy');
      });

      mocha.suiteTeardown(function () {
        const { $datastore } = this;

        return $datastore.evaluateLUAScript(`return redis.call('INFO', 'Memory')`)
          .then(console.log);
      });

      mocha.suite("Action publication", function () {
        const requestCountList = [ 25, 50, 100, 500 ];

        requestCountList
          .forEach((requestCount) => {

            mocha.test(`${requestCount} requests...`, function () {
              const { $engine } = this;

              return Promise.all(Array.apply(null, { length: requestCount })
                .map(() => {
                  const userID = uuid.v4();
                  const $action = new NucleusAction('ExecuteSimpleDummy', {}, userID);

                  return $engine.publishActionToQueueByName('Dummy', $action);
                }));
            });

          });

      });

      mocha.suite("Full request loop", function () {
        const requestCountList = [ 25, 50, 100, 500 ];

        mocha.suiteSetup(function () {
          const { $dummyEngine } = this;

          return $dummyEngine.subscribeToActionQueueUpdate('Dummy');
        });

        requestCountList
          .forEach((requestCount) => {

            mocha.test(`${requestCount} requests...`, function () {
              const { $engine } = this;

              return Promise.all(Array.apply(null, { length: requestCount })
                .map(() => {
                  const userID = uuid.v4();

                  return $engine.publishActionByNameAndHandleResponse('ExecuteSimpleDummy', {}, userID);
                }));
            });

          });

      });

    });

  });

  // NOTE: This test oddly fails when run along the others, seems like the datastore connection closes before getting here.
  mocha.suite.skip("Autodiscovery", function () {

    mocha.test("Autodiscovery test", async function () {
      const { $dummyEngine } = this;

      const { actionConfigurationList, extendableActionConfigurationList, resourceStructureList } = await $dummyEngine.autodiscover(path.join(__dirname, '/autodiscoveryTestAssets'));

      chai.expect(actionConfigurationList).to.have.length(5);
      chai.expect(extendableActionConfigurationList).to.have.length(4);
      chai.expect(resourceStructureList).to.have.length(1);

      chai.expect(actionConfigurationList[0]).to.deep.include({
        actionName: 'ExecuteSimpleDummy'
      });

      chai.expect(actionConfigurationList[1]).to.deep.include({
        actionName: 'ExecuteSimpleDummyWithArguments',
        actionSignature: ['AID1', 'AID2']
      });

      chai.expect(actionConfigurationList[2]).to.deep.include({
        actionName: 'ExecuteSimpleDummyWithEvent',
        eventName: 'SimpleDummyWithEventExecuted'
      });

      chai.expect(actionConfigurationList[3]).to.deep.include({
        actionName: 'ExecuteSimpleDummyWithComplexSignature',
        actionSignature: ['AID1', 'AID2'],
        actionAlternativeSignature: ['AID1', 'AID3']
      });

      chai.expect(extendableActionConfigurationList[0]).to.deep.include({
        actionName: 'CreateResource'
      });

      chai.expect(extendableActionConfigurationList[1]).to.deep.include({
        actionName: 'RemoveResourceByID'
      });

      chai.expect(extendableActionConfigurationList[2]).to.deep.include({
        actionName: 'RetrieveResourceByID'
      });

      chai.expect(extendableActionConfigurationList[3]).to.deep.include({
        actionName: 'UpdateResourceByID'
      });

      chai.expect(resourceStructureList[0]).to.deep.include({
        resourceType: 'Dummy'
      });

      return Promise.resolve()
        .delay(1000);
    });

  });

});