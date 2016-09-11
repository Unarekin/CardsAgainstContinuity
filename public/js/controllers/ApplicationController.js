'use strict'
angular.module('CardsApp.controllers')
.controller('ApplicationController', ['$scope', '$window', '$document', '$rootScope',
  function($scope, $window, $document, $rootScope) {
    $rootScope.isLandscape = ($window.innerWidth > $window.innerHeight);
    $scope.onResize = function() {
      $scope.$apply(function() {
        $rootScope.isLandscape = ($window.innerWidth > $window.innerHeight);
      });
    }

    angular.element($window).bind('resize', $scope.onResize);
    angular.element($window).bind('orientationchange', $scope.onResize);
}]);