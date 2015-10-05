function Player() {
    // Properties
    var self = this;

    self.CardAdministrator = false;
    self.Answers = [];
    self.Question = null;

    self.Socket = null;
    self.ID = "";
    
    self.GameID = "";

    // Functions
    self.GiveAnswer = function (data) {
        // Combine!
        self.Answers = self.Answers.concat(data);
    }
    
    self.GiveQuestion = function (card) {
        self.Question = card;
    }

    // Construction
    self.s4 = function() {
        return (Math.floor((1 + Math.random()) * 0x10000))
                .toString(16)
                .substring(1);
    };
    self.ID = self.s4() + self.s4() + '-' + self.s4() + '-' + self.s4() + '-' + self.s4() + '-' + self.s4() + self.s4() + self.s4();
}


module.exports = Player;