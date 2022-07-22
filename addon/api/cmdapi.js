import {settings} from "../settings.js";
import {helperApp} from "../helper_app.js";
import {cmdManager} from "../cmdmanager.js";
import {delegate} from "../utils.js";
import {executeScript, jsEval, nativeEval} from "../utils_browser.js";
import {CmdUtils} from "./legacy/cmdutils.js";

export const cmdAPI = {
    DEBUG: settings.debug_mode(),
    VERSION: chrome.runtime.getManifest().version,

    dbglog(...args) {
        if (cmdAPI.DEBUG) console.log(...args);
    },

    createCommand(options) {
        return cmdManager.createCommand(options);
    },

    getCommandAttributes(className) {
        return className.__definition;
    },

    htmlPreviewList(prefix, block, htmls, callback, css) {
        return CmdUtils.previewList(prefix, block, htmls, callback, css);
    },

    objectPreviewList(prefix, block, items, fs, css) {
        return CmdUtils.previewList2(prefix, block, items, fs, css);
    },

    get arrowSelection() {
        return ContextUtils.arrowSelection
    },

    get settings() {
        return settings.dynamic_settings();
    },

    get activeTab() {
        return ContextUtils.activeTab;
    },

    evaluate(javaScript) {
        return (_MANIFEST_V3? nativeEval: jsEval)(javaScript);
    },

    reduceTemplate (items, f) {
        return items?.reduce((acc, v, i, arr) => acc + f(v, i, arr), "");
    }
};

export const R = cmdAPI.reduceTemplate;

cmdAPI.objectPreviewList.CSS = CmdUtils.previewList2.CSS;

cmdAPI.localeCompare = function(prop, desc, caseSensitive) {
    const options = {sensitivity: "base"};

    if (caseSensitive)
        options.sensitivity = "case";

    if (prop && !desc)
        return (a, b) => a[prop].localeCompare(b[prop], undefined, options);
    else if (prop && desc)
        return (a, b) => b[prop].localeCompare(a[prop], undefined, options);
    else if (!prop && desc)
        return (a, b) => b.localeCompare(a, undefined, options);
    else if (!prop && !desc)
        return (a, b) => a.localeCompare(b, undefined, options);
}

cmdAPI.hasSugg = function(suggs, text, prop = "text") {
    const comparator = cmdAPI.localeCompare();
    return suggs.some(s => !comparator(s[prop], text));
}

cmdAPI.addSugg = function(suggs, text, html, data, score, selectionIndices) {
    if (!cmdAPI.hasSugg(suggs, text)) {
        const newSugg = cmdAPI.makeSugg(text, html, data, score, selectionIndices);
        suggs.push(newSugg);
    }
}

cmdAPI.previewFetch = async function(display, resource, init) {
    const REASON_TIMEOUT = "Timeout";
    const controller = new AbortController();

    init = init || {};

    let displayError;
    if (init._displayError) {
        displayError = init._displayError;
        delete init._displayError;
    }

    if (init._timeout) {
        delete init._timeout;
        setTimeout(() => controller.abort(REASON_TIMEOUT), init._timeout);
    }

    init.signal = controller.signal;

    function onPreviewChange() {
        display.removeEventListener("preview-change", onPreviewChange, false);
        controller.abort();
    }
    display.addEventListener("preview-change", onPreviewChange, false);

    function removePreviewListener() {
        display.removeEventListener("preview-change", onPreviewChange, false);
    }

    try {
        const response = await fetch(resource, init);

        return new Proxy(response, {
            get(target, key, receiver) {
                if (["arrayBuffer", "blob", "formData", "json", "text"].some(k => k === key)) {
                    return () => target[key]().finally(removePreviewListener);
                }

                if (key === "body")
                    return undefined;

                return target[key];
            }
        })
    } catch (e) {
        removePreviewListener();

        const aborted = this.fetchAborted(e);
        const timeout = controller.signal.reason === REASON_TIMEOUT;

        if (aborted && timeout) {
            const error = new Error("The request operation has timed out.")
            if (displayError)
                display.error(error.message);
            throw error;
        }
        else if (!aborted && displayError) {
            if (typeof displayError === "boolean")
                display.error(e.message);
            else
                display.error(displayError);
        }

        throw e;
    }
};

