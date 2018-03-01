/**
 * 数组转字符串
 * @param array
 * @param separator
 * @returns {*}
 */
function array2String(array, separator) {
  if (!array) return "";
  var resultStr = "";
  array.forEach(element => {
    resultStr = resultStr + element + separator;
  });
  return resultStr.substr(0, resultStr.length - 1);
}

/**
 * 异步请求
 * @param url
 * @param callback
 */
function httpRequest(url, callback) {
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
function unicodeToChar(text) {
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
function calcChange(yesterDayEndPrice, currentPrice) {
  if (currentPrice == 0) return 99;
  var change = (currentPrice - yesterDayEndPrice) / yesterDayEndPrice;
  if (isNaN(change)) {
    return 99;
  } else {
    change = (change * 100).toFixed(2);
    return change;
  }
}

/**
 * 判断开市时间
 */
function checkTime(){
  let date = new Date();

  // 判断是否为周末
  let day = date.getDay();
  if(day == 6 || day == 0){
    return flase;
  }

  //判断当前时间
  // [4500, 12600] [18000, 25200]
  let timestamp=Math.round(date.getTime()/1000);
  let remainder = timestamp % 86400;
  if( (remainder > 4500 && remainder < 12600) || (remainder > 18000 && remainder < 25200)){
    return true;
  } else {
    return false;
  }
}

/**
 * 图标通知
 */
function setBadge(number, color) {
  chrome.browserAction.setBadgeBackgroundColor({
    'color': color
  });
  chrome.browserAction.setBadgeText({
    text: number
  });
}

/**
 * title提示
 */
function setTitle(titleStr) {
  chrome.browserAction.setTitle({
    title: titleStr
  });
}

/**
 * 桌面通知
 */
function setNotify(notifyStr) {
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