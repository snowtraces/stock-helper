$(function () {

  var ajaxcache = new Map();
  var chosenArray = new Set();
  var resultMap = new Map();
  var basePath = "http://hq.sinajs.cn/?list=";
  var dataPre = "hq_str_";
  var refreshTimeout = 0;
  var warningPrice = 0;
  var autoRefreshTime = 0;

  // 动态加载数据，加载完成后回调读取数据
  function loadScript(url, callback) {
    resultMap.clear();
    httpRequest(url, function (result) {
      // 读取string，结果放入本地
      let reg = /var hq_str_(.*)=\"(.*)\"/gi;
      let stockArray = result.split(";");
      stockArray.pop();
      stockArray.forEach(element => {
        element.match(reg);
        resultMap.set(RegExp.$1, RegExp.$2.split(","));
      });
      callback();
    });
  }

  // 初始化列表
  function initList() {
    chrome.storage.sync.get(["stock", "refreshTime", "warningPrice"], function (obj) {
      // 股票列表
      if (obj.stock) {
        let temArray = obj.stock.split("#");
        chosenArray = new Set(temArray);
      }
      // 设置自动刷新时间
      if (obj.refreshTime) {
        setPeriodTime(obj.refreshTime);
      }

      // 设置提醒价格
      if (obj.warningPrice) {
        warningPrice = obj.warningPrice;
      }
    });
  }

  // 刷新列表
  function refreshList() {
    let titleInfo = "";
    let badgeFlage = 1;
    if (autoRefreshTime <= 0) return;
    chrome.storage.sync.get(["stock", "warningPrice"], function (obj) {
      warningPrice = obj.warningPrice * 1;
      let temArray = obj.stock.split("#");
      chosenArray = new Set(temArray);
    });
    chosenArray.forEach(element => {
      var dataArray = resultMap.get(element);
      if (dataArray) {
        var change = calcChange(dataArray[2], dataArray[3]);
        if (change != 99) {
          let tag = change > 0 ? "red" : (change < 0 ? "green" : "");
          if (Math.abs(change) >= warningPrice) titleInfo = titleInfo + dataArray[0] + "    " + change + "\n";
          if (warningPrice > 0 && badgeFlage == 1) {
            setBadge(change, tag);
            badgeFlage = 0;
          }
        }
      }
    });
    badgeFlage = 1;
    if(titleInfo){
      setTitle(titleInfo);
      setNotify(titleInfo);
    }
  }

  // 重建列表
  function reBulidList() {
    if (chosenArray.size <= 0) {
      return;
    }
    var path = basePath;
    chosenArray.forEach(element => {
      path = path + element + ",";
    });
    loadScript(path, refreshList);
  }

  // 自动刷新
  function setPeriodTime(time) {
    let autoRefreshFlag = 0;
    autoRefreshTime = time;
    clearTimeout(refreshTimeout);

    // 刷新数据
    function doRefresh() {
      chrome.storage.sync.get("refreshTime", function (obj) {
        autoRefreshTime = obj.refreshTime;
      })
      if (autoRefreshFlag && autoRefreshTime > 0 && checkTime()) reBulidList();
      autoRefreshFlag = 1;
      refreshTimeout = setTimeout(doRefresh, autoRefreshTime == 0 ? 3000 : autoRefreshTime * 1000);
    }
    doRefresh();
  }

  initList();
});