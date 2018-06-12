"use strict";

const uuid = require('uuid');

/**
 * Creates an user.
 *
 * @Nucleus ActionName CreateUser
 *
 * @argument {Object} userAttributes
 *
 * @returns {Promise<{ user: User }>}
 */
function createUser (userAttributes) {
  const { $datastore } = this;
  if (!('ID' in userAttributes)) userAttributes.ID = uuid.v4();

  return $datastore.createItem(`User:${userAttributes.ID}`, userAttributes)
    .return({ user: userAttributes });
}

/**
 * Removes an user given its ID.
 *
 * @Nucleus ActionName RemoveUserByID
 *
 * @argument {String} userID
 *
 * @returns {Promise<{ userID: String }>}
 */
function removeUserByID (userID) {
  const { $datastore } = this;

  return $datastore.removeItemByName(`User:${userID}`)
    .return({ userID });
}

/**
 * Retrieves an user given its ID.
 *
 * @Nucleus ActionName RetrieveUserByID
 *
 * @argument {String} userID
 *
 * @returns {Promise<{ user: User }>}
 */
function retrieveUserByID (userID) {
  const { $datastore } = this;

  return $datastore.retrieveItemByName(`User:${userID}`)
    .then(user => ({ user }));
}

/**
 * Updates an user given its ID.
 *
 * @Nucleus ActionName UpdateUserByID
 *
 * @argument {String} userID
 * @argument {Object} userAttributes
 *
 * @returns {Promise<{ user: User }>}
 */
function updateUserByID (userID, userAttributes) {
  const { $datastore } = this;

  return $datastore.createItem(`User:${userID}`, userAttributes)
    .return({ user: userAttributes });
}

// Core/User.api.js
module.exports = {
  createUser,
  removeUserByID,
  retrieveUserByID,
  updateUserByID
};

