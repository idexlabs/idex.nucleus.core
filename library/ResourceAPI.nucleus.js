"use strict";

const Promise = require('bluebird');
const uuid = require('node-uuid');

const NucleusError = require('./Error.nucleus');
const NucleusResource = require('./Resource.nucleus');

const nucleusValidator = require('./validator.nucleus');

const RESOURCE_ID_BY_TYPE_TABLE_NAME = 'ResourceIDByType';

/**
 * Creates a resource given its name and an object of its attributes.
 *
 * @argument {String} resourceType
 * @argument {Function} NucleusResourceModel
 * @argument {Object} resourceAttributes
 * @argument {String} originUserID
 *
 * @returns {Promise<{ resource: NucleusResource, resourceAuthorID: String, resourceMemberGroupID: String }>}
 *
 * @throws Will throw an error if the resource type is not a string.
 * @throws Will throw an error if the resource model is not an instance of NucleusResource.
 * @throws Will throw an error if the resource attributes is not an object.
 * @throws Will throw an error if the origin user ID is not a string.
 * @throws Will throw an error if no datastore is passed.
 * @throws Will throw an error if the resource is not conform to the model.
 */
async function createResource (resourceType, NucleusResourceModel, resourceAttributes, originUserID, groupID) {
  if (!nucleusValidator.isString(resourceType)) throw new NucleusError.UnexpectedValueTypeNucleusError("The resource type must be a string.");
  if (!nucleusValidator.isFunction(NucleusResourceModel)) throw new NucleusError.UnexpectedValueTypeNucleusError("The Nucleus resource model must be an instance of NucleusResource.");
  if (!nucleusValidator.isObject(resourceAttributes)) throw new NucleusError.UnexpectedValueTypeNucleusError("The resource attributes must be an object.");
  if (!nucleusValidator.isString(originUserID) || nucleusValidator.isEmpty(originUserID)) throw new NucleusError.UnexpectedValueTypeNucleusError("The origin user ID must be a string and can't be undefined.");

  const { $datastore, $resourceRelationshipDatastore } = this;

  if (nucleusValidator.isEmpty($datastore)) throw new NucleusError.UndefinedContextNucleusError("No datastore is provided.");

  if (!groupID) [ groupID ] = await $resourceRelationshipDatastore.retrieveObjectOfRelationshipWithSubject(originUserID, 'is-member');

  if (!groupID) throw new NucleusError(`Could not retrieve the group which the origin user (${originUserID}) is member of.`);

  try {
    const $resource = new NucleusResourceModel(resourceAttributes, originUserID);
    const resourceItemKey = $resource.generateOwnItemKey();

    return Promise.all([
      $datastore.addItemToHashFieldByName(resourceItemKey, $resource),
      $datastore.addItemToSetByName(RESOURCE_ID_BY_TYPE_TABLE_NAME, resourceType, $resource.ID),
    ])
      .then(() => {
        if (!$resourceRelationshipDatastore) return;

        return Promise.all([
          $resourceRelationshipDatastore.createRelationshipBetweenSubjectAndObject($resource.ID, 'is-member', groupID),
          $resourceRelationshipDatastore.createRelationshipBetweenSubjectAndObject($resource.ID, 'is-authored', originUserID)
        ]);
      })
      .return({ resource: $resource, resourceAuthorID: originUserID, resourceMemberGroupID: groupID });
  } catch (error) {

    throw new NucleusError(`Could not create ${resourceType} because of an external error: ${error}`, { error });
  }
}

/**
 * Removes a resource given its name and ID.
 *
 * @argument {String} resourceType
 * @argument {String} resourceID
 * @argument {String} originUserID
 *
 * @returns {Promise<{ resourceID: String }>}
 *
 * @throws Will throw an error if the resource type is not a string.
 * @throws Will throw an error if the resource ID is not a string.
 * @throws Will throw an error if the origin user ID is not a string.
 * @throws Will throw an error if no datastore is passed.
 * @throws Will throw an error if the origin user is not authorized to remove the resource.
 * @throws Will throw an error if the resource does not exist.
 */
