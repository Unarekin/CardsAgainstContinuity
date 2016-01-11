var config = require('./config');
var colors = require('colors');
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');

var util = require('util');
var cookie = require('express/node_modules/cookie');
var cookieParser = require('cookie-parser');

function WireGameSignals(Socket, Game) {
    
    // Called when there's a change in the Card Administrator
    Game.OnCardAdministratorChanged.add(function (Player) {
        var data = {
            EventType: "new",
            HasCardAdministrator: false,
            Message: "",
            AnswerCount: 1
        };
        
        if (Game.HasCardAdministrator()) {
            data.HasCardAdministrator = true;
            var Question = Game.CurrentQuestion;
            data.AnswerCount = Question.numAnswers;
        }
        Socket.broadcast.to(Game.GameID).emit('administration', data);
    });
    
    Game.OnGameExpired.add(function () {
        console.log("Game expired: " + Game.GameID);
        Socket.broadcast.to(Game.GameID).emit('expiration', { reason: 'Inactivity' });

    });
    
    Game.OnQuestionDrawn.add(function (Question) {
    });
    
    Game.OnRoundBegun.add(function () {
    });
    
    Game.OnRoundEnded.add(function () {
    });
    
    Game.OnPlayerJoined.add(function (Player) {
    });
    
    Game.OnPlayerLeft.add(function (Player) {
    });

}

