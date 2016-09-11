'use strict'
var mongoose = require('mongoose');

module.exports = new mongoose.Schema({
  '_game': {type: 'ObjectId', ref: 'Game'},
  'icon': {type: String, required: false},
  'name': {type: String, required: false },
  'points': {type: Number, default: 0},
  'answers': [{type: 'ObjectId', ref: 'Answer'}],
  'administrator': {type: Boolean, default: false},
  'ready': {type: Boolean, default: false},
  'connected': {type: Boolean, default: true},
  'disconnected': { type: Date, default: null },
  'selectedanswers': [{type: 'ObjectId', ref: 'Answer'}]
});