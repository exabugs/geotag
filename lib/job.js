var async = require("async");
var _ = require("underscore");
var request = require("request");
var cheerio = require("cheerio");
var parser = require("xml2json");
//var zlib = require("zlib");
var fs = require("fs");
var path = require("path");
var uuid = require("node-uuid");
var os = require("os");
var spawn = require('child_process').spawn;



var HOST = "http://e-stat.go.jp/SG2/eStatGIS/";

var censusId = "A002005212010"; // 平成２２年国勢調査（小地域）　2010/10/01

// LABEL id='step2_label_T000572' for='step2_T000572'&gt;男女別人口総数及び世帯総数&lt;/LABEL


request = request.defaults({jar: true});


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

        prefs = {"01": "北海道"};

        async.eachSeries(Object.keys(prefs), function (key, next) {
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
        async.eachSeries(Object.keys(cities).slice(0, 1), function (ccode, next) {
          var form = {
            censusId: censusId,
            statIds: "T000572", // 男女別人口総数及び世帯総数
            forHyou: false, // 境界データ
            cityIds: ccode
          };
          do_request("GetDownloadStep4ListTokeiTag", form, function (err, $) {
            $("a", ".tdw35p").each(function () { // 世界測地系緯度経度・G-XML形式
              var values = $(this).attr("onclick").match(/dodownload\((.*)\)/)[1].split(",");
              result[values[5]] = values[1].slice(1, -1);
            });
            next(err, result);
          });
        }, function (err) {
          next(err, result);
        });
      },
      function (cities, next) {
        async.eachSeries(Object.keys(cities), function (ccode, next1) {
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
          //var filename = path.join(os.tmpDir(), "tmp_" + uuid.v4());
          var filename = path.join("/tmp", "tmp_" + uuid.v4());
          var file = fs.createWriteStream(filename);
        //  var unzip = zlib.createUnzip();

          var zip = spawn('funzip');

          zip.stdout.pipe(file);

          request.post(HOST + "downloadfile.ashx", {form: form})
            .on('response', function (response) {
              console.log(response.statusCode);
              console.log(response.headers['content-type']);
              var encoding = response.headers['content-encoding'];

              //file = response.headers['content-disposition'].split("=")[1];
              //console.log(file);
            })
            .pipe(zip.stdin)
            .pipe(file);
          file.on('close', function () {
            console.log("");
            var x = fs.createReadStream(filename);
            var y = fs.createWriteStream(filename + ".xml");
            x
                 //  .pipe(unzip)
              .pipe(y);
            y.on("close", function () {
              next1();
            });
          });
        }, function (err) {
          next(err, result);
        });
      }
    ],
    function (err, cities) {
      var k = Object.keys(cities);
      console.log(err);
      console.log(cities);
    }
  );

}

get_source("/tmp", function (err, files) {

});
