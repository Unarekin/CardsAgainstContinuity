'use strict'
var mongoose = require('mongoose');
var q = require('q');


module.exports = function(app) {
  return {
    winner: function(socket, data, callback) {
      if (socket && socket.Game && socket.Player && socket.Player.administrator) {
        var cardsToDiscard = [];
        var promiseChain = q(null);
        var winningAnswers = [];
        app.db.getRecords('Player', {_game: socket.Game._id}, 'selectedanswers answers')
        .then(function(Players) {
          Players.forEach(function(Player) {
            cardsToDiscard = cardsToDiscard.concat(Player.selectedanswers);
            Player.selectedanswers.forEach(function(answer) {
              var index = Player.answers.findIndex(function(elem) { return String(elem._id) === String(answer._id); });
              if (index !== -1) {
                Player.answers.splice(index, 1);
              }
            });
            if (String(Player._id) === String(data.id)) {
              Player.points++;
              winningAnswers = Player.selectedanswers;
            }
            Player.administrator = false;
            Player.selectedanswers = [];
            Player.ready = false;
            promiseChain = promiseChain.then(function() { return app.db.saveRecord(Player); });
          });
          socket.Game.discards.answers = socket.Game.discards.answers.concat(cardsToDiscard);
          socket.Game.discards.questions.push(socket.Game.currentquestion);
          var question = socket.Game.currentquestion;
          socket.Game.currentquestion = null;
          promiseChain = promiseChain
                          .then(function() { return app.db.saveRecord(socket.Game); })
                          .then(function() { app.io.to(socket.Game._id).emit('game:winner', {id: data.id, question: app.functions.shallowCard(question), answers: winningAnswers}); });
        });
      } else if (!socket.Player) {
        callback({status: 'err', message: 'Invalid player.'});
      } else if (!socket.Game) {
        callback({status: 'err', message: 'Invalid game.'});
      } else if (!socket.Player.administrator) {
        callback({status: 'err', message: 'Permission denied.'});
      } else {
        callback({status: 'err', message: 'Unknown error.'});
      }
    },
    answers: function(socket, data, callback) {
      if (socket && socket.Player && socket.Game && socket.Player.administrator) {
        app.db.getRecords('Player', {_game: socket.Game._id, ready: true}, 'selectedanswers')
        .then(function(Players) {
          var answers = {};
          Players.forEach(function(Player) {
            answers[Player._id] = [];
            Player.selectedanswers.forEach(function(answer) { answers[Player._id].push(app.functions.shallowCard(answer)); });
            //answers[Player._id] = Player.selectedanswers;
          });
          callback({status: 'ok', answers: answers});
        }, function(err) {
          callback({status: 'err', message: err.message});
        });
      } else if (!socket.Player) {
        callback({status: 'err', message: 'Invalid player.'});
      } else if (!socket.Game) {
        callback({status: 'err', message: 'Invalid game.'});
      } else if (!socket.Player.administrator) {
        callback({status: 'err', message: 'Permission denied.'});
      } else {
        callback({status: 'err', message: 'Unknown error.'});
      }
    },
    question: function(socket, data, callback) {
      if (socket.Player && socket.Game && socket.Player.administrator) {
        if (!socket.Game.currentquestion) {
          // Load one up.
          if (socket.Game.cards.questions.length === 0) {
            socket.Game.cards.questions = socket.Game.discards.questions;
            socket.Game.discards.questions = [];
          }

          var index = Math.floor(Math.random() * socket.Game.cards.questions.length);
          var question = socket.Game.cards.questions.splice(index, 1)[0];
          socket.Game.currentquestion = question;
          socket.Game.save(function(err) {
            if (err) {
              callback({status: 'err', message: err.message});
            } else {
              app.db.getRecordById('Question', question)
              .then(function(card) {
                callback({status: 'ok', question: app.functions.shallowCard(card)});
              }, function(err) {
                callback({status: 'err', message: err.message});
              });
            }
          });
        } else {
          app.db.getRecordById('Question', socket.Game.currentquestion)
          .then(function(card) {
            callback({status: 'ok', question: app.functions.shallowCard(card)});
          }, function(err) {
            callback({status: 'err', message: err.message});
          });
        }
      } else if (!socket.Player) {
        callback({status: 'err', message: 'Invalid player.'});
      } else if (!socket.Game) {
        callback({status: 'err', message: 'Invalid game.'});
      } else if (!socket.Player.administrator) {
        callback({status: 'err', message: 'Permission denied.'});
      }
    },
    adminreset: function(socket, data, callback) {
      if (socket && socket.Game) {
        app.db.getRecords('Player', {_game: socket.Game._id})
        .then(function(Players) {
          var promiseChain = q(null);
          Players.forEach(function(Player) {
            Player.ready = false;
            Player.selectedanswers = [];
            Player.administrator = false;
            promiseChain = promiseChain.then(function() { return app.db.saveRecord(Player); });
          });
          promiseChain = promiseChain.then(function() {
            callback({status: 'ok'});
            app.io.to(socket.Game._id).emit('player:admin', {admin: null, answers: 0});
          }).catch(function(err) { callback({status: 'err', message: err.message ? err.message : err})});
        }).catch(function(err) { callback({status: 'err', message: err.message ? err.message : err})});
      } else if (!socket) {
        callback({status: 'err', message: 'Invalid socket.'});
      } else if (!socket.Game) {
        callback({status: 'err', message: 'Invalid game.'});
      }
    },
    adminclaim: function(socket, data, callback) {
      if (socket.Player && socket.Game) {
        app.functions.getAdministrator(socket.Game._id)
        .then(function(Admin) {
          if (Admin) {
            callback({status: 'err', message: 'There is already an administrator.'});
          } else {
            socket.Player.administrator = true;

            if (socket.Game.cards.questions.length === 0) {
              socket.Game.cards.questions = socket.Game.discards.questions;
              socket.Game.discards.questions = [];
            }

            var index = Math.floor(Math.random() * socket.Game.cards.questions.length);
            var question = socket.Game.cards.questions.splice(index, 1);
            socket.Game.currentquestion = question._id;

            socket.Game.save(function(err) {
              if (err) {
                callback({status: 'err', message: err.message});
              } else {
                socket.Player.save(function(err) {
                  if (err) {
                    callback({status: 'err', message: err.message});
                  } else {
                    callback({status: 'ok'});
                    socket.to(socket.Game._id).emit('player:admin', {admin: socket.Player._id, answers: question.answers});
                  }
                });
              }
            });
          }
        })
      } else if (!socket.Player) {
        callback({status: 'err', message: 'No player entry.'});
      } else if (!socket.Game) {
        callback({status: 'err', message: 'Invalid game.'});
      }
    },
    leave: function(socket, data, callback) {
      if (socket && socket.Game && socket.Player) {
        var game_id = socket.Game._id;
        var promiseChain = q(null);
        if (socket.Player.administrator) {
          promiseChain = 
          app.db.getRecords('Player', {_game: socket.Game._id})
          .then(function(Players) {
            Players.forEach(function(Player) {
              Player.selectedanswers = [];
              Player.ready = false;
              promiseChain = promiseChain.then(function() { return app.db.saveRecord(Player); });
            });
          });
        }
        promiseChain = promiseChain.then(function() {
          socket.leave(game_id);
          socket.Game = null;
          socket.Player._game = null;
          socket.Player.ready = false;
          socket.Player.administrator = false;
          socket.Player.selectedanswers = [];
          return app.db.saveRecord(socket.Player)
        }).then(function() {
          callback({status: 'ok'});
          socket.to(game_id).emit('player:leave', {player: socket.Player._id});
        }).catch(function(err) { callback({status: 'err', message: err.message ? err.message : err}); });
      } else if (!socket) {
        callback({status: 'err', message: 'Invalid socket.'});
      } else if (!socket.Game) {
        callback({status: 'err', message: 'Invalid game.'});
      } else if (!socket.Player) {
        callback({status: 'err', message: 'Invalid player.'});
      }
    },
    join: function(socket, data, callback) {
      if (socket.Player) {
        var key = data.key;
        app.db.getRecord('Game', {key: key})
        .then(function(Game) {
          if (Game) {
            socket.Player._game = Game._id;
            socket.Player.save(function(err) {
              if (err) {
                callback({status: 'err', message: err.message});
              } else {
                callback({status: 'ok', key: Game.key});
                socket.to(Game._id).emit('player:join', {player: app.functions.shallowPlayer(socket.Player)});
                socket.join(Game._id.toString());
              }
            });
          } else {
            callback({status: 'err', message: 'Invalid game key.'});
          }
        });
      } else {
        callback({status: 'err', message: 'No player entry.'});
      }
    },
    get: function(socket, data, callback) {
      if (data && data.key !== undefined && data.key !== null) {
        var key = data.key;
        app.db.getRecord('Game', {key: key}, 'currentquestion')
        .then(function(Game) {
          if (Game)
            return [Game, app.db.getRecords('Player', {_game: Game._id})]
          else if (callback && typeof callback === 'function')
            callback({status: 'err', message: 'Invalid game key.'});
        })
        .spread(function(Game, Players) {
          if (Game) {
            var shallowGame = app.functions.shallowGame(Game);
            Players.forEach(function(Player) {
              var shallowPlayer = app.functions.shallowPlayer(Player);
              shallowGame.players.push(shallowPlayer);
              if (Player.administrator)
                shallowGame.administrator = shallowPlayer;
            });
            if (Game.currentquestion)
              shallowGame.expectedanswers = Game.currentquestion.answers;
            if (callback && typeof callback === 'function')
              callback({status: 'ok', game: shallowGame});
          } else {
            callback({status: 'err', message: 'Invalid game key.'});
          }
        });
      }
    },
    create: function(socket, data, callback) {
      var characters = '1234567890';
      var key = '';
      for (var i=0;i<6;i++) {
        key += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      var Game = new app.schemas.Game({key: key});

      app.db.getRecords('Expansion', {group: 'Continuity'})
      .then(function(Expansions) {
        var Answers = [];
        var Questions = [];
        var promiseChain = q(null);
        var ExpIds = [];
        Expansions.forEach(function(Expansion) { ExpIds.push(Expansion._id); });
        app.db.getRecords('Question', {_expansion: {$in: ExpIds}})
        .then(function(Questions) { return [Questions, app.db.getRecords('Answer', {_expansion: {$in: ExpIds}})] })
        .spread(function(Questions, Answers) {
          Game.cards.questions = Questions;
          Game.cards.answers = Answers;
          Game.save(function(err) {
            if (err) {
              callback({status: 'err', message: err.message})
            } else {
              callback({status: 'ok', key: key});
            }
          });

        });
      });
    }
  }
}