async function removeResourceByID (resourceType, resourceID, originUserID) {
  if (!nucleusValidator.isString(resourceType)) throw new NucleusError.UnexpectedValueTypeNucleusError("The resource type must be a string.");
  if (!nucleusValidator.isString(resourceID)) throw new NucleusError.UnexpectedValueTypeNucleusError("The resource ID must be a string.");
  if (!nucleusValidator.isString(originUserID) || nucleusValidator.isEmpty(originUserID)) throw new NucleusError.UnexpectedValueTypeNucleusError("The origin user ID must be a string and can't be undefined.");

  const { $datastore, $resourceRelationshipDatastore } = this;

  if (nucleusValidator.isEmpty($datastore)) throw new NucleusError.UndefinedContextNucleusError("No datastore is provided.");

  const { canUpdateResource } = await verifyThatUserCanUpdateResource.call(this, originUserID, resourceID);

  if (!canUpdateResource) throw new NucleusError.UnauthorizedActionNucleusError(`The user ("${originUserID}") is not authorized to remove the ${resourceType} ("${resourceID}")`);

  const resourceItemKey = NucleusResource.generateItemKey(resourceType, resourceID);

  const resourceExists = !!(await $datastore.existsAsync(resourceItemKey));

  if (!resourceExists) throw new NucleusError.UndefinedContextNucleusError(`The ${resourceType} ("${resourceID}") does not exist.`);

  return Promise.all([
    $datastore.removeItemByName(resourceItemKey),
  ])
    .then(() => {
      if (!$resourceRelationshipDatastore) return;

      return $resourceRelationshipDatastore.removeAllRelationshipsToVector(resourceID);
    })
    .return({ resourceID });
}

/**
 * Retrieves a resource given its ID.
 *
 * @argument {String} resourceType
 * @argument {Function} NucleusResourceModel
 * @argument {String} resourceID
 * @argument {String} originUserID
 *
 * @returns {Promise<{ resource: NucleusResource }>}
 *
 * @throws Will throw an error if the resource type is not a string.
 * @throws Will throw an error if the resource model is not an instance of NucleusResource.
 * @throws Will throw an error if the resource ID is not a string.
 * @throws Will throw an error if the origin user ID is not a string.
 * @throws Will throw an error if no datastore is passed.
 * @throws Will throw an error if the origin user is not authorized to retrieve the resource.
 * @throws Will throw an error if the resource does not exist.
 */
async function retrieveResourceByID (resourceType, NucleusResourceModel, resourceID, originUserID) {
  if (!nucleusValidator.isString(resourceType)) throw new NucleusError.UnexpectedValueTypeNucleusError("The resource type must be a string.");
  if (!nucleusValidator.isFunction(NucleusResourceModel)) throw new NucleusError.UnexpectedValueTypeNucleusError("The Nucleus resource model must be an instance of NucleusResource.");
  if (!nucleusValidator.isString(resourceID)) throw new NucleusError.UnexpectedValueTypeNucleusError("The resource ID must be a string.");
  if (!nucleusValidator.isString(originUserID) || nucleusValidator.isEmpty(originUserID)) throw new NucleusError.UnexpectedValueTypeNucleusError("The origin user ID must be a string and can't be undefined.");

  const { $datastore } = this;

  if (nucleusValidator.isEmpty($datastore)) throw new NucleusError.UndefinedContextNucleusError("No datastore is provided.");

  const { canRetrieveResource } = await verifyThatUserCanRetrieveResource.call(this, originUserID, resourceID);

  if (!canRetrieveResource) throw new NucleusError.UnauthorizedActionNucleusError(`The user ("${originUserID}") is not authorized to retrieve the ${resourceType} ("${resourceID}")`);

  const resourceItemKey = NucleusResource.generateItemKey(resourceType, resourceID);

  const resourceExists = !!(await $datastore.existsAsync(resourceItemKey));

  if (!resourceExists) throw new NucleusError.UndefinedContextNucleusError(`The ${resourceType} ("${resourceID}") does not exist.`);

  return $datastore.retrieveAllItemsFromHashByName(resourceItemKey)
    .then((resourceAttributes) => {
      const $resource = new NucleusResourceModel(resourceAttributes, originUserID);

      return { resource: $resource };
    });
}

