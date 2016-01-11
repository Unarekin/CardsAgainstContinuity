/*
 * The BackEndViewModel is responsible for handling the display
 * of our administrative back-end view.
 */

var BackEndViewModel = function () {
    // Properties
    var self = this;
    // Functions

    self.HasGameID = function (ID) {
        var Game = self.GetGameByID(ID);
        return (Game != null)
    };

    self.GetGameByID = function (ID) {
        for (var i = 0; i < self.ActiveGames().length; i++) {
            var Game = self.ActiveGames()[i];
            if (Game.GameID() == ID)
                return Game;
        }
        return null;
    }

    self.UpdateIdleTimes = function () {
        // Update idle time.
        for (var i = 0; i < self.ActiveGames().length; i++) {
            var Game = self.ActiveGames()[i];
            Game.UpdateIdleTime();
        }
    };

    self.PerformUpdate = function () {
        // Update player counts
        $.getJSON('/api/games', function (data) {
            if (data.status == 200) {
                for (var GameID in data.games) {
                    var Game = data.games[GameID];
                    var GameVM = self.GetGameByID(GameID);
                    if (GameVM == null) {
                        // This game does not yet exist, add it!
                        self.ActiveGames.push(new ActiveGameViewModel(Game));
                    } else {
                        // Update
                        GameVM.Update(Game);
                    }
                }

                // Now, any games that need to be removed?
                self.PurgeInactiveGames(data.games);
            } else {
                self.RaiseError(data.message);
            }
        });
    }

    self.PurgeInactiveGames = function (Games) {
        var i = self.ActiveGames().length;
        while (i--) {
            var Game = self.ActiveGames()[i];
            if (!Games.hasOwnProperty(Game.GameID())) {
                self.ActiveGames.remove(Game);
            }
        }
    };

    self.DeleteGame = function (Game, event) {
        $.getJSON('/api/game/' + Game.GameID() + '/delete', function (data) {
            if (data.status == 200) {
                self.ActiveGames.remove(Game);
            } else {
                self.RaiseError(data.message);
            }
        });
    }

    // Load a list of our card sets.
    self.LoadCardSets = function () {
        $.getJSON('/api/cards', function (data) {
            if (data.status == 200) {
                self.CardSets.removeAll();
                for (var Set in data.cards) {
                    self.CardSets.push(new CardSetViewModel(Set, data.cards[Set]));
                }
            } else {
                self.RaiseError(data.message);
            }
        });
    };

    self.LoadActiveGames = function () {
        $.getJSON('/api/games', function (data) {
            if (data.status == 200) {
                self.ActiveGames.removeAll();
                for (var GameID in data.games) {
                    self.ActiveGames.push(new ActiveGameViewModel(data.games[GameID]));
                }
            } else {
                self.RaiseError(data.message);
            }
        });
    };

    self.RaiseError = function (Error) {
        //alert("The following error occurred:\n" + Error);
        bootbox.alert("The following error occurred:<br />" + Error);
    }

    self.ShowListElement = function (elem) { if (elem.nodeType === 1) $(elem).hide().slideDown() };
    self.HideListElement = function (elem) { if (elem.nodeType === 1) $(elem).slideUp(function () { $(elem).remove(); }) };

    // Observables
    self.ActiveGames = ko.observableArray([]);
    self.CardSets = ko.observableArray([]);
    // Computed values
    // Construction
    (function () {
        self.LoadCardSets();
        self.LoadActiveGames();
    })();

    setInterval(self.UpdateIdleTimes, 1000);
    setInterval(self.PerformUpdate, 60000);
};


var ActiveGameViewModel = function (Game) {
    // Properties
    var self = this;
    // Functions
    self.FormatDuration = function (milliseconds) {
        var seconds = Math.floor(milliseconds / 1000);
        var hours = Math.floor(seconds / 3600);
        var remainder = seconds % 3600;
        var minutes = Math.floor(remainder / 60);
        seconds = remainder % 60;

        var result = [];
        if (hours > 0) result.push(hours + "h");
        if (minutes > 0) result.push(minutes + "m");
        result.push(seconds + "s");
        return result.join(" ");
    }

    self.CountActivePlayers = function () {
        ActiveCount=0;
        for (var i = 0; i < self.Players().length; i++) {
            var Player = self.Players()[i];
            if (Player.Connected())
                ActiveCount++;
        }
        self.ActivePlayers(ActiveCount);
    };

    self.Update = function (Game) {
        self.LastActivity(Game.LastActivity);
        for (var i = 0; i < Game.Players.length; i++) {
            var Player = Game.Players[i];
            var PlayerVM = self.GetPlayerByID(Player.PlayerID);
            if (PlayerVM != null) {
                // Update
                PlayerVM.Update(Player);
            } else {
                // Create
                self.Players.push(new PlayerViewModel(Player));
            }
        }
        self.CountActivePlayers();
    };

    self.GetPlayerByID = function (ID) {
        for (var i = 0; i < self.Players().length; i++) {
            var Player = self.Players()[i];
            if (Player.PlayerID() == ID)
                return Player;
        }
        return null;
    }

    self.HasPlayer = function (ID) {
        var Player = self.GetPlayerByID(ID);
        return (Player != null);
    }

    self.UpdateIdleTime = function () {
        var now = new Date();
        var LastActivity = new Date(self.LastActivity());
        var IdleTime = now - LastActivity;
        self.IdleTime(self.FormatDuration(IdleTime));
    };
    // Observables
    self.GameID = ko.observable(Game.GameID);
    self.LastActivity = ko.observable(Game.LastActivity);
    self.Players = ko.observableArray([]);
    self.ActivePlayers = ko.observable(0);
    self.IdleTime = ko.observable(0);
    // Computed values
    // Construction
    for (var i = 0; i < Game.Players.length; i++) {
        var Player = Game.Players[i];
        var PlayerVM = new PlayerViewModel(Player);
        self.Players.push(PlayerVM);
        if (Player.Connected)
            self.ActivePlayers(self.ActivePlayers() + 1);
    }
};

var PlayerViewModel = function (Player) {
    // Properties
    var self = this;
    // Functions
    self.Update = function (Player) {
        self.PlayerID(Player.PlayerID);
        self.Connected(Player.Connected);
    }
    // Observables
    self.PlayerID = ko.observable(Player.PlayerID);
    self.Connected = ko.observable(Player.Connected);
    // Computed values
    // Construction
};

var CardSetViewModel = function (Name, Cards) {
    // Properties
    var self = this;
    // Functions
    // Observables
    self.Name = ko.observable(Name);
    self.Cards = ko.observableArray([]);
    // Computed values
    // Construction
    for (var i = 0; i < Cards.length; i++) {
        self.Cards.push(new CardViewModel(Cards[i]));
    }
};

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
    (function () {
        
    })();
};

$(document).ready(function () {
    var BackEndVM = new BackEndViewModel();
    ko.applyBindings(BackEndVM);
});