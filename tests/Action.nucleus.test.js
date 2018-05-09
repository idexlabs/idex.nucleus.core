"use strict";

const Promise = require('bluebird');
const chai = require('chai');
const mocha = require('mocha');
const uuid = require('uuid');
const redis = require('redis');

const NucleusAction = require('../library/Action.nucleus');
const NucleusError = require('../library/Error.nucleus');

mocha.suite('Nucleus Action', function () {

  mocha.suite("Default signature", function () {

    mocha.test("The action requires a name and a message.", function () {
      const actionName = 'DummyAction';
      const actionMessage = { AID: uuid.v1() };

      const $action = new NucleusAction(actionName, actionMessage);

      chai.expect($action).to.have.ownProperty('ID');
      chai.expect($action).to.have.ownProperty('name');
      chai.expect($action).to.have.ownProperty('originalMessage');

      chai.expect($action.name).to.equal(actionName);
      chai.expect($action.originalMessage).to.deep.equal(actionMessage);
    });

    mocha.test("The action's ID, name and original message are not writable.", function () {
      const actionName = 'DummyAction';
      const actionMessage = { AID: uuid.v1() };

      const $action = new NucleusAction(actionName, actionMessage);

      const { ID: actionID, originalMessage: actionOriginalMessage } = $action;
      const { AID: actionAID } = actionOriginalMessage;

      try { $action.ID = uuid.v1(); } catch (error) {}
      try { $action.name = 'ReallyDummyAction'; } catch (error) {}
      try { $action.originalMessage.AID = uuid.v1(); } catch (error) {}
      try { $action.originalMessage.AID2 = uuid.v1(); } catch (error) {}

      chai.expect($action.ID).to.equal(actionID);
      chai.expect($action.name).to.equal(actionName);
      chai.expect($action.originalMessage.AID).to.equal(actionAID);
      chai.expect($action.originalMessage).to.deep.equal(actionOriginalMessage);

    });

    mocha.test("The action's meta is converted to a convenience string if forced to string.", function () {
      const actionName = 'DummyAction';
      const actionMessage = { AID: uuid.v1() };

      const $action = new NucleusAction(actionName, actionMessage);
      const actionMetaPrimitive = `${$action.meta}`;

      chai.expect(actionMetaPrimitive).to.equal(`NucleusAction created on ${$action.meta.createdISOTime} by ${$action.meta.authorUserID}.`);
    });

    mocha.test("The action's meta has a `toString` method that converts the meta object to a JSON string.", function () {
      const actionName = 'DummyAction';
      const actionMessage = { AID: uuid.v1() };

      const $action = new NucleusAction(actionName, actionMessage);
      const actionMeta = $action.meta;
      const actionMetaStringified = $action.meta.toString();

      const actionMetaStringifiedParsed = JSON.parse(actionMetaStringified);

      chai.expect(actionMetaStringifiedParsed).to.deep.equal(actionMeta);
    });

    mocha.test("The action's original message has a `toString` method that converts the original message object to a JSON string.", function () {
      const actionName = 'DummyAction';
      const actionMessage = { AID: uuid.v1() };

      const $action = new NucleusAction(actionName, actionMessage);
      const actionOriginalMessageStringified = $action.originalMessage.toString();

      const actionOriginalMessageStringifiedParsed = JSON.parse(actionOriginalMessageStringified);

      chai.expect(actionOriginalMessageStringifiedParsed).to.deep.equal(actionMessage);
    });

    mocha.test("Using an undefined action name throws an error.", function () {
      chai.expect(function () { new NucleusAction(undefined, {}); }).to.throw(NucleusError);
      chai.expect(function () { new NucleusAction('', {}); }).to.throw(NucleusError);
    });

    mocha.test("The action is converted to a convenience string if force to string.", function () {
      const $action = new NucleusAction('DummyAction', {});
      const actionPrimitive = `${$action}`;

      chai.expect(actionPrimitive).to.equal(`NucleusAction:${$action.name}:${$action.ID}`);
    });

    mocha.test("An action list could be sorted by status.", function () {
      const $action1 = new NucleusAction('DummyAction', {});
      const $action2 = new NucleusAction('DummyAction', {});
      const $action3 = new NucleusAction('DummyAction', {});
      const $action4 = new NucleusAction('DummyAction', {});

      $action1.updateStatus(NucleusAction.CompletedActionStatus);
      $action2.updateStatus(NucleusAction.CompletedActionStatus);
      $action3.updateStatus(NucleusAction.PendingActionStatus);
      $action4.updateStatus(NucleusAction.ProcessingActionStatus);

      const actionList = [ $action1, $action2, $action3, $action4 ];
      const orderedActionIDList = actionList
        .sort(($actionA, $actionB) => {

          return +$actionA - +$actionB;
        })
        .map(($action) => {

          return $action.ID;
        });

      chai.expect(orderedActionIDList).to.deep.equal([$action3.ID, $action4.ID, $action1.ID, $action2.ID]);
    });

  });

  mocha.suite("Action-like signature", function () {

    mocha.test("The action's ID, name and original message are not writable.", function () {
      const actionName = 'DummyAction';
      const actionMessage = { AID: uuid.v1() };
      const userID = uuid.v4();

      const $action = new NucleusAction({
        ID: uuid.v1(),
        name: actionName,
        originalMessage: actionMessage,
        meta: {
          createdISOTime: new Date().toISOString(),
          originEngineID: uuid.v4(),
          originEngineName: 'Dummy',
          originProcessID: process.pid,
          originUserID: userID
        },
        originUserID: userID
      });

      const { ID: actionID, originalMessage: actionOriginalMessage } = $action;
      const { AID: actionAID } = actionOriginalMessage;

      try { $action.ID = uuid.v1(); } catch (error) {}
      try { $action.name = 'ReallyDummyAction'; } catch (error) {}
      try { $action.originalMessage.AID = uuid.v1(); } catch (error) {}
      try { $action.originalMessage.AID2 = uuid.v1(); } catch (error) {}

      chai.expect($action.ID).to.equal(actionID);
      chai.expect($action.name).to.equal(actionName);
      chai.expect($action.originalMessage.AID).to.equal(actionAID);
      chai.expect($action.originalMessage).to.deep.equal(actionOriginalMessage);

    });

    mocha.test("The action's meta is converted to a convenience string if forced to string.", function () {
      const actionName = 'DummyAction';
      const actionMessage = { AID: uuid.v1() };
      const userID = uuid.v4();

      const $action = new NucleusAction({
        ID: uuid.v1(),
        name: actionName,
        originalMessage: actionMessage,
        meta: {
          createdISOTime: new Date().toISOString(),
          originEngineID: uuid.v4(),
          originEngineName: 'Dummy',
          originProcessID: process.pid,
          originUserID: userID
        },
        originUserID: userID
      });

      const actionMetaPrimitive = `${$action.meta}`;

      chai.expect(actionMetaPrimitive).to.equal(`NucleusAction created on ${$action.meta.createdISOTime} by ${$action.meta.originUserID}.`);
    });

    mocha.test("The action's meta has a `toString` method that converts the meta object to a JSON string.", function () {
      const actionName = 'DummyAction';
      const actionMessage = { AID: uuid.v1() };
      const userID = uuid.v4();

      const $action = new NucleusAction({
        ID: uuid.v1(),
        name: actionName,
        originalMessage: actionMessage,
        meta: {
          createdISOTime: new Date().toISOString(),
          originEngineID: uuid.v4(),
          originEngineName: 'Dummy',
          originProcessID: process.pid,
          originUserID: userID
        },
        originUserID: userID
      });
      const actionMeta = $action.meta;
      const actionMetaStringified = $action.meta.toString();

      const actionMetaStringifiedParsed = JSON.parse(actionMetaStringified);

      chai.expect(actionMetaStringifiedParsed).to.deep.equal(actionMeta);
    });

    mocha.test("The action's original message has a `toString` method that converts the original message object to a JSON string.", function () {
      const actionName = 'DummyAction';
      const actionMessage = { AID: uuid.v1() };
      const userID = uuid.v4();

      const $action = new NucleusAction({
        ID: uuid.v1(),
        name: actionName,
        originalMessage: actionMessage,
        meta: {
          createdISOTime: new Date().toISOString(),
          originEngineID: uuid.v4(),
          originEngineName: 'Dummy',
          originProcessID: process.pid,
          originUserID: userID
        },
        originUserID: userID
      });
      const actionOriginalMessageStringified = $action.originalMessage.toString();

      const actionOriginalMessageStringifiedParsed = JSON.parse(actionOriginalMessageStringified);

      chai.expect(actionOriginalMessageStringifiedParsed).to.deep.equal(actionMessage);
    });

    mocha.test("The action is converted to a convenience string if force to string.", function () {
      const actionName = 'DummyAction';
      const actionMessage = {};
      const userID = uuid.v4();

      const $action = new NucleusAction({
        ID: uuid.v1(),
        name: actionName,
        originalMessage: actionMessage,
        meta: {
          createdISOTime: new Date().toISOString(),
          originEngineID: uuid.v4(),
          originEngineName: 'Dummy',
          originProcessID: process.pid,
          originUserID: userID
        },
        originUserID: userID
      });
      const actionPrimitive = `${$action}`;

      chai.expect(actionPrimitive).to.equal(`NucleusAction:${$action.name}:${$action.ID}`);
    });

  });

  mocha.suite('#updateMessage', function () {

    mocha.test("The action's final message is updated and the modification time is recorded.", function () {
      const actionName = 'DummyAction';
      const actionMessage = { AID: uuid.v1() };

      const $action = new NucleusAction(actionName, actionMessage);

      const actionFinalMessage = { AID: uuid.v1() };

      chai.expect($action.meta.modifiedISOTime).to.be.undefined;
      chai.expect($action.finalMessage).to.be.undefined;

      $action.updateMessage(actionFinalMessage);

      chai.expect($action.meta.modifiedISOTime).to.not.be.undefined;
      chai.expect($action.finalMessage).to.deep.equal(actionFinalMessage);
    });

    mocha.test("The action's final message has a `toString` method that converts the final message object to a JSON string.", function () {
      const actionName = 'DummyAction';
      const actionMessage = { AID: uuid.v1() };

      const $action = new NucleusAction(actionName, actionMessage);

      const actionFinalMessage = { AID: uuid.v1() };

      $action.updateMessage(actionFinalMessage);

      const actionFinalMessageStringified = $action.finalMessage.toString();

      const actionFinalMessageStringifiedParsed = JSON.parse(actionFinalMessageStringified);

      chai.expect(actionFinalMessageStringifiedParsed).to.deep.equal(actionFinalMessage);
    });

    mocha.test("The method will throw an error if the final message is not an object.", function () {
      chai.expect(function () {
        const actionName = 'DummyAction';
        const actionMessage = { AID: uuid.v1() };

        const $action = new NucleusAction(actionName, actionMessage);

        const actionFinalMessage = uuid.v1();

        $action.updateMessage(actionFinalMessage);
      }).to.throw(NucleusError);
    });

  });

  mocha.suite('#updateStatus', function () {

    mocha.test("The NucleusAction class has a list of valid action status as property", function () {
      chai.expect(NucleusAction.PendingActionStatus).to.be.a('string');
      chai.expect(NucleusAction.ProcessingActionStatus).to.be.a('string');
      chai.expect(NucleusAction.FailedActionStatus).to.be.a('string');
      chai.expect(NucleusAction.CompletedActionStatus).to.be.a('string');

      chai.expect(NucleusAction.NucleusActionStatusWeightList).to.be.an('array');
    });

    mocha.test("The action's status is updated and the time is recorded.", function () {
      const actionName = 'DummyAction';
      const actionMessage = { AID: uuid.v1() };

      const $action = new NucleusAction(actionName, actionMessage);

      $action.updateStatus(NucleusAction.PendingActionStatus);
      chai.expect($action.status).to.equal(NucleusAction.PendingActionStatus);
      chai.expect($action.meta.markedAsPendingISOTime).to.not.be.undefined;
      chai.expect($action.meta.markedAsPendingTimestamp).to.not.be.undefined;

      $action.updateStatus(NucleusAction.ProcessingActionStatus);
      chai.expect($action.status).to.equal(NucleusAction.ProcessingActionStatus);
      chai.expect($action.meta.markedAsProcessingISOTime).to.not.be.undefined;
      chai.expect($action.meta.markedAsProcessingTimestamp).to.not.be.undefined;

      $action.updateStatus(NucleusAction.FailedActionStatus);
      chai.expect($action.status).to.equal(NucleusAction.FailedActionStatus);
      chai.expect($action.meta.markedAsFailedISOTime).to.not.be.undefined;
      chai.expect($action.meta.markedAsFailedTimestamp).to.not.be.undefined;

      $action.updateStatus(NucleusAction.CompletedActionStatus);
      chai.expect($action.status).to.equal(NucleusAction.CompletedActionStatus);
      chai.expect($action.meta.markedAsCompletedISOTime).to.not.be.undefined;
      chai.expect($action.meta.markedAsCompletedTimestamp).to.not.be.undefined;
      chai.expect($action.meta.completedInMillisecondTime).to.not.be.undefined;
    });

    mocha.test("The method will throw an error if the status is not a valid action status.", function () {
      chai.expect(function () {
        const actionName = 'DummyAction';
        const actionMessage = { AID: uuid.v1() };

        const $action = new NucleusAction(actionName, actionMessage);

        $action.updateStatus('DummyStatus');
      }).to.throw(NucleusError);
    });

  });

});