/**
 * Updates a resource given its ID.
 *
 * @argument {String} resourceType
 * @argument {Function} NucleusResourceModel
 * @argument {String} resourceID
 * @argument {Object} resourceAttributes
 * @argument {String} originUserID
 *
 * @returns {Promise<{ resource: NucleusResource }>}
 *
 * @throws Will throw an error if the resource type is not a string.
 * @throws Will throw an error if the resource model is not an instance of NucleusResource.
 * @throws Will throw an error if the resource ID is not a string.
 * @throws Will throw an error if the resource attributes is not an object.
 * @throws Will throw an error if the origin user ID is not a string.
 * @throws Will throw an error if no datastore is passed.
 * @throws Will throw an error if the origin user is not authorized to retrieve the resource.
 * @throws Will throw an error if the resource does not exist.
 */
async function updatesResourceByID (resourceType, NucleusResourceModel, resourceID, resourceAttributes, originUserID) {
  if (!nucleusValidator.isString(resourceType)) throw new NucleusError.UnexpectedValueTypeNucleusError("The resource type must be a string.");
  if (!nucleusValidator.isFunction(NucleusResourceModel)) throw new NucleusError.UnexpectedValueTypeNucleusError("The Nucleus resource model must be an instance of NucleusResource.");
  if (!nucleusValidator.isString(resourceID)) throw new NucleusError.UnexpectedValueTypeNucleusError("The resource ID must be a string.");
  if (!nucleusValidator.isObject(resourceAttributes)) throw new NucleusError.UnexpectedValueTypeNucleusError("The resource attributes must be an object.");
  if (!nucleusValidator.isString(originUserID) || nucleusValidator.isEmpty(originUserID)) throw new NucleusError.UnexpectedValueTypeNucleusError("The origin user ID must be a string and can't be undefined.");

  const { $datastore } = this;

  if (nucleusValidator.isEmpty($datastore)) throw new NucleusError.UndefinedContextNucleusError("No datastore is provided.");

  const { canUpdateResource } = await verifyThatUserCanUpdateResource.call(this, originUserID, resourceID);

  if (!canUpdateResource) throw new NucleusError.UnauthorizedActionNucleusError(`The user ("${originUserID}") is not authorized to update the ${resourceType} ("${resourceID}")`);

  const resourceItemKey = NucleusResource.generateItemKey(resourceType, resourceID);

  const resourceExists = !!(await $datastore.existsAsync(resourceItemKey));

  if (!resourceExists) throw new NucleusError.UndefinedContextNucleusError(`The ${resourceType} ("${resourceID}") does not exist.`);

  return $datastore.retrieveAllItemsFromHashByName(resourceItemKey)
    .then((staleResourceAttributes) => {
      const $resource = new NucleusResourceModel(Object.assign({}, staleResourceAttributes, resourceAttributes), originUserID);

      return $datastore.addItemToHashFieldByName(resourceItemKey, resourceAttributes)
        .return({ resource: $resource });
    });
}

/**
 * Verifies that the user can retrieve a given resource based on the hierarchy.
 *
 * @argument userID
 * @argument resourceID
 *
 * @returns {Promise<{ canRetrieveResource: Boolean }>}
 */
async function verifyThatUserCanRetrieveResource (userID, resourceID) {
  const { $resourceRelationshipDatastore } = this;

  if (!$resourceRelationshipDatastore) return { canRetrieveResource: true };

  const userAncestorGroupIDList = await walkHierarchyTreeUpward.call(this, userID);
  const userDirectAncestorChildrenGroupIDList = await walkHierarchyTreeDownward.call(this, userAncestorGroupIDList[0]);
  const resourceAncestorGroupIDList = await walkHierarchyTreeUpward.call(this, resourceID);

  const groupIDIntersectionList = userAncestorGroupIDList.slice(0).concat(userDirectAncestorChildrenGroupIDList)
    .filter((groupID) => {

      return resourceAncestorGroupIDList.indexOf(groupID) !== -1;
    });

  if (groupIDIntersectionList.length === 0) return { canRetrieveResource: false };

  return { canRetrieveResource: true };
}

