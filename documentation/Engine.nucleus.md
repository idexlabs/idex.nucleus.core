# Global





* * *

## Class: NucleusEngine



## Class: NucleusEngine
Creates a Nucleus engine. The constructor returns a Proxy that interfaces the class and a Promise that resolves once
the engine is ready. If no datastore is passed in the option, a default connection will be created.

**ID**: `String` , Creates a Nucleus engine. The constructor returns a Proxy that interfaces the class and a Promise that resolves once
the engine is ready. If no datastore is passed in the option, a default connection will be created.
**name**: `String` , Creates a Nucleus engine. The constructor returns a Proxy that interfaces the class and a Promise that resolves once
the engine is ready. If no datastore is passed in the option, a default connection will be created.
### NucleusEngine.autodiscover() 

Autodiscovers the module's actions.

**Returns**: `Promise.<{actionConfigurationList: Array.<actionConfiguration>;, extendableActionConfigurationList: Array.<extendableActionConfiguration>;, resourceStructureList: Array.<resourceStructure>;}>;`

### NucleusEngine.destroy() 

Destroys the engine and the related datastores.

**Returns**: `Promise`

### NucleusEngine.executeAction($action) 

Executes a pending action.

**Parameters**

**$action**: `NucleusAction`, Executes a pending action.

**Returns**: `Promise.<NucleusAction>;`

### NucleusEngine.executeMethodInContext($action, actionSignature, contextName, filePath, methodName) 

Executes the action given its context.

**Parameters**

**$action**: `NucleusAction`, Executes the action given its context.

**actionSignature**: `Array.<String>;`, Executes the action given its context.

**contextName**: `String`, Executes the action given its context.

**filePath**: `String`, Executes the action given its context.

**methodName**: `String`, Executes the action given its context.

**Returns**: `Promise.<Object>;`

### NucleusEngine.fulfilActionSignature($action, actionSignatureList, argumentConfigurationByArgumentName) 

Fulfils an action signature given different options and the argument configuration.

**Parameters**

**$action**: `NucleusAction`, Fulfils an action signature given different options and the argument configuration.

**actionSignatureList**: `Array.<Array>;`, Fulfils an action signature given different options and the argument configuration.

**argumentConfigurationByArgumentName**: `Object`, Fulfils an action signature given different options and the argument configuration.

**Returns**: `Array.<String>;`

### NucleusEngine.generateResourceModelFromResourceStructureByResourceType(resourceType) 

Generates a Resource Model from a resource structure given the resource type.

**Parameters**

**resourceType**: `String`, Generates a Resource Model from a resource structure given the resource type.

**Returns**: `Promise.<function()>;`

### NucleusEngine.publishActionToQueueByName(actionQueueName, $action) 

Publishes an action given a queue name.

**Parameters**

**actionQueueName**: `String`, Publishes an action given a queue name.

**$action**: `NucleusAction`, Publishes an action given a queue name.

**Returns**: `Promise.<Object>;`

**Example**:
```js
const queueName = 'Dummy';
const $action = new NucleusAction('DummyAction', {});

$engine.publishActionToQueueByName(queueName, $action);
```

### NucleusEngine.publishActionByNameAndHandleResponse(actionName, actionMessage, originUserID) 

Publishes an action given its name and a message, then handle the response.

**Parameters**

**actionName**: `String`, Publishes an action given its name and a message, then handle the response.

**actionMessage**: `Object`, Publishes an action given its name and a message, then handle the response.

**originUserID**: `String`, Publishes an action given its name and a message, then handle the response.

**Returns**: `Promise.<Object>;`

**Example**:
```js
const { dummy } = await $engine.publishActionByNameAndHandleResponse('RetrieveDummyByID', { dummyID }, originUserID);
```

### NucleusEngine.publishEventToChannelByName(channelName, $event) 

Publishes an event given a channel name.

**Parameters**

**channelName**: `String`, Publishes an event given a channel name.

**$event**: `NucleusEvent`, Publishes an event given a channel name.

**Returns**: `Promise.<Object>;`

**Example**:
```js
const channelName = 'Dummy';
const $event = new NucleusEvent('DummyEvent', {});

$engine.publishEventToChannelByName(channelName, $event);
```

### NucleusEngine.retrieveActionConfigurationByActionName(actionName) 

