var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  //todo: perform actions...
    console.log("Hello World!");
    res.send("Hello World!");
});

module.exports = router;
