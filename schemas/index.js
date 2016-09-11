'use strict'
var fs = require('fs');
var path = require('path');
var mongoose = require('mongoose');
var EventEmitter = require('events');

fs.readdirSync(__dirname).forEach(function(file) {
  var fullPath = path.join(__dirname, file);
  if (fullPath !== __filename) {
    var modelName = path.basename(file, path.extname(file));
    var schema = require(fullPath);


    // Attach event emitter
    var emitter = new EventEmitter();

    // Wire up to the emitter
    schema.statics.on = function(event, callback) { emitter.on(event, callback); };
    schema.statics.off = function(event, callback) { emitter.off(event, callback); };
    schema.statics.once = function(event, callback) { emitter.once(event, callback); };

    // Set up our emits
    schema.pre('save', function(next) {
      this.wasNew = this.isNew;
      this.wasModified = this.isModified;
      next();
    });

    schema.post('save', function(doc) {
      if (doc.wasNew) {
        emitter.emit('create', doc);
      } else {
        emitter.emit('update', doc);
      }
      delete doc.wasNew;
      delete doc.wasModified;
    });

    schema.post('update', function() {
      if (this.wasNew) {
        emitter.emit('create', this);
      } else {
        emitter.emit('update', this);
      }
      delete this.wasNew;
      delete this.wasModified;
    });

    schema.post('remove', function(doc) {
      emitter.emit('delete', doc);
    });


    var model = mongoose.model(modelName, schema);
    module.exports[modelName] = model;
  }
});