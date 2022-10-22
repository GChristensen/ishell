import {contextMenuManager} from "../ui/contextmenu.js";

// === {{{ noun_arb_text }}} ===
// Suggests the input as is.
// * {{{text, html}}} : user input

export const noun_arb_text = {
  label: "?",
  rankLast: true,
  noExternalCalls: true,
  cacheTime: -1,
  suggest: function nat_suggest(text, html, callback, selectionIndices) {
    return [NounUtils.makeSugg(text, html, null, 0.3, selectionIndices)];
  }
};

// === {{{ noun_type_number }}} ===
// Suggests a number value. Defaults to 1.
// * {{{text, html}}} : number text
// * {{{data}}} : number

export const noun_type_number = {
    label: "number",
    noExternalCalls: true,
    cacheTime: -1,
    suggest: function nt_number_suggest(text) {
        var num = +text;
        return isNaN(num) ? [] : [NounUtils.makeSugg(text, null, num)];
    },
    //default: NounUtils.makeSugg("1", null, 1, 0.5),
};

// === {{{ noun_type_percentage }}} ===
// Suggests a percentage value.
// * {{{text, html}}} : "?%"
// * {{{data}}} : a float number (1.0 for 100% etc.)

export const noun_type_percentage = {
  label: "percentage",
  noExternalCalls: true,
  cacheTime: -1,
  default: NounUtils.makeSugg("100%", null, 1, 0.3),
  suggest: function nt_percentage_suggest(text, html) {
    var number = parseFloat(text);
    if (isNaN(number)) return [];

    var score = text.replace(/[^-\d.Ee%]/g, "").length / text.length;
    var nopercent = text.indexOf("%") < 0;
    if (nopercent) score *= 0.9;

    var suggs = [NounUtils.makeSugg(number + "%", null, number / 100, score)];
    // if the number's 10 or less and there's no
    // % sign, also try interpreting it as a proportion instead of a
    // percent and offer it as a suggestion as well, but with a lower
    // score.
    if (nopercent && number <= 10)
      suggs.push(NounUtils.makeSugg(
        number * 100 + "%", null, number, score * 0.9));
    return suggs;
  },
};

// === {{{ noun_type_date }}} ===
// === {{{ noun_type_time }}} ===
// === {{{ noun_type_date_time }}} ===
// Suggests a date/time for input, using the mighty {{{Date.parse()}}}.
// Defaults to today/now.
// * {{{text, html}}} : date/time text
// * {{{data}}} : {{{Date}}} instance

function __scoreDateTime(text) {
  // Give penalty for short input only slightly,
  // as Date.parse() can handle variety of lengths like:
  // "t" or "Wednesday September 18th 2009 13:29:54 GMT+0900",
  var score = Math.pow(text.length / 42, 1 / 17); // .8 ~
  return score > 1 ? 1 : score;
}

export const noun_type_date = {
  label: "date",
  noExternalCalls: true,
  cacheTime: 0,
  default() { return this._sugg(Date.today()) },
  suggest: function nt_date_suggest(text) {
    var date = Date.parse(text);
    if (!date) return [];

    var score = __scoreDateTime(text);
    if (date.isToday())
      score *= .5;
    if (date.getHours() || date.getMinutes() || date.getSeconds())
      score *= .7;

    return [this._sugg(date, score)];
  },
  _sugg: (date, score) =>
    NounUtils.makeSugg(date.toString("yyyy-MM-dd"), null, date, score),
};

export const noun_type_time = {
  label: "time",
  noExternalCalls: true,
  cacheTime: 0,
  default() { return this._sugg(Date.parse("now")) },
  suggest: function nt_time_suggest(text, html) {
    var date = Date.parse(text);
    if (!date) return [];

    var score = __scoreDateTime(text), now = Date.parse("now");
    if (Math.abs(now - date) > 9) { // not "now"
      if (!now.isSameDay(date))
        score *= .7; // not "today"
      if (!date.getHours() && !date.getMinutes() && !date.getSeconds())
        score *= .5; // "00:00:00"
    }
    return [this._sugg(date, score)];
  },
  _sugg: (date, score) =>
    NounUtils.makeSugg(date.toString("hh:mm:ss tt"), null, date, score),
};

export const noun_type_date_time = {
  label: "date and time",
  noExternalCalls: true,
  cacheTime: 0,
  default() { return this._sugg(Date.parse("now")) },
  suggest: function nt_time_suggest(text) {
    var date = Date.parse(text);
    if (!date) return [];

    var score = __scoreDateTime(text), now = Date.parse("now");
    if (Math.abs(now - date) > 9) { // not "now"
      if (now.isSameDay(date))
        score *= .7; // "today"
      if (!date.getHours() && !date.getMinutes() && !date.getSeconds())
        score *= .7; // "00:00:00"
    }
    return [this._sugg(date, score)];
  },
  _sugg: (date, score) =>
    NounUtils.makeSugg(date.toString("yyyy-MM-dd hh:mm tt"), null, date,
                      score),
};