Retrieves the action configurations given an action name.

**Parameters**

**actionName**: `String`, Retrieves the action configurations given an action name.

**Returns**: `Promise.<actionConfiguration>;`

### NucleusEngine.retrieveExtendableActionConfigurationByActionName(actionName) 

Retrieves the extendable action configurations given an action name.

**Parameters**

**actionName**: `String`, Retrieves the extendable action configurations given an action name.

**Returns**: `Promise.<extendableActionConfiguration>;`

### NucleusEngine.retrievePendingAction(actionQueueName) 

Retrieves a pending action name and call the execution.

**Parameters**

**actionQueueName**: `String`, Retrieves a pending action name and call the execution.

**Returns**: `Promise.<void>;`

### NucleusEngine.retrieveResourceStructureByResourceType(resourceType) 

Retrieves the resource structure given a resource type.

**Parameters**

**resourceType**: `String`, Retrieves the resource structure given a resource type.

**Returns**: `Promise.<resourceStructure>;`

### NucleusEngine.storeActionConfiguration(defaultActionQueueName, actionConfiguration) 

Stores an action configuration.

**Parameters**

**defaultActionQueueName**: `String`, Stores an action configuration.

**actionConfiguration**: `actionConfiguration`, Stores an action configuration.

**Returns**: `Promise`

### NucleusEngine.storeExtendableActionConfiguration(extendableActionConfiguration) 

Stores an extendable action configuration.

**Parameters**

**extendableActionConfiguration**: `extendableActionConfiguration`, Stores an extendable action configuration.

**Returns**: `Promise`

### NucleusEngine.storeResourceStructure(resourceStructure) 

Stores a resource structure.

**Parameters**

**resourceStructure**: `resourceStructure`, Stores a resource structure.

**Returns**: `Promise`

### NucleusEngine.subscribeToActionQueueUpdate(actionQueueName) 

Subscribe to the action queue updates given its name.

**Parameters**

**actionQueueName**: `String`, Subscribe to the action queue updates given its name.

**Returns**: `Promise.<void>;`

### NucleusEngine.subscribeToEventChannelByName(channelName) 

Subscribes to a channel given its name.

**Parameters**

**channelName**: `String`, Subscribes to a channel given its name.

**Returns**: `Promise.<void>;`

### NucleusEngine.unsubscribeFromEventChannelByName(channelName) 

Unsubscribes to a channel given its name.

**Parameters**

**channelName**: `String`, Unsubscribes to a channel given its name.

**Returns**: `Promise.<void>;`

### NucleusEngine.verifyRedisConfiguration() 

Verifies that the Redises connection are configured correctly.

**Returns**: `Promise.<void>;`

### NucleusEngine.parseTemplateString(context, string) 

Parses a template string.

**Parameters**

**context**: `Object`, Parses a template string.

**string**: `String`, Parses a template string.

**Returns**: `Promise | *`

**Example**:
```js
const parsedString = Nucleus.parseTemplateString({ world: "World" }, "`Hello ${world}!`");
// parsedString === 'Hello World!'
```

### NucleusEngine.retrieveModuleDirectoryPath(moduleNode, moduleDirectoryPath) 

Retrieves the current module directory path.

**Parameters**

**moduleNode**: `Object`, Used for recursion.

**moduleDirectoryPath**: `Object`, Used for recursion.

**Returns**: `String`

### NucleusEngine.parseNucleusTag(docletTagList) 

Parses the Nucleus doclet tags.

**Parameters**

**docletTagList**: `Array`, Parses the Nucleus doclet tags.

 - **docletTagList[].originalTitle**: `String`, Parses the Nucleus doclet tags.

 - **docletTagList[].title**: `String`, Parses the Nucleus doclet tags.

 - **docletTagList[].text**: `String`, Parses the Nucleus doclet tags.

 - **docletTagList[].value**: `String`, Parses the Nucleus doclet tags.

**Returns**: `Object`

### NucleusEngine.retrieveAllDocletsInPath(path) 

Retrieves all doclets in path.

**Parameters**

**path**: `String`, Retrieves all doclets in path.

**Returns**: `Promise.<Array.<doclet>;>;`



* * *



**Author:** Sebastien Filion



**Overview:** Define the Nucleus Engine class that is used to interface the action and event loop.


