'use strict'
var mongoose = require('mongoose');
var schemas = require('../schemas');

mongoose.connect('localhost', 'cardsagainstcontinuity', function() {
  schemas.Player.findOne({})
  .populate('_game answers')
  .exec(function(err, Player) {
    console.log(Player);
    process.exit();
  });
});