// === {{{ noun_type_email }}} ===
// Suggests an email address (RFC2822 minus domain-lit).
// The regex is taken from:
// http://blog.livedoor.jp/dankogai/archives/51190099.html
// * {{{text, html}}} : email address

const EMAIL_ATOM = "[\\w!#$%&'*+/=?^`{}~|-]+";
const EMAIL_ADDRESS = RegExp("^(?:" + EMAIL_ATOM + "(?:\\." + EMAIL_ATOM +
                            ')*|(?:\\"(?:\\\\[^\\r\\n]|[^\\\\\\"])*\\"))@(' +
                            EMAIL_ATOM + "(?:\\." + EMAIL_ATOM + ")*)$");
const EMAIL_USER =  RegExp("^(?:" + EMAIL_ATOM + "(?:\\." + EMAIL_ATOM +
                             ')*|(?:\\"(?:\\\\[^\\r\\n]|[^\\\\\\"])*\\"))$');
export const noun_type_email = {
    label: "email",
    noExternalCalls: true,
    cacheTime: -1,
    suggest: function nt_email_suggest(text, html, cb, selectionIndices) {
        if (EMAIL_USER.test(text))
            return [NounUtils.makeSugg(text, html, null, 0.3, selectionIndices)];

        var match = text.match(EMAIL_ADDRESS);
        if (!match) return [];

        var domain = match[1];
        // if the domain doesn't have a period or the TLD
        // has less than two letters, penalize
        var score = /\.(?:\d+|[a-z]{2,})$/i.test(domain) ? 1 : 0.8;

        return [NounUtils.makeSugg(text, html, null, score, selectionIndices)];
    }
};

export const noun_type_contact = {
    label: "email",
    noExternalCalls: true,
    cacheTime: -1,
    BIN_UUID: "--stored-email-items",
    suggest: async function (text, html, cb, selectionIndices) {
        const bin = await Utils.makeBin(this.BIN_UUID);
        const contacts = bin.contacts() || [];
        let suggs = [];

        suggs = contacts.map(c => cmdAPI.makeSugg(c, c, null, 1, selectionIndices));
        suggs = cmdAPI.grepSuggs(text, suggs);

        if (!cmdAPI.hasSugg(suggs, text))
            suggs = [...suggs, ...noun_type_email.suggest(text, html, cb, selectionIndices)];

        return suggs;
    }
};

export const noun_type_tab = {
    label: "tab title or URL",

    async suggest(text, html, callback, selectedIndices) {
        const tabs = await browser.tabs.query({});
        const suggs = tabs.map(tab => cmdAPI.makeSugg(tab.title || tab.url, null, tab, 1, selectedIndices));

        return cmdAPI.grepSuggs(text, suggs);
    }
};

export const noun_type_container = {
    label: "container",

    async suggest(text, html, callback, selectedIndices) {
        if (browser.contextualIdentities) {
            const containers = await browser.contextualIdentities.query({})
            const suggs = containers.map(c => cmdAPI.makeSugg(c.name, null, c, 1, selectedIndices));

            return cmdAPI.grepSuggs(text, suggs);
        }

        return [];
    }
};

export const noun_type_lang_google = NounUtils.NounType("language", {
    Afrikaans: "af",
    Albanian: "sq",
    Arabic: "ar",
    Armenian: "hy",
    Azerbaijani: "az",
    Basque: "eu",
    Belarusian: "be",
    Bulgarian: "bg",
    Catalan: "ca",
    "Chinese Simplified": "zh-CN",
    "Chinese Traditional": "zh-TW",
    Croatian: "hr",
    Czech: "cs",
    Danish: "da",
    Dutch: "nl",
    English: "en",
    Estonian: "et",
    Filipino: "tl",
    Finnish: "fi",
    French: "fr",
    Galician: "gl",
    Georgian: "ka",
    German: "de",
    Greek: "el",
    Hebrew: "iw",
    Hindi: "hi",
    Hungarian: "hu",
    Icelandic: "is",
    Indonesian: "id",
    Irish: "ga",
    Italian: "it",
    Japanese: "ja",
    Korean: "ko",
    Latin: "la",
    Latvian: "lv",
    Lithuanian: "lt",
    Macedonian: "mk",
    Malay: "ms",
    Maltese: "mt",
    Norwegian: "no",
    Persian: "fa",
    Polish: "pl",
    Portuguese: "pt",
    Romanian: "ro",
    Russian: "ru",
    Serbian: "sr",
    Slovak: "sk",
    Slovenian: "sl",
    Spanish: "es",
    Swahili: "sw",
    Swedish: "sv",
    Thai: "th",
    Turkish: "tr",
    Ukrainian: "uk",
    Urdu: "ur",
    Vietnamese: "vi",
    Welsh: "cy",
    Yiddish: "yi",
});

