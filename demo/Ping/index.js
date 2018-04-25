"use strict";

const PingEngine = require('./Ping.engine');

try {
  const $$pingEngine = new PingEngine();
} catch (error) {
  console.error(error);
}