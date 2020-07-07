{

  let watchingStockList = [];
  let dynamicStockData = {};
  let basePath = "http://hq.sinajs.cn/?list=";
  let refreshTimeout = 0;
  let autoRefreshTime = 0;
  let warningPrice = 0;

  /**
   * 动态加载数据，加载完成后回调读取数据
   */
  const getCurrentPrice = function (url, callback) {
    dynamicStockData = {}
    httpRequest(url, function (result) {
      let stockLines = result.split(';');
      stockLines.pop();

      let reg = /var hq_str_(.*)=\"(.*)\"/gi;
      stockLines.forEach(line => {
        line.match(reg);
        dynamicStockData[RegExp.$1] = RegExp.$2.split(",");
      });
      callback();
    });
  }

   /**
   * 初始化列表
   */
  const initList = function () {
    chrome.storage.sync.get(["stock", "refreshTime", "warningPrice"], function (obj) {
      // 股票列表
      if (obj.stock) {
        watchingStockList = obj.stock.split("#");
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
      watchingStockList = obj.stock.split("#");
    });
    watchingStockList.forEach(stockCode => {
      var dataArray = dynamicStockData[stockCode];
      if (dataArray) {
        var change = calcChange(dataArray[2], dataArray[3]);
        if (change !== null) {
          let tag = change > 0 ? "red" : (change < 0 ? "green" : "");
          if (Math.abs(change) >= warningPrice) titleInfo = titleInfo + dataArray[0] + "   " + change + "\n";
          if (warningPrice > 0 && Math.abs(change) >= warningPrice && badgeFlage == 1) {
            setBadge(Math.abs(change) + "", tag);
            badgeFlage = 0;
          }
        }
      }
    });
    badgeFlage = 1;
    if(titleInfo){
      titleInfo = titleInfo.substr(0, titleInfo.length - 1);
      setTitle(titleInfo);
      setNotify(titleInfo);
    }
  }

  // 重建列表
  function reBulidList() {
    if (dynamicStockData.size <= 0) {
      return;
    }
    getCurrentPrice(basePath + watchingStockList.join(','), refreshList);
  }

  // 自动刷新
  function setPeriodTime(time) {
    var autoRefreshFlag = 0;
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
}