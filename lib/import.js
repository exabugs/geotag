"use strict";

var fs = require('fs');
var async = require('async');
var path = require('path');
var parser = require('xml2json');
var MongoClient = require('mongodb').MongoClient;

var DB = "geotag";
var COL = "h22ka"; // collection
var DIR = "/tmp/h22ka";

var Iconv = require('iconv').Iconv;

var iconv = new Iconv('Shift-JIS', 'UTF-8');

var erros = [
  "h22ka01663.xml",
  "h22ka03485.xml",
  "h22ka07364.xml",
  "h22ka07505.xml",
  "h22ka13362.xml",
  "h22ka13382.xml",
  "h22ka15586.xml",
  "h22ka17202.xml",
  "h22ka20409.xml",
  "h22ka20412.xml",
  "h22ka28214.xml",
  "h22ka33681.xml",
  "h22ka39412.xml",
  "h22ka43506.xml",
  "h22ka44322.xml",
  "h22ka47382.xml"
];

function do_import(dir, collection, callback) {
  fs.readdir(dir, function (err, files) {
    if (err) throw err;
    files = files.filter(function (file) {
      var _path = path.join(DIR, file);
      return fs.statSync(_path).isFile() && /.*\.xml$/.test(file);
    });

    // files = ["h22ka01663.xml"];

    async.eachLimit(files, 10, function (file, next) {
      var _path = path.join(DIR, file);
      fs.readFile(_path, function (err, xml) {
        try {
          var obj = JSON.parse(parser.toJson(iconv.convert(xml)));
          //console.log(file);
          obj = obj['G-XML'].MetricGeospace.GeometricFeature[0];
          var data = {};
          var coordinates = obj.Geometry.Polygon.OuterBoundary.LinearRing.Coordinates.$t;
          data.loc = {
            type: "Polygon",
            coordinates: [coordinates.replace(/\"/g, "").split(" ").reduce(function (memo, item) {
              var val = item.split(",");
              memo.push([Number(val[0]), Number(val[1])]);
              return memo;
            }, [])]
          };
          [6, 8, 9, 14, 28].forEach(function (i) {
            var prop = obj.Property[i];
            data[prop.propertytypename] = prop.$t;
          });
          collection.update({KEYCODE1: data.KEYCODE1}, data, {upsert: true}, function (err, result) {
            next();
          });
        } catch (e) {
          console.log("exception : " + file);
          next();
        }
      });
    }, function (err) {
      callback(err);
    });
  });
}

var url = 'mongodb://127.0.0.1:27017/' + DB;

MongoClient.connect(url, function (err, db) {
  var collection = db.collection(COL);
  collection.ensureIndex({KEYCODE1: 1}, function() {
    do_import(DIR, collection, function (err) {
      collection.ensureIndex({loc: "2dsphere"}, function() {
        console.log("finish.");
      });
    });
  });
});

