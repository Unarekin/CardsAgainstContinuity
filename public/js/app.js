'use strict'

var dependencies = [
  'ngMaterial',
  'ngResource',
  'ngSanitize',
  'ui.router',
  'CardsApp.controllers',
  'CardsApp.services',
  'CardsApp.filters',
  'CardsApp.directives'
];
angular.module('CardsApp', dependencies)
.config(['$stateProvider', '$urlRouterProvider', '$mdThemingProvider',
  function($stateProvider, $urlRouterProvider, $mdThemingProvider) {

    $mdThemingProvider.theme('dark', 'default').dark();

    $urlRouterProvider.otherwise('/');
    $stateProvider
      .state('top', {
        abstract: true,
        controller: 'ApplicationController',
        template: '<ui-view flex layout-fill></ui-view>'
      })
      .state('top.index', {
        url: '/',
        templateUrl: 'partials/index'
      })
      .state('top.game', {
        url: '/game/:key',
        templateUrl: 'partials/game',
        controller: 'GameController'
      })
      ;
  }])
.run(['$rootScope', '$log',
  function($rootScope, $log) {
  
    $rootScope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams, options) {
      $log.log("Changed to state: ", toState.name);
    });
}])
;