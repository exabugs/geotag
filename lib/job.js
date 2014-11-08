var async = require("async");
var _ = require("underscore");
var request = require("request");
var cheerio = require("cheerio");

var HOST = "https://yoyaku.city.yokohama.lg.jp/ys/mainservlet/";

request = request.defaults({jar: true});


function do_request(path, form, callback) {
  var URL = HOST + path;
  request.post(URL, {form: form}, function (err, res, body) {
    if (!err && res.statusCode == 200) {
      var $ = cheerio.load(body);
      var token = $('input[name=TOKEN_KEY]').val();
      // console.log(body); // Print the google web page.
      callback(err, token);
    } else {
      callback(err);
    }
  });
}


function do_scenario(scenario, option, callback) {

  async.waterfall(
    [
      function (next) {
        // トップ
        var form = {
          ActionType: "LOAD",
          BeanType: "rsv.bean.RSGK001BusinessInit",
          ViewName: "RSGK001"
        };
        do_request("UserPublic", form, function (err, token) {
          next(err, token);
        })
      },
      function (token, next) {
        // ログイン
        var form = {
          ActionType: "LOGIN",
          BeanType: "rsv.bean.RSGK001BusinessLogin",
          ViewName: "RSGK001",
          NextActionType: "NONE",
          NextBeanType: "NONE",
          NextViewName: "NONE",
          LinkKbn: "",
          ID: option.ID,
          PWD: option.PW
        };
        do_request("UserRestrict", form, function (err, token) {
          next(err, token);
        })
      },
      function (token, next) {
        var form = {
          ACTIVEMODE: "RELEASE",
          HID_Y_POINT: "0",
          HID_X_POINT: "0",
          TOKEN_KEY: token,
          ISSUBMIT: "ON"
        };
        async.reduce(scenario.jobs, token, function (token, job, next) {
          _.extend(job.form, form);
          do_request("UserRestrict", job.form, function (err, token) {
            next(err, token);
          })
        }, function (err, token) {
          console.log(token);
          next(err, token);
        });
      }
    ],
    function (err, token) {
      console.log(err);
      console.log(token);
    }
  );

}

var scenario = {

  jobs: [
    {
      name: "抽選申込確認",
      form: {
        ActionType: "INIT",
        BeanType: "rsv.bean.RSGK420BusinessInit",
        ViewName: "RSGK420",
        NextActionType: "NONE",
        NextBeanType: "NONE",
        NextViewName: "NONE",
        LinkKbn: ""
      }
    },
    {
      name: "トップメニュー",
      form: {
        ActionType: "MENU",
        BeanType: "rsv.bean.RSGK001BusinessInit",
        ViewName: "RSGK001",
        hidTorikeshi: ""
      }
    },
    {
      name: "結果確認",
      form: {
        ActionType: "INIT",
        BeanType: "rsv.bean.RSGK423BusinessInit",
        ViewName: "RSGK423",
        NextActionType: "NONE",
        NextBeanType: "NONE",
        NextViewName: "NONE",
        LinkKbn: ""
      }
    }
  ]
};

var option = {
  ID: "00058664",
  PW: "WERE60MI"
};

