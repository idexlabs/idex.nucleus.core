# Global





* * *

## Class: NucleusDatastore



## Class: NucleusDatastore
Creates a Redis client. The constructor returns a Proxy that interfaces the class and a Promise that resolves once
the server is connected.

### NucleusDatastore.addItemToHashFieldByName(itemKey, itemField, item, hashList) 

Adds an item to a hash given a field and its key. `HMSET key field value`

**Parameters**

**itemKey**: `String`, Adds an item to a hash given a field and its key. `HMSET key field value`

**itemField**: `String`, Adds an item to a hash given a field and its key. `HMSET key field value`

**item**: `*`, Adds an item to a hash given a field and its key. `HMSET key field value`

**hashList**: `Array`, Adds an item to a hash given a field and its key. `HMSET key field value`

**Returns**: `Promise.&lt;*&gt;`

### NucleusDatastore.addItemToListByName(itemKey, item, itemList) 

Adds an item to a list given its key. `LPUSH key value`

**Parameters**

**itemKey**: `String`, Adds an item to a list given its key. `LPUSH key value`

**item**: `*`, Adds an item to a list given its key. `LPUSH key value`

**itemList**: `Array`, Adds an item to a list given its key. `LPUSH key value`

**Returns**: `Promise.&lt;*&gt;`

### NucleusDatastore.addItemToSetByName(itemKey, item) 

Adds an item to a set. `SADD key value`

**Parameters**

**itemKey**: `String`, Adds an item to a set. `SADD key value`

**item**: `String`, Adds an item to a set. `SADD key value`

**Returns**: `Promise.&lt;*&gt;`

### NucleusDatastore.addTripleToHexastore(itemKey, subject, predicate, object) 

Adds a triple to a hexastore.

**Parameters**

**itemKey**: `String`, Adds a triple to a hexastore.

**subject**: `String`, Adds a triple to a hexastore.

**predicate**: `String`, Adds a triple to a hexastore.

**object**: `String`, Adds a triple to a hexastore.

**Returns**: `Promise.&lt;void&gt;`

### NucleusDatastore.createItem(itemKey, item) 

Creates an item. `SET key value`

**Parameters**

**itemKey**: `String`, Creates an item. `SET key value`

**item**: `*`, Creates an item. `SET key value`

**Returns**: `Promise.&lt;*&gt;`

### NucleusDatastore.destroy() 

Destroys the Redis connection.

**Returns**: `Promise`

### NucleusDatastore.duplicateConnection(datastoreName) 

Duplicates the connection.

**Parameters**

**datastoreName**: `String`, Duplicates the connection.

**Returns**: `NucleusDatastore`

### NucleusDatastore.evaluateLUAScript(LUAscript, argumentList) 

Evaluates a LUA script.

**Parameters**

**LUAscript**: `String`, Evaluates a LUA script.

**argumentList**: `Array`, Evaluates a LUA script.

**Returns**: `Promise.&lt;*&gt;`

### NucleusDatastore.executeHandlerCallbackForChannelName(channelName, $event) 

Executes all handler callback for a given channel name.

**Parameters**

**channelName**: `String`, Executes all handler callback for a given channel name.

**$event**: `NucleusEvent`, Executes all handler callback for a given channel name.

**Returns**: `Promise`

### NucleusDatastore.itemIsMemberOfSet(itemKey, item) 

Verifies if an item is part of a given item set.

**Parameters**

**itemKey**: `String`, Verifies if an item is part of a given item set.

**item**: `String`, Verifies if an item is part of a given item set.

**Returns**: `Promise.&lt;Object&gt;`

### NucleusDatastore.handleEventByChannelName(channelName, handlerCallback) 

Handles event published to a specific channel given a handler callback.

**Parameters**

**channelName**: `String`, Handles event published to a specific channel given a handler callback.

**handlerCallback**: `function`, Handles event published to a specific channel given a handler callback.

**Returns**: `Promise.&lt;Object&gt;`

### NucleusDatastore.handleRedisEvent(argumentList) 

Handles Redis event.

**Parameters**

**argumentList**: `Array.&lt;String&gt;`, Handles Redis event.


### NucleusDatastore.removeAllTriplesFromHexastoreByVector(itemKey, vector) 

Removes a triple from a hexastore given the subject vector.
This will remove every relationship where the given vector is subject or object.

**Parameters**

**itemKey**: `String`, Removes a triple from a hexastore given the subject vector.
This will remove every relationship where the given vector is subject or object.

**vector**: `String`, Removes a triple from a hexastore given the subject vector.
This will remove every relationship where the given vector is subject or object.

**Returns**: `Promise.&lt;void&gt;`

