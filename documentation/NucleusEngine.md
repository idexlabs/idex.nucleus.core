# NucleusEngine

## Responsibilities

  1. Publish, listen, manage and handle own action.
    a. Publish a correctly formed action to the correct queue.
    b. Listen and manage new action requests.
    c. Maintain action status.
    d. Handle own action.
  3. Subscribe, listen, publish and handle relevant events
    a. Locally store events to be executed a bit later
  4. Manage autodiscovery of a local module.
    a. Register action configuration
  5. Manage local API modules.
  
## Publishing actions

```javascript
// Publishing an action though an engine and start handling relevant events.
const $$promise = new Promise((resolve, reject) => {
  $engine.publishActionToQueueByName(queueName, $action);
  
  $engine.handleEventByChannelName(`Action:${$action.ID}`, (channelName, { eventName, eventMessage }) => {
    if (eventName === 'ActionStatusUpdated') {
      const { $action, actionStatus } = eventMessage;
      
      if (actionStatus === 'Completed') resolve($action.finalMessage);
      if (actionStatus === 'Failed') reject($action.finalMessage);
    } 
  });
});

return $$promise;
```

```javascript
const $action = new NucleusAction('CreateDummy', {});

// Once published, the action would eventually resolve to the response.
return $action
  .then(({ dummy }) => {
    // Do something with the dummy...
  });
```

