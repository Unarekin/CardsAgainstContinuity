var fs = require('fs');
var path = require('path');
require('colors');

function Deck() {
    // Properties
    var self = this;
    self.Questions = [];
    self.Answers = [];
    
    self.DiscardedQuestions = [];
    self.DiscardedAnswers = [];

    // Functions
    
    /*
     * This function handles loading our list of cards,
     * and sorting them into questions and answers.
     */
    self.LoadCards = function (path) {
        var Cards = JSON.parse(fs.readFileSync(path));
        console.log("[" + "Deck".green + "] Loading cards: " + Cards.length + " found.");
        for (var i = 0; i < Cards.length; i++) {
            var Card = Cards[i];
            if (Card.cardType == "A")
                self.Answers.push(Card);
            if (Card.cardType == "Q")
                self.Questions.push(Card);
        }
    }
    
    /*
     * This function handles shuffling our decks.
     * Call after LoadCards().
     */ 
    self.Shuffle = function () {
        
        // First, recombine our discarded cards with any remaining ones.
        self.Questions = self.Questions.concat(self.DiscardedQuestions);
        self.Answers = self.Answers.concat(self.DiscardedAnswers);
        
        // Now we shuffle.
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

    /*
     * This function returns a random question.
     */ 
    self.GetQuestion = function () {
        if (self.Questions.length == 0) {
            console.log("[" + "Deck".green + "] Shuffling questions ...");
            self.Shuffle();
        }
        var Card = self.Questions.pop();
        return Card;
    }

    self.GetAnswer = function () {
        if (self.Answers.length == 0) {
            console.log("[" + "Deck".green + "] Shuffling answers ...");
            self.Shuffle();
        }
        var Card = self.Answers.pop();
        return Card;
    }

    self.FindAnswer = function (ID) {
        for (var i = 0; i < self.Answers.length; i++) {
            var Card = self.Answers[i];
            if (Card.id == ID) {
                return Card;
            }
        }
        return null;
    }

    self.FindQuestion = function (ID) {
        for (var i = 0; i < self.Questions.length; i++) {
            var Card = self.Questions[i];
            if (Card.id == ID) {
                return Card;
            }
        }
        return null;
    }

// Construction
}


module.exports = Deck;