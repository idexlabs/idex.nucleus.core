# Global





* * *

## Class: NucleusResourceAPI


### NucleusResourceAPI.createResource(resourceType, NucleusResourceModel, resourceAttributes, originUserID, groupID) 

Creates a resource given its name and an object of its attributes.

**Parameters**

**resourceType**: `String`, Creates a resource given its name and an object of its attributes.

**NucleusResourceModel**: `function`, Creates a resource given its name and an object of its attributes.

**resourceAttributes**: `Object`, Creates a resource given its name and an object of its attributes.

**originUserID**: `String`, Creates a resource given its name and an object of its attributes.

**groupID**: `String`, Creates a resource given its name and an object of its attributes.

**Returns**: `Promise.&lt;{resource: NucleusResource, resourceAuthorID: String, resourceMemberGroupID: String}&gt;`

### NucleusResourceAPI.removeResourceByID(resourceType, resourceID, originUserID) 

Removes a resource given its name and ID.

**Parameters**

**resourceType**: `String`, Removes a resource given its name and ID.

**resourceID**: `String`, Removes a resource given its name and ID.

**originUserID**: `String`, Removes a resource given its name and ID.

**Returns**: `Promise.&lt;{resourceID: String}&gt;`

### NucleusResourceAPI.retrieveResourceByID(resourceType, NucleusResourceModel, resourceID, originUserID) 

Retrieves a resource given its ID.

**Parameters**

**resourceType**: `String`, Retrieves a resource given its ID.

**NucleusResourceModel**: `function`, Retrieves a resource given its ID.

**resourceID**: `String`, Retrieves a resource given its ID.

**originUserID**: `String`, Retrieves a resource given its ID.

**Returns**: `Promise.&lt;{resource: NucleusResource}&gt;`

### NucleusResourceAPI.updatesResourceByID(resourceType, NucleusResourceModel, resourceID, resourceAttributes, originUserID) 

Updates a resource given its ID.

**Parameters**

**resourceType**: `String`, Updates a resource given its ID.

**NucleusResourceModel**: `function`, Updates a resource given its ID.

**resourceID**: `String`, Updates a resource given its ID.

**resourceAttributes**: `Object`, Updates a resource given its ID.

**originUserID**: `String`, Updates a resource given its ID.

**Returns**: `Promise.&lt;{resource: NucleusResource}&gt;`

### NucleusResourceAPI.verifyThatUserCanRetrieveResource(userID, resourceID) 

Verifies that the user can retrieve a given resource based on the hierarchy.

**Parameters**

**userID**: , Verifies that the user can retrieve a given resource based on the hierarchy.

**resourceID**: , Verifies that the user can retrieve a given resource based on the hierarchy.

**Returns**: `Promise.&lt;{canRetrieveResource: Boolean}&gt;`

### NucleusResourceAPI.verifyThatUserCanUpdateResource(userID, resourceID) 

Verifies that the user can update a given resource based on the hierarchy.

**Parameters**

**userID**: , Verifies that the user can update a given resource based on the hierarchy.

**resourceID**: , Verifies that the user can update a given resource based on the hierarchy.

**Returns**: `Promise.&lt;{canUpdateResource: Boolean}&gt;`

### NucleusResourceAPI.walkHierarchyTreeDownward(resourceID, depth) 

Recursively walks down all the branches of a given resource and collect every children.

**Parameters**

**resourceID**: `String`, Recursively walks down all the branches of a given resource and collect every children.

**depth**: `Number`, Recursively walks down all the branches of a given resource and collect every children.

**Returns**: `Promise.&lt;Array&gt;`

### NucleusResourceAPI.walkHierarchyTreeUpward(groupID, depth) 

Recursively walks up all the branches of a given resource and collect every ancestors.

**Parameters**

**groupID**: `String`, Recursively walks up all the branches of a given resource and collect every ancestors.

**depth**: `Number`, Recursively walks up all the branches of a given resource and collect every ancestors.

**Returns**: `Promise.&lt;Array&gt;`



* * *










