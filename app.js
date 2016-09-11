'use strict'
///////////////////////////////////////////////////////////////////////
//  Includes
///////////////////////////////////////////////////////////////////////
const express       = require('express'),
      path          = require('path'),
      favicon       = require('serve-favicon'),
      logger        = require('morgan'),
      cookieParser  = require('cookie-parser'),
      bodyParser    = require('body-parser'),
      session       = require('express-session'),
      sharedsession = require('express-socket.io-session'),
      mongostore    = require('connect-mongo')(session),
      mongoose      = require('mongoose'),
      walk          = require('walkdir'),
      q             = require('q')
      ;
var routes = require('./routes/index');
var users = require('./routes/users');

///////////////////////////////////////////////////////////////////////
//  Setup
///////////////////////////////////////////////////////////////////////
var app = express();
app.set('port', 3000);
mongoose.Promise = require('q').Promise;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.schemas = require('./schemas');

app.sessionStore = new mongostore({url: 'mongodb://localhost/cardsagainstcontinuity'});
app.session = session({
  key: 'connect.sid',
  secret: 'tx3E&o3{yR@*3Nq3Typu%NHmpc1FT5',
  resave: true,
  saveUninitialized: true,
  store: app.sessionStore
});
app.use(app.session);

var httpServer = require('http').Server(app);
app.io = require('socket.io')(httpServer);
app.io.use(require('socketio-wildcard')());
app.io.use(sharedsession(app.session));
app.socketrouter = require('./sockets')(app);

// Dev setup
if (app.get('env') === 'development') {
  app.locals.pretty = true;
}

///////////////////////////////////////////////////////////////////////
//  DB
///////////////////////////////////////////////////////////////////////
app.db = {
  getRecords: function(collection, criteria, populate, skip) {
    var deferred = q.defer();
    var collObj = null;
    if (typeof collection === 'object')
      collObj = collection;
    else if (typeof collection === 'string')
      collObj = app.schemas[collection];

    if (collObj) {
      var query = collObj.find(criteria);
      if (populate && typeof populate === 'string')
        query = query.populate(populate);
      else if (populate && Array.isArray(populate))
        query = query.populate(populate.join(' '));
      if (skip)
        query = query.skip(skip);
      query.exec(function(err, data) {
        if (err)
          deferred.reject(err);
        else
          deferred.resolve(data);
      })
    } else {
      deferred.reject(new Error("Invalid collection: " + collection.toString()));
    }
    return deferred.promise;
  },
  getRecord: function(collection, criteria, populate, skip) {
    var deferred = q.defer();
    var collObj = null;
    if (typeof collection === 'object')
      collObj = collection;
    else if (typeof collection === 'string')
      collObj = app.schemas[collection];

    if (collObj) {
      var query =collObj.findOne(criteria);
      if (populate && typeof populate === 'string')
        query = query.populate(populate);
      else if (populate && Array.isArray(populate))
        query = query.populate(populate.join(' '));
      if (skip)
        query = query.skip(skip);
      query.exec(function(err, data) {
        if (err)
          deferred.reject(err);
        else
          deferred.resolve(data);
      })
    } else {
      deferred.reject(new Error("Invalid collection: " + collection.toString()));
    }
    return deferred.promise;
  },
  saveRecord: function(record) {
    var deferred = q.defer();
    record.save(function(err) {
      if (err)
        deferred.reject(err);
      else
        deferred.resolve(record);
    });
    return deferred.promise;
  },
  getRecordById: function(collection, id, populate) {
    var deferred = q.defer();
    var collObj = null;
    if (typeof collection === 'object')
      collObj = collection;
    else if (typeof collection === 'string')
      collObj = app.schemas[collection];

    if (collObj) {
      var query =collObj.findById(id);
      if (populate && typeof populate === 'string')
        query = query.populate(populate);
      else if (populate && Array.isArray(populate))
        query = query.populate(populate.join(' '));

      query.exec(function(err, data) {
        if (err)
          deferred.reject(err);
        else
          deferred.resolve(data);
      })
    } else {
      deferred.reject(new Error("Invalid collection: " + collection.toString()));
    }
    return deferred.promise;
  }
}