var SocketRoutes = function (app) {
    
    var GameConnectionModel = function () {
        var self = this;
        self.Player = null;
        self.Game = null;
        self.Socket = null;
    }
    
    
    var io = app.io;
    
    console.log('[' + "IO".green + '] Initializing ...');
    
    //io.set('authorization', function (data, callback) {
    //    if (data.headers.cookie) {
    //        // Save session ID to handshake
    //        data.cookie = cookie.parse(data.headers.cookie);
    //        data.sessionId = cookieParser.signedCookie(data.cookie['connect.sid'], config.CookieSecret);
    //        //console.log("[" + "IO".green + "] Authorization session id: " + data.sessionId);
    //    }
    //    callback(null, true);
    //});
    
    io.on('connection', function (socket) {
        console.log('[' + "IO".green + '] User connected ...');
        
        // A couple of global variables to store for later events
        var GameConnection = new GameConnectionModel();
        GameConnection.Socket = socket;
        
        //var SessionStore = app.SessionStore;
        //console.log("[" + "IO".green + "] Connection session id: " + sessionId);
        //console.log(socket.handshake);
        
        socket.on('disconnect', function () {
            if (GameConnection.Player) {
                console.log("[" + "IO".green + "] Player " + GameConnection.Player.ID + " disconnected.");
                GameConnection = null;
            }
        });
        
        // Authentication request event.
        
        socket.on('authentication', function (data, callback) {
            var ResponseData = {
                Status: "",
                PlayerID: "",
                IsCardAdministrator: false,
                HasCardAdministrator: false,
                AnswerCount: 0,
                Message: "",
                CurrentScore: 0,
                Cards: []
            };
            
            //console.log("[" + "IO".green + "] Authentication event: ");
            if (data.EventType == "New") {
                // Do we already have a player ID in our session?
                // If so, let us resume that one.
                if (socket.handshake.session.PlayerID) {
                    var Player = app.GameManager.GetPlayer(socket.handshake.session.PlayerID);
                    if (Player) {
                        Player.Socket = socket;
                        if (GameConnection.Socket.connected) {
                            console.log("[" + "IO".green + "] Player " + Player.ID + " reconnected.");
                            GameConnection.Player = Player;
                            ResponseData.PlayerID = Player.ID;
                            ResponseData.IsCardAdministrator = Player.CardAdministrator;
                            ResponseData.Status = "ok"
                            ResponseData.CurrentScore = Player.Score;
                        }
                    } else {
                        // Not a valid Player ID.  Baleet it and let the following code create a new one.
                        delete socket.handshake.session.PlayerID;
                    }
                }
                
                if (!socket.handshake.session.PlayerID) {
                    
                    // New player is connecting
                    // Generate Player.
                    var NewPlayer = app.GameManager.CreatePlayer();
                    NewPlayer.Socket = socket;
                    GameConnection.Player = NewPlayer;
                    ResponseData.PlayerID = NewPlayer.ID;
                    ResponseData.IsCardAdministrator = false;
                    ResponseData.Status = "ok";
                    
                    socket.handshake.session.PlayerID = NewPlayer.ID;
                }
                
                // Are they attempting to join a proper game?
                if (app.GameManager.GameExists(data.GameID)) {
                    var Game = app.GameManager.GetGame(data.GameID);
                    GameConnection.Game = Game;
                    Game.AddPlayer(GameConnection.Player);
                    Game.DealHand(GameConnection.Player);
                    ResponseData.Cards = GameConnection.Player.Answers;
                    if (Game.HasCardAdministrator()) {
                        ResponseData.HasCardAdministrator = true;
                        var Question = GameConnection.Game.CurrentQuestion;
                        ResponseData.AnswerCount = Question.numAnswers;
                        if (GameConnection.Player.CardAdministrator) {
                            ResponseData.Question = GameConnection.Game.CurrentQuestion;
                            ResponseData.SubmittedAnswerCount = 0;
                            for (var PlayerID in GameConnection.Game.SubmittedAnswers) {
                                ResponseData.SubmittedAnswerCount++;
                            }

                        }
                    }
                    // Join teh socket to a 'room' for the game.
                    WireGameSignals(socket, Game);
                    socket.join(data.GameID);
                } else {
                    console.log("[" + "Error".red + "] Attempted to join nonexistent game: " + data.GameID);
                    ResponseData.Status = "error";
                    ResponseData.Message = "Attempted to join nonexistent game.";
                }
                

            } else if (data.EventType == "Reconnect") {
               // Player is reconnecting.
               // Not currently supported.

            } else {
                ResponseData.Status = "error";
                ResponseData.Message = "Unknown authentication event type: " + data.EventType;
            }
            if (callback)
                callback(ResponseData);
        });
        
        // Administration event
        socket.on('administration', function (data, callback) {
            var ResponseData = {
                Status: "error",
                Message: "Unknown error",
                Granted: false,
                Question: {}
            };
            
            if (data.EventType == "request") {
                if (!GameConnection.Game.HasCardAdministrator()) {
                    // Success
                    ResponseData.Granted = true;
                    
                    // Draw a question.
                    var Question = GameConnection.Game.DrawQuestion();
                    GameConnection.Game.CurrentQuestion = Question;
                    ResponseData.Question = Question;
                    ResponseData.Status = "ok";
                    ResponseData.Message = "";
                    
                    
                    console.log("[" + "IO".green + "] Assigning new Card Administrator: ", GameConnection.Player.ID);
                    GameConnection.Game.SetCardAdministrator(GameConnection.Player)
                } else {
                    ResponseData.Message = "The game already has a Card Administrator.";
                }
            } else if (data.EventType == "status") {
                ResponseData.Status = "ok";
                ResponseData.Message = GameConnection.Game.HasCardAdministrator();
            } else if (data.EventType == "reset") {
                if (GameConnection.Game.HasCardAdministrator()) {
                    console.log("[" + "IO".green + "] Resetting administrator for game " + GameConnection.Game.GameID);
                    var Data = {
                        EventType: "reset"
                    }
                    // Return the answer cards to our players in our Game object.
                    // At this stage, the local game clients all still know about their
                    // submitted answers, and we will allow them to handle returning
                    // the card to a state where it can be played validly.
                    GameConnection.Game.ReturnAllAnswers();
                    io.to(GameConnection.Game.GameID).emit('administration', { EventType: "reset" })
                    ResponseData.Status = "ok";
                    ResponseData.Message = "";
                    
                    GameConnection.Game.EndRound();
                    GameConnection.Game.BeginRound();
                } else {
                    ResponseData.Status = "error";
                    ResponseData.Message = "Game does not currently have a Card Administrator.";
                }
            } else {
                ResponseData.Status = "error";
                ResponseData.Message = "Unknown administration event type: " + data.EventType;
            }
            
            
            // Return our callback.
            if (callback)
                callback(ResponseData);

        });
        
        // Answer revent
        socket.on('answer', function (data, callback) {
            var ResponseData = {
                Status: "error",
                Message: "Unknown Error",
                Answers: {}
            }
            if (data.EventType == "Request") {
                console.log("[" + "IO".green + "] Answer request received ...");
                if (GameConnection.Player.CardAdministrator) {
                    ResponseData.Answers = GameConnection.Game.SubmittedAnswers;
                    ResponseData.Status = "ok";
                    ResponseData.Message = "";
                    //console.log("[" + "IO".green + "] Responding.");
                } else {
                    ResponseData.Status = "error";
                    ResponseData.Message = "You are not the Card Administrator.";
                    console.log("[" + "Error".red + "] Answer request received from non-Administrator.");
                }
            }
            
            if (data.EventType == "Submission") {
                if (GameConnection.Game.HasCardAdministrator()) {
                    // Verify that the correct number of answers were submitted.
                    var Question = GameConnection.Game.CurrentQuestion;
                    if (Question.numAnswers == data.Answers.length) {
                        // Verify that we have not already received answers from this player.
                        if (GameConnection.Game.HasAnswersFrom(GameConnection.Player)) {
                            ResponseData.Status = "error";
                            ResponseData.Message = "You have already submitted answer(s) for this question.";
                            console.log("[" + "Error".red + "] Double submission from player " + GameConnection.Player.ID);
                        } else {
                            // We're good.
                            ResponseData.Status = "ok";
                            ResponseData.Message = "";
                            GameConnection.Game.AddAnswersFrom(GameConnection.Player, data.Answers);
                            console.log("[" + "IO".green + "] Answers received from player " + GameConnection.Player.ID);
                            
                            // Notify our administrator
                            (function () {
                                var Admin = GameConnection.Game.GetCardAdministrator();
                                console.log("Players:");
                                var Players = GameConnection.Game.GetPlayers();
                                for (var PlayerID in Players) {
                                    var Log = PlayerID;
                                    if (Players[PlayerID].CardAdministrator)
                                        Log += "     ADMIN";
                                    console.log(Log);
                                }
                                var Data = {
                                    EventType: "Received",
                                    PlayerID: GameConnection.Player.ID,
                                    Quantity: 1//data.Answers.length
                                };
                                Admin.Socket.emit('answer', Data);
                            })();
                            
                        }

                    } else {
                        ResponseData.Status = "error";
                        ResponseData.Message = "Incorrect number of answers were submitted.";
                        console.log("[" + "Error".red + "] Incorrect number of answers submitted by player " + GameConnection.Player.ID);
                    }
                }
            }
            
            if (data.EventType == "winner") {
                if (GameConnection.Player.CardAdministrator) {
                    var WinnerID = data.PlayerID;
                    if (GameConnection.Game.HasPlayer(WinnerID)) {
                        ResponseData.Status = "ok";
                        ResponseData.Message = "";
                        var Winner = app.GameManager.GetPlayer(WinnerID);
                        
                        // Remove answers from all players.
                        
                        // Notify winner to increase their score.
                        Winner.Score++;
                        Winner.Socket.emit('gameplay', {
                            EventType: "score",
                            Amount: 1 ,
                            Total: Winner.Score
                        });
                        
                        // Notify everybody but the admin that a new round is to start.
                        var Answers = GameConnection.Game.GetAnswersFor(app.GameManager.GetPlayer(WinnerID));
                        var Data = {
                            EventType       : "new round",
                            WinningAnswers  : Answers,
                            WinningPlayer   : WinnerID
                        };
                        //GameConnection.Player.Socket.to(GameConnection.Game.GameID).emit('gameplay', Data);
                        io.to(GameConnection.Game.GameID).emit('gameplay', Data);
                        GameConnection.Game.EndRound();
                        GameConnection.Game.BeginRound();
                    } else {
                        ResponseData.Status = "error";
                        ResponseData.Message = "Unknown player.";
                        console.log(data);
                    }
                } else {
                    ResponseData.Status = "error";
                    ResponseData.Message = "You are not the Card Administrator.";
                }
            }
            
            if (data.EventType == "draw") {
                var Amount = data.Amount;
                var Cards = GameConnection.Game.DealHand(GameConnection.Player);
                if (Cards == null)
                    ResponseData.Answers = [];
                else
                    ResponseData.Answers = Cards;
                
                ResponseData.Status = "ok";
                ResponseData.Message = "";
            }
            
            // The user has requested to 'refresh' their hand.  This is generally because they are showing
            // fewer than 10 cards.
            if (data.EventType == "refresh") {
                ResponseData.Answers = GameConnection.Player.Answers;
                ResponseData.Status = "ok";
                ResponseData.Message = "";
            }
            
            // Remit response
            if (callback)
                callback(ResponseData);
            /*
             var Data ={
                EventType: "Submission",
                Answers: Cards
            }
             * */
        });
        
        socket.on('invitation', function (data, callback) {
            //var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
            
            var ResponseData = {
                Status: "error",
                Message: "Unknown event type"
            }
            if (data.EventType == "Email") {
                
                var referer = socket.request.headers['referer'];
                var Message = "You have been invited to a game of Cards Against Continuity.  To join, click here:\r\n" +
                               referer;
                
                ResponseData.Status = "ok";
                ResponseData.Message = "";
                
                var transporter = nodemailer.createTransport(smtpTransport({
                    host: 'mail.blackspork.com',
                    port: 25,
                    secure: false,
                    ignoreTLS: true,
                    auth: {
                        user: 'sam@blackspork.com',
                        pass: 'D0gsC4ntL00kUp'
                    }
                }));
                
                for (var i = 0; i < data.Recipients.length; i++) {
                    var regex = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
                    var Recipient = data.Recipients[i];
                    if (regex.test(Recipient)) {
                        console.log("[" + "IO".green + "] Invitation being sent to: " + Recipient);
                        transporter.sendMail({
                            to: Recipient,       
                            from: 'sam@blackspork.com',
                            subject: "Cards Against Continuity Invite",
                            text: Message,
                        }, function (err, info) {
                            if (err) {
                                console.log("[" + "Error".red + "] An error occurred when sending an email to " + Recipient + ":");
                                console.log(err);
                            } else {
                                console.log("[" + "IO".green + "] message sent.");
                            }
                        });
                    }
                }
            }
            
            // Remit response
            if (callback)
                callback(ResponseData);
        });
        
        
        socket.on('geolocation', function (data, callback) {
            //console.log("[" + "IO".green + "] Geolocation event:");
            //console.log(data.Latitude + "," + data.Longitude);
            var ResponseData = {
                Status: 'Error',
                Message: 'Unknown event type'
            }
            
            if (data.EventType == 'registration') {
                app.UserLocations.RegisterUser(data.DisplayName, socket, data.Latitude, data.Longitude);
                ResponseData.Status = 'ok';
                ResponseData.Message = '';
                callback(ResponseData);
            }
            
            if (data.EventType == 'invitation') {
                var InviteData = {
                    EventType: 'invitation',
                    GameID: data.GameID
                };
                for (var i = 0; i < data.Users.length; i++) {
                    var UserID = data.Users[i];
                    var User = app.UserLocations.GetUser(UserID);
                    if (User != null) {
                        User.Socket.emit('geolocation', InviteData);
                    }
                }
                
                ResponseData.Status = 'ok';
                ResponseData.Message = '';
                callback(ResponseData);
            }
            
            if (data.EventType == 'request') {
                var Users = app.UserLocations.FindUsersNear(data.Latitude, data.Longitude, 5000);
                ResponseData.Status = 'ok';
                ResponseData.Message = '';
                //ResponseData.Users = Users;
                ResponseData.Users = [];
                for (var i = 0; i < Users.length; i++) {
                    var User = Users[i];
                    var UserData = {
                        ID: User.UserID,
                        Name: User.DisplayName,
                        Distance: 0
                    };

                    ResponseData.Users.push(UserData);
                }
                callback(ResponseData);
            }

        });

    });
}
module.exports = SocketRoutes;