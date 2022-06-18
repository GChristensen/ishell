import {cmdManager} from "../cmdmanager.js";

export const _namespace = {name: cmdManager.ns.TRANSLATION, annotated: true};

/**
     # Syntax
     **lingvo** {[**this**] | *words*} [**from** *language*] [**to** *language*]

     # Arguments
     - *language* - a valid language name supported by Lingvo

     # Example
     **lingvo** *espoir* **from** *french* **to** *russian*

     @command
     @markdown
     @author g/christensen
     @delay 1000
     @icon /ui/icons/lingvo.png
     @description Translate words using <a href='https://www.lingvolive.com/'>Abbyy Lingvo</a> online service.
     @uuid 757A2516-9A45-4D02-8756-854B5DE5A074
 */
export class Lingvo {
    #abbyyAPI = "https://developers.lingvolive.com/api";

    #lingvoAPIToken;
    #articleURL;

    constructor(args) {
        args[OBJECT] = {nountype: noun_arb_text, label: "words"}; // object
        args[TO]     = {nountype: noun_type_lang_lingvo, label: "language"}; // goal
        args[FROM]   = {nountype: noun_type_lang_lingvo, label: "language"}; // source
    }

    async preview({OBJECT, FROM, TO}, display, storage) {
        if (!OBJECT?.text) {
            this.previewDefault(display);
            return;
        }

        if (!this.#authorized)
            await this.#authorize(display);

        if (this.#authorized)
            this.#translate(display, OBJECT, FROM, TO);
    }

    execute(args, storage) {
        if (this.#articleURL) {
            cmdAPI.addTab(this.#articleURL);
            this.#articleURL = null;
        }
    }

    async #authorize(display) {
        try {
            let response = await cmdAPI.previewFetch(display, `${this.#abbyyAPI}/v1.1/authenticate`, {
                method: "post",
                headers: {
                    "Authorization": "Basic " + cmdAPI.settings.lingvo_api_key
                },
            });

            if (response.ok)
                this.#lingvoAPIToken = await response.text();
            else
                display.error("Can not authorize Lingvo.")
        } catch (e) {
            if (!cmdAPI.fetchAborted(e))
                display.error("Network error.");
        }
    }

    get #authorized() {
        return !!this.#lingvoAPIToken;
    }

    #translate(display, object, from, to) {
        const words = object.text.trim().toLowerCase();

        display.text(`Translating <b>${words}</b>...`);

        const errorMessage = `Can not translate <b>${words}</b>`;

        const isLatin = /[a-z]/.test(words);
        const EN = {data: [1033, "en"]};
        const RU = {data: [1049, "ru"]};

        const wordsURI = encodeURIComponent(words);
        const fromCode = this.#getLangCode(from, isLatin ? EN: RU);
        const toCode = this.#getLangCode(to, isLatin ? RU: EN);
        const fromID = this.#getLangID(from, isLatin ? EN: RU);
        const toID = this.#getLangID(to, isLatin ? RU: EN);

        this.#articleURL = `https://www.lingvolive.com/en-us/translate/${fromID}-${toID}/${wordsURI}`;

        var options = {
            url: `${this.#abbyyAPI}/v1/Translation?text=${wordsURI}&srcLang=${fromCode}&dstLang=${toCode}`,
            dataType: "json",
            headers: {
                "Authorization": "Bearer " + this.#lingvoAPIToken
            },
            success: data => {
                const article = this.#formatArticle(data, words);
                display.set(article)
            },
            statusCode: {
                401: () => {
                    display.error("Can not authorize Lingvo.");
                }
            },
            error: data => {
                display.text(errorMessage);
            }
        };

        CmdUtils.previewAjax(display, options);
    }

    #getLangCode(lang, def) {
        if (!lang || !lang?.data)
            lang = def;

        return lang.data[0];
    }

    #getLangID(lang, def) {
        if (!lang || !lang?.data)
            lang = def;

        return lang.data[1];
    }

    #formatArticle(json, words) {
        var result = ["<style>"
        + "ol.sublist {counter-reset: list;} "
        + "ol.sublist > li {list-style: none;} "
        + "ol.sublist > li:before "
        + "{content: counter(list) ') '; "
        + "counter-increment: list;}"
        + "</style>"
        + "<h3 style='color: #66b3ff'>" + words + "</h3>"];

        json.forEach(j => this.#formatEntry(j, result));

        return result.join("");
    }

    #formatEntry(item, result, listLevel, afterAbbrev) {
        if (item.IsOptional)
            return;

        if (Array.isArray(item))
            for (let i = 0; i < item.length; ++i)
                this.#formatEntry(item[i], result, listLevel, i > 0 && item[i - 1].Node === "Abbrev");
        else {
            if (item.Title) {
                result.push("<h4 style='background-color: gray;'>" + item.Dictionary + "</h4>");
                this.#formatEntry(item.Body, result);
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
                        this.#formatEntry(item.Markup, result);
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
                        this.#formatEntry(item.Markup, result);
                        result.push("</span> ");
                        break;
                    case "List":
                        // if (listLevel && listLevel > 1)
                        //     result.push("<br/>");
                        result.push("<ol style='padding-left: " + (listLevel && listLevel > 1 ? "10" : "15") + "px;' ");
                        if (listLevel && listLevel > 1)
                            result.push("class='sublist'");
                        result.push(">");
                        this.#formatEntry(item.Items, result, listLevel ? listLevel + 1 : 1);
                        result.push("</ol>");
                        break;
                    case "ListItem":
                        result.push("<li>");
                        this.#formatEntry(item.Markup, result, listLevel);
                        result.push("</li>");
                        break;
                    case "CardRefs":
                        this.#formatEntry(item.Items, result);
                        break;
                    case "CardRefItem":
                        this.#formatEntry(item.Markup, result);
                        break;
                    case "CardRef":
                        result.push(item.Text);
                        break;
                    case "Examples":
                        result.push("<ul style='padding-left: 15px;' class='lingvo-examples'>");
                        this.#formatEntry(item.Items, result);
                        result.push("</ul>");
                        break;
                    case "ExampleItem":
                        result.push("<li class='lingvo-example-item'>");
                        this.#formatEntry(item.Markup, result);
                        result.push("</li>");
                        break;
                    case "Example":
                        this.#formatEntry(item.Markup, result);
                        break;
                }

                if (item.IsItalics)
                    result.push("</i>");
                if (item.IsAccent)
                    result.push("</b>");
            }
        }
    }
}