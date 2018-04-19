"use strict";

/**
 * @fileOverview Abstract various validation tools.
 *
 * @author Sebastien Filion
 *
 * @requires NPM:superstruct
 * @requires NPM:validator
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
 * Validates that the value is a Number.
 value
 * @argument {Number} number
 *
 * @returns {Boolean}
 */
const isNumber = (value) => {

  return typeof value === 'number';
};

/**
 * Validates that the value is an Object.
 *
 * @argument {Object} value
 *
 * @returns {Boolean}
 */
const isObject = (value) => {
  
  return Object.prototype.toString.call(value) === '[object Object]';
};

/**
 * Validates that the value is a String.
 *
 * @argument {String} value
 *
 * @returns {Boolean}
 */
const isString = (value) => {
  
  return typeof value === 'string';
};

module.exports = {
  isArray,
  isEmpty,
  isNumber,
  isObject,
  isString,
  struct
};