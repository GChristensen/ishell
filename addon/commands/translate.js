import {NAMESPACE_TRANSLATION} from "./namespaces.js";

const MS_TRANSLATOR_LIMIT = 1e4;

function defaultLanguage(code2name, exclude) {
    for (let code of [chrome.i18n.getUILanguage()].concat(CmdUtils.acceptLanguages)) {
        if (!(code = code.trim())) continue;
        code = (/^(..-)(..)$/i.test(code)
            ? RegExp.$1.toLowerCase() + RegExp.$2.toUpperCase()
            : code.slice(0, 2).toLowerCase());
        if (code === exclude) continue;
        let name = code2name[code];
        if (name) return {name: name, code: code}
    }
    return {name: code2name["en"], code: "en"}
}

function translate(target, from, to, back) {
    let api_v3 = !!cmdAPI.settings.bing_translator_api_v3_key;
    let translator = api_v3? msTranslator_v3: msTranslator;

    if (!api_v3 && !to) return void
        msTranslator("Detect", {text: target.text}, function detected(code) {
            translate(target, from, defaultLanguage(noun_type_lang_microsoft.MS_LANGS_REV, code).code, back)
        });

    let {html} = target
    // bitbucket#29: The API doesn't like apostrophes HTML-escaped.
    ~html.indexOf('<') || (html = html.replace(/&#39;/g, "'"));

    translator("Translate", {
            contentType: "text/html", text: html, from: from, to: to,
        }, back);
}

function msTranslator_v3(method, params, back) {
    //CmdUtils.deblog("Using Bing Translate API v3");
    let url = "https://api.cognitive.microsofttranslator.com/translate?api-version=3.0";
    if (params.from)
        url += "&from=" + params.from;
    if (params.to)
        url += "&to=" + params.to;
    else
        url += "&to=" + defaultLanguage(noun_type_lang_microsoft.MS_LANGS_REV, params.from).code;
    url += "&textType=html";
    $.ajax({
        url: url,
        method: "POST",
        data: JSON.stringify([{Text: params.text}]),
        headers: {"Content-Type": "application/json",
                  "Ocp-Apim-Subscription-Key": cmdAPI.settings.bing_translator_api_v3_key},
        success : function (json) {
            if (json && json.length > 0) {
                back(json[0].translations[0].text);
            }
        },
        error   : function (e) {
            CmdUtils.notify({title: "Microsoft Translator API v3", text: "(>_<)"})
        },
    })
}

function msTranslator(method, params, back) {
    params.appId = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"+ Math.floor(Math.random() * 10);
    $.ajax({
        url: "http://api.microsofttranslator.com/V2/Ajax.svc/" + method,
        data: params,
        success : function mst_ok(json) { back(JSON.parse(json)) },
        error   : function mst_ng() {
            CmdUtils.notify({title: "Microsoft Translator", text: "(>_<)"})
        },
    })
}

CmdUtils.CreateCommand({
    name: "translate",
    uuid: "43599939-571E-4EBF-AF64-8AD6F39C7B79",
    description: "Translates from one language to another using <a href='https://www.bing.com/translator'>Bing Translator</a>.",
    _namespace: NAMESPACE_TRANSLATION,
    icon: "/ui/icons/translate_bing.ico",
    arguments: {
        object: noun_arb_text,
        source: noun_type_lang_microsoft,
        goal: noun_type_lang_microsoft
    },
    previewDelay: 1000,
    help:
        `<span class="syntax">Syntax</span>
        <ul class="syntax">
            <li><b>translate</b> {[<b>this</b>] | <i>text</i>} [<b>from</b> <i>language</i>] [<b>to</b> <i>language</i>]</li>
        </ul>
        <span class="arguments">Arguments</span><br>
        <ul class="syntax">
            <li>- <i>language</i> - a valid language name supported by Bing Translator</li>
        </ul>
        <span class="arguments">Example</span>
        <ul class="syntax">
            <li><b>translate</b> <i>mother</i> <b>from</b> <i>english</i> <b>to</b> <i>chinese</i></li>
        </ul>
        <p>It works on the selected text in any web page, but there is a limit (a couple of paragraphs)
            to how much it can translate at once.
            If you want to translate a lot of text, use <i>translate-page</i> command instead.</p>`,
    author: "satyr",
    execute: function translate_execute({object, goal, source}) {
        let from = "", to = "";

        if (source && source.data)
            from = source.data;

        if (goal && goal.data)
            to = goal.data;

        if (object.text && object.text.length <= MS_TRANSLATOR_LIMIT)
            translate(object, from, to, CmdUtils.setSelection.bind(CmdUtils));
        else
            CmdUtils.deblog("Error performing translation: no text or text exceeded limits");
    },
    preview: function translate_preview(pblock, {object, goal, source}) {
        let limitExceeded = cmdAPI.settings.bing_translator_api_v3_key
            ? object.text.length > MS_TRANSLATOR_LIMIT
            : object.text.length > MS_TRANSLATOR_LIMIT / 2;
        let from = "", to = "";

        if (source && source.data)
            from = source.data;

        if (goal && goal.data)
            to = goal.data;

        if (!object.text || limitExceeded) {
            let ph = "";
            if (limitExceeded)
                ph += '<p><em class="error">' +
                    _("The text you selected exceeds the API limit.") +
                    '</em>';
            pblock.text(ph);
            return;
        }

        pblock.text("Translating the selected text...");
        translate(
            object, from, to,
            CmdUtils.previewCallback(pblock, function show(html) {
                pblock.text(html);
            }))
    }
});


CmdUtils.CreateCommand({
    names: ["translate-page"],
    uuid: "9A6DFBFE-3BB6-4131-996A-25FB0E9B7A26",
    _namespace: NAMESPACE_TRANSLATION,
    description: `Translates a whole page to the specified language using 
                    <a href="http://translate.google.com">Google Translate</a>.`,
    icon: "/ui/icons/translate_google.ico",
    author: "satyr",
    arguments: {
        object: noun_arb_text,
        goal: noun_type_lang_google,
    },
    execute: function gtranslate_execute({object, goal}) {
        if (!object.text)
            object.text = CmdUtils.getLocation();

        Utils.openUrlInBrowser(
            "http://translate.google.com/translate" +
            Utils.paramsToString({
                u: object.text,
                tl: goal.data || "en",
            }));
    },
    preview: function gtranslate_preview(pb, {object, goal}) {
        if (!object.text)
            object.text = CmdUtils.getLocation();

        let url = (object && object.text)? Utils.escapeHtml(object.text): "";
        let lang = (goal && goal.text && goal.text !== object.text)? goal.text: "English";

        pb.text(`Translates <i>${url}</i> to <strong>${lang}</strong>.`);
    },
});
