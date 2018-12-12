'use strict';

const chai = require('chai');
const mocha = require('mocha');
const sinon = require('sinon');

const NucleusDeferredClassProxy = require('../library/DeferredClassProxy.nucleus');

mocha.suite("Deferred Class Proxy unit test", function () {

  mocha.suiteSetup(function () {
    const $$sandbox = sinon.createSandbox();

    Reflect.defineProperty(this, '$$sandbox', {
      value: $$sandbox,
      writable: false
    });
  });

  mocha.suiteTeardown(function () {
    const { $$sandbox } = this;

    return $$sandbox.reset();
  });

  mocha.suite("#$$executeAfter...", function () {

    mocha.test("The spy is executed after the method.", async function () {
      const { $$sandbox } = this;

      const $$pingSpy = $$sandbox.spy();
      const $$afterPingSpy = $$sandbox.spy();

      class ProxiedClass extends NucleusDeferredClassProxy {

        ping (message) {
          $$pingSpy(message);

          return Promise.resolve({ message });
        }
      }

      class HookedProxiedClass extends ProxiedClass {

        $$executeAfterPing ({ message }) {
          $$afterPingSpy(message);

          const upperCaseMessage = message.toUpperCase();

          return Promise.resolve({ message: upperCaseMessage });
        }
      }

      const $$hookedProxiedClass = new HookedProxiedClass();

      const { message } = await $$hookedProxiedClass.ping("Hello World");

      chai.expect($$pingSpy.calledWith("Hello World"), "The message is passed to the method.").to.be.true;
      chai.expect($$afterPingSpy.calledWith("Hello World"), "The message is passed to the after hook.").to.be.true;
      chai.expect(message, "The message has been modified by the after hook.").to.equal("HELLO WORLD");
    });

    mocha.test("The spy is executed after the method (with before hook).", async function () {
      const { $$sandbox } = this;

      const $$pingSpy = $$sandbox.spy();
      const $$afterPingSpy = $$sandbox.spy();
      const $$beforePingSpy = $$sandbox.spy();

      class ProxiedClass extends NucleusDeferredClassProxy {

        ping (message) {
          $$pingSpy(message);

          return Promise.resolve({ message });
        }
      }

      class HookedProxiedClass extends ProxiedClass {

        $$executeBeforePing (message) {
          const upperCaseMessage = message.toUpperCase();

          return Promise.resolve({ message: upperCaseMessage });
        }

        $$executeAfterPing ({ message }) {
          $$afterPingSpy(message);

          const lowerCaseMessage = message.toLowerCase();

          return Promise.resolve({ message: lowerCaseMessage });
        }
      }

      const $$hookedProxiedClass = new HookedProxiedClass();

      const { message } = await $$hookedProxiedClass.ping("Hello World");

      chai.expect($$beforePingSpy.calledWith("Hello World"), "The message is passed to the before hook.").to.be.true;
      chai.expect($$pingSpy.calledWith("HELLO WORLD"), "The message is passed to the method.").to.be.true;
      chai.expect($$afterPingSpy.calledWith("hello world"), "The message is passed to the after hook.").to.be.true;
      chai.expect(message, "The message has been modified by the after hook.").to.equal("HELLO WORLD");
    });

  });

  mocha.suite("#$$executeBefore...", function () {

    mocha.test("The spy is executed before the method.", async function () {
      const { $$sandbox } = this;

      const $$pingSpy = $$sandbox.spy();
      const $$beforePingSpy = $$sandbox.spy();

      class ProxiedClass extends NucleusDeferredClassProxy {

        ping (message) {
          $$pingSpy(message);

          return Promise.resolve();
        }
      }

      class HookedProxiedClass extends ProxiedClass {

        $$executeBeforePing (message) {
          $$beforePingSpy(message);

          const upperCaseMessage = message.toUpperCase();

          return Promise.resolve({ message: upperCaseMessage });
        }
      }

      const $$hookedProxiedClass = new HookedProxiedClass();

      await $$hookedProxiedClass.ping("Hello World");

      chai.expect($$beforePingSpy.calledWith("Hello World"), "The message is passed to the before hook.").to.be.true;
      chai.expect($$pingSpy.calledWith("HELLO WORLD"), "The message has been modified by the before hook.").to.be.true;
    });

    mocha.test("The hooked method is called with the right argument in the right order.", async function () {
      const { $$sandbox } = this;

      const $$pingSpy = $$sandbox.spy();
      const $$beforePingSpy = $$sandbox.spy();

      class ProxiedClass extends NucleusDeferredClassProxy {

        ping (b, a, c) {
          $$pingSpy(b, a, c);

          return Promise.resolve();
        }
      }

      class HookedProxiedClass extends ProxiedClass {

        $$executeBeforePing (b, a, c) {
          $$beforePingSpy(b, a, c);

          return Promise.resolve({ b, a, c });
        }
      }

      const $$hookedProxiedClass = new HookedProxiedClass();

      await $$hookedProxiedClass.ping(10, 20, 30);

      chai.expect($$beforePingSpy.calledWith(10, 20, 30), "The arguments are passed in the right order.").to.be.true;
      chai.expect($$pingSpy.calledWith(10, 20, 30), "The arguments are passed in the right order.").to.be.true;
    });

  });

});