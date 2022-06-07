// CmdUtils

if (!CmdUtils) var CmdUtils = {
    VERSION: chrome.runtime.getManifest().version,
    DEBUG: undefined,
    BROWSER: (typeof chrome !== "undefined")
        ? ((typeof browser !== "undefined")
            ? "Firefox"
            : "Chrome")
        : undefined,
    activeTab: null,   // tab that is currently active, updated via background.js
    selectedText: "",   // currently selected text, update via content script selection.js
    selectedHTML: ""    // currently selected html, update via content script selection.js
};

var _ = function(x, data) {
    return data
        ? TrimPath.parseTemplate(x).process(data, {keepWhitespace: true})
        : x
};

var H = Utils.escapeHtml;

// stub for original ubiquity string formatter
function L(pattern) {
    for (let sub of Array.prototype.slice.call(arguments, 1)) {
        pattern = pattern.replace("%S", sub);
    }

    return pattern;
}

CmdUtils.log = console.log;

// debug log
CmdUtils.deblog = function () {
    if(CmdUtils.DEBUG){
        console.log.apply(console, arguments);
    }
};

CmdUtils.renderTemplate = function (template, data) {
    return TrimPath.parseTemplate(template).process(data);
};

CmdUtils.CreateCommand = function CreateCommand(options) {
   return CmdManager.createCommand(options);
};

CmdUtils.tabs = {
    search(text, maxResults, callback) {
        let matcher = new RegExp(text, "i");

        chrome.tabs.query({}, tabs => {
            let results = [];
            for (let tab of tabs) {
                let match = matcher.exec(tab.title) || matcher.exec(tab.url);
                if (!match) continue;
                tab.match = match;
                results.push(tab);
                if (maxResults && results.length >= maxResults) break;
            }
            callback(results);
        });
    }
};

// closes current tab
CmdUtils.closeTab = function closeTab() {
	chrome.tabs.query({active:true,currentWindow:true},function(tabs){
        if (tabs && tabs[0]) 
            chrome.tabs.remove(tabs[0].id, function() { });
        else 
            console.error("closeTab failed because 'tabs' is not set");
	});
};

// returns active tabs URL if avaiable
CmdUtils.getLocation = function getLocation() {
    if (CmdUtils.activeTab && CmdUtils.activeTab.url)
        return CmdUtils.activeTab.url;
    else 
        return ""; 
};

// opens new tab with provided url
Utils.openUrlInBrowser = CmdUtils.addTab = function addTab(url, callback) {
    let result = browser.tabs.create({ "url": url });

    if (callback)
        result.then(callback)

    return result;
};

// gets json with xhr
CmdUtils.ajaxGetJSON = function ajaxGetJSON(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            var resp = JSON.parse(xhr.responseText);
            callback(resp, xhr);
        }
    };
    xhr.send();
};

// gets page with xhr
CmdUtils.ajaxGet = function ajaxGet(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            callback(xhr.responseText, xhr);
        }
    };
    xhr.send();
};

// performs jQuery get and returns jqXHR that implements Promise 
CmdUtils.get = function get(url) {
	return jQuery.ajax({
    	url: url,
        async: true
	});
};

// performs jQuery post and return jsXHR
CmdUtils.post = function post(url, data) {
	return jQuery.ajax({
    	url: url,
    	data: data,
        async: true
	});
};

// loads remote scripts into specified window (or background if not specified)
CmdUtils.loadScripts = function loadScripts(url, callback, wnd=window) {
    // this array will hold all loaded scripts into this window
    wnd.loadedScripts = wnd.loadedScripts || [];
    url = url || [];
    if (url.constructor === String) url = [url];

    if (typeof wnd.jQuery === "undefined") {
        console.error("there's no jQuery at " + wnd + ".");
        return false;
    }
    if (url.length == 0)
        return callback();

    let thisurl = url.shift();
    let tempfunc = function(data, textStatus, jqXHR) {
        return loadScripts(url, callback, wnd);
    };
    if (wnd.loadedScripts.indexOf(thisurl) == -1) {
        console.log("loading :::: ", thisurl);
        wnd.loadedScripts.push(thisurl);
        wnd.jQuery.ajax({
            url: thisurl,
            dataType: 'script',
            success: tempfunc,
            async: true
        });
    }
    else {
        tempfunc();
    }
};

CmdUtils.loadCSS = function(doc, id, file) {
    if (!doc.getElementById(id)) {
        let head = doc.getElementsByTagName('head')[0];
        let link = doc.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = file;
        link.media = 'all';
        head.appendChild(link);
    }
};

