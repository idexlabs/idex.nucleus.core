# Create a persistent storage API

So, if you got this far, you know how to create actions and how to interact with the communication layer and maybe you
read about [extendable actions](./Guide-Extendable-actions)...  

In a nutshell, an extendable action is an action you can extend. Let's take an example with a doclet from the resource
API library:

```javascript
  // ResourceAPI.nucleus.js
  
  /**
   * Assigns one or many relationships to a resource given its ID.
   *
   * @Nucleus ActionName AssignRelationshipsToResourceByID
   * @Nucleus ExtendableActionName `AssignRelationshipsTo${resourceType}ByID`
   * @Nucleus ExtendableEventName `RelationshipsTo${resourceType}ByIDAssigned`
   * @Nucleus ExtendableAlternativeActionSignature 'resourceType' `${Nucleus.shiftFirstLetterToLowerCase(resourceType)}ID` 'originUserID'
   * @Nucleus ExtendableActionArgumentDefault resourceType `${resourceType}`
   *
   * @argument {String} resourceType
   * @argument {String} resourceID
   * @argument {Object[]} resourceRelationshipList
   * @argument {String} originUserID
   *
   * @returns {Promise<{ resourceID: String, resourceType: String, resourceRelationships: Object }>}
   *
   * @throws Will throw an error if the resource type is not a string.
   * @throws Will throw an error if the resource ID is not a string.
   * @throws Will throw an error if the origin user ID is not a string.
   */
```

The first Nucleus parameter is known, `ActionName`, it tags a function as a functional action to the system. The
following 4 parameters details how this action can be extended.  
So let's assume we need to create a user API and we want to extend the `AssignRelationshipsToResourceByID` action. You 
can see that all the extendable parameters refers to a variable called `resourceType`, so you know that you have to 
somehow pass the resource type when creating a new API... Long story short, everything that you export from your module
is available to the engine when trying to resolve those variables. There's an exception for everything prefixed with 
`Nucleus` which is injected by the system; ie: `Nucleus.shiftFirstLetterToLowerCase`.

Alright alright, so here's how you leverage this into your codebase:
  1. Create an API file for your resource if you don't already have one;
  2. Define the `resourceType` variable and export it;
  3. Call the Nucleus parameter `ActionNameToExtend` to extend `AssignRelationshipsToResourceByID`;
  4. Add the JSDoc `@memberOf` tag, this will help generating more structured documentation;
  5. Add the JSDoc `@function` tag, this is to make sure that the JSDoc parser reads your doclet correctly;
  6. This is optional, if you want to be able to call the action using the more semantic `userID` instead of `resourceID`,
     just specify it as an argument in the doclet with the correct type.
  
```javascript
// User.api.js

const resourceType = 'User';

/**
 * @Nucleus ActionNameToExtend AssignRelationshipsToResourceByID
 * 
 * @argument {String} userID
 *
 * @memberOf UserAPI
 * @function assignRelationshipsToResourceByID
 */

module.exports = { resourceType };
```

If everything is set-up properly, you can call the new action like this:

```javascript
$engine.publishActionByNameAndHandleResponse('AssignRelationshipsToUserByID', { userID, resourceRelationshipList }, originUserID);
```

Note that the argument `resourceType` argument is not required because it is set as a default, 
(see `ExtendableActionArgumentDefault` for more details) and the `originUserID` will also be injected automatically 
because it is required to publish an action anyway...  

The resource API library offers a lot of different actions that will help you manage your resource out of the box:
  * `CreateResource`, Creates a resource given its attributes.
  * `RemoveResourceByID`, Removes a resource given its ID.
  * `RetrieveResourceByID`, Retrieves a resource given its ID.
  * `UpdateResourceByID`, Updates a resource given its ID and new attributes.
  
Which brings us to talk about the resource model... A resource model is an extension of `NucleusResource` that defines,
more or less, the schema for your resource. During the autodiscovery, Nucleus has the ability to infer resource model
from your type definition doclet:

```javascript
/**
 * @Nucleus ResourceAPIName UserAPI
 *
 * @typedef {Object} User
 * @property {String} email
 * @property {String} firstName
 * @property {String} fullName
 * @property {String} lastName
 * @property {Object[]} phoneNumberList
 * @property {String} username
 */
```

Using the `CreateResource` extendable action doclet as an example, you'll notice that it requires an argument called 
`NucleusResourceModel` that defaults to 
`Nucleus.generateResourceModelFromResourceStructureByResourceType(`${resourceType}`)`. What will happen behind the scene,
if you documented your resource type correctly, the engine will retrieve the resource model for the given type and inject
it in the function.

