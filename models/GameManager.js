var Game = require('./Game.js');
var Deck = require('./Deck.js');
var Player = require('./Player.js');

function GameManager() {
    // Properties
    var self = this;
    self.Games = {};
    self.Players = {};
    
    
    // Functions
    
    //////////////////////////////////////////////////////////
    // Game functions
    //////////////////////////////////////////////////////////
    /*
     * This function generates a simple ID
     * for a game.
     */
    self.GenerateGameID = function () {
        var GameID = "";
        // If we want to force a unique ID,
        // then loop until we find one that
        // is unique.  Chances are this is
        // the first loop anyway, but hey.
        var ValidChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        do {
            GameID = "";
            for (var i = 0; i < 6; i++) {
                GameID += ValidChars.charAt(Math.floor(Math.random() * ValidChars.length));
            }
        } while (self.Games.hasOwnProperty(GameID));
        return GameID;
    }
    /*
     * Returns true if the game exists in this database.
     */
    self.GameExists = function (id) {
        return (self.Games.hasOwnProperty(id));
    }
    /*
     * Returns a game by the given ID, if it exists.
     */
    self.GetGame = function (id) {
        if (self.GameExists(id))
            return self.Games[id];
        else
            return null;
    }
    
    self.CreateGame = function () {
        var NewGame = new Game(self);
        NewGame.GameID = self.GenerateGameID();
        console.log("[" + "CAC".green + "] Created game " + NewGame.GameID);
        self.Games[NewGame.GameID] = NewGame;
        return NewGame;
    }
    
    //////////////////////////////////////////////////////////
    // Player functions
    //////////////////////////////////////////////////////////
    self.CreatePlayer = function () {
        var NewPlayer = new Player();
        self.Players[NewPlayer.ID] = NewPlayer;
        return NewPlayer;
    }

    /*
     * Returns true if a player by the specified ID exists.
     */
    self.PlayerExists = function (id) {
        return (self.Players.hasOwnProperty(id));
    }
    /*
     * Returns the player object, if it exists.
     */
    self.GetPlayer = function (id) {
        if (self.PlayerExists(id))
            return self.Players[id];
        else
            return null;
    }
    
    self.GetPlayers = function (GameID) {
        var Players = {};
        for (var PlayerID in self.Players) {
            var Player = self.Players[PlayerID];
            if (Player.GameID == GameID)
                Players[PlayerID] = Player;
        }
        
        return Players;
    }


    // Construction
};


module.exports = GameManager;