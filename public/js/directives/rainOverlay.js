'use strict'
angular.module('CardsApp.directives')
.directive('rainOverlay', ['$window', '$timeout', '$interval', '$log', function($window, $timeout, $interval, $log) {
  return {
    restrict: 'E',
    template: '<canvas></canvas>',
    link: function(scope, elem, attribs) {
      var particles = [];
      var canvas = null;
      var context = null;
      var drawInterval = null;
      var numParticles = 1000;

      var getCanvas = function() {
        if (canvas)
          return canvas;
        else
          return angular.element(elem).find('canvas')[0];
      };

      var getContext = function() {
        if (context) {
          return context;
        } else {
          var canvas = getCanvas();
          if (canvas)
            return canvas.getContext('2d');
          else
            throw new Error("No context.");
        }
      };

      var init = function(count, width, height) {
        if (!count)
          count = 1000;

        particles = [];
        numParticles = count;

        for (var i=0;i<count;i++) {
          particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            l: Math.random() * 1,
            xs: -4 + Math.random() * 4 + 2,
            ys: Math.random() * 10 + 10
          });
        }
      };

      var resize = function() {
        var canvas = getCanvas();
        var element = elem[0];
        if (canvas && element) {
          canvas.width = element.clientWidth;
          canvas.height = element.clientHeight;
        }
        if (canvas.width && canvas.height)
          numParticles = Math.floor((canvas.width * canvas.height) / 150);
      };

      var fps = 0;
      var lastRun = null;

      var draw = function() {
        resize();
        var ctx = getContext();
        var canvas = getCanvas();

        if (canvas.width === 0 || canvas.height === 0)
          return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'rgba(174, 194, 224, 0.5)';
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';
        ctx.beginPath();
        var drawn = 0;
        particles.forEach(function(p) {
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.l * p.xs, p.y + p.l * p.ys);
          drawn++;
        });
        ctx.stroke();
        if (!lastRun) {
          lastRun = new Date().getTime();
        } else {
          var delta = (new Date().getTime() - lastRun) / 1000;
          lastRun = new Date().getTime();
          fps = 1/delta;
          /*
          ctx.fillStyle = "white";
          ctx.font = "normal 10px Arial";
          var txt = particles.length + " particles, " + Math.floor(fps) + "fps";
          var measure = ctx.measureText(txt);
          ctx.fillText(txt, canvas.width - measure.width - 5, canvas.height - 10);
          /**/
        }
      }

      var move = function() {
        var canvas = getCanvas();
        var toBeRemoved = [];

        if (canvas.width === 0 || canvas.height === 0)
          return;

        for (var i=0; i < particles.length; i++) {
          var p = particles[i];
          p.x += p.xs;
          p.y += p.ys;
          if (p.x > canvas.width || p.y >  canvas.height) {
            if (i >= numParticles) {
              // Too many particles, remove this one!
              toBeRemoved.push(p);
            } else {
              p.x = Math.random() * canvas.width;
              p.y = -(Math.random() * 20);
            }
          }
        }

        // Add more.
        if (particles.length < numParticles) {
          var needMore = numParticles - particles.length;
          for (var i=0;i<needMore;i++) {
            particles.push({
              x: Math.random() * canvas.width,
              y: -(Math.random() * 20),
              xs: -4 + Math.random() * 4 + 2,
              ys: Math.random() * 10 + 10
            });
          }
        } else if (particles.length > numParticles) {
          var numRemoved = particles.length - numParticles;
          for (var i=0;i<numRemoved;i++) {
            var p = toBeRemoved[i];
            var index = particles.indexOf(p);
            if (index !== -1)
              particles.splice(index, 1);
          }
        }
      };

      init(1000, elem[0].clientWidth, elem[0].clientHeight);
      var loop = function() {
        move();
        draw();
        $timeout(loop, (1000 / 30));
      };

      $timeout(resize);
      //loop();
      $interval(function() {
        move();
        draw();
      }, (1000 / 30));
      angular.element(elem).bind('resize', resize);
      angular.element($window).bind('orientationchange', resize);
    }
  }
}]);