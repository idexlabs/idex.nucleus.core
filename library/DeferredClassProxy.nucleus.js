"use strict";

class DeferredClass {

  constructor (name) {

    this.name = name;

    this.$$promise = new Promise((resolve, reject) => {
      setTimeout(resolve, 1000 * 2);
    });

    const $$proxy = new Proxy(this, {
      get: function (object, key) {
        if (key in object) return (typeof object[key] === 'function') ? object[key].bind(object) : object[key];
        else if (key in object.$$promise) {
          return (typeof object.$$promise[key] === 'function') ? object.$$promise[key].bind(object.$$promise) : object.$$promise[key];
        }
        else undefined;
      }
    });

    return $$proxy;
  }

}

module.exports = DeferredClass;