/**
 * Verifies that the user can update a given resource based on the hierarchy.
 *
 * @argument userID
 * @argument resourceID
 *
 * @returns {Promise<{ canUpdateResource: Boolean }>}
 */
async function verifyThatUserCanUpdateResource (userID, resourceID) {
  const { $resourceRelationshipDatastore } = this;

  if (!$resourceRelationshipDatastore) return { canUpdateResource: true };

  const userDirectAncestorGroupIDList = await $resourceRelationshipDatastore.retrieveObjectOfRelationshipWithSubject(userID, 'is-member');
  const userDirectAncestorChildrenGroupIDList = await walkHierarchyTreeDownward.call(this, userDirectAncestorGroupIDList[0]);
  const resourceAncestorGroupIDList = await walkHierarchyTreeUpward.call(this, resourceID);

  const groupIDIntersectionList = userDirectAncestorGroupIDList.slice(0).concat(userDirectAncestorChildrenGroupIDList)
    .filter((groupID) => {

      return resourceAncestorGroupIDList.indexOf(groupID) !== -1;
    });

  if (groupIDIntersectionList.length === 0) return { canUpdateResource: false };

  return { canUpdateResource: true };
}

/**
 * Recursively walks down all the branches of a given resource and collect every children.
 *
 * @argument {String} resourceID
 * @argument {Number} [depth=Infinity]
 *
 * @returns {Promise<Array>}
 */
function walkHierarchyTreeDownward (resourceID, depth = Infinity) {
  const { $resourceRelationshipDatastore } = this;

  if (!$resourceRelationshipDatastore) return [];

  const groupIDList = [];

  async function retrieveAncestorForResourceByID (resourceID) {
    const childrenGroupIDList = await $resourceRelationshipDatastore.retrieveSubjectOfRelationshipWithObject(resourceID, 'is-member');

    if (childrenGroupIDList.length === 0 || !!~childrenGroupIDList.indexOf('SYSTEM')) return null;

    childrenGroupIDList
      .forEach((groupID) => {
        if (!~groupIDList.indexOf(groupID)) groupIDList.push(groupID);
      }, groupIDList);

    if (groupIDList.length >= depth) return;

    return Promise.all(childrenGroupIDList
      .map(retrieveAncestorForResourceByID.bind(this)));
  }

  return new Promise(async (resolve, reject) => {
    await retrieveAncestorForResourceByID.call(this, resourceID);

    resolve(groupIDList);
  });
}

/**
 * Recursively walks up all the branches of a given resource and collect every ancestors.
 *
 * @argument {String} groupID
 * @argument {Number} [depth=Infinity]
 *
 * @returns {Promise<Array>}
 */
function walkHierarchyTreeUpward (resourceID, depth = Infinity) {
  const { $resourceRelationshipDatastore } = this;

  const groupIDList = [];

  async function retrieveAncestorForResourceByID (resourceID) {
    const ancestorGroupIDList = await $resourceRelationshipDatastore.retrieveObjectOfRelationshipWithSubject(resourceID, 'is-member');

    if (ancestorGroupIDList.length === 0 || !!~ancestorGroupIDList.indexOf('SYSTEM')) return null;

    ancestorGroupIDList
      .forEach((groupID) => {
        if (!~groupIDList.indexOf(groupID)) groupIDList.push(groupID);
      }, groupIDList);

    if (groupIDList.length >= depth) return;

    return Promise.all(ancestorGroupIDList
      .map(retrieveAncestorForResourceByID.bind(this)));
  }

  return new Promise(async (resolve, reject) => {
    await retrieveAncestorForResourceByID.call(this, resourceID);

    resolve(groupIDList);
  });
}


const ResourceAPI = {
  createResource,
  removeResourceByID,
  retrieveResourceByID,
  updatesResourceByID,
  verifyThatUserCanRetrieveResource,
  verifyThatUserCanUpdateResource,
  walkHierarchyTreeDownward,
  walkHierarchyTreeUpward
};

module.exports = ResourceAPI;