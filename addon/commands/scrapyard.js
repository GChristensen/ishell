import {settings} from "../settings.js";
import {cmdManager} from "../cmdmanager.js";
import {camelCaseToSnakeCase} from "../utils.js";
import {CommandPreprocessor} from "../api/preprocessor.js";
import {cmdAPI} from "../api/cmdapi.js";

export const namespace = new CommandNamespace(CommandNamespace.SCRAPYARD, true);

const DEFAULT_OUTPUT_LIMIT = 50;

const NODE_TYPE_SHELF = 1;
const NODE_TYPE_GROUP = 2;
const NODE_TYPE_BOOKMARK = 3;
const NODE_TYPE_ARCHIVE = 4;
const NODE_TYPE_SEPARATOR = 5;
const NODE_TYPE_NOTES = 6;
const SEARCH_TYPE_CONTENT = -1;
const SEARCH_TYPE_FIREFOX = -2;
const ENDPOINT_TYPES = [NODE_TYPE_ARCHIVE, NODE_TYPE_BOOKMARK, NODE_TYPE_NOTES];
const TODO_STATE_TODO = 1;
const TODO_STATE_DONE = 4;
const TODO_STATE_WAITING = 2;
const TODO_STATE_POSTPONED = 3;
const TODO_STATE_CANCELLED = 5;
const DEFAULT_SHELF_NAME = "default";
const EVERYTHING = "everything";

let todo_names = {
    [TODO_STATE_TODO]: "TODO",
    [TODO_STATE_WAITING]: "WAITING",
    [TODO_STATE_POSTPONED]: "POSTPONED",
    [TODO_STATE_CANCELLED]: "CANCELLED",
    [TODO_STATE_DONE]: "DONE"
};

let todo_states = {
    "TODO": TODO_STATE_TODO,
    "WAITING": TODO_STATE_WAITING,
    "POSTPONED": TODO_STATE_POSTPONED,
    "CANCELLED": TODO_STATE_CANCELLED,
    "DONE": TODO_STATE_DONE
};

let completionUpdateRequired = true;

browser.runtime.onMessageExternal.addListener(message => {
    switch (message.type) {
        case "SCRAPYARD_INVALIDATE_COMPLETION":
            completionUpdateRequired = true;
            break;
    }
});

function scrapyardSend(message, payload) {
    let msg = Object.assign({type: message}, payload? payload: {})
    return browser.runtime.sendMessage(SCRAPYARD_ID, msg);
}

function openListSuggestion(text, html, _, selectionIndices) {
    if (text) {
        const matcher = new RegExp(text, "i");

        const suggs = this._items
            .filter(i => {
                i.match = matcher.exec(i.path || i.name);
                return (i.path || i.name) && i.match;
            })
            .map(i => cmdAPI.makeSugg(
                i.path || i.name,
                i.path || i.name,
                null,
                i.match.input
                    ? cmdAPI.matchScore(i.match)
                    : .0001,
                selectionIndices
            ));

        const textSugg = cmdAPI.makeSugg(text, html, null, suggs.length ? .001 : 1, selectionIndices);
        if (textSugg)
            suggs.push(textSugg);

        if (suggs.length > 0)
            return suggs;
    }

    return {};
}

cmdAPI.scrapyard = {};

var noun_scrapyard_shelf = {
    label: "shelf",
    _items: [],
    suggest: openListSuggestion
};

var noun_scrapyard_group = {
    label: "path",
    _items: [],
    suggest: openListSuggestion
};

var noun_scrapyard_tag = {
    label: "tags",
    _items: [],
    suggest: openListSuggestion
};