export const noun_type_lang_wikipedia = NounUtils.NounType("language", {
    English: "en",
    German: "de",
    French: "fr",
    Polish: "pl",
    Japanese: "ja",
    Italian: "it",
    Dutch: "nl",
    Portuguese: "pt",
    Spanish: "es",
    Russian: "ru",
    Swedish: "sv",
    Chinese: "zh",
    "Norwegian (Bokmal)": "no",
    Finnish: "fi",
    Catalan: "ca",
    Ukrainian: "uk",
    Turkish: "tr",
    Czech: "cs",
    Hungarian: "hu",
    Romanian: "ro",
    Volapuk: "vo",
    Esperanto: "eo",
    Danish: "da",
    Slovak: "sk",
    Indonesian: "id",
    Arabic: "ar",
    Korean: "ko",
    Hebrew: "he",
    Lithuanian: "lt",
    Vietnamese: "vi",
    Slovenian: "sl",
    Serbian: "sr",
    Bulgarian: "bg",
    Estonian: "et",
    Persian: "fa",
    Croatian: "hr",
    "Simple English": "simple",
    "Newar / Nepal Bhasa": "new",
    Haitian: "ht",
    "Norwegian (Nynorsk)": "nn",
    Galician: "gl",
    Thai: "th",
    Telugu: "te",
    Greek: "el",
    Malay: "ms",
    Basque: "eu",
    Cebuano: "ceb",
    Hindi: "hi",
    Macedonian: "mk",
    Georgian: "ka",
    Latin: "la",
    Bosnian: "bs",
    Luxembourgish: "lb",
    Breton: "br",
    Icelandic: "is",
    "Bishnupriya Manipuri": "bpy",
    Marathi: "mr",
    Albanian: "sq",
    Welsh: "cy",
    Azeri: "az",
    "Serbo-Croatian": "sh",
    Tagalog: "tl",
    Latvian: "lv",
    Piedmontese: "pms",
    Bengali: "bn",
    "Belarusian (Tarashkevitsa)": "be-x-old",
    Javanese: "jv",
    Tamil: "ta",
    Occitan: "oc",
    Ido: "io",
    Belarusian: "be",
    Aragonese: "an",
    "Low Saxon": "nds",
    Sundanese: "su",
    Sicilian: "scn",
    Neapolitan: "nap",
    Kurdish: "ku",
    Asturian: "ast",
    Afrikaans: "af",
    "West Frisian": "fy",
    Swahili: "sw",
    Walloon: "wa",
    Cantonese: "zh-yue",
    Samogitian: "bat-smg",
    Quechua: "qu",
    Urdu: "ur",
    Chuvash: "cv",
    Ripuarian: "ksh",
    Malayalam: "ml",
    Tajik: "tg",
    Irish: "ga",
    Venetian: "vec",
    Tarantino: "roa-tara",
    "Waray-Waray": "war",
    Uzbek: "uz",
    "Scottish Gaelic": "gd",
    Kapampangan: "pam",
    Kannada: "kn",
    Maori: "mi",
    Yiddish: "yi",
    Yoruba: "yo",
    Gujarati: "gu",
    Nahuatl: "nah",
    Lombard: "lmo",
    Corsican: "co",
    Gilaki: "glk",
    "Upper Sorbian": "hsb",
    "Min Nan": "zh-min-nan",
    Aromanian: "roa-rup",
    Alemannic: "als",
    Interlingua: "ia",
    Limburgian: "li",
    Armenian: "hy",
    Sakha: "sah",
    Kazakh: "kk",
    Tatar: "tt",
    Gan: "gan",
    Sanskrit: "sa",
    Turkmen: "tk",
    Wu: "wuu",
    "Dutch Low Saxon": "nds-nl",
    Faroese: "fo",
    "West Flemish": "vls",
    Norman: "nrm",
    Ossetian: "os",
    Voro: "fiu-vro",
    Amharic: "am",
    Romansh: "rm",
    Banyumasan: "map-bms",
    Pangasinan: "pag",
    Divehi: "dv",
    Mongolian: "mn",
    "Egyptian Arabic": "arz",
    "Northern Sami": "se",
    Zazaki: "diq",
    Nepali: "ne",
    Friulian: "fur",
    Manx: "gv",
    Scots: "sco",
    Ligurian: "lij",
    Novial: "nov",
    Bavarian: "bar",
    Bihari: "bh",
    Maltese: "mt",
    Ilokano: "ilo",
    Pali: "pi",
    "Classical Chinese": "zh-classical",
    Khmer: "km",
    "Franco-Provencal/Arpitan": "frp",
    Mazandarani: "mzn",
    Kashubian: "csb",
    Ladino: "lad",
    "Pennsylvania German": "pdc",
    Uyghur: "ug",
    Cornish: "kw",
    Sinhalese: "si",
    "Anglo-Saxon": "ang",
    Hawaiian: "haw",
    Tongan: "to",
    Sardinian: "sc",
    "Central_Bicolano": "bcl",
    Komi: "kv",
    Punjabi: "pa",
    Pashto: "ps",
    Silesian: "szl",
    Interlingue: "ie",
    Malagasy: "mg",
    Guarani: "gn",
    Lingala: "ln",
    Burmese: "my",
    "Fiji Hindi": "hif",
}, "^_");

