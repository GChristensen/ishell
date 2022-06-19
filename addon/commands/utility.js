export const _namespace = CMD_NS.UTILITY;

CmdUtils.CreateCommand({
    names: ["base64decode","b64d","atob"],
    uuid: "E5C587CB-5733-463E-80DD-A6D4C085EE53",
    description: "base64decode",
    icon: "/ui/icons/encoding.svg",
    author: {
        name: "rostok",
    },
    license: "GPL",
    arguments: [{role: "object", nountype: noun_arb_text, label: "text"}],
    execute: function execute({object: {text}}) {
        CmdUtils.setSelection(atob(text));
    },
    preview: function preview(pblock, {object: {text}}) {
        pblock.innerHTML = atob(text);
    },
});

CmdUtils.CreateCommand({
    names: ["base64encode","b64e", "btoa"],
    uuid: "A7337919-93A1-48AC-AE1F-B9C322B7169E",
    description: "base64encode",
    icon: "/ui/icons/encoding.svg",
    author: {
        name: "rostok",
    },
    license: "GPL",
    arguments: [{role: "object", nountype: noun_arb_text, label: "text"}],
    execute: function execute({object: {text}}) {
        CmdUtils.setSelection(btoa(text));
    },
    preview: function preview(pblock, {object: {text}}) {
        pblock.innerHTML = btoa(text);
    },
});

CmdUtils.CreateCommand({
    names: ["urldecode"],
    uuid: "C042DDB6-FD05-4CD5-9356-1725C0533568",
    description: "Decode an URL using decodeURIComponent",
    help:  `<span class="syntax">Syntax</span>
            <ul class="syntax">
                <li><b>urldecode</b> <i>URL</i> [<b>by</b> <i>amount</i>]</li>
            </ul>
            <span class="arguments">Arguments</span><br>
            <ul class="syntax">
                <li>- <i>amount</i> - number, number of times to apply decodeURIComponent to the URL.</li>
            </ul>`,
    icon: "/ui/icons/encoding.svg",
    arguments: [{role: "object", nountype: noun_arb_text, label: "text"},
        {role: "cause",  nountype: noun_type_number, label: "amount"}, // by
    ],
    _decode: function(url, n) {
        let s = url;
        for (let i = 0; i < n; ++i)
            s = decodeURIComponent(s);
        return s;
    },
    execute: function execute(args) {
        let n = args.cause && args.cause.text? parseInt(args.cause.text): 1;
        CmdUtils.setSelection(this._decode(args.object.text, n));
    },
    preview: function preview(pblock, args) {
        if (args.object?.text) {
            let n = args.cause?.text ? parseInt(args.cause.text) : 1;
            pblock.innerHTML = this._decode(args.object?.text, n);
        }
    },
});

CmdUtils.CreateCommand({
    names: ["urlencode"],
    uuid: "80F43371-F330-4685-A153-9A493B07A553",
    description: "Encode an URL using encodeURIComponent",
    icon: "/ui/icons/encoding.svg",
    arguments: [{role: "object", nountype: noun_arb_text, label: "text"}],
    execute: function execute({object: {text}}) {
        CmdUtils.setSelection(encodeURIComponent(text));
    },
    preview: function preview(pblock, {object: {text}}) {
        if (text)
            pblock.innerHTML = encodeURIComponent(text);
    },
});

const noun_calc = {
    label: "expression",
    uuid: "F48E9D0A-06AA-499F-B724-7332529D1D8E",
    _parser: new MathParser(),
    suggest: function (txt, htm, cb, si) {
        if (!this._mathlike.test(txt)) return []
        try {
            var result = this._parser.evaluate(txt)
                , score = result === txt ? .3 : 1
        }
        catch (e) {
            result = e.message
            score  = .1
        }
        return [CmdUtils.makeSugg(txt, htm, result, score, si)];
    },
    _mathlike: /^[\w.+\-*\/^%(, )|]+$/,
};