cmdAPI.fetchAborted = function(error) {
    return error?.name === "AbortError";
};

cmdAPI.helperFetch = async function(pblock, path, init) {
    let _pblock = pblock, _path = path, _init = init;

    let preview = !!pblock;
    if (typeof pblock === "string") {
        _path = pblock;
        _init = path;
        preview = false;
    }

    if (!await helperApp.probe()) {
        const error = new Error();
        error.name = "IShellNoHelperApp";
        error.message = "Can not run iShell helper app."
        throw error;
    }

    const url = helperApp.url(_path);
    _init = helperApp.injectAuth(_init);

    if (preview)
        return this.previewFetch(_pblock, url, _init);
    else
        return fetch(url, _init);
}

cmdAPI.executeScript = async function(tabId, options) {
    if (typeof tabId === "object") {
        options = tabId;
        tabId = this.activeTab?.id;
    }

    if (options.jQuery) {
        delete options.jQuery;

        const hasJQuery = await executeScript(tabId,{func: () => !!window.$});

        if (!hasJQuery[0]?.result)
            await executeScript(tabId, {file: "/lib/jquery.js"});
    }

    return executeScript(tabId, options);
};

cmdAPI.imagePreviewList = function(prefix, display, imageURLs, callback, css) {
    if (typeof prefix !== "string") {
        [display, imageURLs, callback, css] = [prefix, display, imageURLs, callback];
        prefix = "";
    }

    const images = [];

    imageURLs.forEach(imageURL => {
        let span = document.createElement("span"); // <a> events do not bubble without href
        let img = document.createElement("img");
        img.src = imageURL;
        span.appendChild(img);
        images.push(span);
    });

    let i = 0;
    for (let span of images) {
        span.id = i;
        span.setAttribute("key", i);
        if (i < 32)
            span.setAttribute("accessKey", String.fromCharCode("a".charCodeAt() + i));
        ++i
    }

    const html =
        `<style>
            
            #image-preview-list {
                text-align: center;
            }
            #image-preview-list span {
              display: inline-block; vertical-align: top; position: relative;
              margin: 0 1px 2px; padding: 0;
              cursor: pointer;
            }
            #image-preview-list span::before {
              content: attr(accesskey);
              position: absolute; top: 0; left: 0;
              padding: 0 4px 2px 3px; border-bottom-right-radius: 6px;
              opacity: 0.5; color: #fff; background-color: #000;
              font:bold medium monospace;
            }
            img {
                max-width: 150px;
                max-height: 150px;
            }
            ${css}
         </style>
         ${prefix}
         <div id="image-preview-list">${R(images.map(a => a.outerHTML),html => html)}</div>
        `;

    display.set(html);

    callback = callback || (i => browser.tabs.create({url: imageURLs[i], active: false}));

    const thumbsDIV = $("#image-preview-list", display)[0], start = 0;
    function onPreviewListClick(ev) {
        ev.preventDefault();
        var {target} = ev;
        while (!target.getAttribute("key"))
            target = target.parentNode;
        callback.call(this, target.getAttribute("key"), ev);
    }
    callback && thumbsDIV.addEventListener("click", onPreviewListClick, false);
    callback && thumbsDIV.addEventListener("mousedown", function (ev) {
        if (ev.which === 2)
            onPreviewListClick(ev)
    }, false);

    return thumbsDIV;
}

// add everything from Utils
for (const prop of Object.keys(Utils))
    if (!cmdAPI.hasOwnProperty(prop) && typeof Utils[prop] === "function")
        cmdAPI[prop] = delegate(Utils, Utils[prop]);

// add everything from CmdUtils
for (const prop of Object.keys(CmdUtils))
    if (!cmdAPI.hasOwnProperty(prop) && typeof CmdUtils[prop] === "function")
        cmdAPI[prop] = delegate(CmdUtils, CmdUtils[prop]);

// add missing functions back to CmdUtils
for (const prop of Object.keys(cmdAPI))
    if (!CmdUtils.hasOwnProperty(prop) && typeof cmdAPI[prop] === "function")
        CmdUtils[prop] = delegate(cmdAPI, cmdAPI[prop]);
