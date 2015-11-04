﻿
/*
 * The GameClientViewModel is responsible for handling the display
 * of our game view, and communicating with the server.
 */
var GameClientViewModel = function () {
    // Properties
    var self = this;
    // Functions
    
    self.NewRound = function (NewRoundData) {
        console.log("New round:");
        console.log(NewRoundData);
        // Nuke eeeeeeeerrything.
        self.HasCardAdministrator(false);
        self.IsCardAdministrator(false);
        self.QuestionCard(null);
        self.AnswersToSelect(0);
        self.UnsubmittedAnswers.removeAll();
        self.SubmittedAnswers.removeAll();
        self.AnswersReceived(0);
        
        self.HasSubmittedAnswer(false);
        self.ShowAdminAnswersView(false);
        self.AdminSubmittedAnswers.removeAll();
        
        // Request cards to refill our hand.
        var CardsNeeded = (10 - self.AnswerCards.length);
        console.log("New round.  Drawing " + CardsNeeded + " cards.");
        var Data = {
            EventType: "draw",
            Amount: CardsNeeded
        };
        self.Socket.emit('answer', Data, function (response) {
            if (response.Status == "error") {
                self.RaiseError(response.Message);
            } else if (response.Status == "ok") {
                var message = "A new round has begun!<br />";
                if (NewRoundData.WinningPlayer == self.PlayerID())
                    message += "<b class='text-center'>You've won!</b><br />";
                else {
                    message += "Winning answer(s):<br/>";
                    for (var i = 0; i < NewRoundData.WinningAnswers.length; i++) {
                        message += NewRoundData.WinningAnswers[i].text + "<br />";
                    }
                }
                message += "Your score: <b>" + self.AwesomePoints() + "</b>.";
                bootbox.alert({
                    message: message,
                    title: "New Round"
                });
                for (var i = 0; i < response.Answers.length; i++) {
                    var Card = new CardViewModel(response.Answers[i]);
                    self.AnswerCards.push(Card);
                }
            }
        });
    };
    
    self.RequestCardAdministrator = function () {
        var Data = {
            EventType: "request"
        };
        self.Socket.emit('administration', Data, function (response) {
            if (response.Status == "error") {
                self.RaiseError(response.Message);
            } else {
                if (response.Granted) {
                    self.QuestionCard(new CardViewModel(response.Question));
                    self.IsCardAdministrator(true);
                } else {
                    self.RaiseError(response.Message);
                }
            }
        });
    };
    
    self.CardClick = function (Card, event) {
        if (self.CanSelectAnswer()) {
            var AnswerCount = parseInt(self.AnswersToSelect());
            if (self.UnsubmittedAnswers().length < AnswerCount) {
                // Move card to unsubmitted answers.
                // In the future, an animation can go here.
                self.UnsubmittedAnswers.push(Card);
                self.AnswerCards.remove(Card);
            }
        }
    }
    
    self.ResetUnsubmittedAnswers = function () {
        if (self.CanResetAnswer()) {
            for (var i = 0; i < self.UnsubmittedAnswers().length; i++) {
                var Card = self.UnsubmittedAnswers()[i];
                self.AnswerCards.push(Card);
            }
            self.UnsubmittedAnswers.removeAll();
        }
    };
    
    self.SubmitUnsubmittedAnswers = function () {
        if (self.CanSubmitAnswer()) {
            // Build data packet.
            var Data = {
                EventType: "Submission",
                Answers: []
            }
            for (var i = 0; i < self.UnsubmittedAnswers().length; i++) {
                var Card = self.UnsubmittedAnswers()[i];
                Data.Answers.push(Card.ID());
            }
            
            //console.log(Data);
            self.Socket.emit('answer', Data, function (response) {
                //console.log("Response:", response);
                if (response.Status == "error") {
                    self.RaiseError(response.Message);
                }
                if (response.Status == "ok") {
                    // Migrate cards over to submitted answers list
                    var Cards = [];
                    for (var i = 0; i < self.UnsubmittedAnswers().length; i++) {
                        var Card = self.UnsubmittedAnswers()[i];
                        self.SubmittedAnswers.push(Card);
                        Cards.push(Card);
                    }
                    self.HasSubmittedAnswer(true);
                    self.UnsubmittedAnswers.removeAll();
                }
            });

        }
    };
    
    self.ViewSubmittedAnswers = function () {
        console.log("Requesting answers ...");
        if (self.IsCardAdministrator()) {
            // Request our answers from the server.
            
            self.Socket.emit('answer', { EventType: "Request" }, function (response) {
                //console.log("Answer response:", response);
                if (response.Status == "error") {
                    self.RaiseError(response.Message);
                } else {
                    //self.AdminSubmittedAnswers.removeAll();
                    var AnswerArray = [];
                    for (var OwnerID in response.Answers) {
                        var Answers = response.Answers[OwnerID];
                        var AnswerVM = new AnswerViewModel(OwnerID, Answers);
                        //self.AdminSubmittedAnswers.push(AnswerVM);
                        AnswerArray.push(AnswerVM);
                    }
                    // Shuffle
                    var currentIndex = AnswerArray.length, temporaryValue, randomIndex;
                    while (0 !== currentIndex) {
                        randomIndex = Math.floor(Math.random() * currentIndex);
                        currentIndex -= 1;
                        temporaryValue = AnswerArray[currentIndex];
                        AnswerArray[currentIndex] = AnswerArray[randomIndex];
                        AnswerArray[randomIndex] = temporaryValue;
                    }
                    
                    self.AdminSubmittedAnswers(AnswerArray);

                    self.ShowAdminAnswersView(true);
                }
            });
        }
    }
    
    self.SelectWinner = function (Answer, event) {
        var Data = {
            EventType: "winner",
            PlayerID: Answer.OwnerID()
        };
        self.Socket.emit('answer', Data, function (response) {
            if (response.Status == "error")
                self.RaiseError(response.Message);
            //if (response.Status == "ok") {
            //    self.NewRound();
            //} else if (response.Status == "error") {
            //    self.RaiseError(response.Message);
            //}
        });
    }
    
    self.ResetCardAdministrator = function () {
        bootbox.confirm("Are you sure you wish to reset the Card Administrator?  Any submitted answers will be returned to their owners.", function (result) {
            if (result) {
                var Data = {
                    EventType: "reset"
                }
                self.Socket.emit('administration', Data, function (response) {
                    if (response.Status == "error") {
                        self.RaiseError(response.Message);
                    }
                });
            }
        });
    };
    
    self.InvitePlayers = function () {
        var AlertMessage = "There are several ways to invite players to your Cards Against Continuity game.\r\n" +
                            "<ol>\r\n" +
                            "<li>Have them browse to the following URL:<br />\r\n" +
                            "<a href='" + window.location.href + "'>" + window.location.href + "</a></li>\r\n" +
                            "<li>Give them the following game code to enter on the front page of this site:<br />\r\n" +
                            GameID + "</li>\r\n" +
                            "<li><a href='#' id='EmailInviteLink'>Email them</a></li>\r\n" +
                            "</ol>\r\n";
        
        bootbox.alert(AlertMessage);
        $("#EmailInviteLink").click(self.EmailInvite);
    };
    
    self.EmailInvite = function () {
        //console.log("Email invite");
        
        var EmailMessage = "Please enter the email address(es) to which you wish to send an invitation, one per line:<br />\r\n" +
                            "<textarea id='EmailInviteList'></textarea>"
        
        bootbox.dialog({
            message: EmailMessage,
            title: "Invite by Email",
            buttons: {
                cancel: {
                    label: "Cancel",
                    className: "btn-danger",
                },
                ok: {
                    label: "Ok",
                    className: "btn-primary",
                    callback: function () {
                        var Data = {
                            EventType: "Email",
                            GameID: GameID,
                            Recipients: []
                        };
                        
                        var text = $("#EmailInviteList").val();
                        var lines = text.split("\n");
                        for (var i = 0; i < lines.length; i++) {
                            var Line = lines[i];
                            // We'll validate on the server side.
                            Data.Recipients.push(Line);
                        }
                        console.log("Sending email invite request.");
                        console.log(Data);
                        self.Socket.emit('invitation', Data, function (response) {
                            console.log("Invitation response");
                            console.log(response);
                        });

                    }
                }
            }
        });
    };
    
    self.RefreshHand = function () {
        var Data = {
            EventType: "refresh"
        }
        self.Socket.emit('answer', Data, function (response) {
            if (response.Status == "ok") {
                // Empty our current hand
                self.AnswerCards.removeAll();
                for (var i = 0; i < response.Answers.length; i++) {
                    self.AnswerCards.push(new CardViewModel(response.Answers[i]));
                }
            } else {
                self.RaiseError(response.Message);
            }
        });
    };
    
    // Observables
    self.PlayerID = ko.observable("");
    
    self.HasCardAdministrator = ko.observable(false);
    self.IsCardAdministrator = ko.observable(false);
    
    self.AnswerCards = ko.observableArray([]);
    self.QuestionCard = ko.observable();
    
    
    self.AnswersToSelect = ko.observable(0);
    self.UnsubmittedAnswers = ko.observableArray([]);
    self.SubmittedAnswers = ko.observableArray([]);
    self.DroppedAnswer = ko.observable();
    self.AnswersReceived = ko.observable(0);
    
    self.HasSubmittedAnswer = ko.observable(false);
    self.ShowAdminAnswersView = ko.observable(false);
    self.AdminSubmittedAnswers = ko.observableArray([]);
    
    self.AwesomePoints = ko.observable(0);
    
    self.SocketConnected = ko.observable(false);
    
    // Computed values
    
    // Most of these are to handle different states for the UI.
    self.IsPreRound = ko.pureComputed(function () {
        return (!(self.HasCardAdministrator() || self.IsCardAdministrator()));
    });
    
    self.ShowHand = ko.pureComputed(function () {
        return (!self.IsCardAdministrator());
    });
    
    self.EnableViewAnswersButton = ko.pureComputed(function () {
        return (self.AnswersReceived() > 0 && (self.SocketConnected()));
    });
    
    self.ShowSelectAnswerView = ko.pureComputed(function () {
        return (self.HasCardAdministrator() && !self.IsCardAdministrator() && !self.ShowSubmittedAnswerView());
    });
    
    self.ShowSubmittedAnswerView = ko.pureComputed(function () {
        return (self.HasSubmittedAnswer());
    });
    
    self.CanSelectAnswer = ko.pureComputed(function () {
        return (self.ShowSelectAnswerView && !self.ShowSubmittedAnswerView());
    });
    
    self.CanSubmitAnswer = ko.pureComputed(function () {
        return ((self.SocketConnected()) && (self.UnsubmittedAnswers().length == self.AnswersToSelect()) && !self.HasSubmittedAnswer());
    });
    
    self.CanResetAnswer = ko.pureComputed(function () {
        return ((self.UnsubmittedAnswers().length > 0) && !self.HasSubmittedAnswer());
    });
    
    self.ShowQuestionView = ko.pureComputed(function () {
        return (self.IsCardAdministrator() && !self.ShowAdminAnswersView());
    });
    
    
    // Construction
    
    //self.DroppedAnswer.subscribe(function (value) {
    //    if (value != null) {
    //        self.AnswerCards.remove(value);
    //        self.UnsubmittedAnswers.push(value);
    //        self.DroppedAnswer(null);
    
    //        console.log(self.UnsubmittedAnswers());
    //        console.log(self.DroppedAnswer());
    //    }
    //});
    
    // Wire in our socket.io stuff
    console.log("Initializing socket");
    self.RaiseError = function (Error) {
        //alert("The following error occurred:\n" + Error);
        bootbox.alert("The following error occurred:<br />" + Error);
    }
    self.Socket = io();
    self.Socket.on('error', function (data) {
        self.RaiseError(data.Message);
    });
    
    self.Socket.on('connect', function () {
        self.SocketConnected(true);
    });
    
    self.Socket.on('disconnect', function () {
        self.SocketConnected(false);
    });
    
    // An admnistration event has happened!  Probably
    // assigning someone as the Card Administrator.
    self.Socket.on('administration', function (data) {
        if (data.EventType == "new") {
            self.HasCardAdministrator(data.HasCardAdministrator);
            self.AnswersToSelect(data.AnswerCount);
        } else if (data.EventType == "reset") {
            console.log("Admin reset event received!");
            // Return all of our cards.
            for (var i = 0; i < self.SubmittedAnswers().length; i++) {
                var Card = self.SubmittedAnswers()[i];
                self.AnswerCards.push(Card);
            }
            self.SubmittedAnswers.removeAll();
            
            for (var i = 0; i < self.UnsubmittedAnswers().length; i++) {
                var Card = self.UnsubmittedAnswers()[i];
                self.AnswerCards.push(Card);
            }
            self.NewRound();
        }
    });
    
    // An answer event has occurred.  Likely, this is notification
    // that a user has submitted an answer.
    self.Socket.on('answer', function (data) {
        //console.log("Answer event:", data);
        if (data.EventType == "Received") {
            // An answer is received.
            self.AnswersReceived(self.AnswersReceived() + data.Quantity);
        }
    });
    
    self.Socket.on('gameplay', function (data) {
        if (data.EventType == "score") {
            var Amount = parseInt(data.Amount);
            self.AwesomePoints(self.AwesomePoints() + Amount);
        } else if (data.EventType == "new round") {
            self.NewRound(data);
        }
    });
    
    self.Socket.on('expiration', function (data) {
        console.log("Expiration event");
        self.RaiseError("This game has been expired due to inactivity.");
        self.Socket.disconnect();
    });
    
    // Initialize connection.
    (function () {
        var AuthentData = {
            EventType: "New",
            GameID: GameID
        }
        self.Socket.emit('authentication', AuthentData, function (response) {
            console.log("Attempting to authenticate ...");
            if (response.Status == "ok") {
                console.log("Authenticated.");
                self.PlayerID(response.PlayerID);
                for (var i = 0; i < response.Cards.length; i++) {
                    self.AnswerCards.push(new CardViewModel(response.Cards[i]));
                }
                self.IsCardAdministrator(response.IsCardAdministrator);
                self.HasCardAdministrator(response.HasCardAdministrator);
                self.AwesomePoints(response.CurrentScore);
                
                if (response.IsCardAdministrator) {
                    // We're the card admin
                    self.QuestionCard(new CardViewModel(response.Question));
                    self.AnswersReceived(response.SubmittedAnswerCount);
                }
                
                self.AnswersToSelect(response.AnswerCount);

            } else {
                self.RaiseError(response.Message);
            }
        });
    })();
}

/*
 * 
 */
var CardViewModel = function (Card) {
    // Properties
    var self = this;
    
    // Functions
    
    // Observables
    self.Text = ko.observable(Card.text);
    self.CardType = ko.observable(Card.cardType);
    self.NumAnswers = ko.observable(parseInt(Card.numAnswers));
    self.Expansion = ko.observable(Card.expansion);
    self.ID = ko.observable(parseInt(Card.id));
    // Computed values

    // Construction

};

var AnswerViewModel = function (OwnerID, Answers) {
    // Properties
    var self = this;
    // Functions
    
    // Observables
    self.OwnerID = ko.observable(OwnerID);
    self.Answers = ko.observableArray();
    // Computed
    // Construction
    for (var i = 0; i < Answers.length; i++) {
        var Answer = Answers[i];
        self.Answers.push(new CardViewModel(Answer));
    }
};

// Attach our ViewModel
$(document).ready(function () {
    var GameClient = new GameClientViewModel();
    ko.applyBindings(GameClient);
});