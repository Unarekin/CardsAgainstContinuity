var fs = require('fs');
var path = require('path');

var GameDatabase = function () {
    // Properties
    var self = this;
    
    self.Games = {};
    
    // Functions
    
    self.GenerateNonce = function (Length) {
        var NonceChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        var Nonce = "";
        for (var i = 0; i < Length; i++) {
            Nonce += NonceChars.charAt(Math.floor(Math.random() * NonceChars.length));
        }
        return Nonce;
    }
    
    self.GetGame = function (id) {
        if (self.GameExists(id))
            return self.Games[id];
    }
    
    self.GameExists = function (id) {
        return self.Games.hasOwnProperty(id);
    }
    
    self.CreateGame = function () {
        var NewGame = new Game();
        
        // Ensure a unique ID.
        var GameID = "";
        do {
            GameID = self.GenerateNonce(6);
        } while (self.GameExists(GameID));
        
        NewGame.GameID = GameID;
        self.Games[GameID] = NewGame;
        return NewGame;
    }

    // Construction
}

var Game = function () {
    // Properties
    var self = this;
    
    self.GameID = "";
    self.Players = [];
    
    self.Cards = new Deck();
    
    self.CurrentAnswers = {};
    
    // Functions
    
    self.SetAdministrator = function (Player) {
        //CurrentPlayer.CardAdministrator = true;
        for (var i = 0; i < self.Players.length; i++) {
            if (self.Players[i] != Player)
                self.Players[i].CardAdministrator = false;
        }
        Player.CardAdministrator = true;
        self.CurrentAnswers = [];
    }
    
    self.HasAdministrator = function () {
        for (var i = 0; i < self.Players.length; i++) {
            if (self.Players[i].CardAdministrator)
                return true;
        }
        return false;
    };
    
    self.GetAdministrator = function () {
        for (var i = 0; i < self.Players.length; i++) {
            if (self.Players[i].CardAdministrator)
                return self.Players[i];
        }
        return null;
    }
    
    self.GetPlayer = function (socket) {
        for (var i = 0; i < self.Players.length; i++) {
            if (self.Players[i].Socket == socket)
                return self.Players[i];
        }
        return null;
    }
    
    self.DealHand = function (Player) {
        if (Player.Cards.length > 0) {
            // They already have cards, let's discard them.
        }
        
        for (var i = 0; i < 10; i++) {
            self.DealCard(Player);
        }
    }
    
    self.DealCard = function (Player) {
        var Card = self.Cards.Answers.pop();
        Player.Cards.push(Card);
    }
    
    self.CreatePlayer = function (socket) {
        var NewPlayer = new Player();
        self.Players.push(NewPlayer);
        NewPlayer.Socket = socket;
        return NewPlayer;
    }

    // Construction
};

var Deck = function () {
    // Properties
    var self = this;
    
    self.Questions = [];
    self.Answers = [];
    
    self.DiscardedQuestions = [];
    self.DiscardedAnswers = [];
    
    // Functions
    self.Shuffle = function () {
        var currentIndex = self.Questions.length, temporaryValue, randomIndex;
        
        // Shuffle questions
        while (0 !== currentIndex) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;
            temporaryValue = self.Questions[currentIndex];
            self.Questions[currentIndex] = self.Questions[randomIndex];
            self.Questions[randomIndex] = temporaryValue;
        }
        
        // Shuffle answers
        currentIndex = self.Answers.length;
        while (0 !== currentIndex) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;
            temporaryValue = self.Answers[currentIndex];
            self.Answers[currentIndex] = self.Answers[randomIndex];
            self.Answers[randomIndex] = temporaryValue;
        }

    }
    
    self.GetQuestion = function () {
        var Card = self.Questions.pop();
        return Card;
    }
    
    self.LoadCards = function () {
        
        //var data = require('./public/js/cards.json');
        // As much as I would love to just require() and be done,
        // I need this to not cache the results.
        
        Cards = JSON.parse(fs.readFileSync("./public/js/cards.json"));
        for (var i = 0; i < Cards.length; i++) {
            var Card = Cards[i];
            if (Card.cardType == "A")
                self.Answers.push(Card);
            if (Card.cardType == "Q")
                self.Questions.push(Card);
        }
    }
    
    // Construction
    self.LoadCards();
    self.Shuffle();
}

var Player = function () {
    // Properties
    var self = this;
    
    self.CardAdministrator = false;
    self.Cards = [];
    
    self.Socket = null;
    self.ID = "";
    
    // Functions
    
    // Construction
    var s4 = function () {
        return (Math.floor((1 + Math.random()) * 0x10000))
                .toString(16)
                .substring(1);
    };
    self.ID = s4() + s4() + '-' + s4() + '-' + s4() + '-' +s4() + '-' + s4() + s4() + s4();
}


module.exports = new GameDatabase();