// updates selectedText variable
CmdUtils.updateSelection = async function (tab_id) {
    CmdUtils.selectedText = "";
    CmdUtils.selectedHtml = "";

    let results;

    try {
        results = await browser.tabs.executeScript(tab_id, {file: "/selection.js", allFrames: true});
    }
    catch (e) {
        console.error(e)
    }

    if (results && results.length)
        for (let selection of results)
            if (selection) {
                CmdUtils.selectedText = selection.text;
                CmdUtils.selectedHtml = selection.html;
                break;
            }
};

CmdUtils._internalClearSelection = function() {
    CmdUtils.selectedText = "";
    CmdUtils.selectedHtml = "";
};

CmdUtils.getActiveTab = function () {
    return CmdUtils.activeTab;
};

// called when tab is switched or changed, updates selectedText and activeTab
CmdUtils.updateActiveTab = async function () {
    CmdUtils.activeTab = null;
    CmdUtils.selectedText = '';
    CmdUtils.selectedHtml = '';

    try {
        let tabs = await browser.tabs.query({active: true, currentWindow: true})
        if (tabs.length) {
            let tab = tabs[0];
            if (tab.url.match('^https?://') || tab.url.match('^file://')) {
                CmdUtils.activeTab = tab;
                await CmdUtils.updateSelection(tab.id);
            }
        }
    }
    catch (e) {
        console.error(e);
    }
};

ContextUtils.getSelection = CmdUtils.getSelection = () => CmdUtils.selectedText;
ContextUtils.getHtmlSelection = CmdUtils.getHtmlSelection = () => CmdUtils.selectedHtml;

// TODO: getting nodes of a range
// https://stackoverflow.com/questions/667951/how-to-get-nodes-lying-inside-a-range-with-javascript/7931003#7931003