### NucleusDatastore.removeItemByName(itemKey) 

Removes an item given its key. `DEL key`

**Parameters**

**itemKey**: `String`, Removes an item given its key. `DEL key`

**Returns**: `Promise.&lt;null&gt;`

### NucleusDatastore.removeItemFromFieldByName(itemKey, itemField) 

Removes an item from a hash given a field. `HMDEL key field`

**Parameters**

**itemKey**: `String`, Removes an item from a hash given a field. `HMDEL key field`

**itemField**: `String`, Removes an item from a hash given a field. `HMDEL key field`

**Returns**: `Promise.&lt;null&gt;`

### NucleusDatastore.retrieveAllItemsFromHashByName(itemKey) 

Retrieves all the items from a hash given its name. `HGETALL key`

**Parameters**

**itemKey**: , Retrieves all the items from a hash given its name. `HGETALL key`

**Returns**: `Promise.&lt;Array&gt;`

### NucleusDatastore.retrieveItemByName(itemKey) 

Retrieves an item given its key. `GET key`

**Parameters**

**itemKey**: `String`, Retrieves an item given its key. `GET key`

**Returns**: `Promise.&lt;*&gt;`

### NucleusDatastore.retrieveItemFromHashFieldByName(itemKey, itemField, itemFieldList) 

Remove an item from a hash given an item field. `HMDEL key field`

**Parameters**

**itemKey**: `String`, Remove an item from a hash given an item field. `HMDEL key field`

**itemField**: `String`, Remove an item from a hash given an item field. `HMDEL key field`

**itemFieldList**: `Array.&lt;String&gt;`, Remove an item from a hash given an item field. `HMDEL key field`

**Returns**: `Promise.&lt;*&gt;`

### NucleusDatastore.retrieveItemFromListDeferred(itemKey) 

Retrieves an item from a list but blocks the client if the list is empty. `BRPOP key timeout`

**Parameters**

**itemKey**: `String`, Retrieves an item from a list but blocks the client if the list is empty. `BRPOP key timeout`

**Returns**: `Promise`

### NucleusDatastore.retrieveRelationshipListFromHexastore(itemName, subject, object) 

Retrieves the relationship between a subject and an object from a hexastore.

**Parameters**

**itemName**: `String`, Retrieves the relationship between a subject and an object from a hexastore.

**subject**: `String`, Retrieves the relationship between a subject and an object from a hexastore.

**object**: `String`, Retrieves the relationship between a subject and an object from a hexastore.

**Returns**: `Promise.&lt;Array.&lt;String&gt;&gt;`

### NucleusDatastore.retrieveVectorByIndexSchemeFromHexastore(itemName, indexingScheme, vectorA, vectorB) 

Retrieves the any vector from any triple given the index scheme from a hexastore.

**Parameters**

**itemName**: `String`, Retrieves the any vector from any triple given the index scheme from a hexastore.

**indexingScheme**: `String`, Retrieves the any vector from any triple given the index scheme from a hexastore.

**vectorA**: `String`, Retrieves the any vector from any triple given the index scheme from a hexastore.

**vectorB**: `String`, Retrieves the any vector from any triple given the index scheme from a hexastore.

**Returns**: `Promise.&lt;Array.&lt;String&gt;&gt;`

**Example**:
```js
async $datastore.addTripleToHexastore('ResourceRelationship', userID, 'isMember', userGroupID);
const relationshipList = async $datastore.retrieveVectorByIndexSchemeFromHexastore('ResourceRelationship', 'SOP', userID, userGroupID);
```

### NucleusDatastore.subscribeToChannelName(channelName) 

Subscribes the client to a channel given its name.

**Parameters**

**channelName**: `String`, Subscribes the client to a channel given its name.

**Returns**: `Promise`

### NucleusDatastore.unsubscribeFromChannelName(channelName) 

Unsubscribes the client from a channel given its name.

**Parameters**

**channelName**: `String`, Unsubscribes the client from a channel given its name.

**Returns**: `Promise`

### NucleusDatastore.parseHashItem(itemList) 

Parses a hash item list into an object.

**Parameters**

**itemList**: `Array`, Parses a hash item list into an object.

**Returns**: `Object`

### NucleusDatastore.parseItem(item) 

Parses an item to a native data type.

**Parameters**

**item**: `String`, Parses an item to a native data type.

**Returns**: `*`

### NucleusDatastore.stringifyItem(item) 

Stringifies a native data type.

**Parameters**

**item**: `*`, Stringifies a native data type.

**Returns**: `String`



* * *



**Author:** Sebastien Filion



**Overview:** Define the Nucleus Datastore class that wraps a Redis client.


