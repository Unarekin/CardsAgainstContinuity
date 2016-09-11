'use strict'
angular.module('CardsApp.directives')
.directive('card',
  [function() {
    return {
      restrict: 'E',
      scope: {
        'card': '=',
        'type': '@',
        'canSelect': '&',
        'onSelect': '&',
        'onUnselect': '&',
        'showSelection': '=',
        'isSelected': '&'
      },
      templateUrl: '/partials/card',
      controller: ['$scope', '$log', function($scope, $log) {
        $scope.selected = ($scope.isSelected({card: $scope.card}));
        $scope.isDisabled = function() {
          var val = $scope.canSelect({card: $scope.card});
          return !val;
        };

        $scope.$watch('selected', function() {
          if ($scope.selected)
            $scope.onSelect({card: $scope.card});
          else
            $scope.onUnselect({card: $scope.card});
        });
      }]
    }
  }]);