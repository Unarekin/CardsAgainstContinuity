'use strict'
var mongoose = require('mongoose');
var q = require('q');


module.exports = function(app) {
  return {
    selectanswer: function(socket, data, callback) {
      if (socket && socket.Player && socket.Game && data.card) {
        var handIndex = socket.Player.answers.findIndex(function(elem) { return String(elem._id) === String(data.card); });
        var selectedIndex = socket.Player.selectedanswers.findIndex(function(elem) { return String(elem._id) === String(data.card); });
        if (handIndex !== -1 && selectedIndex === -1) {
          socket.Player.selectedanswers.push(data.card);
          socket.Player.save(function(err) {
            if (err)
              callback({status: 'err', message: err.message});
            else
              callback({status: 'ok'});
          });
        } else if (selectedIndex !== -1) {
          callback({status: 'err', message: 'Card already selected.'});
        } else {
          callback({status: 'err', message: 'Card not in hand.'});
        }
      } else if (!socket.Player) {
        callback({status: 'err', message: 'Invalid player.'});
      } else if (!socket.Game) {
        callback({status: 'err', message: 'Invalid game.'});
      } else if (!data.card) {
        callback({status: 'err', message: 'No card provided.'});
      }
    },
    unselectanswer: function(socket, data, callback) {
      if (socket && socket.Player && data.card) {
        var index = socket.Player.selectedanswers.findIndex(function(elem) { return String(elem._id) === String(data.card); });
        if (index !== -1) {
          socket.Player.selectedanswers.splice(index, 1);
          socket.Player.save(function(err) {
            if (err)
              callback({status: 'err', message: err.message});
            else
              callback({status: 'ok'});
          });
        } else {
          callback({status: 'err', message: 'Card not selected.'});
        }
      } else if (!socket.Player) {
        callback({status: 'err', message: 'Invalid player.'});
      } else if (!data.card) {
        callback({status: 'err', message: 'No card provided.'});
      }
    },
    rename: function(socket, data, callback) {
      if (socket && socket.Player && data.name) {
        socket.Player.name = data.name;
        socket.Player.save(function(err) {
          if (err) {
            callback({status: 'err', message: err.message});
            console.error(err);
            if (err.stack)
              console.error(err.stack);
          } else {
            callback({status: 'ok', name: data.name});
            if (socket.Game) {
              console.log("Broadcasting rename");
              socket.to(socket.Game._id).emit('player:rename', {'_id': socket.Player._id, 'name': data.name});
            }
          }
        });
      } else if (!data.name) {
        callback({status: 'err', message: 'No name specified.'});
      } else {
        callback({status: 'err', message: 'Invalid player.'});
      }
    },
    ready: function(socket, data, callback) {
      if (socket.Player && socket.Game) {
        socket.Player.ready = data.value;
        socket.Player.save(function(err) {
          if (err) {
            callback({status: 'err', message: err.message});
          } else {
            callback({status: 'ok'});
            socket.to(socket.Game._id).emit('player:ready', {'player': socket.Player._id, 'value': data.value});
          }
        });
      } else if (!socket.Player) {
        callback({status: 'err', message: 'Invalid player.'});
      } else if (!socket.Game) {
        callback({status: 'err', message: 'Invalid game.'});
      }
    },
    hand: function(socket, data, callback) {
      if (socket && socket.Player && socket.Game) {
        var promiseChain = q(null);
        if (socket.Player.answers.length < 10) {
          var needsMore = 10 - socket.Player.answers.length;
          for (var i=0;i<needsMore;i++) {
            if (socket.Game.cards.answers.length === 0) {
              // "Shuffle"
              socket.Game.cards.answers = socket.Game.discards.answers;
              socket.Game.discards.answers = [];
            }

            var index = Math.floor(Math.random() * socket.Game.cards.answers.length);
            var card = socket.Game.cards.answers.splice(index, 1)[0];
            socket.Player.answers.push(card);
          }

          promiseChain = promiseChain
          .then(function() {
            // Save game
            var deferred = q.defer();
            socket.Game.save(function(err) {
              if (err)
                deferred.reject(err);
              else
                deferred.resolve();
            });
            return deferred.promise;
          }).then(function() {
            // Save player
            var deferred = q.defer();
            socket.Player.save(function(err) {
              if (err)
                deferred.reject(err);
              else
                deferred.resolve();
            });
            return deferred.promise;
          });
        }

        // Populate our cards.
        promiseChain = promiseChain
        .then(function() { return app.db.getRecords('Answer', {_id: {$in: socket.Player.answers}})})
        .then(function(cards) {
          var shallowCards = [];
          cards.forEach(function(card) { shallowCards.push(app.functions.shallowCard(card)); });
          callback({status: 'ok', hand: shallowCards});
        }).catch(function(err) {
          console.error(err);
          if (err.stack)
            console.error(err.stack);
        });
      } else {
        callback({status: 'err', message: 'Invalid request.'});
      }
    },
    me: function(socket, data, callback) {
      if (socket && socket.Player) {
        var shallowPlayer = app.functions.shallowPlayer(socket.Player);
        shallowPlayer._game = app.functions.shallowGame(socket.Player._game);
        shallowPlayer.answers = [];
        socket.Player.answers.forEach(function(Answer) {
          shallowPlayer.answers.push(app.functions.shallowCard(Answer));
        });
        shallowPlayer.selectedanswers = [];
        socket.Player.selectedanswers.forEach(function(Answer) {
          shallowPlayer.selectedanswers.push(app.functions.shallowCard(Answer));
        })
        callback({status: 'ok', player: shallowPlayer});
      } else if (socket && !socket.Player) {
        callback({status: 'err', message: 'No player.'});
      } else {
        callback({status: 'err', message: 'No socket.'});
      }
    },
    get: function(socket, data, callback) {
      if (socket) {
        app.db.getRecordById('Player', data._id)
        .then(function(Player) {
          if (Player)
            callback({status: 'ok', player: app.functions.shallowPlayer(Player)});
          else
            callback({status: 'err', message: 'Invalid player.'});
        });
      } else {
        callback({status: 'err', message: 'No socket.'});
      }
    }
  }
}