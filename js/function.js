
/**
 * dom选择
 */
const el = (selector) => document.querySelector(selector)
const elAll = (selector) => document.querySelectorAll(selector)

/**
 * 事件绑定
 */
const bindEvent = (selector, event, func) => {
  const nodeList = elAll(selector)
  if (!nodeList || nodeList.length === 0) {
    bindEventForce(selector, event, func)
  } else {
    let eventList = event.split(' ').map(e => e.trim())
    nodeList.forEach(
      node => eventList.forEach(e => node.addEventListener(e, func, false))
    )
  }
}

/**
 * 事件绑定委托，默认使用document处理event
 */
const bindEventForce = function (selector, event, func, delegation) {
  let eventList = event.split(' ').map(e => e.trim())
  eventList.forEach(e => {
    (delegation ? el(delegation) : document).addEventListener(e, (_e) => {
      const _list = elAll(selector)
      _list.forEach(
        item => (_e.target === item || item.contains(_e.target)) && func.call(item, _e)
      )
    }, false)
  })
}

/**
 * 异步请求
 * @param url
 * @param callback
 */
const httpRequest = function (url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.onreadystatechange = function () {
    if (xhr.readyState == 4) {
      callback(xhr.responseText);
    }
  }
  xhr.send();
}

/**
 * unicode 转字符串
 * @param text
 * @returns {string|XML|void}
 */
const unicodeToChar = function (text) {
  return text.replace(/\\u[\dA-F]{4}/gi,
    function (match) {
      return String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16));
    });
}

/**
 * 涨跌幅计算
 * @param yesterDayEndPrice
 * @param currentPrice
 * @returns {number}
 */
const calcChange = function (yesterDayEndPrice, currentPrice) {
  if (currentPrice == 0) return null;
  var change = (currentPrice - yesterDayEndPrice) / yesterDayEndPrice;
  if (isNaN(change)) {
    return null;
  } else {
    change = (change * 100).toFixed(2);
    return change;
  }
}

/**
 * 判断开市时间
 */
const checkTime = function () {
  let date = new Date();

  // 判断是否为周末
  let day = date.getDay();
  if (day == 6 || day == 0) {
    return flase;
  }

  //判断当前时间
  // [4500, 12600] [18000, 25200]
  let timestamp = Math.round(date.getTime() / 1000);
  let remainder = timestamp % 86400;
  if ((remainder > 4500 && remainder < 12600) || (remainder > 18000 && remainder < 25200)) {
    return true;
  } else {
    return false;
  }
}

/**
 * 图标通知
 */
const setBadge = function (number, color) {
  chrome.action.setBadgeBackgroundColor({
    'color': color
  });
  chrome.action.setBadgeText({
    text: number
  });
}

/**
 * title提示
 */
const setTitle = function (titleStr) {
  chrome.action.setTitle({
    title: titleStr
  });
}

/**
 * 桌面通知
 */
const setNotify = function (notifyStr) {
  var options = {
    dir: "ltr", //控制方向，据说目前浏览器还不支持
    lang: "utf-8",
    icon: "images/stocks48.png",
    body: notifyStr,
    tag: 'stockNotify',
    renotify: true
  };
  let notification = new Notification("价格提醒", options);
  setTimeout(function () {
    notification.close();
  }, 3000);
}