# Nucleus

// Library microservice tool implemented in JavaScript for NodeJS.

## High level Nucleus architecture

Nucleus implements a two way communication layer based on Redis. Each service are called "Engine" which can communicate
between each other via two different protocols:

### Action
An action is similar to an HTTP request: you make a request, you get a response.

```javascript
const { NucleusEngine } = require('Nucleus');

// Create an Engine that registers the Ping action.
class DummyEngine extends NucleusEngine {
  
  // Register the `ping` method as the "Ping" action handler using the `@Nucleus ActionName` tag.
  /**
  * Pings
  * 
  * @Nucleus ActionName Ping
  * 
  * @returns {Promise<Object>}
  */
  ping () {
    // Every action is expected to return a Promise that resolves to an object.
    
    return Promise.resolve({ ping: "Ping" });
  }
  
}


// ---

// Instantiate the engines that was created.
const $dummyEngine = new DummyEngine();
const $testEngine = new NucleusEngine();

// Wait for both engine to be initialized and ready to use.
await $dummyEngine;
await $testEngine;

// Use the Test engine to publish an action named "Ping".
// Behind the scene, the Dummy engine will respond to the request by executing the $dummyEngine.ping function.
const { ping } = $testEngine.publishActionByNameAndHandleResponse('Ping', {});

console.log(ping);
// $ Ping
```

### Event
An event as a similar implementation than a NodeJS EventEmitter event, you can publish/subscribe to an event.

```javascript
const { NucleusEngine, NucleusEvent } = require('Nucleus');

// Instantiate the engines that were created.
const $pingEngine = new NucleusEngine();
const $pongEngine = new NucleusEngine();
const $testEngine = new NucleusEngine();

// Create an event handler for the "Ping" channel.
$pingEngine.handleEventByChannelName('Ping', () => {
  console.log('PING');

  const $event = new NucleusEvent('Pong', {});

  // Publish an event to the "Pong" channel.
  process.nextTick($pingEngine.publishEventToChannelByName.bind($pingEngine, 'Pong', $event));
});

// Create an event handler for the "Pong" channel.
$pongEngine.handleEventByChannelName('Pong', () => {
  console.log('PONG');

  const $event = new NucleusEvent('Ping', {});

  // Publish an event to the "Ping" channel.
  process.nextTick($pongEngine.publishEventToChannelByName.bind($pongEngine, 'Ping', $event));
});

// Subscribe the Ping engine to the "Ping" channel.
$pingEngine.subscribeToChannelName('Ping');

// Subscribe the Pong engine to the "Pong" channel.
$pongEngine.subscribeToChannelName('Pong');

const $event = new NucleusEvent('Ping', {});

$testEngine.publishEventToChannelByName('Ping', $event);

// An infinite loop of "Ping" and "Pong" will be printed.
```