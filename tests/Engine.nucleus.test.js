"use strict";

const Promise = require('bluebird');
const chai = require('chai');
const mocha = require('mocha');
const uuid = require('node-uuid');
const sinon = require('sinon');
const redis = require('redis');

const NucleusAction = require('../library/Action.nucleus');
const NucleusDatastore = require('../library/Datastore.nucleus');
const NucleusEngine = require('../library/Engine.nucleus');
const NucleusEvent = require('../library/Event.nucleus');

const datastoreIndex = 0;
const datastoreURL = 'localhost';
const datastorePort = 6379;

mocha.suite('Nucleus Engine', function () {

  mocha.suiteSetup(function () {
    const $actionDatastore = new NucleusDatastore('Action', {
      index: datastoreIndex,
      URL: datastoreURL,
      port: datastorePort
    });

    const $engineDatastore = new NucleusDatastore('Engine', {
      index: datastoreIndex,
      URL: datastoreURL,
      port: datastorePort
    });

    const $eventDatastore = new NucleusDatastore('Event', {
      index: datastoreIndex,
      URL: datastoreURL,
      port: datastorePort
    });

    const $datastore = new NucleusDatastore('Test', {
      index: datastoreIndex,
      URL: datastoreURL,
      port: datastorePort
    });

    const $engine = new NucleusEngine('Dummy', {
      $actionDatastore,
      $engineDatastore,
      $eventDatastore
    });

    Object.defineProperty(this, '$datastore', {
      value: $datastore,
      writable: false
    });
    Object.defineProperty(this, '$engine', {
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

  mocha.suiteSetup(function () {
    const { $datastore } = this;

    return $datastore.addItemToSet('ActionQueueNameSet', 'Dummy');
  });

  mocha.suiteTeardown(function () {
    const { $datastore } = this;

    return $datastore.$$server.flushallAsync();
  });

  mocha.suite("Actions", function () {

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

  });

  mocha.suite("Events", function () {

    mocha.teardown(function () {
      const { $engine } = this;

      $engine.$$handlerCallbackListByChannelName = {};
    });

    mocha.suite("#handleEventByChannelName", function () {

      mocha.test("The handler callback is added.", async function () {
        const { $engine } = this;

        const spy = sinon.spy(() => Promise.resolve());

        await $engine.handleEventByChannelName('DummyEvent', spy);

        chai.expect($engine.$$handlerCallbackListByChannelName, "The `DummyEvent` has been added.").to.have.property('DummyEvent');
        chai.expect($engine.$$handlerCallbackListByChannelName.DummyEvent, "One handler callback has been added.").to.have.length(1);
        chai.expect($engine.$$handlerCallbackListByChannelName.DummyEvent[0], "The spy handler has been added.").to.equal(spy);
      });

    });

    mocha.suite("#executeHandlerCallbackForChannelName", function () {

      mocha.suiteSetup(function () {
        const { $engine } = this;
        const spyA = sinon.spy(() => Promise.resolve());
        const spyB = sinon.spy(() => Promise.resolve());
        const spyC = sinon.spy(() => Promise.resolve());

        $engine.$$handlerCallbackListByChannelName.DummyEvent = [ spyA, spyB, spyC ];
      });

      mocha.test("Every registered handler callback is executed given the channel name.", async function () {
        const { $engine } = this;
        const [ spyA, spyB, spyC ] = $engine.$$handlerCallbackListByChannelName.DummyEvent;

        const $event = new NucleusEvent('DummyDummied', {});

        await $engine.executeHandlerCallbackForChannelName('DummyEvent', $event);

        return new Promise((resolve, reject) => {
          process.nextTick(function () {
            try {
              chai.expect(spyA.called, "The spy has been executed.").to.be.true;
              chai.expect(spyB.called, "The spy has been executed.").to.be.true;
              chai.expect(spyC.called, "The spy has been executed.").to.be.true;

              resolve();
            } catch (error) {
              reject(error);
            }
          });
        });
      });

    });

    mocha.suite("@event", function () {

      mocha.suiteSetup(function () {
        const { $engine } = this;

        const spy = sinon.spy(() => Promise.resolve());

        // $engine.$$handlerCallbackListByChannelName['DummyEvent'] = [];
        // $engine.$$handlerCallbackListByChannelName.DummyEvent.push(spy);

        return $engine.handleEventByChannelName('DummyEvent', spy);
      });

      mocha.suiteTeardown(function () {
        const { $engine } = this;

        return $engine.unsubscribeFromChannelName('DummyEvent');
      });

      mocha.test("Every registered handler callback is executed after an event is published to the channel.", async function () {
        const { $engine } = this;
        const spy = $engine.$$handlerCallbackListByChannelName.DummyEvent[0];

        const $event = new NucleusEvent('DummyDummied', {});

        await $engine.subscribeToChannelName('DummyEvent');
        await $engine.publishEventToChannelByName('DummyEvent', $event);

        return new Promise((resolve, reject) => {
          process.nextTick(function () {
            try {
              chai.expect(spy.called, "The handler callback has been called for the channel `DummyEvent`").to.be.true;

              resolve();
            } catch (error) {
              reject(error);
            }
          });
        });
      });

    });

  });

});