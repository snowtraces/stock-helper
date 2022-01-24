{

  let ajaxcache = {};
  let watchingStockList = [];
  let dynamicStockData = {};
  let basePath = "http://hq.sinajs.cn/?list=";
  let refreshTimeout = 0;
  let allStockArray = []
  let warningPrice = 0;

  /**
   * 隐藏提示内容
   */
  const hintHidden = function () {
    el('#wordHint').innerHTML = null
    el('#wordHint').classList.remove('hint-show')
    el('#wordHint').classList.add('hint-hidden')
  }

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
    let dataUrls = [
      'http://www.cninfo.com.cn/new/data/szse_stock.json',
      'http://www.cninfo.com.cn/new/data/fund_stock.json'
    ]
    dataUrls.forEach(url => {
      httpRequest(url, function (result) {
        let stockList = JSON.parse(result).stockList;
        stockList.forEach(stock => {
          let code = stock.code;
          let prefix = code.startsWith('6') ? 'sh' : 'sz'
          allStockArray.push(`${prefix}${stock.code}|${stock.zwjc}|${stock.pinyin.toUpperCase()}`);
        });
      })
    })

    chrome.storage.sync.get(["stock", "refreshTime", "warningPrice"], function (obj) {
      // 股票列表
      if (obj.stock) {
        watchingStockList = obj.stock.split("#");
      }
      // 设置自动刷新时间
      if (obj.refreshTime) {
        el("#period-time").value = obj.refreshTime
        setPeriodTime();
      }
      // 设置提醒价格
      if (obj.warningPrice) {
        el("#badge-price").value = obj.warningPrice;
        warningPrice = obj.warningPrice;
      }
      reBulidList();
    });
    setBadge("", "#fff");
    setTitle("");
  }

  /**
   * 刷新列表
   */
  function refreshList() {
    el("#show-list").innerHTML = null
    let nodeList = watchingStockList.map(stockCode => {
      let dataArray = dynamicStockData[stockCode];
      if (!dataArray) return;

      let change = calcChange(dataArray[2], dataArray[3]);
      let changeStr = `<span class="stock-change">--</span>`;
      if (change !== null) {
        changeStr = `<span class="stock-change ${change > 0 ? "red" : change < 0 ? "green" : ""}">${change}%</span>`;
      }

      return `<div class="stock-item"  id="stock-${stockCode}">
          <li draggable="true" id="${stockCode}">
            <span class="stock-code">${stockCode}</span>
            <span class="stock-name">${dataArray[0]}</span>
            <span class="stock-price">${(dataArray[3] * 1).toFixed(2)}</span>
            ${changeStr}
            <span class="stock-remove"><i class="material-icons">remove</i></span>
          </li>
        </div>`;
    })
    el('#show-list').innerHTML = nodeList.join('')
  }

  /**
   * 列表拖动控制和重新排序
   */
  const listDragController = function () {
    // 拖动前准备
    function startDrag(e) {
      e.dataTransfer.setData('Text', e.target.id + ';' + e.target.parentElement.id);
    }
    // 拖放时交换对象
    function exchangeElement(e) {
      e.preventDefault();
      let el = e.target;
      while (el.tagName.toLowerCase() !== 'div') {
        el = el.parentElement;
      }

      let PE = el//要插入位置的父元素
      // let CE = el.querySelector('li'); //需要交换的元素
      if (!PE.classList.contains('stock-item')) {
        return;
      }
      const data = e.dataTransfer.getData('Text').split(';');
      //交换元素
      // document.getElementById(data[1]).appendChild(CE);
      PE.before(document.getElementById(data[1]));
      reSortList();
    }

    // 重新排序
    const reSortList = function () {
      const stockCodeEls = [...elAll('.stock-code')] || []
      const stockList = stockCodeEls.map(el => el.textContent)

      watchingStockList = stockList;
      chrome.storage.sync.set({
        "stock": stockList.join("#")
      });
    }

    bindEvent('#show-list', 'dragstart', startDrag)
    bindEvent('#show-list', 'dragover', function (e) { e.preventDefault() })
    bindEvent('#show-list', 'drop', exchangeElement)
  }

  /**
   * 重建列表
   */
  function reBulidList() {
    el(".refresh-btn").classList.add("animation-rotate");
    setTimeout(_ => {
      el(".refresh-btn").classList.remove("animation-rotate");
    }, 980);
    if (watchingStockList.length === 0) {
      el("#show-list").innerHTML = null;
      return;
    }
    getCurrentPrice(basePath + watchingStockList.join(','), refreshList);
  }

  /**
   * 添加输入框内容到列表
   */
  function addToList() {
    hintHidden();
    let wordStr = el("#word").value;
    if (/(s[z|h])?[0-9]{6}/.test(wordStr)) {
      if (!watchingStockList.includes(wordStr)) {
        watchingStockList.push(wordStr);
        chrome.storage.sync.set({
          "stock": watchingStockList.join('#')
        });
      }
      reBulidList();
    }
  }

  /**
   * 搜索框提示
   */
  function searchHint(getFuc) {
    console.log("begin...");
    let timeout = 0;

    // 初始化，绑定事件
    let init = function () {
      bindEvent("#word", "keyup", doSearch)
      bindEvent("#word", "focus", doSearch)
      bindEvent("#word", "blur", hintHidden)
    }

    // 根据键盘输入内容开始查询数据库
    function doSearch(e) {
      let keycode = 'which' in e ? e.which : e.keyCode;
      if (keycode == "40" || keycode == "38") {
        let current = el("#wordHint .hintItem.hover");
        if (keycode == "40") {
          if (current) {
            current.classList.remove("hover")
            let nextItem = current.nextElementSibling;
            if (nextItem) {
              nextItem.classList.add('hover');
              el("#word").value = nextItem.querySelector('.hintItem_w').innerText
            }
          } else {
            let firstItem = el("#wordHint .hintItem:first-child");
            firstItem.classList.add('hover');
            el("#word").value = firstItem.querySelector('.hintItem_w').innerText
          }
        } else if (keycode == "38") {
          if (current) {
            current.classList.remove("hover")
            let prevItem = current.previousElementSibling;
            if (prevItem) {
              prevItem.classList.add('hover');
              el("#word").value = prevItem.querySelector('.hintItem_w').innerText
            }
          } else {
            let lastItem = el("#wordHint .hintItem:last-child");
            lastItem.classList.add('hover');
            el("#word").value = lastItem.querySelector('.hintItem_w').innerText
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
          console.log(el("#word"))
          let keyword = el("#word").value.trim();
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
    if (ajaxcache.hasOwnProperty(keyword)) {
      console.info("---从缓存中查询：" + keyword);
      let result = ajaxcache[keyword];

      renderSearchList(result)
    } else {
      console.info("***从数据库查询：" + keyword);
      if (!/s[hz][0-9]{1,6}/.test(keyword)) {
        keyword = keyword.toUpperCase();
      }

      let pattKey = new RegExp(".*" + keyword + ".*");
      let tmpCount = 0;
      let len = allStockArray.length;

      let result = {}
      for (let i = 0; i < len; i++) {
        let item = allStockArray[i];
        if (pattKey.test(item)) {
          if (tmpCount++ >= 10) break;
          let stockPair = item.split("|", 3);
          result[stockPair[0]] = stockPair[1]
        }
      }

      renderSearchList(result)
      ajaxcache[keyword] = result;
    }
  }

  function renderSearchList(result) {
    el("#wordHint").classList.remove('hint-hidden')
    el("#wordHint").classList.add('hint-show')

    let stockList = Object.keys(result).map(key => `
      <div class="hintItem">
        <span class="hintItem_w">${key}</span>
        <span class="hintItem_t" title="${result[key]}">${result[key]}</span>
      </div>
    `)

    el('#wordHint').innerHTML = stockList.join('')
  }


  // 自动刷新
  function setPeriodTime() {
    let autoRefreshTime = el("#period-time").value;
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

  // 设置提醒价格
  function setBadgePrice() {
    let badgePrice = el("#badge-price").value;
    // 保存数据
    chrome.storage.sync.set({
      "warningPrice": badgePrice
    });
  }

  // 点击添加触发，读取并刷新数据
  bindEvent("#add-btn", 'click', addToList)

  // 点击刷新触发，读取并刷新数据
  bindEvent("#getData-btn", 'click', reBulidList)

  // 点击显示到输入框
  bindEvent(".hintItem", 'click', function () {
    el('#word').value = this.querySelector('.hintItem_w').innerText
  })

  // 鼠标移入
  bindEvent(".hintItem", 'mouseover', function () {
    el('#word').value = this.querySelector('.hintItem_w').innerText
  })

  // 点击删除
  bindEvent(".stock-remove", "click", function () {
    let stockCode = this.parentElement.querySelector('.stock-code').innerText
    watchingStockList = watchingStockList.filter(_code => _code !== stockCode)
    chrome.storage.sync.set({
      "stock": watchingStockList.join('#')
    });
    reBulidList();
  });

  // 刷新周期
  bindEvent("#period-time", "change", setPeriodTime);

  // 提示价格
  bindEvent("#badge-price", "change", setBadgePrice);

  initList();
  searchHint(getSearchData);
  listDragController();


  chrome.webRequest.onBeforeSendHeaders.addListener(
    function (details) {
      if (details.type === 'xmlhttprequest') {
        var exists = false;
        for (var i = 0; i < details.requestHeaders.length; ++i) {
          if (details.requestHeaders[i].name === 'Referer') {
            exists = true;
            details.requestHeaders[i].value = 'http://finance.sina.com.cn/';
            break;
          }
        }

        if (!exists) {
          details.requestHeaders.push({ name: 'Referer', value: 'http://finance.sina.com.cn/' });
        }

        return { requestHeaders: details.requestHeaders };
      }
    },
    { urls: ['http://hq.sinajs.cn/?list=*'] },
    ["blocking", "requestHeaders", "extraHeaders"]
  );

}