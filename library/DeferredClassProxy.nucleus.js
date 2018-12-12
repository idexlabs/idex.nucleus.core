"use strict";

const nucleusValidator = require('./validator.nucleus');

class DeferredClassProxy {

  constructor () {
    Reflect.ownKeys(this.__proto__)
      .filter(methodName => /^\$\$execute/.test(methodName))
      .forEach((hookMethodName) => {
        const [ hookPrefix, hookType ] = hookMethodName.match(/^\$\$execute(Before|After|InsteadOf)/);
        const referencedMethodName = nucleusValidator.shiftFirstLetterToLowerCase(hookMethodName.replace(hookPrefix, ''));

        if (hookType === 'Before') {
          this[referencedMethodName] = (function beforeHookMethod (...argumentList) {
            return this.__proto__[hookMethodName].apply(this, argumentList)
              .then((argumentsByName) => {
                const argumentList = Object.values(argumentsByName);

                return this.__proto__[referencedMethodName].apply(this, argumentList);
              });
          }).bind(this);
        }

        if (hookType === 'After') {
          this[referencedMethodName] = (function afterHookMethod (...argumentList) {
            return (this.__proto__[referencedMethodName]).apply(this, argumentList)
              .then((result) => {

                return this.__proto__[hookMethodName].call(this, result);
              });
          }).bind(this);
        }

        if (hookType === 'InsteadOf') {
          this[referencedMethodName] = this.__proto__[hookMethodName].bind(this);
        }

      });

    this.$$promise = Promise.resolve();

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

module.exports = DeferredClassProxy;