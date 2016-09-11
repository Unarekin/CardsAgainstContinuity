'use strict'
angular.module('CardsApp.controllers')
.controller('NewGameController', ['$scope', '$mdDialog', '$state', 'socket',
  function($scope, $mdDialog, $state, socket) {
    $scope.newGame = function() {
      socket.emit('game:create', {}, function(res) {
        if (res.status === 'ok') {
          $state.go('top.game', {key: res.key});
        } else {
          $mdDialog.show(
            $mdDialog.alert()
            .title('Error')
            .textContent('An error occurred: ' + res.message)
            .ariaLabel('Error')
            .ok('Ok')
          );
        }
      })
    };
  }]);