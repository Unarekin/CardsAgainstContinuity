var config = require('./config');
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var filestore = require('session-file-store')(session);

var fs = require('fs');
var path = require('path');

var sharedsession = require("express-socket.io-session");
var flash = require('connect-flash');

var bodyParser = require('body-parser');
var crontab = require("node-crontab");

var promise = require('promise');


var app = express();


// Set up game DB
//var GameDB = require('./game');
var GameManager = require('./models/GameManager');
app.GameManager = new GameManager();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.set('env', 'development');

// uncomment after placing your favicon in /public
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));


//////////////////////////////////////////////////////////
//  Session
//////////////////////////////////////////////////////////
var SessionStore = new filestore({ path: __dirname + '/sessions' });
var SessionMiddleware = session({
    store: SessionStore,
    secret: 'tx3E&o3{yR@*3Nq3Typu%NHmpc1FT5',
    resave: true,
    saveUninitialized: true
});
app.SessionStore = SessionStore;
app.use(SessionMiddleware);

console.log("[" + "Session".green + "] Removing old sessions ...");

(function () {
    try { var files = fs.readdirSync(__dirname + '/sessions'); }
    catch (e) { return; }
    if (files.length > 0) {
        for (var i = 0; i < files.length; i++) {
            var filePath = __dirname + '/sessions/' + files[i];
            if (fs.statSync(filePath).isFile())
                fs.unlinkSync(filePath);
        }
    }
})();

//////////////////////////////////////////////////////////
//  Authentication
//////////////////////////////////////////////////////////

var Users = require('./models/Users.json');
/*
 * Authenticate
 * @param {string} username
 * @param {string} password
 * @return If successful, the ID of the user authenticated.  Otherwise, returns false.
 */
function Authenticate(req, res) {
    var username = req.body.Username;
    var password = req.body.Password;

    console.log("[" + "Auth".green + "] Attempting to authenticate " + username + " ...");
    for (var i = 0; i < Users.length; i++) {
        var User = Users[i];
        if (User.username.toLowerCase() == username.toLowerCase()) {
            if (User.password == password) {
                console.log("[" + "Auth".green + "] Success");
                req.session.UserID = User.id;
                req.session.save();
                return true;
            } else {
                console.log("[" + "Auth".red + "] Failure.  Invalid password.");
                return false;
            }
        }
    }
    console.log("[" + "Auth".red + "] Failure.  Invalid username.");
    return false;
}

function IsAuthenticated(req) {
    console.log("IsAuthenticated");
    console.log("   UserID: " + req.session.UserID);
    if (req.session.UserID != undefined) {
        var User = DeserializeUser(req.session.UserID);
        console.log("   Deserialized: " + typeof (User));
        return (User != null);
    }
    return false;
}

function SerializeUser(user) {
    return user.id;
}

function DeserializeUser(id) {
    for (var i = 0; i < Users.length; i++) {
        var User = Users[i];
        if (User.id == id)
            return User;
    }
    return null;
}

/*

function IsLoggedIn(req, res, next) {
    if (req.isAuthenticated())
        next();
    else
        res.redirect('/admin/login');
}


var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var Users = require('./models/Users.json');
passport.use(new LocalStrategy({
    usernameField: 'Username',
    passwordField: 'Password'
}, function (username, password, callback) {
    //console.log(arguments);
    //console.log("Attempting to authenticate " + username + " ...");
    for (var i = 0; i < Users.length; i++) {
        var User = Users[i];
        if (User.username.toLowerCase() == username.toLowerCase()) {
            // User found
            if (User.password == password) {
                // Match!
                return callback(null, User);
            } else {
                return callback(null, false, { message: 'Invalid password' });
            }
        }
    }
    return callback(null, false, { message: 'Invalid username' });
}));

passport.serializeUser(function (user, callback) {
    callback(null, user.id);
});

passport.deserializeUser(function (id, callback) {
    for (var i = 0; i < Users.length; i++) {
        var User = Users[i];
        if (User.id == id)
            callback(null, User);
    }
    callback(new Error('User ' + id + ' does not exist.'));
});

app.use(passport.initialize());
app.use(passport.session());
/**/
app.use(flash());
//////////////////////////////////////////////////////////
//  Maintenance cron
//////////////////////////////////////////////////////////
var ExpirationJobID = crontab.scheduleJob("0 * * * *", function () {
    console.log("[" + "CRON".green + "] Checking for inactive games ...");
    app.GameManager.ExpireOldGames(config.GameTTL);
});
console.log("[" + "CRON".green + "] Beginning expiration cron with ID " + ExpirationJobID);


//////////////////////////////////////////////////////////
//  Routes
//////////////////////////////////////////////////////////
var router = express.Router();
/* GET home page. */
router.get('/', function (req, res) {
    var Game = null;
    console.log("Player ID:" + req.session.PlayerID);
    if (req.session.PlayerID)
        Game = app.GameManager.GetGameForPlayer(req.session.PlayerID);
    
    if (Game != null) {
        console.log("Game ID: " + Game.GameID);
        res.render('index', { title: 'Cards Against Continuity', GameID: Game.GameID });
    } else {
        res.render('index', { title: 'Cards Against Continuity' });
    }
   
});