///////////////////////////////////////////////////////////////////////
//  Functions
///////////////////////////////////////////////////////////////////////
app.functions = {
  getAdministrator: function(game_id) {
    return app.db.getRecord('Player', {_game: game_id, administrator: true});
  },
  shallowGame: function(Game) {
    if (!Game)
      return null;
    return {
      _id: Game._id,
      lastactivity: new Date(Game.lastactivity),
      key: Game.key,
      players: [],
      administrator: null,
      expectedanswers: (Game.currentquestion ? Game.currentquestion.answers : 0)
    };
  },
  shallowPlayer: function(Player) {
    if (!Player)
      return null;
    return {
      _id: Player._id,
      name: Player.name,
      ready: Player.ready,
      points: Player.points,
      administrator: Player.administrator,
      lastactivity: new Date(Player.lastactivity),
      connected: Player.connected
    };
  },
  shallowCard: function(Card) {
    if (!Card)
      return null;
    if (Card.answers)
      return app.functions.shallowQuestion(Card);
    else
      return app.functions.shallowAnswer(Card);
  },
  shallowQuestion: function(Card) {
    if (!Card)
      return null;
    return {
      _id: Card._id,
      _expansion: Card._expansion,
      text: Card.text,
      answers: Card.answers
    };
  },
  shallowAnswer: function(Card) {
    if (!Card)
      return null;
    return {
      _id: Card._id,
      _expansion: Card._expansion,
      text: Card.text
    };
  }
};

///////////////////////////////////////////////////////////////////////
// Middleware
///////////////////////////////////////////////////////////////////////
app.use('/lib', express.static(path.join(__dirname, './bower_components')));
app.use(function(req, res, next) {
  res.io = app.io;
  next();
});

// Ensure we have a player object.
// Does one already exist in our session?
app.use(function(req, res, next) {
  if (req.session.player) {
    app.db.getRecordById('Player', req.session.player)
    .then(function(Player) {
      if (Player)
        req.Player = Player;
      else
        req.session.player = null;
      next();
    });
  } else {
    next();
  }
});
// One does not exist, create.
app.use(function(req, res, next) {
  if (!req.Player) {
    var Player = new app.schemas.Player({name: 'New Player'});
    Player.save(function(err) {
      if (err) {
        next(err);
      } else {
        req.Player = Player;
        req.session.player = Player._id;
        next();
      }
    }, function(err) { next(err); });
  } else {
    next();
  }
});

// Populate a game
app.use(function(req, res, next) {
  if (req.Player && req.Player._game) {
    app.db.getRecordById('Game', req.Player._game)
    .then(function(Game) {
      if (Game) {
        req.Game = Game;
      } else {
        req.Player._game = null;
        req.Player.save(function(err) {
          if (err)
            next(err);
          else
            next();
        });
      }
      next();
    }, function(err) { next(err); });
  } else {
    next();
  }
});


// At this point, req.Player and req.Game should both be populated
// reliably.  req.Player will always be a value.  req.Game will be
// a value if the player is a member of an active game.

///////////////////////////////////////////////////////////////////////
// Routes
///////////////////////////////////////////////////////////////////////

app.route('/partials/*?')
.get(function(req, res) {
  res.render('partials/' + req.params[0]);
});

app.route('*')
.get(function(req, res) {
  var scripts = [];
  walk.sync('./public/js', function(dir, stat) {
    if (stat.isFile() && path.extname(dir) === '.js')
      scripts.push('/' + path.relative(__dirname + '/public/', dir));
  });
  res.render('index', {scripts: scripts});
})

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


///////////////////////////////////////////////////////////////////////
//  Sockets
///////////////////////////////////////////////////////////////////////

function setupSocket(socket) {
  var deferred = q.defer();

  if (socket.handshake.session && socket.handshake.session.player) {
    app.db.getRecordById('Player', socket.handshake.session.player, 'answers selectedanswers')
    .then(function(Player) {
      if (Player) {
        socket.Player = Player;
        if (Player._game)
          return app.db.getRecordById('Game', Player._game, 'currentquestion');
      }
    })
    .then(function(Game) {
      if (Game) {
        socket.Game = Game;
        if (socket.Player)
          socket.Player._game = Game;
      }
      deferred.resolve();
    })
    .catch(function(err) { deferred.reject(err); });
  }

  return deferred.promise;
}


