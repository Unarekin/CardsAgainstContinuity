var Signal = require('signals');
var Deck = require('./Deck');

function Game(Manager) {
    // Properties
    var self = this;
    self.GameID = "";
    self.Cards = null;
    
    self.CurrentQuestion = null;
    self.SubmittedAnswers = {};

    var GameManager = Manager;
    
    // Functions
    /*
     * This function checks to see if 
     */

    //////////////////////////////////////////////////////////
    //  Card Administrator functions
    //////////////////////////////////////////////////////////
    self.HasCardAdministrator = function () {
        var Administrator = self.GetCardAdministrator();
        return (Administrator != null);
    }
    self.GetCardAdministrator = function () {
        var Players = self.GetPlayers();
        for (var ID in Players) {
            if (Players.hasOwnProperty(ID)) {
                var Player = Players[ID];
                if (Player.CardAdministrator)
                    return Player;
            }
        }
        return null;
    };
    
    self.IsCardAdministrator = function (Player) {
        return (Player.CardAdministrator);
    }

    self.SetCardAdministrator = function (Player) {
        if (self.HasCardAdministrator()) {
            var Admin = self.GetCardAdministrator();
            Admin.CardAdministrator = false;
        }
        if (Player != null)
            Player.CardAdministrator = true;
        self.OnCardAdministratorChanged.dispatch(Player);
    };

    //////////////////////////////////////////////////////////
    //  Player functions
    //////////////////////////////////////////////////////////
    self.AddPlayer = function (Player) {
        Player.GameID = self.GameID;
        self.OnPlayerJoined.dispatch(Player);
    }
    
    self.RemovePlayer = function (Player) {
        if (Player.GameID == self.GameID) {
            Player.GameID = "";
            self.OnPlayerLeft.dispatch(Player);
        }
    }
    
    self.GetPlayers = function () {
        return GameManager.GetPlayers(self.GameID);
    }
    
    self.HasPlayer = function (id) {
        var Players = self.GetPlayers();
        return (Players.hasOwnProperty(id));
    }

    //////////////////////////////////////////////////////////
    // Card drawing/dealing functions
    //////////////////////////////////////////////////////////
    self.DrawQuestion = function () {
        var Card = self.Cards.GetQuestion();
        self.OnQuestionDrawn.dispatch(Card);
        return Card;
    }
    self.DrawAnswer = function (amount) {
        var Answers = [];
        if (typeof amount === "undefined")
            amount = 1;
        for (var i = 0; i < amount; i++) {
            Answers.push(self.Cards.GetAnswer());
        }
        return Answers;
    }
    self.DealHand = function (Player) {
        var Amount = (10 - Player.Answers.length);
        if (Amount > 0) {
            var Cards = self.DrawAnswer(Amount);
            Player.GiveAnswer(Cards);
            return Cards;
        }
        return null;
    }
    
    //////////////////////////////////////////////////////////
    // Answer functions
    //////////////////////////////////////////////////////////
    self.HasAnswersFrom = function(Player) {
        return (self.SubmittedAnswers.hasOwnProperty(Player.ID));
    }
    
    self.AddAnswersFrom = function (Player, Cards) {
        //self.SubmittedAnswers[Player.ID] = Cards;
        self.SubmittedAnswers[Player.ID] = [];
        var IndicesToRemove = [];
        for (var i = 0; i < Cards.length; i++) {
            var CardID = Cards[i];
            for (var j = 0; j < Player.Answers.length; j++) {
                var Answer = Player.Answers[j];
                if (Answer.id == CardID) {
                    IndicesToRemove.push(j);
                    self.SubmittedAnswers[Player.ID].push(Answer);
                }
            }
        }
        
        // Now remove the cards from the player's list of them.
        for (var i = 0; i < IndicesToRemove.length; i++) {
            var Index = IndicesToRemove[i];
            Player.Answers.splice(Index, 1);
        }
        self.OnAnswersSubmitted.dispatch(Player, self.SubmittedAnswers[Player.ID]);
    }
    
    self.ReturnAllAnswers = function () {
        var Players = self.GetPlayers();
        for (var PlayerID in Players) {
            var Player = Players[PlayerID];
            self.ReturnAnswersTo(Player);
        }
    };

    self.ReturnAnswersTo = function (Player) {
        var Answers = self.SubmittedAnswers[Player.ID];
        Player.GiveAnswer(Answers);
    };
    
    self.GetAnswersFor = function (Player) {
        var Answers = self.SubmittedAnswers[Player.ID];
        return Answers;
    }

    //////////////////////////////////////////////////////////
    //  Game flow functions
    //////////////////////////////////////////////////////////
    self.BeginRound = function () {
        self.OnRoundBegun.dispatch();
    }
    
    self.EndRound = function () {
        self.SetCardAdministrator(null);
        
        // Add our question and answers to the discard for the deck
        self.Cards.DiscardedQuestions.push(self.CurrentQuestion);
        for (var PlayerID in self.SubmittedAnswers) {
            var Answers = self.SubmittedAnswers[PlayerID];
            self.Cards.DiscardedAnswers = self.Cards.DiscardedAnswers.concat(Answers);
        }

        self.CurrentQuestion = null;
        self.SubmittedAnswers = {};
        self.OnRoundEnded.dispatch();
    }
    
    //////////////////////////////////////////////////////////
    //  Signals
    //////////////////////////////////////////////////////////
    self.OnCardAdministratorChanged = new Signal();
    self.OnQuestionDrawn = new Signal();
    self.OnRoundBegun = new Signal();
    self.OnRoundEnded = new Signal();
    self.OnPlayerJoined = new Signal();
    self.OnPlayerLeft = new Signal();
    self.OnAnswersSubmitted = new Signal();

    // Construction
    self.Cards = new Deck();
    self.Cards.LoadCards('./models/cards/debug.json');
    self.Cards.Shuffle();
};

module.exports = Game;