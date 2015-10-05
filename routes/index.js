var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res) {
    res.render('index', { title: 'Cards Against Continuity' });
});

router.get('/api/new', function (req, res) {
    var NewGame = router.GameManager.CreateGame();
    res.json({ status: 200, gameid: NewGame.GameID });
});

router.get("/game/:id", function (req, res) {
    //res.send("Game: " + req.params.id);
    res.render('game', { title: 'Cards Against Continuity', GameID: req.params.id });
});

router.get('/api/cards', function (req, res) {
    
    var data = require('../public/js/cards.json');
    
    res.json(data);
});

router.get('/api/answers/:id', function (req, res) {
    var GameID = req.params.id;
    var CurrentGame = router.GameManager.GetGame(GameID);
    res.json(CurrentGame.CurrentAnswers);
});
module.exports = router;