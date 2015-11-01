﻿var colors = require('colors');
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');


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
    
    io.on('connection', function (socket) {
        console.log('[' + "IO".green + '] User connected ...');
        
        // A couple of global variables to store for later events
        var GameConnection = new GameConnectionModel();
        GameConnection.Socket = socket;
        
        // Authentication request event.
        
        socket.on('authentication', function (data, callback) {
            var ResponseData = {
                Status: "",
                PlayerID: "",
                IsCardAdministrator: false,
                HasCardAdministrator: false,
                AnswerCount: 0,
                Message: "",
                Cards: []
            };
            
            //console.log("[" + "IO".green + "] Authentication event: ");
            if (data.EventType == "New") {
                // New player is connecting
                // Generate Player.
                var NewPlayer = app.GameManager.CreatePlayer();
                NewPlayer.Socket = socket;
                GameConnection.Player = NewPlayer;
                ResponseData.PlayerID = NewPlayer.ID;
                ResponseData.IsCardAdministrator = false;
                ResponseData.Status = "ok";
                
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
                    console.log("[" + "IO".green + "] Responding.");
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
                                    Quantity: data.Answers.length
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
                        Winner.Socket.emit('gameplay', { EventType: "score", Amount: 1 });

                        // Notify everybody but the admin that a new round is to start.
                        GameConnection.Player.Socket.to(GameConnection.Game.GameID).emit('gameplay', { EventType: "new round" });
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
    });
}
module.exports = SocketRoutes;