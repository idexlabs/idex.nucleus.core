"use strict";

const DummyEngine = require('./Dummy.engine');

try {
  const $$dummyEngine = new DummyEngine();
} catch (error) {
  console.error(error);
}