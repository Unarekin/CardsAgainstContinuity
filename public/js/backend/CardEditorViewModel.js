/*
 * The CardEditorViewModel responsible for handling our card editor page.
 */
var CardEditorViewModel = function () {
    // Properties
    var self = this;
    // Functions
    self.RaiseError = function (Error) {
        //alert("The following error occurred:\n" + Error);
        bootbox.alert("The following error occurred:<br />" + Error);
    }
    
    self.LoadCards = function () {
        self.IsLoading(true);
        $.getJSON('/api/cards', function (data) {
            console.log(data);
            if (data.status == 200) {
                self.Cards.removeAll();
                for (var Set in data.cards) {
                    //self.CardSets.push(new CardSetViewModel(Set, data.cards[Set]));
                    var cards = data.cards[Set];
                    for (var i = 0; i < cards.length; i++) {
                        self.Cards.push(new CardViewModel(cards[i]));
                    }
                }
                self.IsLoading(false);
            } else {
                self.IsLoading(false);
                self.RaiseError(data.message);
            }
        });
    };

    // Observables
    self.IsLoading = ko.observable(false);
    self.Cards = ko.observableArray([]);

    // Computed values

    // Construction
    setTimeout(self.LoadCards, 500);
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
    var CardEditorVM = new CardEditorViewModel();
    ko.applyBindings(CardEditorVM);
});