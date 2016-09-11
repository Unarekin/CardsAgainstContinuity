'use strict'
'use strict'
angular.module('CardsApp.services')
.service('PlayerService', ['$log', '$q', 'socket',
  function($log, $q, socket) {
    return {
      get: function(id) {
        var deferred = $q.defer();
        socket.emit('player:get', {_id: id}, function(res) {
          if (res.status === 'ok')
            deferred.resolve(res.player);
          else
            deferred.reject(res.message);
        });
        return deferred.promise;
      },
      me: function() {
        var deferred = $q.defer();
        socket.emit('player:me', {}, function(res) {
          if (res.status === 'ok')
            deferred.resolve(res.player);
          else
            deferred.reject(res.message);
        });
        return deferred.promise;
      },
      hand: function() {
        var deferred = $q.defer();
        socket.emit('player:hand', {}, function(res) {
          if (res.status === 'ok')
            deferred.resolve(res.hand);
          else
            deferred.reject(res.message);
        });
        return deferred.promise;
      },
      ready: function(value) {
        var deferred = $q.defer();
        socket.emit('player:ready', {value: value}, function(res) {
          if (res.status === 'ok')
            deferred.resolve();
          else
            deferred.reject(res.message);
        });
        return deferred.promise;
      },
      selectanswer: function(id) {
        var deferred = $q.defer();
        socket.emit('player:selectanswer', {card: id}, function(res) {
          if (res.status === 'ok')
            deferred.resolve();
          else
            deferred.reject(res.message);
        });
        return deferred.promise;
      },
      unselectanswer: function(id) {
        var deferred = $q.defer();
        socket.emit('player:unselectanswer', {card: id}, function(res) {
          if (res.status === 'ok')
            deferred.resolve();
          else
            deferred.reject(res.message);
        });
        return deferred.promise;
      },
      rename: function(name) {
        var deferred = $q.defer();
        socket.emit('player:rename', {name: name}, function(res) {
          if (res.status === 'ok')
            deferred.resolve(res.name);
          else
            deferred.reject(res.message);
        });
        return deferred.promise;
      }
    }
  }]);