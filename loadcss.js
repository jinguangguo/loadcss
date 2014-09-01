// 异步加载css
(function(head) {
    var cssLoadedList = {};

    var util = {

        log: function (str) {
            var win = window;
            if (win.console && win.console.log) {
                win.console.log(str);
            }
        },

        isFunction: function (f) {
            return f instanceof Function;
        },

        client: (function () {
            var UA_OPERA = 'opera',
                UA_CHROME = 'chrome',
                UA_SAFARI = 'safari',
                UA_FIREFOX = 'firefox',
                UA_IE = 'ie';

            return function () {
                var win = window,
                    ua = win.navigator.userAgent,
                    browser,
                    version;

                // opera
                if (win.opera) {
                    browser = UA_OPERA;
                    version = win.parseFloat(win.opera.version(), 10);
                }

                // chrome & safari
                if (/AppleWebKit\/(\S+)/.test(ua)) {
                    //确定是Chrome还是Safari
                    if (/Chrome\/(\S+)/.test(ua)) {
                        browser = UA_CHROME;
                        version = win.parseFloat(RegExp["$1"], 10);
                    } else if (/Version\/(\S)/.test(ua)) {
                        browser = UA_SAFARI;
                        version = win.parseFloat(RegExp["$1"], 10);
                    } else {
                        //近似地确定版本号
                        var safariVersion = 1;
                        if (engine.webkit < 100) {
                            safariVersion = 1;
                        } else if (engine.webkit < 312) {
                            safariVersion = 1.2;
                        } else if (engine.webkit < 412) {
                            safariVersion = 1.3;
                        } else {
                            safariVersion = 2;
                        }
                        browser = UA_SAFARI;
                        version = safariVersion;
                    }
                }

                // firefox
                if (/Firefox\/(\S)/.test(ua)) {
                    browser = UA_FIREFOX;
                    version = win.parseFloat(RegExp["$1"], 10);
                }

                // ie
                if (/MSIE ([^;]+)/.test(ua)) {
                    browser = UA_IE;
                    version = win.parseFloat(RegExp["$1"], 10);
                }

                return {
                    browser: browser,
                    version: version
                }
            };
        })()
    };

    var cssLoader = {
        /**
         * 加载css文件
         * @param {Object} url
         */
        importCSS: function (url, callback) {
            var docHead, link, img, firefox, opera, chrome, poll, client, browser, version;

            //成功之后做的事情
            var wellDone = function () {
                cssLoadedList[url] = true;
                clear();
                util.log('[' + browser + '] load css file success:' + url);
                callback();
            };

            var clear = function () {
                timer = null;
                link.onload = link.onerror = null;
                docHead = null;
            };

            if (cssLoadedList[url]) {
                util.isFunction(callback) && callback();
                return;
            }

            docHead = head;

            link = document.createElement("link");
            link.rel = "stylesheet";
            link.type = "text/css";
            link.href = url;

            link.onerror = function () {
                clear();
                util.log('[' + browser + ']load css file error:' + url);
            };

            if (util.isFunction(callback)) {

                // 如果是IE系列,直接load事件
                client = util.client();
                browser = client.browser;
                version = client.version;

                if (browser == 'ie' || (browser == 'firefox' && version > 8.9) ||
                    browser == 'opera' || (browser == 'chrome' && version > 19) ||
                    (browser == 'safari' && version > 5.9)) {

                    // IE和opera浏览器用img实现
                    link.onload = function () {
                        wellDone();
                    };

                    docHead.appendChild(link);

                } else if ((browser == 'chrome' && version > 9) || (browser == 'safari' && version > 4.9) || browser == 'firefox') {

                    docHead.appendChild(link);
                    // 如果是非IE系列
                    img = document.createElement('img');
                    img.onerror = function () {
                        img.onerror = null;
                        img = null;
                        wellDone();
                    };
                    img.src = url;

                } else { //轮询实现

                    docHead.appendChild(link);
                    poll = function () {
                        if (link.sheet && link.sheet.cssRules) {
                            wellDone();
                        } else {
                            setTimeout(poll, 300);
                        }
                    };
                    poll();

                }
            } else {
                docHead.appendChild(link);
            }
        },
        /**
         * 异步加载所需的文件
         * @param {Array|String} urls
         * @param {Function} callback
         * @param {Boolean} [option=true] isOrdered 是否需要按序加载，默认是不需要按序加载
         */
        loadCss: function (urls, callback, isOrdered) {
            var _self = this,
                isOrder = isOrdered === true ? true : false,
                isAllDone = false,
                now,
                i,
                len,
                load,
                orderLoad,
                urls = ('string' === typeof urls) ? [urls] : urls;

            len = urls.length;

            /**
             * 根据后缀判断是js还是css文件
             * @param {Object} url
             * @param {Object} done
             */
            load = function (url, done) {
                if (/\.css(?:\?\S+|#\S+)?$/.test(url) === false) {
                    throw new Error('the file must be the css file!!!');
                }
                _self.importCSS(url, done);
            };

            orderLoad = function () {
                now = urls.shift();
                if (now) {
                    load(now, orderLoad);
                } else {
                    callback && callback();
                }
            };

            if (!len || len < 1) {
                throw new Error('urls is not allowed empty!');
                return;
            }

            // 如果有顺序
            if (isOrder) {
                orderLoad();
            } else {
                // 如果没有顺序加载
                for (i = 0, now = 0; i < len; i++) {
                    load(urls[i], function () {
                        now += 1;
                        if (now == len) {
                            callback && callback();
                        }
                    });
                }
            }
        }
    };


    var DEBUG_STATIC_URL = '/static';
    var PRODUCT_STATIC_URL = 'yun-static';

    var getFormatedUrls = function(urls) {
        urls = ('string' === typeof urls) ? [urls] : urls;

        var replace = function(url) {
            return url.replace(/(\S+):(\S+)/, function($0, $1, $2) {
                return DEBUG_STATIC_URL + '/' + $1 + '/' + $2;
            });
        };

        for (var i = 0, len = urls.length; i < len; i++) {
            urls[i] = replace(urls[i]);
        }

        return urls;
    };

    // 暴露全局-构造门面
    require.loadCss = function(urls, callback, isOrder) {
        cssLoader.loadCss(getFormatedUrls(urls), callback, isOrder);
    }
})(head);
