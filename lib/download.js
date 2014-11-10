"use strict";

// http://qiita.com/hamichamp/items/ac9e80f1078febb9f1b9
// http://e-stat.go.jp/SG2/eStatGIS/page/download.html

// ガーデンプレイス : lat=139.713183&lon=35.642108
// 渋谷駅 : lat=139.701334&lon=35.658517

// db.h22ka.ensureIndex( { loc: "2dsphere" } )
// db.h22ka.ensureIndex( { KEYCODE1: 1 } )


var async = require("async");
var _ = require("underscore");
var fs = require("fs");
var path = require("path");
var spawn = require('child_process').spawn;
var request = require("request").defaults({jar: true});
var cheerio = require("cheerio");


var HOST = "http://e-stat.go.jp/SG2/eStatGIS/";

var censusId = "A002005212010"; // 平成２２年国勢調査（小地域）　2010/10/01

var MAX_CONN = 3;

function get_source(dir, callback) {

  function do_request(path, form, callback) {
    var URL = HOST + "Service.asmx/" + path;
    request.post(URL, {form: form}, function (err, res, body) {
      if (!err && res.statusCode == 200) {
        var bar = body.match(/<string .*>(.*)<\/string>/);
        var a = _.unescape(bar[1]);
        var $ = cheerio.load(a);
        callback(err, $);
      } else {
        callback(err);
      }
    });
  }

  async.waterfall(
    [
      function (next) {
        request.get(HOST + "page/download.html", function (err) {
          next(err);
        });
      },
      function (next) {
        var form = {
          censusId: censusId
        };
        var result = {};
        do_request("GetDownloadStep3PrefListTag", form, function (err, $) {
          $('option').each(function () {
            result[$(this).attr("value")] = $(this).text();
          });
          next(err, result);
        });
      },
      function (prefs, next) {
        var result = {};

        // prefs = {"01": "北海道"};

        async.eachLimit(Object.keys(prefs), MAX_CONN, function (key, next) {
          var form = {
            censusId: censusId,
            chiikiName: prefs[key]
          };
          do_request("GetDownloadStep3CityListTag", form, function (err, $) {
            $('option').each(function () {
              result[$(this).attr("value")] = $(this).text();
            });
            next(err);
          });
        }, function (err) {
          next(err, result);
        });
      },
      function (cities, next) {
        var result = {};
        async.eachLimit(Object.keys(cities), MAX_CONN, function (ccode, next) {
          var form = {
            censusId: censusId,
            statIds: "T000572", // 男女別人口総数及び世帯総数
            forHyou: false, // 境界データ
            cityIds: ccode
          };
          do_request("GetDownloadStep4ListTokeiTag", form, function (err, $) {
            $("a", ".tdw35p").each(function () { // 世界測地系緯度経度・G-XML形式
              var values = $(this).attr("onclick").match(/dodownload\((.*)\)/)[1].replace(/'/g, "").split(",");
              result[values[5]] = values[1];
            });
            next(err, result);
          });
        }, function (err) {
          next(err, result);
        });
      },
      function (cities, next) {
        var files = [];
        async.eachLimit(Object.keys(cities), MAX_CONN, function (ccode, next) {
          var form = {
            state: "",
            pdf: 0,
            id: cities[ccode],
            cmd: "D001",
            type: 6,
            tcode: censusId,
            acode: "",
            ccode: ccode
          };

          var name = "h22ka" + ccode + ".xml";
          var file = fs.createWriteStream(path.join(dir, name));
          var zip = spawn('funzip');
          zip.stdout.pipe(file);

          request.post(HOST + "downloadfile.ashx", {form: form})
            .pipe(zip.stdin)
            .pipe(file);

          file.on('close', function () {
            console.log(file.path);
            files.push(name);
            next();
          });
        }, function (err) {
          next(err, files);
        });
      }
    ],
    function (err, files) {
      callback(err, files);
    }
  );

}

get_source("/tmp/h22ka", function (err, files) {
  console.log("finish");
});