var scenario = {

  jobs: [
    {
      name: "抽選申込",
      form: {
        ActionType: "INIT",
        BeanType: "rsv.bean.RSGK402BusinessInit",
        ViewName: "RSGK402",
        NextActionType: "NONE",
        NextBeanType: "NONE",
        NextViewName: "NONE",
        LinkKbn: ""
      }
    },
    {
      name: "施設分類：スポーツ",
      form: {
        ActionType: "CLICK",
        BeanType: "rsv.bean.RSGK402BusinessClick",
        ViewName: "RSGK402",
        KANRIKUBUN: "01",
        GOTOWAKUKUBUN: "",
        KANRIKUBUN_MEI: ""

      }
    },
    {
      name: "枠区分：横浜国際プール",
      form: {
        ActionType: "CLICK",
        BeanType: "rsv.bean.RSGK403BusinessClick",
        ViewName: "RSGK403",
        KANRIKUBUN: "01",
        GOTOWAKUKUBUN: "04",
        GOTOWAKUKUBUN_MEI: ""
      }
    },
    {
      name: "室場：サブプール１",
      form: {
        ActionType: "CLICK",
        BeanType: "rsv.bean.RSGK404BusinessClick",
        ViewName: "RSGK404",
        ShisetsuShosaiCd: "7206",
        ShisetsuShosaiMei: "",
        LST_SHISETSU: "720"
      }
    },
    {
      name: "21日",
      form: {
        ActionType: "SEARCH_POINT_RSGK407",
        BeanType: "rsv.bean.RSGK407BusinessInit",
        ViewName: "RSGK405",
        POINT_DAY: "21"
      }
    },
    {
      name: "09301130",
      form: {
        ActionType: "CLICK",
        BeanType: "rsv.bean.RSGK407BusinessClick",
        ViewName: "RSGK407",
        POINT_DAY: "20141221",
        SHISETSUSYOUSAI: "7206",
        JIKANTAI: "09301130",
        YOUBIKUBUN: "2",
        NowPos: "NONE",
        SHISETSU: "NONE",
        SHUKANRIYOUBISUU: "1",
        CELL_SPAN_FLG: "0",
        BTN_TYPE: ""
      }
    },

    {
      name: "申し込み",
      form: {
        ActionType: "MOSHIKOMI_BTN",
        BeanType: "rsv.bean.RSGK407BusinessMoshikomiBtn",
        ViewName: "RSGK407",
        POINT_DAY: "NONE",
        SHISETSUSYOUSAI: "NONE",
        JIKANTAI: "NONE",
        YOUBIKUBUN: "NONE",
        NowPos: "NONE",
        SHISETSU: "NONE",
        SHUKANRIYOUBISUU: "1",
        CELL_SPAN_FLG: "0",
        BTN_TYPE: ""
      }
    },

    {
      name: "確認。人数",
      form: {
        ActionType: "KAKUNIN_BTN",
        BeanType: "rsv.bean.RSGK408BusinessInit",
        ViewName: "RSGK407",
        POINT_DAY: "NONE",
        SHISETSUSYOUSAI: "NONE",
        JIKANTAI: "NONE",
        YOUBIKUBUN: "NONE",
        NowPos: "NONE",
        SHISETSU: "NONE",
        SHUKANRIYOUBISUU: "1",
        CELL_SPAN_FLG: "0",
        BTN_TYPE: "",
        COLINFO_CNT: ""
      }
    },
    {
      name: "利用目的",
      form: {
        ActionType: "RIYOMOKUTEKI_BTN",
        BeanType: "rsv.bean.RSGK408BusinessRiyoMokutekiSentakuBtn",
        ViewName: "RSGK408",
        NowPos: "1",
        Kibobi: "20141221",
        ShisetsuShosaiCd: "7206",
        TXT_GYOUJIMEI1201412217206: "",
        txtNinsu_1_20141221_7206: "0",
        LST_KIBOUJYUNNI_1: "5",
        MAIL_FLG: "1"
      }
    },

    {
      name: "水泳",
      form: {
        ActionType: "CLICK",
        BeanType: "rsv.bean.RSGK409BusinessRiyoMokutekiClick",
        ViewName: "RSGK409",
        NowPos: "1",
        Kibobi: "20141221",
        ShisetsuShosaiCd: "7206",
        RIYOUMOKUTEKI_CODE: "0004"
      }
    },
    {
      name: "次へ",
      form: {
        ActionType: "BACK_BTN",
        BeanType: "rsv.bean.RSGK408BusinessFromRSGK409",
        ViewName: "RSGK409",
        NowPos: "NONE",
        Kibobi: "NONE",
        ShisetsuShosaiCd: "NONE",
        RIYOUMOKUTEKI_CODE: ""
      }
    },

    {
      name: "確定",
      form: {
        ActionType: "KAKUTEI_BTN",
        BeanType: "rsv.bean.RSGK408BusinessKakuteiBtn",
        ViewName: "RSGK408",
        NowPos: "NONE",
        Kibobi: "NONE",
        ShisetsuShosaiCd: "NONE",
        TXT_GYOUJIMEI1201412217206: "",
        txtNinsu_1_20141221_7206: "0",
        LST_KIBOUJYUNNI_1: "5",
        MAIL_FLG: "1"
      }
    }
  ]
};

do_scenario(scenario, option, function (err) {
  console.log(err);
});