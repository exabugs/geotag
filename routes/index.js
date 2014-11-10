var MongoClient = require('mongodb').MongoClient;

var express = require('express');
var router = express.Router();

var DB = "geotag";
var COL = "h22ka"; // collection

var url = 'mongodb://127.0.0.1:27017/' + DB;

var db;

MongoClient.connect(url, function (err, _db) {
  db = _db;
});


/* GET home page. */
router.get('/', function (req, res) {
  res.render('index', {title: 'Express'});
});

// latitude/longitude
router.get('/coordinates', function (req, res) {
  var lon = req.query['lon'] || 0;
  var lat = req.query['lat'] || 0;
  var coordinates = [Number(lon), Number(lat)];
  var collection = db.collection(COL);

  var condition = {"$geometry": {"type": "Point", "coordinates": coordinates}};

  var query = req.query['intersect'] ?
  {loc: {"$geoIntersects": condition}} :
  {loc: {"$near": condition}};

  var fields = {"KEN_NAME": 1, "GST_NAME": 1, "CSS_NAME": 1, "MOJI": 1, "KEYCODE1": 1};

  collection.findOne(query, fields, function (err, result) {
    if (err || !result) {
      res.send(404);
    } else {
      res.send(result);
    }
  });
});

module.exports = router;
