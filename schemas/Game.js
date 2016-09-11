'use strict'
var mongoose = require('mongoose');

module.exports = new mongoose.Schema({
  'key': {type: String, required: true, unique: true},
  'lastactivity': {type: Date, default: Date.now},
  'discards': {
    'answers': [{type: 'ObjectId', ref: 'Answer'}],
    'questions': [{type: 'ObjectId', ref: 'Question'}]
  },
  'cards': {
    'answers': [{type: 'ObjectId', ref: 'Answer'}],
    'questions': [{type: 'ObjectId', ref: 'Question'}]
  },
  'currentquestion': {type: 'ObjectId', ref: 'Question'}
});