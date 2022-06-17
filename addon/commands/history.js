import {settings} from "../settings.js";
import {NAMESPACE_BROWSER} from "./_namespaces.js";

/**
 @nountype
 @label day
*/
export function noun_type_history_date(text, html, cb, selectionIndices) {
    let predefs = ["today", "yesterday", "week", "month"];
    let matcher = new RegExp(text, "i");
    let suggs;

    let matchingPredefs = predefs.map(p => ({label: p}))
        .filter(p => {
            p.match = matcher.exec(p.label);
            return !!p.match;
        });

    function addZero(text) {
        return (("" + text).length === 1? "0": "") + text;
    }

    suggs = matchingPredefs.map(p =>
        NounUtils.makeSugg(p.label, p.label, dayToDate(p.label), NounUtils.matchScore(p.match), selectionIndices));

    if (/\d{4}-d{1,2}-d{1,2}/.test(text)) {
        suggs.push(NounUtils.makeSugg(text, text, dayToDate(text), NounUtils.matchScore(p.match), selectionIndices));
    }
    else if (/\d{1,2}-\d{1,2}/.test(text)) {
        let now = new Date();
        let [month, day] = text.split("-");
        let date = now.getFullYear() + "-" + addZero(month) + "-" + addZero(day);
        suggs.push(NounUtils.makeSugg(date, date, dayToDate(date), 1, selectionIndices));
    }
    else if (/\d{1,2}/.test(text)) {
        let now = new Date();
        let date = now.getFullYear() + "-" + addZero(now.getMonth() + 1) + "-" + addZero(text);
        suggs.push(NounUtils.makeSugg(date, date, dayToDate(date), 1, selectionIndices));
    }

    return suggs;
}

function dayToDate(day) {
    let date;

    switch (day) {
        case "today":
            date = new Date();
            date.setHours(0,0,0,0);
            break;
        case "yesterday":
            date = new Date();
            date.setDate(date.getDate() - 1);
            break;
        case "week":
            date = new Date();
            date.setDate(date.getDate() - 7);
            break;
        case "month":
            date = new Date();
            date.setDate(date.getDate() - 30);
            break;
        default:
            if (day)
                date = new Date(day + "T00:00:00");
            else {
                console.log("date command: empty day");
            }
    }

    return date;
}

/**
    # Syntax
    **history** [*filter*] [**for** *domain*] [**of** *day*] [**from** *day*] [**to** *day*] [**by** *amount*]
 
    # Arguments
    - *filter* - arbitrary text, filters history items by title or URL if specified.
    - *domain* - additional filter by URL.
    - *day* - {**today** | yesterday | week | month | YYYY-MM-DD | MM-DD | DD | D}, specifies date to search history for.
    - *amount* - number, specifies the maximum amount of listed items.

    # Examples
    - **history** *books* **from** *01* **to** *10*
    - **history** *news* **for** *example.com* **of** *week* **by** *50*

    @command
    @markdown
    @author g/christensen
    @delay 1000
    @icon /ui/icons/history.ico
    @description Search browsing history.
    @uuid 128DEB45-F187-4A1F-A74D-566EDAE8DD0F
*/
export class History {
    _namespace = NAMESPACE_BROWSER;

    constructor(args) {
        args[OBJECT] = {nountype: noun_arb_text, label: "title or url"}; // object
        args[FOR]    = {nountype: /[^\s]+/, label: "url"}; // subject
        args[TO]     = {nountype: noun_type_history_date, label: "day"}; // goal
        args[FROM]   = {nountype: noun_type_history_date, label: "day"}; // source
        //args[NEAR]   = {nountype: noun_arb_text, label: "text"}; // location
        //args[AT]     = {nountype: noun_arb_text, label: "text"}; // time
        //args[WITH]   = {nountype: noun_arb_text, label: "text"}; // instrument
        //args[IN]     = {nountype: noun_arb_text, label: "text"}; // format
        args[OF]     = {nountype: noun_type_history_date, label: "day"}; // modifier
        //args[AS]     = {nountype: noun_arb_text, label: "text"}; // alias
        args[BY]     = {nountype: noun_type_number, label: "amount"}; // cause
        //args[ON]     = {nountype: noun_arb_text, label: "text"}; // dependency
    }

    async preview({OBJECT, FOR, FROM, TO, OF, BY}, display, storage) {
        let maxResults = BY?.data || settings.max_history_items() || 20;
        let forDomain = FOR?.text;

        let startDate = OF?.data || this.#monthAgo;

        if (FROM?.data)
            startDate = FROM?.data;

        let endDate = new Date();

        if (TO?.data)
            endDate = TO?.data;

        let historyItems = await browser.history.search({
            text: OBJECT.text,
            startTime: startDate,
            endTime: endDate,
            maxResults: forDomain? undefined: maxResults
        });

        if (!historyItems || historyItems.length === 0)
            display.text("History is empty.");
        else {
            if (forDomain) {
                let matcher = new RegExp(forDomain, "i");
                historyItems = historyItems.filter(hi => !!matcher.exec(hi.url));
                historyItems = historyItems.slice(0, maxResults);
            }

            cmdAPI.objectPreviewList(display, historyItems, {
                text: (h => h.url && !h.title? h.url: h.title),
                subtext: (h => h.url && !h.title? null: h.url),
                action: h =>  browser.tabs.create({"url": h.url, active: ContextUtils.activateTab})
            });
        }
    }

    execute(args, storage) {
    }

    get #monthAgo() {
        const date = new Date();
        date.setHours(0,0,0,0);
        date.setDate(date.getDate() - 30);
        return date;
    }
}
