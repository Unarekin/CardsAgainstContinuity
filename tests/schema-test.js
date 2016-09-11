'use strict'
var mongoose = require('mongoose');
var q = require('q');
mongoose.Promise = require('q').Promise;

var schemas = require('../schemas');
mongoose.connect('localhost', 'cardsagainstcontinuity', function() {
  schemas.Test.on('create', function(doc) {
    console.log("In create event: ", doc._id);
  });

  schemas.Test.on('delete', function(doc) {
    console.log("In remove event: ", doc._id);
  });

  schemas.Test.on('update', function(doc) {
    console.log("In update event: ", doc._id);
  });

  var Test = new schemas.Test({text: 'Test Answer'});
  Test.save(function(err) {
    Test.text = "Updated";
    Test.save(function(err) {
      Test.remove(function(err) {
        process.exit();
      });
    })
  });
})