let noun_type_date = {
    label: "date",
    noExternalCalls: true,
    cacheTime: -1,
    suggest: function (text, html, cb, selectionIndices) {
        if (text)
            text = text.trim();

        let suggs;

        function addZero(text) {
            return (("" + text).length === 1? "0": "") + text;
        }

        suggs = [];

        if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(text)) {
            suggs.push(cmdAPI.makeSugg(text, text, null, 1, selectionIndices));
        }
        else if (/^\d{1,2}-\d{1,2}$/.test(text)) {
            let now = new Date();
            let [month, day] = text.split("-");
            let date = now.getFullYear() + "-" + addZero(month) + "-" + addZero(day);
            suggs.push(cmdAPI.makeSugg(date, date, null, 1, selectionIndices));
        }
        else if (/^\d{1,2}$/.test(text)) {
            let now = new Date();
            let date = now.getFullYear() + "-" + addZero(now.getMonth() + 1) + "-" + addZero(text);
            suggs.push(cmdAPI.makeSugg(date, date, null, 1, selectionIndices));
        }

        return suggs;
    }
};

function genericErrorHandler(error) {
    if (error.status)
        cmdAPI.notify("Scrapyard: HTTP error: " + error.status)
    else
        cmdAPI.notify("Cannot contact backend")
}

function updateShelfSuggestions() {
    scrapyardSend("SCRAPYARD_LIST_SHELVES_ISHELL").then(shelves => {
        if (shelves)
            noun_scrapyard_shelf._items = shelves;
    })
}

function updateGroupSuggestions() {
    scrapyardSend("SCRAPYARD_LIST_GROUPS_ISHELL").then(groups => {
        if (groups)
            noun_scrapyard_group._items = groups;
    })
}

function updateTagSuggestions() {
    scrapyardSend("SCRAPYARD_LIST_TAGS_ISHELL").then(tags => {
        if (tags)
            noun_scrapyard_tag._items = tags;
    })
}

function updateCompletion() {
    if (completionUpdateRequired || !noun_scrapyard_group._items.length) {
        //updateShelfSuggestions();
        updateGroupSuggestions();
        updateTagSuggestions();
        completionUpdateRequired = false;
    }
}

let getArgumentText = arg =>
    arg && arg.text && arg.text !== cmdAPI.getSelection() && arg.text !== "this"
        ? arg.text
        : null;

function unpackArgs(cmd, args) {
    let result = {
        search: getArgumentText(args.OBJECT),
        depth: getArgumentText(args.FROM),
        path:  getArgumentText(args.AT) || cmd.__scr_path,
        tags:  getArgumentText(args.AS) || cmd.__scr_tags,
        limit: getArgumentText(args.BY),
        types: args.IN && args.IN.text? args.IN.data: null,
        todo_state: (args.WITH && args.WITH.text? args.WITH.data: null)
            || (cmd.__scr_todo? todo_states[cmd.__scr_todo.toUpperCase()]: undefined),
        todo_date:  getArgumentText(args.TO) || cmd.__scr_due,
        details:  getArgumentText(args.FOR) || cmd.__scr_details,
        _selector: cmd.__scr_selector,
        _filter: cmd.__scr_filter,
        _style: cmd.__scr_style
    };

    if (!result.limit)
        result.limit = DEFAULT_OUTPUT_LIMIT;

    let selection = cmdAPI.getSelection();

    for (let k of Object.keys(result)) {
        if (!result[k] || result[k] === selection)
            delete result[k];
    }

    return result;
}

/**
 @command
 @markdown
 @delay 1000
 @icon /ui/icons/scrapyard.svg
 @description Switch to or create a shelf in Scrapyard.
 @uuid C481A44B-071E-4100-8047-6B708498B3CF
 */
export class Shelf {
    constructor(args) {
        args[OBJECT] = {nountype: noun_scrapyard_group, label: "name"};
    }

    preview({OBJECT: {text: path}}, display) {
        let html = `Switch to or create <span style='color: #FD7221;'>${H(path)}</span> Scrapyard shelf or folder.`;
        display.text(html);
    }

    execute({OBJECT: {text: path}}) {
        scrapyardSend("SCRAPYARD_SWITCH_SHELF_ISHELL", {name: path});
    }
}