app.io.on('connection', function(socket) {
  setupSocket(socket)
  .then(function() {
    if (socket.Game && socket.Player) {
      app.io.to(socket.Game._id).emit('player:connect', {player: socket.Player._id});
      socket.join(socket.Game._id);
    }
    if (socket.Player) {
      socket.Player.connected = true;
      socket.Player.save(function() {});
    }
  });

  socket.on('disconnect', function() {
    console.log("Socket disconnected.");
    if (socket.Game)
      app.io.to(socket.Game._id).emit('player:disconnect', {player: socket.Player._id});
    if (socket.Player) {
      socket.Player.connected = false;
      socket.Player.disconnected = new Date();
      socket.Player.save(function() {});
    }
  });

  socket.on('*', function(arg) {
    setupSocket(socket)
    .then(function() {
      var route = arg.data[0];
      var data = arg.data[1];
      var callback = arg.data[2];
      var split = route.split(':');
      if (split.length === 2) {
        var channel = split[0];
        var action = split[1];
        //console.log("Socket request from player " + socket.Player._id + ": " + channel + ":" + action + "; ", data);
        if (app.socketrouter && app.socketrouter[channel] && app.socketrouter[channel][action] && typeof app.socketrouter[channel][action] === 'function') {
          var res = app.socketrouter[channel][action](socket, data, callback);
          if (res && res.then && typeof res.then === 'function') {
            res.then(function(data) {
              callback(data);
            });
          }
        } else {
          console.error("Unknown socket route: " + route);
        }
      }
    });
  });
});

//module.exports = app;


///////////////////////////////////////////////////////////////////////
// Start Server
///////////////////////////////////////////////////////////////////////
httpServer.on('listening', function() {
  console.log("Server listening on port " + app.get('port'));
});

mongoose.connection.on('error', function(err) {
  console.error(err);
  if (err.stack)
    console.error(err.stack);
});

mongoose.connection.on('open', function() {
  console.log("Connected to Mongo.");
});

mongoose.connection.on('disconnect', function() {
  console.log("Disconnected from Mongo.");
});

mongoose.connect('localhost', 'cardsagainstcontinuity', function() {
  httpServer.listen(app.get('port'));
});


///////////////////////////////////////////////////////////////////////
// Cleanup daemon
///////////////////////////////////////////////////////////////////////
setInterval(function() {
  removeIdlePlayers()
  .then(removeEmptyGames);
}, 60000);


function removeEmptyGames() {
  var deferred = q.defer();
  var toRemove = [];
  app.schemas.Game.find({})
  .cursor()
  .eachAsync(function(Game) {
    return checkEmptyGame(Game._id)
            .then(function(empty) {
              if (empty)
                toRemove.push(Game._id);
            });
  }, function() {
    if (toRemove.length > 0) {
      console.log("Removing " + toRemove.length + " empty game(s).");
      app.schemas.Game.remove({_id: {$in: toRemove}})
      .exec(function(err) {
        if (err)
          deferred.reject(err);
        else
          deferred.resolve();
      });
    }
  });
  return deferred.promise;
}

function checkEmptyGame(id) {
  var deferred = q.defer();
  app.schemas.Player.find({connected: true, _game: id})
  .count(function(err, Count) {
    if (err) {
      deferred.reject(err);
    } else {
      deferred.resolve(Count === 0);
    }
  });
  return deferred.promise;
}

function removeIdlePlayers() {
  var deferred = q.defer();
  var toRemove = [];
  console.log("Looking for idle players ...");
  app.schemas.Player.find({connected: false})
  .cursor({batchSize: 100})
  .eachAsync(function(Player) {
    var idleTime = ((new Date().getTime() - new Date(Player.disconnected).getTime()) / 60000);
    if (idleTime >= 10) {
      toRemove.push(Player._id);
      if (Player._game) {
        app.io.to(Player._game).emit('player:removed', {player: Player._id});
        return app.db.getRecordById('Player', Player._game)
                .then(function(Game) {
                  Game.discards.answers = Game.discards.answers.concat(Player.answers);
                  if (Player.administrator) {
                    Game.discards.questions.push(Game.currentquestion);
                    Game.currentquestion = null;
                  }
                  return Game.save();
                });
      }
    }
  }, function() {
    if (toRemove.length > 0) {
      console.log("Removing " + toRemove.length + " idle player(s).");
      app.schemas.Player.remove({_id: {$in: toRemove}})
      .exec(function(err) {
        if (err)
          deferred.reject(err);
        else
          deferred.resolve();
      });
    }
  });
  return deferred.promise;
}