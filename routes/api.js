var express = require('express');
var router = express.Router();
var path = require('path');


/* GET home page. */
router.get('/cards', function (req, res) {
    
    var data = require('../public/js/cards.json');
    
    res.json(data);
});

router.get('/')

router.get('/', function (req, res) {
    
    // Return a 404.
    res.status(404);
    if (req.accepts('html')) {
        res.render('error', { message: 'Not found' });
        return;
    }
    
    if (req.accepts('json')) {
        res.send({ error: 'Not found' });
        return;
    }
    
    // Default to plain-text send
    res.type('txt').send('Not found');

});

module.exports = router;