'use strict'
var mongoose = require('mongoose');
var q = require('q');
mongoose.Promise = require('q').Promise;

var schemas = require('./schemas');
mongoose.connect('localhost', 'cardsagainstcontinuity', function() {
  console.log("Daemon running.");
  setTimeout(function() {
    removeIdlePlayers()
    .then(removeEmptyGames);
  }, 60000)
});

function removeEmptyGames() {
  var deferred = q.defer();

  schemas.Game.find({})
  .cursor({batchSize: 100})
  .eachAsync(function(Game) {
    return checkEmptyGame(Game._id);
  }, function() {

  });

  return deferred.promise;
}

function checkEmptyGame(id) {
  var deferred = q.defer();
  schemas.Player.find({_game: id}).count(function(err, Count) {
    if (err) {
      deferred.reject(err);
    } else {
      if (Count === 0) {
        console.log("Removing game " + id);
        schemas.Game.remove({_id: id})
        .exec(function(err) {
          if (err)
            deferred.reject(err);
          else
            deferred.resolve();
        });
      } else {
        deferred.resolve();
      }
    }
  });
  return deferred.promise;
}

function removeIdlePlayers() {
  var deferred = q.defer();
  var toRemove = [];
  schemas.Player.find({connected: false})
  .cursor({batchSize: 100})
  .eachAsync(function(Player) {
    var idleTime = Math.floor((new Date().getTime() - new Date(Player.lastactivity).getTime()) / 60000);
    if (idleTime >= 10)
      toRemove.push(Player._id);
  }, function() {
    if (toRemove.length > 0) {
      console.log("Removing " + toRemove.length + " idle players.");
      schemas.Player.remove({_id: {$in: toRemove}}, function(err) {
        if (err)
          deferred.reject(err);
        else
          deferred.resolve();
      });
    }
  });
  return deferred.promise;
}