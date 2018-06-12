"use strict";

const APIGatewayEngine = require("./APIGateway.engine");

const $APIGatewayEngine = new APIGatewayEngine();

if (require.main === module) {
  $APIGatewayEngine.catch(console.error);
} else module.exports = $APIGatewayEngine;