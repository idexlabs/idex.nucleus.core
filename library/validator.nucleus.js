"use strict";

/**
 * @fileOverview Abstract various validation tools.
 *
 * @author Sebastien Filion
 */

const { struct } = require('superstruct');
const validator = require('validator');

/**
 * Validates that the value is an Array.
 * 
 * @argument {Array} value
 * 
 * @returns {Boolean}
 */
const isArray = (value) => {

  return Array.isArray(value);
};

const isEmpty = (value) => {
  if (!value) return true;
  if (isArray(value)) return value.length === 0;
  if (isObject(value)) return Object.keys(value).length === 0;
  if (isString(value)) return value === '';
};

/**
 * Validates that the value is a Function.
 *
 * @argument {Function|*} value
 *
 * @returns {boolean}
 */
const isFunction = (value)  => {

  return typeof value === 'function';
};

/**
 * Validates that the value is a Number.
 *
 * @argument {Number|*} value
 *
 * @returns {Boolean}
 */
const isNumber = (value) => {

  return typeof value === 'number';
};

/**
 * Validates that the value is an Object.
 *
 * @argument {Object|*} value
 *
 * @returns {Boolean}
 */
const isObject = (value) => {
  
  return Object.prototype.toString.call(value) === '[object Object]';
};

/**
 * Validates that the value is object-like; that it has the prototype of an object, that it is not an array and that the
 * stringified primitive might have been modified.
 *
 * @argument {Object|*} value
 *
 * @returns {boolean}
 */
const isObjectLike = (value) => {

  return !isArray(value) && Object.keys(value).length === Object.values(value).length;
};

/**
 * Validates that the value is a String.
 *
 * @argument {String|*} value
 *
 * @returns {Boolean}
 */
const isString = (value) => {
  
  return typeof value === 'string';
};

/**
 * Replaces the first letter to lower case.
 *
 * @argument {String|*} string
 *
 * @returns {String}
 */
const shiftFirstLetterToLowerCase = (string) => {

  return string.replace(new RegExp('^\\${0,1}([A-Z])(?![A-Z]{2,})'), (match) => {

    return match.toLowerCase();
  });
};


module.exports = {
  isArray,
  isEmpty,
  isFunction,
  isNumber,
  isObject,
  isObjectLike,
  isString,
  shiftFirstLetterToLowerCase,
  struct
};