/**
 # Syntax
 **scrapyard** [**filter**] [**at** *path*] [**from** *depth*] [**in** *type*] [**as** *tags*] [**by** *amount*]

 # Arguments
 - *filter* - arbitrary text, filters bookmarks by title, URL or content, depending on **type** parameter.
 - *path* - limits the scope of search to the specified path. The default shelf is designated by '~' character.
 - *depth*
     - *folder* - return only bookmarks found in the specified path.
     - *subtree* - search in subfolders (default).
 - *type*
     - *bookmark* - return only bookmarks.
     - *archive* - return only archives.
     - *content* - search by content.
     - *folder* - search for folders.
 - *tags* - filter bookmarks by comma-separated list of tags.
 - *amount* - number, specifies the maximum amount of listed items.

 # Examples
 - **scrapyard** *important* **at** *~/papers* **as** *news*
 - **scrapyard** *notes* **at** *clips/misc* **from** *group* **in** *content*
 
 @command
 @markdown
 @delay 1000
 @icon /ui/icons/scrapyard.svg
 @description List and filter Scrapyard bookmarks.
 @uuid F39C4D86-C987-4A8A-8109-8D683C25BE4E
 */
export class Scrapyard {
    constructor(args) {
        args[OBJECT] = {nountype: noun_arb_text, label: "title"}; // object
        //args[FOR]    = {nountype: noun_arb_text, label: "text"}; // subject
        //args[TO]     = {nountype: noun_arb_text, label: "text"}; // goal
        args[FROM]   = {nountype: ["folder", "subtree"], label: "depth"}; // source
        //args[NEAR]   = {nountype: noun_arb_text, label: "text"}; // location
        args[AT]     = {nountype: noun_scrapyard_group, label: "path"}; // time
        //args[WITH]   = {nountype: noun_arb_text, label: "text"}; // instrument
        args[IN]     = {nountype: {"folder": [NODE_TYPE_GROUP],
                                   "bookmark": [NODE_TYPE_BOOKMARK],
                                   "archive": [NODE_TYPE_ARCHIVE],
                                   "content": SEARCH_TYPE_CONTENT},
                        label: "type"}; // format
        //args[OF]     = {nountype: noun_arb_text, label: "text"}; // modifier
        args[AS]     = {nountype: noun_scrapyard_tag, label: "tags"}; // alias
        args[BY]     = {nountype: noun_type_number, label: "amount"}; // cause
        //args[ON]     = {nountype: noun_arb_text, label: "text"}; // dependency
    }

    init() {
        updateCompletion();
    }

    async preview(args, display) {
        if (args.FROM?.text === "folder")
            args.FROM.text = "group";

        if (args.IN?.text === "folder")
            args.IN.text = "group";

        let payload = unpackArgs(this, args);

        if (!payload.types)
            payload.types = ENDPOINT_TYPES.concat([NODE_TYPE_GROUP]);
        else if (payload.types === SEARCH_TYPE_CONTENT) {
            payload.types = ENDPOINT_TYPES;
            payload.content = true;
        }

        const nodes = await scrapyardSend("SCRAPYARD_LIST_NODES_ISHELL", payload);

        if (!nodes || nodes.length === 0)
            display.text("Bookmarks are empty.");
        else
            this.#createBookmarkList(nodes, display, payload.path);
    }

    execute(args) {
    }

    #createBookmarkList(nodes, display, path) {
        const cfg = {
            text: n => {
                if (n.type === NODE_TYPE_GROUP)
                    return H(n.path)
                else {
                    if (n.uri && !n.name)
                        return H(n.uri);
                    else
                        return n.name;
                }
            },
            subtext: n => n.uri && H(n.uri),
            icon: n => {
                if (n.type === NODE_TYPE_GROUP)
                    return "/ui/icons/folder.svg";
                else if (n.icon)
                    return n.icon;
                else
                    return "/ui/icons/globe.svg";
            },
            iconSize: 16,
            className: n => n.type === NODE_TYPE_GROUP? "n-group": "",
            action: n => {
                if (n.type === NODE_TYPE_GROUP) {
                    let itemPath = path? path + "/": "";
                    cmdAPI.setCommandLine("scrapyard from folder at " + itemPath + n.path);
                }
                else
                    scrapyardSend("SCRAPYARD_BROWSE_NODE_ISHELL", {node: n});
            }
        };