// replaces current selection with string provided
ContextUtils.setSelection = CmdUtils.setSelection = function setSelection(s) {
    if (typeof s!=='string') s = s+'';
    s = s.replace(/(['"])/g, "\\$1");
    s = s.replace(/\\\\/g, "\\");
    // http://jsfiddle.net/b3Fk5/2/

    var insertCode = `
    function replaceSelectedText(replacementText) {
        var sel, range;
        sel = window.getSelection();
        var activeElement = document.activeElement;
        if (activeElement.nodeName == "TEXTAREA" ||
            (activeElement.nodeName == "INPUT" && (activeElement.type.toLowerCase() == "text"
                || activeElement.type.toLowerCase() == "search"))) {
                var val = activeElement.value, start = activeElement.selectionStart, end = activeElement.selectionEnd;
                activeElement.value = val.slice(0, start) + replacementText + val.slice(end);
        } else {
            if (sel.rangeCount) {
                range = sel.getRangeAt(0);
                
                for (let i = 0; i < sel.rangeCount; ++i)
                    sel.getRangeAt(i).deleteContents();  

                var el = document.createElement("div");
                el.innerHTML = replacementText;
                var frag = document.createDocumentFragment(), node, lastNode;
                while ( (node = el.firstChild) ) {
                    lastNode = frag.appendChild(node);
                }
                range.insertNode(frag);
            } else {
                sel.deleteFromDocument();
            }
        }
    }
    replaceSelectedText(\``+s+`\`);`;
    if (CmdUtils.activeTab && CmdUtils.activeTab.id)
        return chrome.tabs.executeScript( CmdUtils.activeTab.id, { code: insertCode } );
    else 
        return chrome.tabs.executeScript( { code: insertCode } );
};

// for measuring time the input is changed
CmdUtils.inputUpdateTime = performance.now();
CmdUtils.timeSinceInputUpdate = function timeSinceInputUpdate() {
	return (performance.now() - CmdUtils.inputUpdateTime) * 0.001;
};

// returns command with this name
CmdUtils.getcmd = function getcmd(cmdname) {
    for (let c in CmdManager.commands)
        if (CmdManager.commands[c].name === cmdname || CmdManager.commands[c].names.indexOf(cmdname) > -1)
            return CmdManager.commands[c];
    return null;
};

// sets clipboard
CmdUtils.copyToClipboard = CmdUtils.setClipboard = function setClipboard (t) {
    var input = document.createElement('textarea');
    document.body.appendChild(input);
    input.value = t;
    input.focus();
    input.select();
    document.execCommand('Copy');
    input.remove();
};

// show browser notification with simple limiter
CmdUtils.lastNotification = "";
CmdUtils.notify = function (message, title) {
    if (typeof message === "object") {
        title = message.title;
        message = message.text;
    }
    if (CmdUtils.lastNotification === title + "/" + message) return;
    chrome.notifications.create({
        "type": "basic",
        "iconUrl": chrome.extension.getURL("/res/icons/logo.svg"),
        "title": title || "iShell",
        "message": message
    });
    CmdUtils.lastNotification = title + "/" + message;
};

var displayMessage = CmdUtils.notify;

// === {{{ CmdUtils.absUrl(data, baseUrl) }}} ===
// Fixes relative URLs in {{{data}}} (e.g. as returned by Ajax calls).
// Useful for displaying fetched content in command previews.
//
// {{{data}}} is the data containing relative URLs, which can be
// an HTML string or a jQuery/DOM object.
//
// {{{baseUrl}}} is the URL used for base
// (that is to say; the URL that the relative paths are relative to).

CmdUtils.absUrl = function (data, baseUrl) {
    switch (typeof data) {
        case "string": return data.replace(
            /<[^>]+>/g,
            tag => tag.replace(
                /\b(href|src|action)=(?![\"\']?[a-z]+:\/\/)([\"\']?)([^\s>\"\']+)\2/i,
                (_, a, q, path) =>
                    a + "=" + q + new URL(path, baseUrl).href + q));
        case "object": {
            let $data = jQuery(data);
            for (let name of ["href", "src", "action"]) {
                let sl = "*[" + name + "]", fn = function absUrl_each() {
                    this.setAttribute(name, new URL(this.getAttribute(name), baseUrl).href);
                };
                $data.filter(sl).each(fn).end().find(sl).each(fn);
            }
            return data;
        }
    }
    return null;
};

CmdUtils.previewCallback = function(pblock, callback, abortCallback) {
    var previewChanged = false;
    function onPreviewChange() {
        pblock.removeEventListener("preview-change", onPreviewChange, false);
        previewChanged = true;
        if (abortCallback) abortCallback();
    }
    pblock.addEventListener("preview-change", onPreviewChange, false);

    return function wrappedCallback() {
        if (previewChanged) return null;

        pblock.removeEventListener("preview-change", onPreviewChange, false);
        return callback.apply(this, arguments);
    };
};

CmdUtils.previewAjax = function(pblock, options) {
    var xhr;
    function abort() { if (xhr) xhr.abort() }

    var newOptions = {__proto__: options};
    for (var key in options) if (typeof options[key] === "function")
        newOptions[key] = CmdUtils.previewCallback(pblock, options[key], abort);

    // see scripts/jquery_setup.js
    var wrappedXhr = newOptions.xhr || jQuery.ajaxSettings.xhr;
    newOptions.xhr = function backgroundXhr() {
        var newXhr = wrappedXhr.apply(this, arguments);
        newXhr.mozBackgroundRequest = true;
        return newXhr;
    };

    return xhr = jQuery.ajax(newOptions);
};

// === {{{ CmdUtils.previewGet(pblock, url, data, callback, type) }}} ===
// === {{{ CmdUtils.previewPost(pblock, url, data, callback, type) }}} ===
// Does an asynchronous request to a remote web service.
// It is used just like {{{jQuery.get()}}}/{{{jQuery.post()}}},
// which is documented at [[http://docs.jquery.com/Ajax]].
// The difference is that {{{previewGet()}}}/{{{previewPost()}}} is designed to
// handle command previews, which can be cancelled by the user between the
// time that it's requested and the time it displays.  If the preview
// is cancelled, the given callback will not be called.

for (let method of ["Get", "Post"]) {
    let x = method
    CmdUtils["preview" + x] = function previewXet(pblock, url, data, cb, type) {
        if (typeof data == "function") {
            cb = data
            data = null
        }
        return CmdUtils.previewAjax(pblock, {
            type: x,
            url: url,
            data: data,
            success: cb,
            dataType: type,
        })
    }
}

CmdUtils.makeSearchCommand = function(options) {
    if (!("url" in options)) options.url = options.parser.url;
    var [baseUrl, domain] = /^\w+:\/\/([^?#/]+)/.exec(options.url) || [""];
    var [name] = [].concat(options.names || options.name);
    if (!name) name = options.name = domain;
    var htmlName = Utils.escapeHtml(name);
    if (!("icon" in options)) options.icon = baseUrl + "/favicon.ico";
    if (!("description" in options))
        options.description = L(
            "Searches %S for your words.",
            "defaultUrl" in options ? htmlName.link(options.defaultUrl) : htmlName);
    if (!("arguments" in options || "argument" in options))
        options.argument = noun_arb_text;
    if (!("execute" in options)) options.execute = CmdUtils.makeSearchCommand.execute;
    if (!("preview" in options)) {
        options.preview = CmdUtils.makeSearchCommand.preview;
        if ("parser" in options) {
            let {parser} = options;
            function fallback(n3w, old) {
                if (n3w in parser || !(old in parser)) return;
                Utils.reportWarning(
                    "makeSearchCommand: parser." + old + " is deprecated. " +
                    "Use parser." + n3w + " instead.", 2);
                parser[n3w] = parser[old];
            }
            fallback("body", "preview");
            fallback("baseUrl", "baseurl");
            if (!("baseUrl" in parser)) parser.baseUrl = baseUrl;
            if ("type" in parser) parser.type = parser.type.toLowerCase();
            parser.keys = ["title", "body", "href", "thumbnail"].filter((k) => k in parser);
            if ("log" in parser && typeof parser.log !== "function")
                parser.log = CmdUtils.makeSearchCommand.log;
        }
    }
    return CmdUtils.CreateCommand(options);
};

CmdUtils.makeSearchCommand.log = function searchLog(it, type) {
    Utils.log("SearchCommand: " + type + " =", it);
};
CmdUtils.makeSearchCommand.query = function searchQuery(target, query, charset) {
    var re = /%s|{QUERY}/g, fn = encodeURIComponent;
    if (charset) {
        //query = Utils.convertFromUnicode(charset, query);
        fn = escape;
    }
    return typeof target == "object"
        ? Object.keys(target).map(key => fn(key) + "=" + fn(target[key])).join("&")
        : target && target.replace(re, fn(query));
};
CmdUtils.makeSearchCommand.execute = function searchExecute({object: {text}}) {
    if (!text && "defaultUrl" in this)
        Utils.openUrlInBrowser(this.defaultUrl);
    else
        Utils.openUrlInBrowser(
            CmdUtils.makeSearchCommand.query(this.url, text, this.charset),
            CmdUtils.makeSearchCommand.query(this.postData, text, this.charset))
};
CmdUtils.makeSearchCommand.preview = function searchPreview(pblock, {object: {text}}) {
    if (!text) return void this.previewDefault(pblock);

    function put() {
        pblock.innerHTML =
            "<div class='search-command'>" + Array.prototype.join.call(arguments, "") + "</div>";
    }
    var {parser, global} = this, queryHtml =
        "<strong class='query'>" + Utils.escapeHtml(text) + "</strong>";
    put(L("Searches %S for: %S", Utils.escapeHtml(this.name), queryHtml),
        !parser ? "" :
            "<p class='loading'>" + L("Loading results...") + "</p>");
    if (!parser) return;

    var {type, keys} = parser;
    var params = {
        url: CmdUtils.makeSearchCommand.query(parser.url || this.url, text, this.charset),
        dataType: parser.type || "text",
        success: searchParse,
        error: function searchError(xhr) {
            put("<em class='error'>", xhr.status, " ", xhr.statusText, "</em>");
        },
    };
    var pdata = parser.postData || this.postData;
    if (pdata) {
        params.type = "POST";
        params.data = CmdUtils.makeSearchCommand.query(pdata, text, this.charset);
    }
    CmdUtils.previewAjax(pblock, params);
    function searchParse(data) {
        if (!data) {
            put("<em class='error'>" + L("Error parsing search results.") + "</em>");
            return;
        }
        if (parser.log) parser.log(data, "data");
        switch (type) {
            case "json": return parseJson(data);
            case "xml" : return parseDocument(data);
            default: return Utils.parseHtml(data, parseDocument);
        }
    }
    function parseJson(data) {
        // TODO: Deal with key names that include dots.
        function dig(dat, key) {
            var path = parser[key];
            if (path.call) return path.call(dat, dat);
            for (let p of path && path.split(".")) dat = dat[p] || 0;
            return dat;
        }
        var results = [];
        if ("container" in parser)
            for (let dat of dig(data, "container")) {
                let res = {};
                for (let key of keys) res[key] = dig(dat, key);
                results.push(res);
            }
        else {
            let vals = keys.map(k => dig(data, k));
            for (let j in vals[0])
                results.push(keys.reduce((r, k, i) => (r[k] = vals[i][j], r), {}));
        }
        onParsed(results);
    }
    function parseDocument(doc) {
        var $ = jQuery, results = [], $doc = $(doc);
        function find($_, key) {
            var path = parser[key];
            return !path ? $() : path.call ? path.call($_, $_) : $_.find(path);
        }
        if ("container" in parser)
            find($doc, "container").each(function eachContainer() {
                var res = {}, $this = $(this);
                for (let k of keys) res[k] = find($this, k);
                results.push(res);
            });
        else {
            let qs = keys.map(k => find($doc, k));
            for (let j of Utils.seq(qs[0].length))
                results.push(keys.reduce((r, k, i) => (r[k] = qs[i].eq(j), r), {}));
        }
        function pluck() { return this.innerHTML || this.textContent }
        function toCont(key) {
            for (let r of results) r[key] = r[key].map(pluck).get().join(" ");
        }
        function toAttr(key, lnm, anm) {
            for (let res of results) {
                let $_ = res[key], atr = ($_.is(lnm) ? $_ : $_.find(lnm)).attr(anm);
                res[key] = atr && Utils.escapeHtml(atr);
            }
        }
        "thumbnail" in parser && toAttr("thumbnail", "img", "src");
        "body" in parser && toCont("body");
        if (!("href" in parser)) for (let r of results) r.href = r.title;
        toAttr("href", "a", "href");
        toCont("title");
        onParsed(results);
    }
    function onParsed(results) {
        if (parser.log) parser.log(results, "results");
        for (let k of parser.plain || [])
            for (let r of results)
                r[k] = r[k] && Utils.escapeHtml(r[k]);
        let max = parser.maxResults || 10;
        if (!parser.display || parser.display === "previewList") {
            var list = "", i = 0;
            for (let {title, href, body, thumbnail} of results)
                if (title) {
                    if (href) {
                        let key = i < 35 ? (i + 1).toString(36) : "-";
                        title = ("<kbd>" + key + "</kbd>. <a href='" + href +
                            "' accesskey='" + key + "'>" + title + "</a>");
                    }
                    list += "<dt class='title'>" + title + "</dt>";
                    if (thumbnail)
                        list += "<dd class='thumbnail'><img src='" + thumbnail + "'/></dd>";
                    if (body)
                        list += "<dd class='body'>" + body + "</dd>";
                    if (++i >= max) break;
                }
            put(list
                ? ("<span class='found'>" +
                    L("Results for %S:", queryHtml) +
                    "</span><dl class='list'>" + list + "</dl>")
                : ("<span class='empty'>" +
                    L("No results for %S.", queryHtml) +
                    "</span>"));
        }
        else {
            if (results.length)
                CmdUtils.previewList2(pblock, results.slice(0, max), {
                    text: (r) => r.title,
                    subtext: (r) => r.body,
                    thumb: parser.thumbnail ? ((r) => r.thumbnail) : undefined,
                    action: (r) => chrome.tabs.create({"url": r.href, active: false})
                });
            else
                put("<span class='empty'>" +
                    L("No results for %S.", queryHtml) +
                    "</span>");
        }
        CmdUtils.absUrl(pblock, parser.baseUrl);
    }
};

// === {{{ CmdUtils.previewList(block, htmls, [callback], [css]) }}} ===
// Creates a simple clickable list in the preview block and
// returns the list element.
// * Activating {{{accesskey="0"}}} rotates the accesskeys
//   in case the list is longer than the number of available keys.
// * The buttons are disabled upon activation to prevent duplicate calls.
//   To re-enable them, make {{{callback}}} return {{{true}}}.
//
// {{{block}}} is the DOM element the list will be placed into.
//
// {{{htmls}}} is the array/dictionary of HTML string to be listed.
//
// {{{callback(id, ev)}}} is the function called
// when one of the list item becomes focused.
// *{{{id}}} : one of the keys of {{{htmls}}}
// *{{{ev}}} : the event object
//
// {{{css}}} is an optional CSS string inserted along with the list.

CmdUtils.previewList = function(block, htmls, callback, css) {
    var {escapeHtml} = Utils, list = "", num = 0, CU = this;
    for (let key in htmls) {
        let k = ++num < 36 ? num.toString(36) : "-";
        list += ('<li key="' + escapeHtml(key) + '" accesskey="' + k + '" class="preview-list-item"><span '
             + 'class="preview-item-key">' + k + '.&nbsp;</span><span class="preview-item-text">'
             + htmls[key] + '</span></li>');
    }
    block.innerHTML = (
        '<ol id="preview-list">' +
        '<style>' + CmdUtils.previewList.CSS + (css || "") + '</style>' + list + '</ol>');
    var ol = block.firstChild, start = 0;
    function onPreviewListClick(ev) {
        ev.preventDefault();
        var {target} = ev;
        while (!target.getAttribute("key"))
            target = target.parentNode;
        callback.call(this, target.getAttribute("key"), ev);
    }
    callback && ol.addEventListener("click", onPreviewListClick, false);
    callback && ol.addEventListener("mousedown", function (ev) {
        if (ev.which === 2)
            onPreviewListClick(ev)
    }, false);
    return ol;
};
CmdUtils.previewList.CSS = `\
  #preview-list {margin: 0; padding: 2px; list-style-type: none}
  #preview-list > li {position: relative; min-height: 3ex; margin-right: 3px; cursor: pointer}
  #preview-list > li:hover {outline: 1px solid;}
`;

CmdUtils.previewList2 = function(block, items, fs, css) {
    
    let lines = [];
    for (let i of items) {
        let html = "";
        let thumb = fs.thumb? fs.thumb(i): undefined;

        if (thumb)
            html += `<img class='image' src='${thumb}'>`
        else
            html += "<div></div>";

        let text = fs.text(i);
        let subtext = fs.subtext(i);

        html += `<div class='cnt'><div class='text'>${text}</div>`;

        if (subtext)
            html += `<div class='subtext'>${subtext}</div>`;

        html += "</div>";

        lines.push(html);
    }

    return CmdUtils.previewList(block, lines, (i, e) => fs.action(items[i], e),
        `
         .preview-list-item {
            white-space: nowrap;
            display: flex;
            flex-flow: row nowrap;
            align-content: center;
         }
         .preview-list-item > span:nthchild(1) {
            flex 0 1 auto;
         }
         .preview-list-item > span:nthchild(2) {
            flex 1 1 auto;
         }
         .preview-item-key {
            display: block;
            ${fs.thumb? 'width: 18px;': 'width: 16px;'}
            align-self: center;
            flex 0 1 auto;
         }
         .preview-item-text {
            color: #45BCFF;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 490px;
            display: flex;
            flex-flow: row nowrap;
            align-content: center;
         }
         .image {
            width: 32px;
            height: 32px;
            object-fit: contain;
            align-self: center;
            float: left;
            margin-top: 5px;
            margin-bottom: 5px;
            margin-right: 5px;
            display: inline-block;
            flex: 0 1 auto;
         }
         .cnt {
            flex: 1 1 auto;
            min-width: 0;
            align-self: center;
         }
         .subtext {
            font-size: x-small;
            padding-left: 10px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            color: #FD7221;
         }
         .text {
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
         }
         ${css? css: ""}`
    );
};

// Some legacy code

(function ( $ ) {
    $.fn.blankify = function( url ) {
        return this.find("a").not('[href^="http"],[href^="//:"],[href^="mailto:"],[href^="#"]').each(function() {
            $(this).attr("target", "_blank").attr('href', function(index, value) {
                if (value.substr(0,1) !== "/") value = "/"+value;
                return url + value;
            });
});
        };
}( jQuery ));

// https://stackoverflow.com/questions/8498592/extract-hostname-name-from-string
function url_domain(data) {
    var    a      = document.createElement('a');
           a.href = data;
    return a.hostname;
}

(function ( $ ) {
    $.fn.loadAbs = function( url, complete ) {
        var result = this;
        return this.load(url, function() {
            url = "http://"+url_domain( url );
            result.find("a")
                    .not('[href^="http"],[href^="//:"],[href^="mailto:"],[href^="#"]')
                    .attr("target", "_blank")
                    .attr('href', function(index, value) {
                if (typeof value === "undefined") return url;
                if (value.substr(0,1) !== "/") value = "/" + value;
                return url + value;
            });
            result.find("img")
                    .not('[src^="http"],[src^="//:"],[src^="mailto:"],[src^="#"]')
                    .attr('src', function(index, value) {
                if (typeof value === "undefined") return url;
                if (value.substr(0,1) !== "/") value = "/" + value;
                return url + value;
            });
            if (typeof complete === 'function') complete();
        });
    };
}( jQuery ));