for (let ntl of [noun_type_lang_google, noun_type_lang_wikipedia]) {
    ntl._code2name = ntl._list.reduce(function (o, s) {
        o[s.data] = s.text;
        return o;
    }, {});
    ntl.getLangName = function getLangName(langCode) {
        return this._code2name[langCode]
    };
    ntl.noSelection = true;
}

{
    noun_type_lang_wikipedia.default.push(
        NounUtils.makeSugg("English", null, "en"));
}

export let noun_type_lang_microsoft;

const MS_LANGS = {}
    , MS_LANGS_REV =
    {
        af: "Afrikaans"
        ,ar: "Arabic"
        ,bg: "Bulgarian"
        ,bn: "Bangla"
        ,bs: "Bosnian"
        ,ca: "Catalan"
        ,cs: "Czech"
        ,cy: "Welsh"
        ,da: "Danish"
        ,de: "German"
        ,el: "Greek"
        ,en: "English"
        ,es: "Spanish"
        ,et: "Estonian"
        ,fa: "Persian"
        ,fi: "Finnish"
        ,fil: "Filipino"
        ,fj: "Fijian"
        ,fr: "French"
        ,he: "Hebrew"
        ,hi: "Hindi"
        ,hr: "Croatian"
        ,ht: "Haitian Creole"
        ,hu: "Hungarian"
        ,id: "Indonesian"
        ,is: "Icelandic"
        ,it: "Italian"
        ,ja: "Japanese"
        ,ko: "Korean"
        ,lt: "Lithuanian"
        ,lv: "Latvian"
        ,mg: "Malagasy"
        ,ms: "Malay"
        ,mt: "Maltese"
        ,mww: "Hmong Daw"
        ,nb: "Norwegian"
        ,nl: "Dutch"
        ,otq: "Querétaro Otom"
        ,pl: "Polish"
        ,pt: "Portuguese"
        ,ro: "Romanian"
        ,ru: "Russian"
        ,sk: "Slovak"
        ,sl: "Slovenian"
        ,sm: "Samoan"
        ,"sr-Cyrl": "Serbian (Cyrillic)"
        ,"sr-Latn": "Serbian (Latin)"
        ,sv: "Swedish"
        ,sw: "Kiswahili"
        ,ta: "Tamil"
        ,te: "Telugu"
        ,th: "Thai"
        ,tlh: "Klingon"
        ,to: "Tongan"
        ,tr: "Turkish"
        ,ty: "Tahitian"
        ,uk: "Ukrainian"
        ,ur: "Urdu"
        ,vi: "Vietnamese"
        ,yua: "Yucatec Maya"
        ,yue: "Cantonese (Traditional)"
        ,"zh-Hans": "Chinese Simplified"
        ,"zh-Hant": "Chinese Traditional"
    };

// all ms is in google except hebrew (ms:he vs goog:iw)
for (let [code, name] of Object.entries(MS_LANGS_REV)) {
    MS_LANGS[name] = code;
}

noun_type_lang_microsoft = NounUtils.NounType("language", MS_LANGS);
noun_type_lang_microsoft.MS_LANGS_REV = MS_LANGS_REV;


export const noun_type_lang_lingvo = NounUtils.NounType("language", {
    "Chinese": [1028, "zh"],
    "Danish": [1030, "da"],
    "Dutch": [1043, "nl"],
    "English": [1033, "en"],
    "Finnish": [1035, "fi"],
    "French": [1036, "fr"],
    "German": [1031, "de"],
    "Greek": [1032, "el"],
    "Hungarian": [1038, "hu"],
    "Italian": [1040, "it"],
    "Kazakh": [1087, "kk"],
    "Latin": [1142, "la"],
    "Norwegian": [1044, "no"],
    "Polish": [1045, "pl"],
    "Portuguese": [2070, "pt"],
    "Russian": [1049, "ru"],
    "Spanish": [1034, "es"],
    "Tatar": [1110, "tt"],
    "Turkish": [1055, "tr"],
    "Ukrainian": [1058, "uk"]
});