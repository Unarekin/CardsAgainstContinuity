'use strict'
angular.module('CardsApp.controllers')
.controller('JoinGameController', ['$scope', '$mdDialog', '$log', '$state', 'socket', 'PlayerService',
  function($scope, $mdDialog, $log, $state, socket, PlayerService) {
    $scope.lastGame = null;

    PlayerService.me()
    .then(function(Player) { $scope.lastGame = Player._game; });

    $scope.rejoinGame = function() { $state.go('top.game', {key: $scope.lastGame.key}); };

    $scope.joinGame = function(ev) {
      $mdDialog.show(
        $mdDialog.prompt()
        .title('Game Key')
        .textContent('Please enter a game key')
        .ariaLabel('Game Key')
        .targetEvent(ev)
        .ok('Join')
        .cancel('Cancel')
      ).then(function(key) {
        socket.emit('game:join', {key: key}, function(res) {
          if (res.status === 'ok') {
            $state.go('top.game', {key: key});
          } else {
            $mdDialog.show(
              $mdDialog.alert()
              .title('Error')
              .textContent(res.message)
              .ariaLabel('Error')
              .ok('Ok')
            );
          }
        });
      }, function(err) {
        $log.error(err);
      });
    }
  }]);