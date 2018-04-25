"use strict";

const APIGatewayEngine = require('./APIGateway.engine');

try {
  const $$APIGatewayEngine = new APIGatewayEngine();
} catch (error) {
  console.error(error);
}