//////////////////////////////////////////////////////////
//  API routes
//////////////////////////////////////////////////////////

router.get('/api/new', function (req, res) {
    var NewGame = app.GameManager.CreateGame();
    res.json({ status: 200, gameid: NewGame.GameID });
});

router.get("/game/:id", function (req, res) {
    //res.send("Game: " + req.params.id);
    res.render('game', { title: 'Cards Against Continuity', GameID: req.params.id });
});

router.get('/api/cards', function (req, res) {
    var files = fs.readdirSync(config.DeckPath);
    
    var CardSets = {};
    
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        var fullpath = path.resolve(path.join(config.DeckPath, file));
        var stat = fs.statSync(fullpath);
        if (stat.isFile()) {
            var CardFile = require(fullpath);
            for (var j = 0; j < CardFile.length; j++) {
                var Card = CardFile[j];
                if (!CardSets.hasOwnProperty(Card.expansion))
                    CardSets[Card.expansion] = [];
                
                CardSets[Card.expansion].push(Card);
            }
        }
    }
    
    res.json({ status: 200, cards: CardSets });
});

router.get('/api/games', function (req, res) {
    var GameJSON = {};
    for (var GameID in app.GameManager.Games) {
        var Game = app.GameManager.Games[GameID];
        
        var GameRep = {
            GameID: GameID,
            LastActivity: Game.LastActivity,
            IdleTime: ((new Date() - Game.LastActivity) / 1000),
            Players: []
        };
        
        var players = Game.GetPlayers();
        for (var PlayerID in players) {
            var Player = players[PlayerID];
            var PlayerRep = {
                PlayerID: PlayerID,
                Connected: Player.Socket.connected
            };
            
            GameRep.Players.push(PlayerRep);
        }
        
        GameJSON[GameID] = GameRep;
    }
    res.json({ status: 200, games: GameJSON });
});

router.get('/api/game/:id/delete', function (req, res) {
    var GameID = req.params.id;
    var Game = app.GameManager.GetGame(GameID);
    if (Game != null) {
        Game.Expire();
        res.json({ status: 200, message: 'ok' });
    } else {
        res.json({ status: 500, message: 'Invalid game ID' });
    }

});

router.get('/api/answers/:id', function (req, res) {
    var GameID = req.params.id;
    var CurrentGame = app.GameManager.GetGame(GameID);
    res.json(CurrentGame.CurrentAnswers);
});

router.get('/api/exists/:id', function (req, res) {
    var GameID = req.params.id;
    var Data = {
        Status: "error",
        Message: "Invalid game ID."
    };
    
    if (app.GameManager.GameExists(GameID)) {
        Data.Status = "ok";
        Data.Message = "";
    }
    
    res.json(Data);

});

//////////////////////////////////////////////////////////
//  Backend routes
//////////////////////////////////////////////////////////
/*
router.post('/admin/login',
    passport.authenticate('local', {
    successRedirect: '/admin',
    failureRedirect: '/admin/login',
    failureFlash: true
}),
    function (req, res) {
    if (!req.isAuthenticated()) {
        var message = null;
        if (req.flash('error'))
            message = req.flash('error');
        res.render('Backend/login', { title: 'Cards Against Continuity', message: error });
    }
});
/**/
router.post('/admin/login', function (req, res) {
    if (Authenticate(req, res)) {
        res.redirect('/admin');
    } else {
        req.flash('error', 'Invalid username or password.');
        res.redirect('/admin/login');
    }
});

//router.post('/admin/login', passport.authenticate('local'), function (req, res) {
//    console.log("Logged in successfully");
//    res.redirect('/admin');
//});

router.get('/admin/login', function (req, res) {
    //res.render('game', { title: 'Cards Against Continuity', GameID: req.params.id });
    
    var message = null;
    if (req.flash('error'))
        res.render('Backend/login', { title: 'Cards Against Continuity', message: req.flash('error') });
    else
        res.render('Backend/login', { title: 'Cards Against Continuity' });

});

router.get('/admin', function (req, res) {
    var auth = IsAuthenticated(req);
    console.log("[" + "Auth".green + "] Checking authentication: " + auth);
    if (IsAuthenticated(req))
        res.render('Backend/index', { title: 'Cards Against Continuity' , user: Users[req.session.UserID] });
    else
        res.redirect('/admin/login');
});

app.use(router);

//////////////////////////////////////////////////////////

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
//if (app.get('env') === 'development') {
app.locals.pretty = true;
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: err
    });
});
//}

// production error handler
// no stacktraces leaked to user
//app.use(function (err, req, res, next) {
//    res.status(err.status || 500);
//    res.render('error', {
//        message: err.message,
//        error: {}
//    });
//});




// Sockets
var socket_io = require("socket.io");
var io = socket_io();
io.use(sharedsession(SessionMiddleware, {
    autoSave: true
}));
app.io = io;
require("./sockets")(app);



module.exports = app;
