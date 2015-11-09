var GameViewModel = function (GameID) {
    // Properties
    var self = this;
    self.GameID = ko.observable(GameID);
    self.CurrentQuestion = ko.observable('');
    self.SubmittedAnswers = ko.observable(0);
    self.LastActivity = ko.observable('');
    self.Players = ko.observableArray([]);

    // Functions
    self.LoadGame = function (GameID) {
        $.getJSON('/api/game/' + GameID, function (data, status, jqXHR) {
            console.log(data);
            if (data.status == 200) {
                var Game = data.game;
                self.CurrentQuestion(Game.CurrentQuestion);
                self.SubmittedAnswers(Game.SubmittedAnswers);
                self.LastActivity(Game.LastActivity);
                self.Players([]);
                for (var i = 0; i < Game.Players.length; i++) {
                    var Player = new PlayerViewModel(Game.Players[i]);
                    self.Players.push(Player);
                }

            } else {
                bootbox.alert("An error has occurred:<br />" + data.message);
            }
        });
    }

    // Observables
    // Computed values

    // Construction
    self.LoadGame(GameID);
}

var PlayerViewModel = function (Player) {
    // Properties
    var self = this;
    // Functions
    self.LoadPlayer = function (Player) {
        self.PlayerID(Player.PlayerID);
        self.Connected(Player.Connected);
        self.Administrator(Player.Administrator);
        self.AnswersSubmitted(Player.AnswersSubmitted);
        self.Cards(Player.Cards);
        self.Score(Player.Score);
    }
    // Observables
    self.PlayerID = ko.observable('');
    self.Connected = ko.observable(false);
    self.Administrator = ko.observable(false);
    self.AnswersSubmitted = ko.observable(false);
    self.Cards = ko.observable(0);
    self.Score = ko.observable(0);
    // Computed values

    // Construction
    self.LoadPlayer(Player);
}

$(document).ready(function () {
    var GameVM = new GameViewModel(GameID);
    ko.applyBindings(GameVM);
});