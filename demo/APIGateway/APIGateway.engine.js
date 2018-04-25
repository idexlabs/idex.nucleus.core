"use strict";

const express = require('express');
const http = require('http');
const uuid = require('node-uuid');

const { NucleusEngine } = require('../../');

const HTTP_PORT = 3000;

class APIGatewayEngine extends NucleusEngine {

  constructor () {
    super('APIGateway', {
      automaticallyAutodiscover: true
    });

    this.$$application = express();
    this.$$httpServer = http.createServer(this.$$application);

    this.$$promise = this.$$promise
      .then(() => {

        return new Promise((resolve) => {

          this.$$httpServer.listen(HTTP_PORT, resolve);
        });
      })
      .timeout(1000)
      .then(() => {
        this.$logger.info(`HTTP server is listening on port ${HTTP_PORT}.`);
      })
      .then(() => {
        // GET /ping
        this.$$application.get('/ping', async (request, response) => {
          try {
            const actionResponse = await this.publishActionByNameAndHandleResponse('Ping', {}, uuid.v4());

            response.status(200).send(actionResponse).end();
          } catch (error) {

            response.status(500).send(error).end();
          }
        });
      });
  }

}

module.exports = APIGatewayEngine;
