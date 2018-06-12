"use strict";

const bodyParser = require('body-parser');
const express = require('express');
const http = require('http');
const uuid = require('uuid');

const { NucleusPublisherEngine } = require('idex.nucleus');

const HTTP_PORT = 3000;

class APIGatewayEngine extends NucleusPublisherEngine {

  constructor () {
    super('APIGateway');

    this.$$application  = express();
    this.$$httpServer = http.createServer(this.$$application);

    // Once the engine is initialized...
    this.$$promise = this.$$promise
      .then(() => {

        return new Promise((resolve) => {
          // HTTP server listens on the given port;
          this.$$httpServer.listen(HTTP_PORT, resolve);
        });
      })
      .then(() => {
        this.$logger.info(`HTTP server is listening on port ${HTTP_PORT}.`);
      })
      .then(this.registerRESTEndpoints.bind(this));
  }

  registerRESTEndpoints () {
    const routeList = [
      [ 'POST', '/user', 'CreateUser' ],
      [ 'DELETE', '/user/:userID', 'RemoveUserByID' ],
      [ 'GET', '/user/:userID', 'RetrieveUserByID' ],
      [ 'PATCH', '/user/:userID', 'UpdateUserByID' ],
    ];

    this.$$application.use(bodyParser.json());
    this.$$application.use(bodyParser.urlencoded({ extended: true }));

    this.$$application.use((request, response, next) => {

      response.header("Access-Control-Allow-Origin", request.headers.origin);
      response.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
      response.header("Access-Control-Allow-Headers", "X-Requested-With, X-HTTP-Method-Override, Content-Type, Authorization, Accept");
      response.header("Access-Control-Allow-Credentials", "true");
      response.header("X-Powered-By", "Nucleus");


      if (request.method === 'OPTIONS') {
        response.header("Access-Control-Max-Age", 1000 * 60 * 10);
        return response.status(204).end();
      }
      next();
    });

    routeList
      .forEach(([ endpointVerb, endpointPath, actionName ]) => {
        this.$$application[endpointVerb.toLowerCase()](endpointPath, async (request, response) => {
          try {
            const actionMessage = Object.assign({}, request.body, request.params, request.query);
            const actionResponse = await this.publishActionByNameAndHandleResponse(actionName, actionMessage, uuid.v4());

            response.status(200).send(actionResponse).end();
          } catch (error) {

            response.status(500).send(error).end();
          }
        });
      });
  }

}

module.exports = APIGatewayEngine;