        const style = `.n-group .opl-lines {
                        color: #FD7221;
                        font-weight: 500;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        flex: 1 1 auto;
                     }`;

        const list = display.objectList(nodes, cfg, style);

        $(list).find("img.n-icon").on("error", e => e.target.src = "/ui/icons/globe.svg");
    }
}

class BookmarkCommandBase {
    constructor(args) {
        args[OBJECT] = {nountype: noun_arb_text, label: "title"}; // object
        args[FOR]    = {nountype: noun_arb_text, label: "details"}; // subject
        args[TO]     = {nountype: noun_type_date, label: "due"}; // goal
        //args[FROM]   = {nountype: noun_arb_text, label: "text"}; // source
        //args[NEAR]   = {nountype: noun_arb_text, label: "text"}; // location
        args[AT]     = {nountype: noun_scrapyard_group, label: "path"}; // time
        args[WITH]   = {nountype: {"TODO": TODO_STATE_TODO,
                                   "WAITING": TODO_STATE_WAITING,
                                   "POSTPONED": TODO_STATE_POSTPONED,
                                   "CANCELLED": TODO_STATE_CANCELLED,
                                   "DONE": TODO_STATE_DONE},
                        label: "todo"}; // instrument
        //args[IN]     = {nountype: noun_arb_text, label: "text"}; // format
        //args[OF]     = {nountype: noun_arb_text, label: "text"}; // modifier
        args[AS]     = {nountype: noun_scrapyard_tag, label: "tags"}; // alias
        //args[BY]     = {nountype: noun_arb_text, label: "text"}; // cause
        //args[ON]     = {nountype: noun_arb_text, label: "text"}; // dependency
    }

    preview(args, display) {
        let {search, path, tags, todo_state, todo_date, details} = unpackArgs(this, args);
        let title = search || cmdAPI.activeTab?.title || "Bookmark";
        let html = "";

        if (title)
            html += "Bookmark title: <span style='color: #45BCFF;'>" + Utils.escapeHtml(title) + "</span><br>";

        if (path)
            html += "Path: <span style='color: #FD7221;'>" + Utils.escapeHtml(path) + "</span><br>";

        if (tags && cmdAPI.getSelection() !== tags)
            html += "Tags: <span style='color: #7DE22E;'>" + Utils.escapeHtml(tags) + "</span><br>";

        if (todo_state)
            html += "Priority: <span style='" + this._styleTODO(todo_state) + "'>"
                + Utils.escapeHtml(todo_names[todo_state]) + "</span><br>";

        if (todo_date)
            html += "Deadline: <span style='" + this._styleTODO(todo_state) + "'>&lt;"
                + Utils.escapeHtml(todo_date) + "&gt;</span><br>";

        if (details) {
            html += "Details: " + Utils.escapeHtml(details) + "<br>";
        }

        if (html)
            display.text(html);
    }

    async execute(args) {
        let payload = unpackArgs(this, args);

        payload.name = payload.search;
        payload.uri = cmdAPI.getLocation();

        scrapyardSend(`SCRAPYARD_ADD_${this.__entity}_ISHELL`, payload);
    };

    _todoColor(todo_state) {
        switch (todo_state) {
            case TODO_STATE_TODO:
                return "#fc6dac";
            case TODO_STATE_WAITING:
                return"#ff8a00";
            case TODO_STATE_POSTPONED:
                return "#00b7ee";
            case TODO_STATE_CANCELLED:
                return "#ff4d26";
            case TODO_STATE_DONE:
                return "#00b60e";
        }
        return "";
    }

