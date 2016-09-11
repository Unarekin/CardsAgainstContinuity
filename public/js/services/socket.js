'use strict'
angular.module('CardsApp.services')
.service('socket', ['$rootScope', '$log',
  function($rootScope, $log) {
    var socket = io.connect();

    var onevent = socket.onevent;
    socket.onevent = function(packet) {
      var args = packet.data || [];
      onevent.call(this, packet);
      packet.data = ["*"].concat(args);
      onevent.call(this, packet);
    };
    
    //socket.on('*', function(event, data) { $log.log(event + " event: ", data); });
    return {
      on: function(eventName, callback) {
        socket.on(eventName, function() {
          var args = arguments;
          $rootScope.$apply(function() {
            callback.apply(socket, args);
          });
        });
      },
      emit: function(eventName, data, callback) {
        socket.emit(eventName, data, function() {
          var args = arguments;
          $rootScope.$apply(function() {
            if (callback)
              callback.apply(socket, args);
          });
        });
      }
    }
  }]);