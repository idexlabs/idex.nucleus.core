# Create a basic engine

Simply instantiating a Nucleus engine is enough to start interacting with the [communication layer](./Guide-Communication-layer)
but it wouldn't be very useful. 

## Extend the Nucleus engine with new actions

You can extend the Nucleus engine like any other class and add [actions](./Guide-Action) that will be registered during the [autodiscovery](./Guide-Autodiscovery).

In the following example, you will learn how to create a Ping engine that has only one action called "Ping" and how to call it.

```javascript
const { NucleusEngine } = require('@idex/nucleus.core');

// Extend the Nucleus engine to create the Ping engine.
class PingEngine extends NucleusEngine {

  constructor () {
    // Name the engine.
    super('Ping');
  }

  /**
   * Pings.
   *
   * @Nucleus ActionName Ping
   *
   * @returns {Promise<{ ping: String }>}
   */
  ping () {

    return Promise.resolve({ ping: 'PING' });
  }

}

async function executePingAction () {
  const $pingEngine = new PingEngine();
  // Create a test engine to publish actions.
  const $testEngine = new NucleusEngine('Test');

  // Wait for both engines to be ready.
  await $pingEngine;
  await $testEngine;

  // Start the autodiscovery on the local directory.
  await $pingEngine.autodiscover(__dirname);
  // Start subscribing to any update made to the action queue.
  await $pingEngine.subscribeToActionQueueUpdate($pingEngine.defaultActionQueueName);

  const dummyUserID = '15808ee9-cb02-4391-99ca-211d29314b31';

  // Read more about the `publishActionByNameAndHandleResponse` method in the engine guide.
  const { ping } = await $testEngine.publishActionByNameAndHandleResponse('Ping', {}, dummyUserID);
  // ping === 'PING'

  return ping;
}

const $$promise = executePingAction();

$$promise
  .catch(console.error)
  .then(process.exit);
```

Assuming that Redis [has been setup correctly](./Home#redis), the Test engine will create an action and push it in the 
action queue for the Ping engine.  
Once the Ping engine have executed your action, the `publishActionByNameAndHandleResponse` will resolve with the response `{ ping: 'PING' }`.

You can confirm that everything went according to plan by digging in Redis a little:

1. The action has been registered correctly;
    ```
    $ redis-cli
    127.0.0.1:6379> HKEYS ActionConfigurationByActionName
    1) "Ping"
    ```

2. The action has been completed;
    ```
    $ redis-cli
    127.0.0.1:6379> KEYS NucleusAction:Ping:*
    1) "NucleusAction:Ping:d38ba020-5893-11e8-bf03-c38d7bd3fb0e"
    127.0.0.1:6379> HGET NucleusAction:Ping:d38ba020-5893-11e8-bf03-c38d7bd3fb0e status
    "\"Completed\""
    
    127.0.0.1:6379> HGET NucleusAction:Ping:d38ba020-5893-11e8-bf03-c38d7bd3fb0e finalMessage
    "{\"ping\":\"PING\"}"
    ```

Now that's in the bag, let's try to solve a common use case and [create a persistent storage API with its Gateway](./Tutorial-Create-a-basic-API-with-public-gateway).