    _styleTODO(todo_state) {
        if (todo_state)
            return "color: " + this._todoColor(todo_state) + "; font-weight: bold;";

        return "";
    }
}

/**
 # Syntax
 **archive** [**this** | *title*] [**at** *path*] [**as** *tags*] [**for** *details*] [**with** *todo*] [**to** *due*]

 # Arguments
 - **this** - may be required if iShell offers incorrect suggestions.
 - *title* - bookmark title. The current tab name used if not specified.
 - *path* - the folder to save archive into. The default shelf is designated by '~' character.
 - *tags* - assigns a comma-separated list of tags to the created archive.
 - *details* - fills the 'Details' property.
 - *todo* - sets bookmark TODO state.
 - *due* - sets bookmark TODO deadline.

 # Examples
 - **archive** **this** **at** *~/wiki* **as** *chem* **with** *todo* **to** *10* **for** *research*
 
 @command
 @markdown
 @icon /ui/icons/scrapyard.svg
 @description Archive a web-page or selection to <a href="https://gchristensen.github.io/scrapyard/" target="_blank">Scrapyard</a>.
 @uuid 2CFD7052-84E2-465C-A450-45BFFE3C6C80
 */
export class Archive extends BookmarkCommandBase {
    constructor(args) {
        super(args);
        this.__entity = "ARCHIVE";
    }
}

/**
 # Syntax
 Same as **archive**.

 @command
 @markdown
 @icon /ui/icons/scrapyard.svg
 @description Bookmark a web-page to Scrapyard.
 @uuid 520F182C-34D0-4837-B42A-64A7E859D3D5
 */
export class Bookmark extends BookmarkCommandBase {
    constructor(args) {
        super(args);
        this.__entity = "BOOKMARK";
    }
}

class CopyCommandBase {
    constructor(args) {
        args[OBJECT] = {nountype: noun_scrapyard_group, label: "path"}; // object
        args[BY]     = {nountype: ["switching"], label: "action"}; // cause
    }

    async preview({OBJECT: {text: path}, BY: {text: action}}, display) {
        let html = "";

        if (path)
            html += "Path: <span style='color: #FD7221;'>" + H(path) + "</span><br>";

        if (action) {
            let actionDesc;

            switch (action) {
                case "switching":
                    actionDesc = "switch to the destination folder";
                    break;
            }

            html += "Action: <span style='color: #45BCFF;'>" + actionDesc + "</span><br>";
        }

        if (html)
            display.text(html);
    }

    execute({OBJECT: {text: path}, BY: {text: action}}) {
        if (!path)
            return;
        
        scrapyardSend(`SCRAPYARD_${this.__action}_AT_ISHELL`, {path, action});
    }
}

/**
 # Syntax
  **copy-at** *path* [**by** *action*]

 # Arguments

 - *path* - path of the destination folder.
 - *action* - action to take after copying:
    - *switching* - switch to the destination folder.

 # Example
 - **copy-at** *~/wiki* **by** *switching*

 @command
 @markdown
 @delay 1000
 @icon /ui/icons/scrapyard.svg
 @description Copy selected bookmarks at the destination folder.
 @uuid F21CD346-D5B0-41F1-BAC0-1E325DB9DD21
 */
export class CopyAt extends CopyCommandBase {
    constructor(args) {
        super(args);
        this.__action = "COPY";
    }
}

/**
 # Syntax
 Same as **copy-at**.

 @command
 @markdown
 @delay 1000
 @icon /ui/icons/scrapyard.svg
 @description Copy selected bookmarks at the destination folder.
 @uuid 425CC0C9-8794-486E-AF8C-3D64F92F9AD7
 */
export class MoveAt extends CopyCommandBase {
    constructor(args) {
        super(args);
        this.__action = "MOVE";
    }
}

