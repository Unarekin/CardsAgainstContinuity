'use strict'
var mongoose = require('mongoose');

module.exports = new mongoose.Schema({
  'text': {type: String, required: true},
  '_expansion': {type: 'ObjectId', required: true, ref: 'Expansion'}
});