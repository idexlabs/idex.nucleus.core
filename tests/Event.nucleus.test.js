"use strict";

const Promise = require('bluebird');
const chai = require('chai');
const mocha = require('mocha');
const uuid = require('node-uuid');
const redis = require('redis');

const NucleusEvent = require('../library/Event.nucleus');
const NucleusError = require('../library/Error.nucleus');

mocha.suite('Nucleus Event', function () {

  mocha.test("The event requires a name and a message.", function () {
    const eventName = 'DummyEvent';
    const eventMessage = { EID: uuid.v1() };

    const $event = new NucleusEvent(eventName, eventMessage);

    chai.expect($event).to.have.ownProperty('ID');
    chai.expect($event).to.have.ownProperty('name');
    chai.expect($event).to.have.ownProperty('message');

    chai.expect($event.name).to.equal(eventName);
    chai.expect($event.message).to.deep.equal(eventMessage);
  });

  mocha.test("The event's ID, name and message are not writable.", function () {
    const eventName = 'DummyEvent';
    const eventMessage = { EID: uuid.v1() };

    const $event = new NucleusEvent(eventName, eventMessage);

    const { ID: eventID } = $event;
    const { EID: eventEID } = $event.message;

    try { $event.ID = uuid.v1(); } catch (error) {}
    try { $event.name = 'ReallyDummyEvent'; } catch (error) {}
    try { $event.message.EID = uuid.v1(); } catch (error) {}
    try { $event.message.EID2 = uuid.v1(); } catch (error) {}

    chai.expect($event.ID).to.equal(eventID);
    chai.expect($event.name).to.equal(eventName);
    chai.expect($event.message.EID).to.equal(eventEID);
    chai.expect($event.message).to.deep.equal(eventMessage);

  });

  mocha.test("The event's meta is converted to a convenience string if forced to string.", function () {
    const eventName = 'DummyEvent';
    const eventMessage = { EID: uuid.v1() };

    const $event = new NucleusEvent(eventName, eventMessage);
    const eventMetaPrimitive = `${$event.meta}`;

    chai.expect(eventMetaPrimitive).to.equal( `NucleusEvent created on ${$event.meta.createdISOTime} by ${$event.meta.originEngineID}.`);
  });

  mocha.test("The event's meta has a `toString` method that converts the meta object to a JSON string.", function () {
    const eventName = 'DummyEvent';
    const eventMessage = { EID: uuid.v1() };

    const $event = new NucleusEvent(eventName, eventMessage);
    const eventMeta = $event.meta;
    const eventMetaStringified = $event.meta.toString();

    const eventMetaStringifiedParsed = JSON.parse(eventMetaStringified);

    chai.expect(eventMetaStringifiedParsed).to.deep.equal(eventMeta);
  });

  mocha.test("The event's message has a `toString` method that converts the message object to a JSON string.", function () {
    const eventName = 'DummyEvent';
    const eventMessage = { EID: uuid.v1() };

    const $event = new NucleusEvent(eventName, eventMessage);
    const eventMessageStringified = $event.message.toString();

    const eventMessageStringifiedParsed = JSON.parse(eventMessageStringified);

    chai.expect(eventMessageStringifiedParsed).to.deep.equal(eventMessage);
  });

  mocha.test("The event can be stringified to JSON.", function () {
    const eventName = 'DummyEvent';
    const eventMessage = { EID: uuid.v1() };

    const $event = new NucleusEvent(eventName, eventMessage);
    const eventStringified = JSON.stringify($event);

    const eventStringifiedParsed = JSON.parse(eventStringified);

    chai.expect(eventStringifiedParsed).to.deep.include($event);
  });

  mocha.test("The event will throw an error if the event name is undefined.", function () {
    chai.expect(function () { new NucleusEvent(undefined, {}); }).to.throw(NucleusError);
    chai.expect(function () { new NucleusEvent('', {}); }).to.throw(NucleusError);
  });

  mocha.test("The event is converted to a convenience string if force to string.", function () {
    const $event = new NucleusEvent('DummyEvent', {});
    const eventPrimitive = `${$event}`;

    chai.expect(eventPrimitive).to.equal(`NucleusEvent:${$event.name}:${$event.ID}`);
  });

});