```javascript
  /**
   * Creates a resource given its name and an object of its attributes.
   *
   * @Nucleus ActionName CreateResource
   * @Nucleus ActionAlternativeSignature resourceType NucleusResourceModel resourceAttributes originUserID
   * @Nucleus ExtendableActionName `Create${resourceType}`
   * @Nucleus ExtendableEventName `${resourceType}Created`
   * @Nucleus ExtendableAlternativeActionSignature 'resourceType' 'NucleusResourceModel' `${Nucleus.shiftFirstLetterToLowerCase(resourceType)}Attributes` 'originUserID'
   * @Nucleus ExtendableActionArgumentDefault resourceType `${resourceType}` NucleusResourceModel Nucleus.generateResourceModelFromResourceStructureByResourceType(`${resourceType}`)
   *
   * @argument {String} resourceType
   * @argument {Function} NucleusResourceModel
   * @argument {Object} resourceAttributes
   * @argument {String} originUserID
   * @argument {String} [parentNodeType]
   * @argument {String} [parentNodeID]
   *
   * @returns {Promise<{ resource: NucleusResource, resourceRelationships: Object }>}
   *
   * @throws Will throw an error if the resource type is not a string.
   * @throws Will throw an error if the resource model is not an instance of NucleusResource.
   * @throws Will throw an error if the resource attributes is not an object.
   * @throws Will throw an error if the origin user ID is not a string.
   * @throws Will throw an error if no datastore is passed.
   * @throws Will throw an error if the resource is not conform to the model.
   */
```

If we add the type definition doclet and the new extendable actions, your user API now looks like this:

```javascript
// User.api.js

const resourceType = 'User';

/**
 * @Nucleus ResourceAPIName UserAPI
 *
 * @typedef {Object} User
 * @property {String} email
 * @property {String} firstName
 * @property {String} fullName
 * @property {String} lastName
 * @property {Object[]} phoneNumberList
 * @property {String} username
 */

/**
 * @Nucleus ActionNameToExtend CreateResource
 *
 * @argument {Object} userAttributes
 * @argument {String} originUserID
 *
 * @memberOf UserAPI
 * @function createResource
 */

/**
 * @Nucleus ActionNameToExtend RemoveResourceByID
 *
 * @argument {String} userID
 * @argument {String} originUserID
 *
 * @memberOf UserAPI
 * @function removeResourceByID
 */

/**
 * @Nucleus ActionNameToExtend RetrieveAllResourcesByType
 *
 * @memberOf UserAPI
 * @function retrieveAllResourcesByType
 */

/**
 * @Nucleus ActionNameToExtend RetrieveBatchResourceByIDList
 *
 * @argument {String[]} userIDList
 * @argument {String} originUserID
 *
 * @memberOf UserAPI
 * @function retrieveBatchResourceByIDList
 */

/**
 * @Nucleus ActionNameToExtend RetrieveResourceByID
 *
 * @argument {String} userID
 * @argument {String} originUserID
 *
 * @memberOf UserAPI
 * @function retrieveResourceByID
 */

/**
 * @Nucleus ActionNameToExtend UpdateResourceByID
 *
 * @argument {String} userID
 * @argument {Object} userAttributes
 * @argument {String} originUserID
 *
 * @memberOf UserAPI
 * @function updateResourceByID
 */

/**
 * @class UserAPI
 */
module.exports = {
  pluralResourceType: resourceType + 's',
  resourceType
};
```

This provides you with new actions: `CreateUser`, `RemoveUserByID`, `RetrieveAllUsers`, `RetrieveBatchUserByIDList`, 
`RetrieveUserByID`, `UpdateUserByID`.

At this point, if you need to add more actions, just go ahead! Don't forget to export it from your module.

```javascript
// ...

/**
 * Authenticates the user given its credentials.
 * 
 * @Nucleus ActionName AuthenticateUserWithCredentials
 * 
 * @argument {String} username
 * @argument {String} password
 * @argument {String} originUserID
 * 
 * @returns {Promise}
 */
function authenticateUserWithCredentials (username, password, originUserID) {
  // Authenticate the user using your preferred algorithm.
  
  return Promise.resolve();
}

// ...

/**
 * @class UserAPI
 */
module.exports = {
  authenticateUserWithCredentials,
  pluralResourceType: resourceType + 's',
  resourceType
};
```

That's all folks!