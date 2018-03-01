$(function () {

  var ajaxcache = new Map();
  var chosenArray = new Set();
  var resultMap = new Map();
  var basePath = "http://hq.sinajs.cn/?list=";
  var dataPre = "hq_str_";
  var refreshTimeout = 0;
  var warningPrice = 0;
  var shArray = new Array();

  // 隐藏提示内容
  function hintHidden() {
    $("#wordHint").empty().css("border", "1px solid transparent").css("background", "transparent");
  }

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
    // httpRequest("http://www.sse.com.cn/js/common/ssesuggestdataAll.js", function(result){
    //   let reg = /_t\.push\({val:\"([0-9]{6})\",val2:\"(.*)\",val3:\"(.*)\"}\)/gi;
    //   let stockArray = result.split(";");
    //   stockArray.shift();
    //   let tmpStr = ""
    //   stockArray.forEach(element => {
    //     element.match(reg);
    //     shArray.push("sh" + RegExp.$1 + "|" + RegExp.$2 + "|" + RegExp.$3.toUpperCase());
    //   });
    // })
    httpRequest("http://www.ctxalgo.com/api/stocks", function(result){
      let reg = /\{?\"(.*)\":\"(.*)\"\}?/gi;
      let stockArray = result.split(",");
      let tmpStr = "";
      stockArray.forEach(element => {
        element.match(reg);
        shArray.push(RegExp.$1 + "|" + unicodeToChar(RegExp.$2) + "|" + RegExp.$3.toUpperCase());
      });
    })
    httpRequest("http://www.ctxalgo.com/api/indices", function(result){
      let reg = /\{?\"(.*)\":\"(.*)\"\}?/gi;
      let stockArray = result.split(",");
      let tmpStr = "";
      stockArray.forEach(element => {
        element.match(reg);
        shArray.push(RegExp.$1 + "|" + unicodeToChar(RegExp.$2) + "|" + RegExp.$3.toUpperCase());
      });
    })

    chrome.storage.sync.get(["stock", "refreshTime", "warningPrice"], function (obj) {
      // 股票列表
      if (obj.stock) {
        let temArray = obj.stock.split("#");
        chosenArray = new Set(temArray);
      }
      // 设置自动刷新时间
      if (obj.refreshTime) {
        $("#period-time").val(obj.refreshTime);
        setPeriodTime();
      }
      // 设置提醒价格
      if (obj.warningPrice) {
        $("#badge-price").val(obj.warningPrice);
        warningPrice = obj.warningPrice;
      }
      reBulidList();
    });
    setBadge("","#fff");
    setTitle("");
  }

  // 刷新列表
  function refreshList() {
    $("#show-list").empty();
    chosenArray.forEach(element => {
      // if (stockList[element]) {
      var dataArray = resultMap.get(element);
      if (!dataArray) return;
      var change = calcChange(dataArray[2], dataArray[3]);
      let changeStr;
      if (change != 99) {
        let tag = change > 0 ? "red" : (change < 0 ? "green" : "");
        changeStr = "<span class=\"stock-change " + tag + "\">" + change + "%" + "</span>";
      } else {
        changeStr = "<span class=\"stock-change\">--</span>"
      }
      $("#show-list").append("<div class=\"stock-item\"  id=\"stock-" + element + "\"><li draggable=\"true\" id=\"" + element + "\"><span class=\"stock-code\">" + element +
        "</span><span class=\"stock-name\">" + dataArray[0] + "</span>" +
        "<span class=\"stock-price\">" + (dataArray[3] * 1).toFixed(2) + "</span>" +
        changeStr +
        "<span class=\"stock-remove\"><i class=\"material-icons\">remove</i></span>" + "</li></div>");
      // }
    });
  }

  // 列表拖动控制和重新排序
  function listDragController(){
    // 拖动前准备
    function startDrag(e) {
      e.dataTransfer.setData('Text', e.target.id + ';' + e.target.parentElement.id);
    }
    // 拖放时交换对象
    function exchangeElement(e) {
      e.preventDefault();
      let el = e.target;
      console.info(el.tagName)
      let PE, //要插入位置的父元素
        CE; //需要交换的元素
      if (el.tagName.toLowerCase() !== 'div') {
        el = el.parentElement;
      }
      if (el.tagName.toLowerCase() !== 'div') {
        el = el.parentElement;
      }
      PE = el;
      CE = el.querySelector('li');
      if (!PE.classList.contains('stock-item')) {
        return;
      }
      const data = e.dataTransfer.getData('Text').split(';');
      //交换元素
      document.getElementById(data[1]).appendChild(CE);
      PE.appendChild(document.getElementById(data[0]));
      reSortList();
    }
    // 重新排序
    function reSortList(){
      let stockCode = $(".stock-code");
      let tmpArray = new Array();
      $.each(stockCode,function(i,element){
        tmpArray.push(element.textContent);
      })
      chosenArray = new Set(tmpArray);
      chrome.storage.sync.set({
        "stock": array2String(tmpArray, "#")
      });
    }

    const dragCon = document.getElementById('show-list');
    dragCon.addEventListener('dragstart', startDrag, false);
    dragCon.addEventListener('dragover', function (e) {
      e.preventDefault();
    }, false);
    dragCon.addEventListener('drop', exchangeElement, false);
  }

  // 重建列表
  function reBulidList() {
    $(".refresh-btn").addClass("animation-rotate");
    setTimeout(() => {
      $(".refresh-btn").removeClass("animation-rotate");
    }, 980);
    if (chosenArray.size <= 0) {
      $("#show-list").empty();
      return;
    }
    var path = basePath;
    chosenArray.forEach(element => {
      path = path + element + ",";
    });
    loadScript(path, refreshList);
  }

  // 添加输入框内容到列表
  function addToList() {
    hintHidden();
    var wordStr = $("#word").val();
    var patt = new RegExp("(s[z|h])?[0-9]{6}");
    if (patt.test(wordStr)) {
      chosenArray.add($("#word").val());
      chrome.storage.sync.set({
        "stock": array2String(chosenArray, "#")
      });
      reBulidList();
    }
  }

  // 点击添加触发，读取并刷新数据
  $("#add-btn").on("click", addToList);

  // 点击刷新触发，读取并刷新数据
  $("#getData-btn").on("click", reBulidList);

  // 搜索框提示
  function searchHint(getFuc) {
    console.log("begin...");
    var wordEl = $("#word");
    var hintCotainer = $("#wordHint");
    var timeout = 0;

    // 初始化，绑定事件
    var init = function () {
      wordEl.bind("keyup", doSearch);
      wordEl.bind("focus", doSearch);
      wordEl.bind("blur", hintHidden);
    }

    // 根据键盘输入内容开始查询数据库
    function doSearch(e) {
      var keycode = 'which' in e ? e.which : e.keyCode;
      if (keycode == "40" || keycode == "38") {
        var current = hintCotainer.find(".hintItem.hover");
        if (keycode == "40") {
          if (current.length > 0) {
            var nextItem = current.removeClass("hover").next();
            if (nextItem.length > 0) {
              nextItem.addClass('hover');
              wordEl.val(nextItem.children(".hintItem_w").html());
            }
          } else {
            var firstItem = hintCotainer.find(".hintItem:first");
            firstItem.addClass("hover");
            wordEl.val(firstItem.children(".hintItem_w").html());
          }
        } else if (keycode == "38") {
          if (current.length > 0) {
            var prevItem = current.removeClass("hover").prev();
            if (prevItem.length > 0) {
              prevItem.addClass('hover');
              wordEl.val(prevItem.children(".hintItem_w").html());
            }
          } else {
            var lastItem = hintCotainer.find(".hintItem:last");
            lastItem.addClass("hover");
            wordEl.val(lastItem.children(".hintItem_w").html());
          }
        }
      } else if (keycode == "13") {
        // 回车
        addToList();
        hintHidden();
      } else {
        clearTimeout(timeout);
        timeout = setTimeout(function () {
          // 异步请求获取提示词
          var keyword = $.trim(wordEl.val());
          if (keyword == "" || keyword == null) {
            return;
          }
          getFuc(keyword);
        }, 200);
      }
    }

    // 初始化
    init();
  }

  function getSearchData(keyword) {
    if (ajaxcache.has(keyword)) {
      console.info("---从缓存中查询：" + keyword);
      var resultMap = ajaxcache.get(keyword);
      $("#wordHint").empty().css("border", "1px solid #ccc").css("background", "#fff");
      resultMap.forEach(function (i, n) {
        $("#wordHint").append(
          "<div class=\"hintItem\">" + "<span class=\"hintItem_w\">" + n +
          "</span>" + "<span class=\"hintItem_t\" title=\"" + resultMap.get(n) + "\">" + resultMap.get(n) + "</span>" +
          "</div>");
      })
    } else {
      console.info("***从数据库查询：" + keyword);
      let reg = new RegExp("s[hz][0-9]{1,6}");
      if (!reg.test(keyword)) {
        keyword = keyword.toUpperCase();
      } 

      var pattKey = new RegExp(".*" + keyword + ".*");
      var resultMap = new Map();
      let tmpCount = 0;

      for (i = 0, len = shArray.length; i < len; i++) {
        let element = shArray[i];
        if (pattKey.test(element)) {
          if (tmpCount++ >= 10) break;
          let _stockmeta = element.split("|", 3);
          resultMap.set(_stockmeta[0], _stockmeta[1])
        }
      }

      $("#wordHint").empty().css("border", "1px solid #ccc").css("background", "#fff");
      resultMap.forEach(function (i, n) {
        $("#wordHint").append(
          "<div class=\"hintItem\">" + "<span class=\"hintItem_w\">" + n +
          "</span>" + "<span class=\"hintItem_t\" title=\"" + resultMap.get(n) + "\">" + resultMap.get(n) + "</span>" +
          "</div>");
      })
      ajaxcache.set(keyword, resultMap);
    }
  }

  // 点击显示到输入框
  $(document).on("click", ".hintItem", function () {
    $("#word").val($(this).children(".hintItem_w").html());
  })
  // 鼠标移入
  $(document).on("mouseover", ".hintItem", function () {
    $("#word").val($(this).children(".hintItem_w").html());
  })
  //点击删除
  $(document).on("click touchend", ".stock-remove", function () {
    var stockCode = $(this).siblings(".stock-code").html();
    chosenArray.delete(stockCode);
    chrome.storage.sync.set({
      "stock": array2String(chosenArray, "#")
    });
    reBulidList();
  });

  // 自动刷新
  function setPeriodTime() {
    var autoRefreshTime = $("#period-time").val();
    // 保存数据
    chrome.storage.sync.set({
      "refreshTime": autoRefreshTime
    });

    clearTimeout(refreshTimeout);
    if (isNaN((autoRefreshTime * 1)) || autoRefreshTime * 1 <= 0) return;

    function doRefresh() {
      reBulidList();
      chrome.storage.sync.get("refreshTime", function (obj) {
        if (obj.refreshTime) {

          refreshTimeout = setTimeout(doRefresh, obj.refreshTime * 1000);
        }
      })
    }
    doRefresh();
  }
  $("#period-time").on("change", setPeriodTime);

  // 设置提醒价格
  function setBadgePrice() {
    let badgePrice = $("#badge-price").val();
    // 保存数据
    chrome.storage.sync.set({
      "warningPrice": badgePrice
    });
  }
  $("#badge-price").on("change", setBadgePrice);

  initList();
  searchHint(getSearchData);
  listDragController();
});