CmdUtils.makeCaptureCommand =
cmdAPI.makeCaptureCommand =
cmdAPI.createCaptureCommand = function(options) {
    if (options.path) {
        options.__scr_path = options.path;
        delete options.path;
    }

    if (options.selector) {
        options.__scr_selector = options.selector;
        delete options.selector;
    }

    if (options.filter) {
        options.__scr_filter = options.filter;
        delete options.filter;
    }

    if (options.details) {
        options.__scr_details = options.details;
        delete options.details;
    }

    if (options.due) {
        options.__scr_due = options.due;
        delete options.due;
    }

    if (options.todo) {
        options.__scr_todo = options.todo;
        delete options.todo;
    }

    if (options.tags) {
        options.__scr_tags = options.tags;
        delete options.tags;
    }

    if (options.style) {
        options.__scr_style = options.style;
        delete options.style;
    }

    let action = options.type === "bookmark"
        ? "Bookmark"
        : "Archive";

    options = Object.assign(options, {
        icon: "/ui/icons/scrapyard.svg",
        description: options.description || (action + " a web-page or selection to Scrapyard."),
        previewDelay: options.previewDelay || 1000,
        __entity: action.toUpperCase()
    });

    const command = CommandPreprocessor.instantiateCommand(BookmarkCommandBase);
    Object.assign(command, options);

    return cmdAPI.createCommand(command);
};

let ISHELL_ID = browser.runtime.getManifest().applications?.gecko?.id;
let SCRAPYARD_ID = ISHELL_ID?.includes("-we")
    ? "scrapyard-we@firefox"
    : "scrapyard@firefox";

cmdAPI.scrapyard = new Proxy({}, {
    get(target, key, receiver) {

        if (key === "noun_type_directory")
            return noun_scrapyard_group;

        return (val) => {
            const payload = val || {};
            payload.type = "SCRAPYARD_" + camelCaseToSnakeCase(key);
            return browser.runtime.sendMessage(SCRAPYARD_ID, payload);
        };
    }
});

chrome.management.onInstalled.addListener(async (info) => {
    if (info.id === SCRAPYARD_ID) {
        await settings.scrapyard_presents(true);
        chrome.runtime.reload();
    }
});

chrome.management.onUninstalled.addListener(async (info) => {
    if (info.id === SCRAPYARD_ID) {
        await settings.scrapyard_presents(false);
        chrome.runtime.reload()
    }
});

let SCRAPYARD_COMMANDS;
namespace.onModuleCommandsLoaded = function() {
    const commandUUIDs = [
        cmdAPI.getCommandAttributes(Shelf).uuid,
        cmdAPI.getCommandAttributes(Scrapyard).uuid,
        cmdAPI.getCommandAttributes(Bookmark).uuid,
        cmdAPI.getCommandAttributes(Archive).uuid,
        cmdAPI.getCommandAttributes(CopyAt).uuid,
        cmdAPI.getCommandAttributes(MoveAt).uuid
    ];

    SCRAPYARD_COMMANDS = commandUUIDs.map(cmdManager.getCommandByUUID.bind(cmdManager));
    SCRAPYARD_COMMANDS.forEach(c => cmdManager.removeCommand(c));

    checkForScrapyard();
};

async function isScrapyardPresents() {
    try {
        const response = await browser.runtime.sendMessage(SCRAPYARD_ID, {type: "SCRAPYARD_GET_VERSION"});
        return !!response;
    }
    catch (e) {
        return false;
    }
}

async function checkForScrapyard(retry = 1) {
    //console.log(`Checking for Scrapyard, retry ${retry}`);

    let scrapyardPresents = await isScrapyardPresents();

    if (scrapyardPresents) {
        settings.scrapyard_presents(true)

        if (cmdManager.commands.indexOf(SCRAPYARD_COMMANDS[0]) < 0)
            cmdManager.commands = [...cmdManager.commands, ...SCRAPYARD_COMMANDS];
    }
    else {
        if (retry < 10)
            setTimeout(() => checkForScrapyard(retry + 1), 1000);
        else
            settings.scrapyard_presents(false);
    }
}
