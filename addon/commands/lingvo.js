// Use lingvolive.com online service with the Firefox iShell extension

// (C) 2010-2018 g/christensen (gchristnsn@gmail.com)

var __lingvoLiveAPIToken;

{
    var abbyyServiceAPI = "https://developers.lingvolive.com";
    var urlTemplateAPI = "${service}/api/v1/Translation?text=${words}&srcLang=${from}&dstLang=${to}";
    var urlTemplateTranslate = "https://www.lingvolive.com/en-us/translate/${from}-${to}/${words}";

    var latinREAPI = new RegExp("[a-z]");
    var executionUrl;

    CmdUtils.CreateCommand(
        {
            names: ["lingvo"],
            uuid: "757A2516-9A45-4D02-8756-854B5DE5A074",
            /*---------------------------------------------------------------------------*/
            _namespace: "Translation",
            /*---------------------------------------------------------------------------*/
            arguments: [{role: "object", nountype: noun_arb_text, label: "words"},
                {role: "source", nountype: noun_type_lang_lingvo, label: "language"},
                {role: "goal", nountype: noun_type_lang_lingvo, label: "language"}],
            /*---------------------------------------------------------------------------*/
            description: "Translate words using <a href='https://www.lingvolive.com/'>Abbyy Lingvo</a> online service.",
            /*---------------------------------------------------------------------------*/
            help:
                `<span class="syntax">Syntax</span>
                <ul class="syntax">
                    <li><b>lingvo</b> {[<b>this</b>] | <i>words</i>} [<b>from</b> <i>language</i>] [<b>to</b> <i>language</i>]</li>
                </ul>
                <span class="arguments">Arguments</span><br>
                <ul class="syntax">
                    <li>- <i>language</i> - a valid language name supported by Lingvo</li>
                </ul>
                <span class="arguments">Example</span>
                <ul class="syntax">
                    <li><b>lingvo</b> <i>espoir</i> <b>from</b> <i>french</i> <b>to</b> <i>russian</i></li>
                </ul>`,
            /*---------------------------------------------------------------------------*/
            icon: "/res/icons/lingvo.png",
            /*---------------------------------------------------------------------------*/
            previewDelay: 1000,
            /*---------------------------------------------------------------------------*/
            author: {name: "g/christensen"},
            /*---------------------------------------------------------------------------*/
            execute: function (args) {
                if (executionUrl != null)
                    CmdUtils.addTab(executionUrl);
            },
            /*---------------------------------------------------------------------------*/
            preview: function (pblock, args) {
                if (!args.object.text)
                    return;

                this.previewBlock = pblock;

                function norm(arg) {
                    if (args[arg] && args[arg].text)
                        return args[arg].text.trim();
                }

                try {
                    if (!__lingvoLiveAPIToken)
                        this._authorize().then(() => {
                            this._translate(norm("object"), args.source, args.goal);
                        });
                    else
                        this._translate(norm("object"), args.source, args.goal);
                }
                catch (e) {
                    pblock.innerHTML = this._failureMessage;
                }
            },
            /*---------------------------------------------------------------------------*/
            _failureMessage: "error",
            /*---------------------------------------------------------------------------*/
            _authorize: function () {
                var self = this;

                return jQuery.ajax({
                    type: "POST",
                    headers: {
                        "Authorization": "Basic " + cmdAPI.settings.lingvo_api_key
                    },
                    url: abbyyServiceAPI + "/api/v1.1/authenticate"
                }).then(data => {
                    __lingvoLiveAPIToken = data;
                });
            },
            /*---------------------------------------------------------------------------*/
            _translate: function (words, from, to) {
                words = words ? words.trim().toLowerCase() : null;

                this._failureMessage = "Could not translate \"<b>" + words + "</b>\"";
                this.previewBlock.text("Translating <b>" + words + "</b> ...");

                if (this.oldRequest != undefined)
                    this.oldRequest.abort();

                function abbrev2id(lang, def, need_code) {
                    if (!lang || lang && !lang.data)
                        lang = def;
                    return need_code ? lang.data[0]: lang.data[1];
                }

                var isLatin = latinREAPI.test(words);

                const EN = {data: [1033, "en"]};
                const RU = {data: [1049, "ru"]};

                var requestUrl = CmdUtils.renderTemplate(urlTemplateAPI,
                    {
                        service: abbyyServiceAPI,
                        words: words, //words.replace(/ /, "+"),
                        from: abbrev2id(from, isLatin ? EN: RU, true),
                        to: abbrev2id(to, isLatin ? RU: EN, true)
                    });

                executionUrl = CmdUtils.renderTemplate(urlTemplateTranslate,
                    {
                        words: words, //words.replace(/ /, "+"),
                        from: abbrev2id(from, isLatin ? EN: RU),
                        to: abbrev2id(to, isLatin ? RU: EN)
                    });

                var self = this;

                var errorCtr = 0;

                var options = {
                    url: requestUrl,
                    dataType: "json",
                    headers: {
                        "Authorization": "Bearer " + __lingvoLiveAPIToken
                    },
                    success: function (data) {
                        try {
                            self._onTranslated(words, data, requestUrl);
                        }
                        catch (e) {
                            self.previewBlock.text(self._failureMessage);
                        }
                    },
                    statusCode: {
                        401: function () {
                            if (errorCtr === 0) {
                                __lingvoLiveAPIToken = undefined;
                                self._authorize();
                                self.oldRequest = jQuery.get(options);
                                errorCtr += 1;
                            }
                            else
                                self.previewBlock.text(self._failureMessage);
                        }
                    },
                    error: function (data) {
                        self.previewBlock.text(self._failureMessage);
                    }
                };

                CmdUtils.previewAjax(self.previewBlock, options);
            },
            /*---------------------------------------------------------------------------*/
            _onTranslated: function (words, jsonResponse, requestUrl) {
                var response = this._formatJSON(jsonResponse, words);

                if (response == null) {
                    this.previewBlock.text(this._failureMessage);
                    executionUrl = null;
                }
                else {
                    this.previewBlock.innerHTML = response;
                }
            },
            /*---------------------------------------------------------------------------*/
            _formatItem: function (item, result, listLevel, afterAbbrev) {

                if (item.IsOptional)
                    return;

                if (Array.isArray(item))
                    for (let i = 0; i < item.length; ++i)
                        this._formatItem(item[i], result, listLevel, i > 0 && item[i - 1].Node === "Abbrev");
                else {
                    if (item.Title) {
                        result.push("<h4 style='background-color: gray;'>" + item.Dictionary + "</h4>");
                        this._formatItem(item.Body, result);
                    }
                    else {
                        if (item.IsItalics)
                            result.push("<i>");
                        if (item.IsAccent)
                            result.push("<b>");

                        if (item.Text && item.Text.length > 0 && /[\w�-�0-9]/i.test(item.Text[0]) && afterAbbrev)
                            item.Text = " " + item.Text;

                        switch (item.Node) {
                            case "Paragraph":
                                if (!listLevel || listLevel == 1)
                                    result.push("<p class='lingvo-paragraph'>");
                                this._formatItem(item.Markup, result);
                                if (!listLevel || listLevel == 1)
                                    result.push("</p>");
                                break;
                            case "Transcription":
                                result.push("<span style='color: #80ff80' class='lingvo-transcription'>");
                                result.push("[" + item.Text + "]");
                                result.push("</span>");
                                break;
                            case "Text":
                                result.push(item.Text);
                                break;
                            case "Abbrev":
                                result.push(" <span style='color: #a5a5a5' class='lingvo-abbrev'>");
                                result.push(item.Text);
                                result.push("</span> ");
                                break;
                            case "Comment":
                                result.push(" <span style='color: #a5a5a5' class='lingvo-comment'>");
                                this._formatItem(item.Markup, result);
                                result.push("</span> ");
                                break;
                            case "List":
                                // if (listLevel && listLevel > 1)
                                //     result.push("<br/>");
                                result.push("<ol style='padding-left: " + (listLevel && listLevel > 1 ? "10" : "15") + "px;' ");
                                if (listLevel && listLevel > 1)
                                    result.push("class='sublist'");
                                result.push(">");
                                this._formatItem(item.Items, result, listLevel ? listLevel + 1 : 1);
                                result.push("</ol>");
                                break;
                            case "ListItem":
                                result.push("<li>");
                                this._formatItem(item.Markup, result, listLevel);
                                result.push("</li>");
                                break;
                            case "CardRefs":
                                this._formatItem(item.Items, result);
                                break;
                            case "CardRefItem":
                                this._formatItem(item.Markup, result);
                                break;
                            case "CardRef":
                                result.push(item.Text);
                                break;
                            case "Examples":
                                result.push("<ul style='padding-left: 15px;' class='lingvo-examples'>");
                                this._formatItem(item.Items, result);
                                result.push("</ul>");
                                break;
                            case "ExampleItem":
                                result.push("<li class='lingvo-example-item'>");
                                this._formatItem(item.Markup, result);
                                result.push("</li>");
                                break;
                            case "Example":
                                this._formatItem(item.Markup, result);
                                break;
                        }

                        if (item.IsItalics)
                            result.push("</i>");
                        if (item.IsAccent)
                            result.push("</b>");

                    }
                }
            },
            /*---------------------------------------------------------------------------*/
            _formatJSON: function (json, words) {
                var result = ["<style>"
                + "ol.sublist {counter-reset: list;} "
                + "ol.sublist > li {list-style: none;} "
                + "ol.sublist > li:before "
                + "{content: counter(list) ') '; "
                + "counter-increment: list;}"
                + "</style>"
                + "<h3 style='color: #66b3ff'>" + words + "</h3>"];
                json.forEach(j => this._formatItem(j, result));
                return result.join("");
            }
        });
}