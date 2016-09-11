'use strict'
var mongoose = require('mongoose');

module.exports = new mongoose.Schema({
  'name': {type: String, required: true, unique: true},
  'group': {type: String, required: false, default: ''}
});