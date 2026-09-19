export const namespace = new CommandNamespace(CommandNamespace.UTILITY);

namespace.createCommand({
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

namespace.createCommand({
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

namespace.createCommand({
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
        let decodedURL;
        try {
            decodedURL = this._decode(args.object.text, n)
        }
        catch (e) {
            console.error(e);
        }
        if (decodedURL)
            CmdUtils.setSelection();
    },
    preview: function preview(pblock, args) {
        if (args.object?.text) {
            let n = args.cause?.text ? parseInt(args.cause.text) : 1;
            let decodedURL;
            try {
                decodedURL = this._decode(args.object.text, n)
            }
            catch (e) {
                pblock.error(e.message);
            }
            if (decodedURL)
                pblock.innerHTML = this._decode(args.object?.text, n);
        }
    },
});

namespace.createCommand({
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

namespace.createCommand({
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


namespace.createCommand({
    names: ["shorten-url", "tinyurl"],
    uuid: "6475BAAA-4547-4FF0-BCA7-EE4236F20386",
    icon: "/ui/icons/tinyurl.png",
    description: "Shorten your URLs with the least possible keystrokes",
    help: "Shortens the given URL or the URL of the current tab using <a href='https://tinyurl.com'>TinyURL</a>.",
    homepage: "https://tinyurl.com",
    previewDelay: 1000,
    author: {
        name: "Cosimo Streppone",
        email: "cosimo@cpan.org"
    },
    license: "GPL",
    arguments: [{role: "object", nountype: noun_arb_text, label: "text"}],
    _normalizeURL: function (text) {
        text = (text || "").trim();

        if (text && !/^[a-z][a-z\d+.\-]*:\/\//i.test(text))
            text = "https://" + text;

        try {
            const url = new URL(text);
            if (/^https?:$/.test(url.protocol) && url.hostname.includes("."))
                return url.href;
        }
        catch (e) {}
    },
    preview: async function (pblock, {object: {text}}) {
        this._short_url = undefined;

        // Get the url from current open tab if none specified
        const query = text || CmdUtils.getLocation();
        if (!query) return;

        const longURL = this._normalizeURL(query);
        if (!longURL) {
            pblock.error(`<b>${Utils.escapeHtml(query)}</b> is not a valid URL.`);
            return;
        }

        const requestURL = "https://tinyurl.com/api-create.php?url=" + encodeURIComponent(longURL);
        const shortURL = (await pblock.fetchText(requestURL, {_displayError: "Network error."}))?.trim();

        if (shortURL && /^https?:\/\//.test(shortURL)) {
            this._short_url = shortURL;
            pblock.text(`Shortened <b>${Utils.escapeHtml(query)}</b> to: <span style="color: #45BCFF">${shortURL}</span>.
                                <br><br>Press 'Enter' to copy the result to clipboard.<br>`);
        }
        else
            pblock.error("The URL could not be shortened.");
    },
    execute: async function ({object: {text}}) {
        if (this._short_url)
            CmdUtils.setClipboard(this._short_url);
    }
});

namespace.createCommand({
    name: "isdown",
    arguments: [{role: "object", nountype: noun_arb_text, label: "URL"}],
    previewDelay: 1000,
    icon: "/ui/icons/isdown.ico",
    description: "Check if the selected/typed URL is down.",
    uuid: "48449987-B873-49F5-99B4-7F99662BCA99",
    async preview(pblock, {object: {text}}) {
        text = text || cmdAPI.getLocation();

        if (text) {
            let json;
            // const requestURL = "https://api-prod.downfor.cloud/httpcheck/" + encodeURIComponent(text);
            //
            // pblock.text("Checking <b>" + text + "</b>");
            //
            // try {
            //     json = await pblock.fetchJSON(requestURL);
            // } catch (e) {
            //     console.error(e);
            // }

            if (json) {
                if (json.isDown)
                    pblock.text('It\'s <b>not</b> just you. The site is <b>down!</b>');
                else
                    pblock.text('It\'s just you. The site is <b>up!</b>');
            }
            else
                pblock.text('Press enter to check online.');
        }
    },
    execute({object: {text}}) {
        if (!text)
            text = cmdAPI.getLocation();

        if (!text)
            return;

        cmdAPI.addTab("http://downforeveryoneorjustme.com/" + encodeURIComponent(text));
    }
});

namespace.createCommand({
    name: "current-ip",
    icon: "/ui/icons/current-ip.png",
    description: "Displays your current IP address.",
    uuid: "03F608A8-FB85-46BE-B2B2-B7B817104BCC",

    // free keyless services returning the caller's address; they are tried in order
    _sources: [
        {
            url: "https://ipwho.is/?fields=success,ip,country,country_code,region,city,flag",
            parse: j => j.success && {
                ip: j.ip, city: j.city, region: j.region, country: j.country,
                countryCode: j.country_code, flag: j.flag?.img
            }
        },
        {
            url: "https://api.seeip.org/geoip",
            parse: j => ({
                ip: j.ip, city: j.city, region: j.region, country: j.country,
                countryCode: j.country_code
            })
        }
    ],

    async preview(pblock, args) {
        pblock.text("Fetching IP information...");

        const info = await this._lookup(pblock);

        if (info)
            this._constructView(pblock, info);
        else if (info === null)
            pblock.error("Could not determine the IP address.");
    },

    execute(args) {
        cmdAPI.addTab("https://ipinfo.io/");
    },

    // returns undefined if the preview was changed while the request was in flight
    async _lookup(pblock) {
        for (const source of this._sources) {
            try {
                const response = await pblock.fetch(source.url);

                if (response.ok) {
                    const info = source.parse(await response.json());

                    if (info?.ip)
                        return info;
                }
            }
            catch (e) {
                if (cmdAPI.fetchAborted(e))
                    return undefined;

                console.error(e);
            }
        }

        return null;
    },

    _constructView(pblock, info) {
        const flag = info.flag
            || (/^[a-z]{2}$/i.test(info.countryCode || "")
                ? `https://flagcdn.com/w20/${info.countryCode.toLowerCase()}.png` : "");
        const flagHTML = flag
            ? ` <img src="${Utils.escapeHtml(flag)}" style="height: 16px; vertical-align: middle;"/>`
            : "";
        const place = [info.city, info.region, info.country].filter(p => p).map(Utils.escapeHtml).join(", ");
        const location = place ? ` (${place}${flagHTML})` : "";

        pblock.text(`Current IP address: <b>${Utils.escapeHtml(info.ip)}</b>${location}`);
    }
});
