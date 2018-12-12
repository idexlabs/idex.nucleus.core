# Nucleus

Nucleus is a flexible library that offers tools to implement a distributed micro-service(-like) architecture in NodeJS.  

## Getting started

### Redis

The communication of Nucleus is heavily based on Redis, first and for all make sure to install Redis. [Redis installation guide](https://redis.io/topics/quickstart)

For Nucleus to work correctly, you need to make sure that your server can use keyspace notification. `CONFIG SAVE notify-keyspace-events AKE`  
You can copy the `redis.conf` file from Nucleus root directory into your project.

```bash
$ redis-server PATH_TO_PROJECT/redis.conf
```

## Nucleus Engine

The Nucleus engine (engine for short) is used to interact with the communication layer. It is task to publish/handle actions
and events.

### Create a new Engine

You can create an engine by simply instantiating the `NucleusEngine` class:

```javascript
const { NucleusEngine } = require('@idex/nucleus.core');

const $engine = new NucleusEngine('Test');

// Here, `$engine` is a proxy: it is both a valid promise and the instantiated Nucleus engine.

$engine
      // The engine is ready to be used.
    .then(() => {
      // Do something with the engine.
    })
    // Something happened during the initialization of the engine.
    .catch(console.error);
```