CmdUtils.CreateCommand({
    name: "calculate",
    uuid: "53E7B63A-4084-449F-B142-9D62D82B9772",
    description:
        'Calculates using\
         <a href="http://silentmatt.com/javascript-expression-evaluator/">\
         JavaScript Expression Evaluator</a>.',
    help: "Try: <code>22/7, 3^4^5, sin(sqrt(log(PI)))</code>",
    icon: "/ui/icons/calculator.png",
    author: "satyr",
    license: "Public domain",
    arguments: [{role: "object", nountype: noun_calc, label: "expression"}],
    preview: function (pb, {object: {data, score}}) {
        pb.text(data? (score < .3 ? "<em style='color: red'>" : "<strong>") + data: "");
    },
});


var bitly_api_user = "ubiquityopera";
var bitly_api_key = "R_59da9e09c96797371d258f102a690eab";
CmdUtils.CreateCommand({
    names: ["shorten-url", "bitly"],
    uuid: "6475BAAA-4547-4FF0-BCA7-EE4236F20386",
    icon: "/ui/icons/bitly.png",
    description: "Shorten your URLs with the least possible keystrokes",
    homepage: "http://bit.ly",
    author: {
        name: "Cosimo Streppone",
        email: "cosimo@cpan.org"
    },
    license: "GPL",
    arguments: [{role: "object", nountype: noun_arb_text, label: "text"}],
    preview: async function (pblock, {object: {text}}) {
        this._short_url = undefined;
        let url = "http://api.bit.ly/shorten?version=2.0.1&longUrl={QUERY}&login=" + bitly_api_user
            + "&apiKey=" + bitly_api_key;

        var query = text;
        // Get the url from current open tab if none specified
        if (!query) query = CmdUtils.getLocation();
        if (!query) return;
        var urlString = url.replace("{QUERY}", query);

        // Get the url from current open tab if none specified
        var ajax = await CmdUtils.previewGet(pblock, urlString, ajax => {
            var err_code = ajax.errorCode;
            var err_msg = ajax.errorMessage;
            // Received an error from bit.ly API?
            if (err_code > 0 || err_msg) {
                pblock.innerHTML = '<br/><p style="font-size: 18px; color:orange">'
                    + 'Bit.ly API error ' + err_code + ': ' + err_msg + '</p>';
                return;
            }

            this._short_url = ajax.results[query].shortUrl;
            pblock.text(`Shortened <b>${query}</b> to: 
                                <span style="color: #45BCFF">${this._short_url}</span>. <br><br>
                                Press 'Enter' to copy the result to clipboard.<br>`);
        }, "json");
    },
    execute: async function ({object: {text}}) {
        CmdUtils.setClipboard(this._short_url);
    }
});

// CmdUtils.CreateCommand({
//     name: "isdown",
//     uuid: "48449987-B873-49F5-99B4-7F99662BCA99",
//     arguments: [{role: "object", nountype: noun_arb_text, label: "URL"}],
//     previewDelay: 1000,
//     icon: "/ui/icons/isdown.ico",
//     description: "Check if selected/typed URL is down.",
//     preview: function (pblock, {object: {text}}) {
//         if (!text)
//             text = CmdUtils.getLocation();
//
//         if (!text)
//             return;
//
//         pblock.text("Checking <b>" + text + "</b>");
//         var urlString = "https://isitdown.site/api/v3/" + encodeURIComponent(text);
//
//         CmdUtils.previewGet(pblock, urlString, (resp) => {
//
//             if (!resp) return;
//             if (resp.isitdown) {
//                 pblock.text('It\'s <b>not</b> just you. The site is <b>down!</b>');
//             } else {
//                 pblock.text('It\'s just you. The site is <b>up!</b>');
//             }
//         }, "json");
//     },
//     execute: async function ({object: {text}}) {
//         if (!text)
//             text = CmdUtils.getLocation();
//
//         if (!text)
//             return;
//
//         CmdUtils.addTab("http://downforeveryoneorjustme.com/" + encodeURIComponent(text));
//     }
// });