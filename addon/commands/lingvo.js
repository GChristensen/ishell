export const namespace = new AnnotatedCommandNamespace(CommandNamespace.TRANSLATION);

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

        return this.#translate(display, OBJECT, FROM, TO);
    }

    execute({OBJECT, FROM, TO}, storage) {
        const {articleURL} = this.#createURL(OBJECT, FROM, TO);

        cmdAPI.addTab(articleURL);
    }

    async #translate(display, object, from, to) {
        const {words, apiURL, articleURL} = this.#createURL(object, from, to);

        display.text(`Translating <b>${words}</b>...`);

        try {
            const html = await display.fetchText(articleURL);
            const doc = cmdAPI.parseHtml(html);
            const defs = doc.querySelector(`[name="#dictionary"]`);

            if (defs) {
                this.#formatEntry(defs);
                display.text(defs.outerHTML);
            }
            else {
                display.text(`Can not translate <b>${words}</b>`);
            }
        } catch (e) {
            display.error(`Error translating <b>${words}</b>`);
        }
    }

    #createURL(object, from, to) {
        const words = object.text.trim().toLowerCase();

        const isLatin = /[a-z]/.test(words);
        const EN = {data: [1033, "en"]};
        const RU = {data: [1049, "ru"]};

        const wordsURI = encodeURIComponent(words);
        const fromCode = this.#getLangCode(from, isLatin? EN: RU);
        const toCode = this.#getLangCode(to, isLatin? RU: EN);
        const fromID = this.#getLangID(from, isLatin? EN: RU);
        const toID = this.#getLangID(to, isLatin? RU: EN);

        const articleURL = `https://www.lingvolive.com/en-us/translate/${fromID}-${toID}/${wordsURI}`;
        const apiURL = `${this.#abbyyAPI}/v1/Translation?text=${wordsURI}&srcLang=${fromCode}&dstLang=${toCode}`;

        return {words, apiURL, articleURL};
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

    #formatEntry(defs) {
        const $defs = $(defs);
        $defs.find("svg").parent().remove();
        $defs.find("h3").first().remove();
        $defs.find("h3")
            .css("background-color", "gray")
            .css("padding-left", "5px");
        $defs.find("h4").remove();
    }
}