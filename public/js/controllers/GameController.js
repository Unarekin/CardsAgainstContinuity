'use strict'
angular.module('CardsApp.controllers')
.controller('GameController', ['$scope', '$rootScope', '$log', '$mdSidenav', '$mdMedia', '$mdToast', '$stateParams', '$q', '$state', '$mdDialog',
  'socket', 'PlayerService', 'GameService',
  function($scope, $rootScope, $log, $mdSidenav, $mdMedia, $mdToast, $stateParams, $q, $state, $mdDialog, socket, PlayerService, GameService) {
    $scope.$mdMedia = $mdMedia;
    $scope.Game = null;
    $scope.Player = null;
    $scope.Disconnected = false;
    $scope.Hand = [];
    $scope.SelectedAnswers = [];
    $scope.isReady = false;
    $scope.PlayerAnswers = null;
    $scope.selectedWinner = null;

    $scope.lockSideNav = function() { return $mdMedia('gt-md'); };
    $scope.openSideNav = function() { $mdSidenav('left').open(); };
    $scope.closeSideNav = function() { $mdSidenav('left').close(); };
    $scope.smallSideNav = function() { return !$mdMedia('gt-md') && $rootScope.isLandscape };

    $scope.findPlayer = function(id) {
      if (!$scope.Game) return null;
      return $scope.Game.players.find(function(elem) { return String(elem._id) === String(id); });
    };
    $scope.findPlayerIndex = function(id) { return $scope.Game.players.findIndex(function(elem) { return String(elem._id) === String(id); }); };

    ///////////////////////////////////////////////////////////////////////////////////////////
    // Socket events
    ///////////////////////////////////////////////////////////////////////////////////////////
    socket.on('disconnect', function() {
      $scope.Disconnected = true;
      $scope.showToast('Disconnected.');
    });
    socket.on('connect', function() {
      if ($scope.Disconnected) {
        $scope.showToast('Connected');
        $scope.refresh();
      }
    });

    ///////////////////////////////////////////////////////////////////////////////////////////
    // Player events
    ///////////////////////////////////////////////////////////////////////////////////////////
    socket.on('player:connect', function(data) {
      PlayerService.get(data.player)
      .then(function(Player) {
        var player = $scope.findPlayer(Player._id);
        if (player)
          player.connected = true;
        $scope.showToast(Player.name + " connected.");
      }, function(err) {
        $scope.showToast(err.message);
      });
    });

    socket.on('player:disconnect', function(data) {
      var player = $scope.findPlayer(data.player);
      if (player) {
        player.connected = false;
        $scope.showToast(player.name + " disconnected.");
      }
    });

    socket.on('player:join', function(data) {
      $scope.showToast(data.player.name + " joined.");
      $scope.Game.players.push(data.player);
    });

    socket.on('player:leave', function(data) {
      var index = $scope.findPlayerIndex(data.player);
      if (index !== -1) {
        var player = $scope.Game.players[index];
        $scope.showToast(player.name + " left.");
        $scope.refresh();
      }
    });

    socket.on('player:removed', function(data) {
      var index = $scope.findPlayerIndex(data.player);
      if (index !== -1)
        $scope.Game.players.splice(index, 1);
    });

    socket.on('player:rename', function(data) {
      var player = $scope.findPlayer(data._id);
      if (player) {
        $scope.showToast(player.name + " changed their name to " + data.name);
        player.name = data.name;
      }
    });

    socket.on('player:ready', function(data) {
      var player = $scope.findPlayer(data.player);
      if (player) {
        player.ready = data.value;
      }
    });

    ///////////////////////////////////////////////////////////////////////////////////////////
    // Game Events
    ///////////////////////////////////////////////////////////////////////////////////////////
    socket.on('game:winner', function(data) {
      $log.log("Winner: ", data);
      var winner = $scope.findPlayer(data.id);
      var message = "";
      if (winner) {
        message = "Winner: " + winner.name + "<br />";
      }
      
      // Build our output!
      var text = data.question.text;
      var reg = /_+/;
      if (reg.test(text)) {
        for (var i=0;i<data.answers.length;i++) {
          var answer = data.answers[i];
          text = text.replace(reg, "<u>" + answer.text + "</u>");
        }
      } else {
        for (var i=0;i<data.answers.length;i++) {
          text += "<br />" + data.answers[i].text;
        }
      }
      message += text;

      $scope.showAlert(message, 'Winner');
      $scope.PlayerAnswers = null;
      PlayerService.get(data.id)
      .then(function(player) {
        var index = $scope.findPlayerIndex(player._id);
        $scope.Game.players[index] = player;
        return $scope.refresh();
      });
    });

    socket.on('player:admin', function(data) {
      $log.log("Admin: ", data);
      $scope.refresh();
    });



    ///////////////////////////////////////////////////////////////////////////////////////////
    // Helper Functions
    ///////////////////////////////////////////////////////////////////////////////////////////

    $scope.selectCard = function(card) {
      $log.log("Selecting: ", card);
      var index = $scope.SelectedAnswers.findIndex(function(elem) { return String(elem._id) === String(card._id); });
      if (index === -1) {
        $scope.SelectedAnswers.push(card);
        PlayerService.selectanswer(card._id)
        .then(function() {
          $log.log("Success");
        }, function(err) {
          $log.error(err);
        });
      }
    };

    $scope.unselectCard = function(card) {
      var index = $scope.SelectedAnswers.findIndex(function(elem) { return String(elem._id) === String(card._id); });
      if (index !== -1) {
        $scope.SelectedAnswers.splice(index, 1);
      }
      PlayerService.unselectanswer(card._id);
    }

    $scope.canSelectAnswers = function(card) {
      if ($scope.Player.ready) return false;
      var found = $scope.SelectedAnswers.find(function(elem) { return elem._id === card._id});
      if (found) return true;
      return ($scope.SelectedAnswers.length < ($scope.Game ? $scope.Game.expectedanswers : 0));
    };

    $scope.isCardSelected = function(card) { return $scope.SelectedAnswers.findIndex(function(elem) { return String(elem._id) === String(card._id); }) !== -1; };

    $scope.viewAnswers = function() {
      GameService.answers()
      .then(function(answers) {
        $scope.PlayerAnswers = answers;
      }, function(err) {
        $scope.showAlert(err);
      });
    };

    $scope.readyPlayers = function() {
      if ($scope.Game && $scope.Game.players)
        return $scope.Game.players.filter(function(elem) { return elem.ready});
    };

    $scope.selectingPlayers = function() {
      if ($scope.Game && $scope.Game.players)
        return $scope.Game.players.filter(function(elem) { return elem.connected && !elem.administrator; });
    };


    $scope.selectWinner = function(id) { $scope.selectedWinner = id; };
    $scope.confirmWinner = function(id) { GameService.selectwinner(id); };


    $scope.changeName = function(ev) {
      var dialog = $mdDialog.prompt({
        title: 'Change Name',
        textContent: 'Please enter a new name:',
        ariaLabel: 'Change name',
        initialValue: $scope.Player.name,
        targetEvent: ev,
        ok: 'Ok',
        cancel: 'Cancel'
      });
      $mdDialog.show(dialog)
        .then(function(val) {
          PlayerService.rename(val)
          .then(function(name) {
            $scope.Player.name = name;
            var player = $scope.findPlayer($scope.Player._id);
            if (player)
              player.name = name;
          }, function(err) {
            $scope.showAlert(err);
          });
        });
    };

    $scope.getPlayer = function() { return PlayerService.me(); };
    $scope.getGame = function() { return GameService.get({key: $stateParams.key}); };
    $scope.joinGame = function() { return GameService.join({key: $stateParams.key}); };
    $scope.claimAdministrator = function() {
      GameService.claimadmin()
      .then(function(data) {
        $scope.Game.administrator = $scope.Player;
        $scope.Player.administrator = true;
        return GameService.question();
      })
      .then(function(Question) { $scope.Question = Question; })
      .catch(function(err) { $scope.showAlert(err.message ? err.message : err); });
    };

    $scope.resetAdministrator = function() {
      $mdDialog.show($mdDialog.confirm({
        title: 'Reset Administrator',
        textContent: 'Are you sure you wish to reset the Card Administrator?',
        ok: 'Reset',
        cancel: 'Cancel'
      })).then(function(res) {
        if (res) {
          GameService.resetadmin()
          .catch(function(err) { $scope.showAlert(err.message ? err.message : err); });
        }
      })
    };

    $scope.leaveGame = function(ev) {
      $mdDialog.show($mdDialog.confirm({
        title: 'Leave',
        textContent: 'Are you sure?',
        ok: 'Leave',
        cancel: 'Stay'
      })).then(function(res) {
        if (res) {
          GameService.leave()
          .then(function() { $state.go('top.index'); });
        }
      })
    };


    $scope.showAlert = function(message, title) {
      var dialog = $mdDialog.alert({
        clickOutsideToClose: true,
        title: (title ? title : 'Error'),
        template: 
          '<md-dialog aria-label="Alert">' +
          ' <md-dialog-content layout-padding>' + message + '</md-dialog-content>' +
          ' <md-dialog-actions>' + 
          '   <md-button ng-click="closeDialog()" class="md-primary">Ok</md-button>' +
          ' </md-dialog-actions>' +
          '</md-dialog>',
        ariaLabel: 'Alert',
        ok: 'Ok',
        controller: ['$scope', '$mdDialog', function($scope, $mdDialog) {
          $scope.closeDialog = function() { $mdDialog.hide(); };
        }]
      });
      return $mdDialog.show(dialog);
    };


    var currentToast = null;
    $scope.showToast = function(message) {
      if (currentToast) {
        $mdToast.hide(currentToast);
      }
      currentToast = $mdToast.simple().textContent(message).position('bottom right').action('Ok').hideDelay(3000);
      $mdToast.show(currentToast).then(function(res) {
        if (res === 'ok')
          currentToast.hide(currentToast);
      });
    }

    if (!$scope.lockSideNav()) {
      $scope.showToast('Swipe right to view options');
    }

    $scope.getNumber = function(num) { return new Array(num); };


    $scope.$watch('Player.ready', function() {
      if ($scope.Player) {
        var player = $scope.findPlayer($scope.Player._id);
        if (player)
          player.ready = $scope.isReady;
        PlayerService.ready($scope.Player.ready);
      }
    });

    // Handles setup of basic data:
    // Game, Player, Hand
    // Also handles joining the current game if our player is not already,
    // and unreadying our Player if they have refreshed the page / rejoined the game
    $scope.refresh = function() {
      $log.log("Refreshing ...");
      $scope.selectedWinner = null;
      $scope.SelectedAnswers = [];
      $scope.Question = null;
      PlayerService.me()
      .then(function(Player) {
        $log.log("Player: ", Player);
        $scope.Player = Player;
        if (Player.selectedanswers)
          $scope.SelectedAnswers = Player.selectedanswers;
      })
      .then(function() {
        if (!$scope.Player._game) {
          $log.log("Joining game.");
          return GameService.join($stateParams.key);
        }
      })
      .then(function() { return GameService.get($stateParams.key); })
      .then(function(Game) {
        $log.log("Game: ", Game);
        $scope.Game = Game;
      })
      .then(function() { return PlayerService.hand(); })
      .then(function(hand) {
        $scope.Hand = hand;
        $log.log("Hand: ", hand);
        if ($scope.Player.administrator) {
          $log.log("Retrieving question");
          return GameService.question();
        }
      })
      .then(function(question) {
        if (question) {
          $scope.Question = question;
          $log.log("Question: ", question);
        }
      })
      .catch(function(err) { $log.error(err); });
    }
    $scope.refresh();
  }]);