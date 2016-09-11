'use strict'
var fs = require('fs');
var path = require('path');
var EventEmitter = require('events');

module.exports = function(app) {
  var listener = {};
  fs.readdirSync(__dirname).forEach(function(file) {
    var fullPath = path.join(__dirname, file);
    if (fullPath !== __filename) {
      var configName = path.basename(file, path.extname(file)).toLowerCase();
      var config = require(fullPath)(app);
      listener[configName] = config;
    }
  });
  return listener;
}