var config = require('./config');
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var filestore = require('session-file-store')(session);

var sharedsession = require("express-socket.io-session");

var bodyParser = require('body-parser');
var crontab = require("node-crontab");





var app = express();


// Set up game DB
//var GameDB = require('./game');
var GameManager = require('./models/GameManager');
app.GameManager = new GameManager();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
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

router.get('/api/new', function (req, res) {
    var NewGame = app.GameManager.CreateGame();
    res.json({ status: 200, gameid: NewGame.GameID });
});

router.get("/game/:id", function (req, res) {
    //res.send("Game: " + req.params.id);
    res.render('game', { title: 'Cards Against Continuity', GameID: req.params.id });
});

router.get('/api/cards', function (req, res) {
    
    var data = require('../public/js/cards.json');
    
    res.json(data);
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
if (app.get('env') === 'development') {
    app.locals.pretty = true;
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});




// Sockets
var socket_io = require("socket.io");
var io = socket_io();
io.use(sharedsession(SessionMiddleware, {
    autoSave: true
}));
app.io = io;
require("./sockets")(app);



module.exports = app;
