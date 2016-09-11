'use strict'
'use strict'
angular.module('CardsApp.services')
.service('GameService', ['$log', '$q', 'socket',
  function($log, $q, socket) {
    return {
      selectwinner: function(id) {
        var deferred = $q.defer();
        socket.emit('game:winner', {id: id}, function(res) {
          if (res.status === 'ok')
            deferred.resolve();
          else
            deferred.reject(res.message);
        });
        return deferred.promise;
      },
      answers: function() {
        var deferred = $q.defer();
        socket.emit('game:answers', {}, function(res) {
          if (res.status === 'ok')
            deferred.resolve(res.answers);
          else
            deferred.reject(err);
        });
        return deferred.promise;
      },
      question: function() {
        var deferred = $q.defer();
        socket.emit('game:question', {}, function(res) {
          if (res.status === 'ok')
            deferred.resolve(res.question);
          else
            deferred.reject(res.message);
        });
        return deferred.promise;
      },
      create: function() {
        var deferred = $q.defer();
        socket.emit('game:create', {}, function(res) {
          if (res.status === 'ok')
            deferred.resolve(res.key);
          else
            deferred.reject(res.message);
        });
        return deferred.promise;
      },
      get: function(key) {
        var deferred = $q.defer();
        socket.emit('game:get', {key: key}, function(res) {
          if (res.status === 'ok')
            deferred.resolve(res.game);
          else
            deferred.reject(res.message);
        });
        return deferred.promise;
      },
      leave: function() {
        var deferred = $q.defer();
        socket.emit('game:leave', {}, function(res) {
          if (res.status == 'ok')
            deferred.resolve();
          else
            deferred.reject(res.message);
        });
        return deferred.promise;
      },
      join: function(key) {
        var deferred = $q.defer();
        socket.emit('game:join', {key: key}, function(res) {
          if (res.status === 'ok')
            deferred.resolve();
          else
            deferred.reject(res.message);
        });
        return deferred.promise;
      },
      claimadmin: function() {
        var deferred = $q.defer();
        socket.emit('game:adminclaim', {}, function(res) {
          $log.log("Adminclaim: ", res);
          if (res.status === 'ok')
            deferred.resolve(res.question);
          else
            deferred.reject(res.message);
        });
        return deferred.promise;
      },
      resetadmin: function() {
        var deferred = $q.defer();
        socket.emit('game:adminreset', {}, function(res) {
          if (res.status === 'ok')
            deferred.resolve();
          else
            deferred.reject(res.message);
        });
        return deferred.promise;
      }
    }
  }]);