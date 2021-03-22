{
    const NAMESPACE = "Scrapyard";

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

    browser.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
        switch (message.type) {
            case "SCRAPYARD_INVALIDATE_COMPLETION":
                completionUpdateRequired = true;
                break;
        }
    });

    function scrapyardSend(message, payload) {
        let msg = Object.assign({type: message}, payload? payload: {})
        return browser.runtime.sendMessage(scrapyard_id, msg);
    }

    function openListSuggestion(text, html, cb, selectionIndices) {
        if (text) {
            let matcher = new RegExp(text, "i");

            let suggs = this._items.filter(i => {
                i.match = matcher.exec(i.path || i.name);
                return (i.path || i.name) && i.match;
            }).map(i => CmdUtils.makeSugg(i.path || i.name, i.path || i.name, null,
                i.match.input? CmdUtils.matchScore(i.match): .0001, selectionIndices));

            let textSugg = CmdUtils.makeSugg(text, html, null, suggs.length ? .001 : 1, selectionIndices);
            if (textSugg)
                suggs.push(textSugg);

            if (suggs.length > 0)
                return suggs;
        }

        return {};
    }


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
                suggs.push(CmdUtils.makeSugg(text, text, null, 1, selectionIndices));
            }
            else if (/^\d{1,2}-\d{1,2}$/.test(text)) {
                let now = new Date();
                let [month, day] = text.split("-");
                let date = now.getFullYear() + "-" + addZero(month) + "-" + addZero(day);
                suggs.push(CmdUtils.makeSugg(date, date, null, 1, selectionIndices));
            }
            else if (/^\d{1,2}$/.test(text)) {
                let now = new Date();
                let date = now.getFullYear() + "-" + addZero(now.getMonth() + 1) + "-" + addZero(text);
                suggs.push(CmdUtils.makeSugg(date, date, null, 1, selectionIndices));
            }

            return suggs;
        }
    };

    function genericErrorHandler(error) {
        if (error.status)
            CmdUtils.notify("Scrapyard: HTTP error: " + error.status)
        else
            CmdUtils.notify("Cannot contact backend")
    }


    function updateShelfSuggestions() {
        scrapyardSend("SCRAPYARD_LIST_SHELVES").then(shelves => {
            if (shelves)
                noun_scrapyard_shelf._items = shelves;
        })
    }


    function updateGroupSuggestions() {
        scrapyardSend("SCRAPYARD_LIST_GROUPS").then(groups => {
            if (groups)
                noun_scrapyard_group._items = groups;
        })
    }


    function updateTagSuggestions() {
        scrapyardSend("SCRAPYARD_LIST_TAGS").then(tags => {
            if (tags)
                noun_scrapyard_tag._items = tags;
        })
    }


    function updateCompletion() {
        if (completionUpdateRequired || !noun_scrapyard_group._items.length) {
            updateShelfSuggestions();
            updateGroupSuggestions();
            updateTagSuggestions();
            completionUpdateRequired = false;
        }
    }

    let getArgumentText = arg =>
        arg && arg.text && arg.text !== CmdUtils.getSelection() && arg.text !== "this"
            ? arg.text
            : null;

    function unpackArgs(cmd, args) {

        if (cmd.__scr_ignore_args) {
            for (let arg of cmd.__scr_ignore_args)
                args[arg] = undefined;
        }

        // let result = {
        //     search: args.object && args.object.text && args.object.text !== "this"? args.object.text: null,
        //     depth: args.source && args.source.text? args.source.text: null,
        //     path:  (args.time && args.time.text? args.time.text: null) || cmd.__scr_path,
        //     tags:  (args.alias && args.alias.text? args.alias.text: null) || cmd.__scr_tags,
        //     limit: args.cause && args.cause.text? args.cause.text: null,
        //     types: args.format && args.format.text? args.format.data: null,
        //     todo_state: (args.instrument && args.instrument.text? args.instrument.data: null)
        //         || (cmd.__scr_todo? todo_states[cmd.__scr_todo.toUpperCase()]: undefined),
        //     todo_date:  (args.goal && args.goal.text? args.goal.text: null) || cmd.__scr_due,
        //     details:  (args.subject && args.subject.text? args.subject.text: null) || cmd.__scr_details,
        //     _selector: cmd.__scr_selector,
        //     _filter: cmd.__scr_filter,
        //     _style: cmd.__scr_style
        // };

        let result = {
            search: getArgumentText(args.object),
            depth: getArgumentText(args.source),
            path:  getArgumentText(args.time) || cmd.__scr_path,
            tags:  getArgumentText(args.alias) || cmd.__scr_tags,
            limit: getArgumentText(args.cause),
            types: args.format && args.format.text? args.format.data: null,
            todo_state: (args.instrument && args.instrument.text? args.instrument.data: null)
                            || (cmd.__scr_todo? todo_states[cmd.__scr_todo.toUpperCase()]: undefined),
            todo_date:  getArgumentText(args.goal) || cmd.__scr_due,
            details:  getArgumentText(args.subject) || cmd.__scr_details,
            _selector: cmd.__scr_selector,
            _filter: cmd.__scr_filter,
            _style: cmd.__scr_style
        };

        if (!result.limit)
            result.limit = DEFAULT_OUTPUT_LIMIT;

        let selection = CmdUtils.getSelection();

        for (let k of Object.keys(result)) {
            if (!result[k] || result[k] === selection)
                delete result[k];
        }

        cmd.__scr__args = result;

        return result;
    }


    let shelfCmd = CmdUtils.CreateCommand({
        name: "shelf",
        uuid: "C481A44B-071E-4100-8047-6B708498B3CF",
        arguments: [{role: "object", nountype: noun_scrapyard_group, label: "name"}],
        description: "Switch to or create a shelf in Scrapyard.",
        icon: "/res/icons/scrapyard.svg",
        _namespace: NAMESPACE,
        preview: function(pblock, {object: {text}}) {
            pblock.innerHTML = "Switch to or create <span style='color: #FD7221;'>"
                + Utils.escapeHtml(text)
                + "</span> Scrapyard shelf.";
        },
        execute: function({object: {text}}) {
            scrapyardSend("SCRAPYARD_SWITCH_SHELF", {name: text});
        }
    });

    let scrapyardCmd = CmdUtils.CreateCommand({
        name: "scrapyard",
        uuid: "F39C4D86-C987-4A8A-8109-8D683C25BE4E",
        arguments: [{role: "object",     nountype: noun_arb_text, label: "title"},
            //{role: "subject",    nountype: noun_arb_text, label: "text"}, // for
            //{role: "goal",       nountype: noun_arb_text, label: "text"}, // to
            {role: "source",     nountype: ["group", "subtree"], label: "depth"}, // from
            //{role: "location",   nountype: noun_arb_text, label: "text"}, // near
            {role: "time",       nountype: noun_scrapyard_group, label: "path"}, // at
            //{role: "instrument", nountype: noun_arb_text, label: "text"}, // with
            {role: "format",     nountype: {"group": [NODE_TYPE_GROUP],
                    "bookmark": [NODE_TYPE_BOOKMARK],
                    "archive": [NODE_TYPE_ARCHIVE],
                    "content": SEARCH_TYPE_CONTENT},
                label: "type"}, // in
            //{role: "modifier",   nountype: noun_arb_text, label: "text"}, // of
            {role: "alias",      nountype: noun_scrapyard_tag, label: "tags"}, // as
            {role: "cause",      nountype: noun_type_number, label: "amount"}, // by
        ],
        description: "List and filter Scrapyard or Firefox bookmarks.",
        help:  `<span class="syntax">Syntax</span>
            <ul class="syntax">
                <li><b>scrapyard</b> [<i>filter</i>] [<b>at</b> <i>path</i>] [<b>from</b> <i>depth</i>] [<b>in</b> <i>type</i>] [<b>as</b> <i>tags</i>] [<b>by</b> <i>amount</i>]</li>
            </ul>
            <span class="arguments">Arguments</span><br>
            <ul class="syntax">
                <li>- <i>filter</i> - arbitrary text, filters bookmarks by title, URL or content, depending on <i>type</i> parameter.</li>
            </ul>
            <ul class="syntax">
                <li>- <i>path</i> - limits the scope of search to the specified path. The default shelf is designated by '~' character.</li>
            </ul>
            <ul class="syntax">
                <li>- <i>depth</i> 
                 <li><ul class="arguments">
                    <li><b>group</b> - return only bookmarks found in the specified path.</li> 
                    <li><b>subtree</b> - search in subfolders (default).</li>
                 </ul></li>
                </li>
            </ul>
            <ul class="syntax">
                <li>- <i>type</i> 
                 <li><ul class="arguments">
                    <li><b>bookmark</b> - return only bookmarks.</li> 
                    <li><b>archive</b> - return only archives.</li>
                    <li><b>content</b> - search by content.</li>
                 </ul></li>
                </li>
            </ul>
            <ul class="syntax">
                <li>- <i>tags</i> - filter bookmarks by comma-separated list of tags.</li>
            </ul>
            <ul class="syntax">
                <li>- <i>amount</i> - number, specifies the maximum amount of listed items.</li>
            </ul>
            <span class="arguments">Examples</span>
            <ul class="syntax">
                <li><b>scrapyard</b> <i>important</i> <b>at</b> <i>~/papers</i> <b>as</b> <i>news</i></li>
                <li><b>scrapyard</b> <i>notes</i> <b>at</b> <i>clips/misc</i> <b>from</b> <i>group</i> <b>in</b> <i>content</i></li>
            </ul>`,
        icon: "/res/icons/scrapyard.svg",
        previewDelay: 1000,
        _namespace: NAMESPACE,
        init: function(doc /* popup document */) {
            updateCompletion();
        },
        preview: function(pblock, args) {
            let payload = unpackArgs(this, args);
            if (!payload.types)
                payload.types = ENDPOINT_TYPES.concat([NODE_TYPE_GROUP]);
            else {
                if (payload.types === SEARCH_TYPE_CONTENT) {
                    payload.types = ENDPOINT_TYPES;
                    payload.content = true;
                }
                else if (payload.types === SEARCH_TYPE_FIREFOX) {
                    payload.types = "firefox";
                }
            }

            scrapyardSend("SCRAPYARD_LIST_NODES", payload).then(nodes => {
                if (!nodes || nodes.length === 0) {
                    pblock.innerHTML = "Bookmarks are empty."
                }
                else {
                    let html = "";
                    let items = [];
                    for (let n of nodes) {
                        let text = "";

                        if (n.type === NODE_TYPE_GROUP) {
                            text = "<img class='n-icon' src='/res/icons/folder.svg'>"
                                + "<div class='n-group'>" + Utils.escapeHtml(n.path) + "</div>";
                        }
                        else {
                            if (n.icon) {
                                n.icon = n.icon.replace(/'/g, "\\'");
                                text = "<img class='n-icon' src='" + n.icon + "'>"
                            }
                            else
                                text = "<img class='n-icon' src='/res/icons/globe.svg'>";


                            if (n.uri && !n.name)
                                text += "<div class='cnt'>" + Utils.escapeHtml(n.uri) + "</div>";
                            else
                                text += "<div class='cnt'><div class='n-title'>" + n.name + "</div>"
                                    +  "<div class='n-url'>" + Utils.escapeHtml(n.uri) + "</div></div>";
                        }

                        items.push(text);
                    }

                    let list = CmdUtils.previewList(pblock, items, (i, _) => {
                            if (nodes[i].type === NODE_TYPE_GROUP) {
                                let path = payload.path? payload.path + "/": "";

                                CmdUtils.setCommandLine("scrapyard from group at " + path + nodes[i].path);
                            }
                            else {
                                ///if (typeof nodes[i].id === "string" && nodes[i].id.startsWith("firefox_"))
                                scrapyardSend("SCRAPYARD_BROWSE_NODE", {node: nodes[i]});
                            }
                        },
                        `.preview-list-item {
                        white-space: nowrap;
                        display: flex;
                        flex-flow: row nowrap;
                        align-content: center;
                    }
                     .preview-list-item > span:nthchild(1) {
                        flex 0 1 auto;
                     }
                     .preview-list-item > span:nthchild(2) {
                        flex 1 1 auto;
                     }
                     .preview-item-text {
                        color: #45BCFF;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        width: 490px;
                        display: flex;
                        flex-flow: row nowrap;
                        align-content: center;
                     }
                     .n-icon {
                        width: 16px;
                        height: 16px;
                        float: left;
                        margin-top: 5px;
                        margin-bottom: 5px;
                        margin-right: 5px;
                        display: inline-block;
                        flex: 0 1 auto;
                     }
                     .cnt {
                      flex: 1 1 auto;
                      min-width: 0;
                     }
                     .n-group {
                        color: #FD7221;
                        font-weight: 500;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        width: 490px;
                        flex: 1 1 auto;
                     }
                     .n-url {
                        font-size: x-small;
                        padding-left: 10px;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        color: #FD7221;
                     }
                     .n-title {
                        overflow: hidden;
                        white-space: nowrap;
                        text-overflow: ellipsis;
                     }`
                    );
                    
                    $(list).find("img.n-icon").on("error", 
                        e => e.target.src = "/res/icons/globe.svg");
                }
            });
        },
        execute: function(args, {Bin}) {

        }
    });

    function _todoColor(todo_state) {
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

    function _styleTODO(todo_state) {
        if (todo_state)
            return "color: " + _todoColor(todo_state) + "; font-weight: bold;";

        return "";
    }

    let bookmarkingArgs = [
        {role: "object",     nountype: noun_arb_text, label: "title"},
        {role: "subject",    nountype: noun_arb_text, label: "details"}, // for
        {role: "goal",       nountype: noun_type_date, label: "due"}, // to
        //{role: "source",     nountype: ["group", "subtree"], label: "depth"}, // from
        //{role: "location",   nountype: noun_arb_text, label: "text"}, // near
        {role: "time",       nountype: noun_scrapyard_group, label: "path"}, // at
        {role: "instrument", nountype: {"TODO": TODO_STATE_TODO,
                "WAITING": TODO_STATE_WAITING,
                "POSTPONED": TODO_STATE_POSTPONED,
                "CANCELLED": TODO_STATE_CANCELLED,
                "DONE": TODO_STATE_DONE}, label: "todo"}, // with
        //{role: "format",     nountype: noun_arb_text, label: "text"}, // in
        //{role: "modifier",   nountype: noun_arb_text, label: "text"}, // of
        {role: "alias",      nountype: noun_scrapyard_tag, label: "tags"}, // as
        //{role: "cause",      nountype: noun_type_number, label: "amount"}, // by
    ];


    let bookmarkingCommandHelp = "help";

    function bookmarkingCommandPreview(node_type) {
        return function(pblock, args) {
            let {search, path, tags, todo_state, todo_date, details} = unpackArgs(this, args);

            let title = search
                ? search
                : (CmdUtils.activeTab
                    ? CmdUtils.activeTab.title
                    : "Bookmark");

            let html = "";

            if (title)
                html += "Bookmark title: <span style='color: #45BCFF;'>" + Utils.escapeHtml(title) + "</span><br>";

            if (path)
                html += "Path: <span style='color: #FD7221;'>" + Utils.escapeHtml(path) + "</span><br>";

            if (tags && CmdUtils.getSelection() !== tags)
                html += "Tags: <span style='color: #7DE22E;'>" + Utils.escapeHtml(tags) + "</span><br>";

            if (todo_state)
                html += "Priority: <span style='" + _styleTODO(todo_state) + "'>"
                    + Utils.escapeHtml(todo_names[todo_state]) + "</span><br>";

            if (todo_date)
                html += "Deadline: <span style='" + _styleTODO(todo_state) + "'>&lt;"
                    + Utils.escapeHtml(todo_date) + "&gt;</span><br>";

            if (details) {
                html += "Details: " + Utils.escapeHtml(details) + "<br>";
            }

            if (html)
                pblock.innerHTML = html;
        }
    }


    function bookmarkingCommand(node_type) {
        return function(args) {
            let url = CmdUtils.getLocation();

            if (!url) {
                CmdUtils.notify("Scrapyard: cannot obtain page URL");
                return;
            }

            let payload = this.__scr__args;
            delete this.__scr__args;

            let title = payload.search
                ? payload.search
                : (CmdUtils.activeTab
                    ? CmdUtils.activeTab.title
                    : "Bookmark");

            payload.name = payload.search = title;
            payload.uri = url;

            let send = () =>
                scrapyardSend(node_type == NODE_TYPE_BOOKMARK
                    ? "SCRAPYARD_ADD_BOOKMARK"
                    : "SCRAPYARD_ADD_ARCHIVE", payload);

            let test_default_favicon = () => {
                let favicon = new URL(CmdUtils.activeTab.url).origin + "/favicon.ico";
                fetch(favicon, {method: "GET"})
                    .then(response => {
                        let type = response.headers.get("content-type") || "image";
                        if (response.ok && type.startsWith("image"))
                            response.arrayBuffer().then(bytes => {
                                        payload.icon = bytes.byteLength? favicon.toString(): undefined;
                                        send();
                                    });
                        else
                            send();
                    }).catch(() => send());
            };

            chrome.tabs.executeScript(CmdUtils.activeTab.id, {
                    code: `function extractIcon() {
                                let iconElt = document.querySelector("head link[rel*='icon'], head link[rel*='shortcut']");
                                if (iconElt)
                                    return iconElt.href;
                            }
                            extractIcon();
                            `
                },
                icon => {
                    if (chrome.runtime.lastError) {
                        send();
                    }
                    else if (icon && icon.length && icon[0]) {
                        let icon_url = new URL(icon[0], new URL(CmdUtils.activeTab.url).origin);
                        payload.icon = icon_url.toString();
                        send();
                    } else {
                        test_default_favicon();
                    }
                });

            if (payload.path && noun_scrapyard_group._items && !noun_scrapyard_group._items.includes(payload.path)) {
                noun_scrapyard_group._items.push(payload.path);
            }
        };
    }


    let bookmarkCmd = CmdUtils.CreateCommand({
        name: "bookmark",
        uuid: "520F182C-34D0-4837-B42A-64A7E859D3D5",
        arguments: bookmarkingArgs,
        description: "Add bookmark to Scrapyard.",
        help:  `<span class="syntax">Syntax</span>
            <ul class="syntax">
                <li>Same as <b>archive</b>.</li>
            </ul>`,
        icon: "/res/icons/scrapyard.svg",
        //previewDelay: 1000,
        _namespace: NAMESPACE,
        preview: bookmarkingCommandPreview(NODE_TYPE_BOOKMARK),
        execute: bookmarkingCommand(NODE_TYPE_BOOKMARK)

    });


    let archiveCmd = CmdUtils.CreateCommand({
        name: "archive",
        uuid: "2CFD7052-84E2-465C-A450-45BFFE3C6C80",
        arguments: bookmarkingArgs,
        description: "Archive a web-page or selection to Scrapyard.",
        help: `<span class="syntax">Syntax</span>
            <ul class="syntax">
                <li><b>archive</b> [<b>this</b> | <i>title</i>] [<b>at</b> <i>path</i>] [<b>as</b> <i>tags</i>] [<b>for</b> <i>details</i>] [<b>with</b> <i>todo</i>] [<b>to</b> <i>due</i>]</li>
            </ul>
            <span class="arguments">Arguments</span><br>
            <ul class="syntax">
                <li>- <b>this</b> - may be required if iShell offers incorrect suggestions.</li>
            </ul>
            <ul class="syntax">
                <li>- <i>title</i> - bookmark title. The current tab name used if not specified.</li>
            </ul>
            <ul class="syntax">
                <li>- <i>path</i> - limits the scope of search to the specified path. The default shelf is designated by '~' character.</li>
            </ul>
            <ul class="syntax">
                <li>- <i>tags</i> - assigns a comma-separated list of tags to the created archive.</li>
            </ul>
            <ul class="syntax">
                <li>- <i>details</i> - fills the 'Details' property.</li>
            </ul>
            <ul class="syntax">
                <li>- <i>todo</i> - sets bookmark TODO state.</li>
            </ul>
            <ul class="syntax">
                <li>- <i>due</i> - sets bookmark TODO deadline.</li>
            </ul>
            <span class="arguments">Examples</span>
            <ul class="syntax">
                <li><b>archive</b> <b>this</b> <b>at</b> <i>~/wiki</i> <b>as</b> <i>chem</i> <b>with</b> <i>todo</i> <b>to</b> <i>10</i> <b>for</b> <i>research</i></li>
            </ul>`,
        icon: "/res/icons/scrapyard.svg",
        //previewDelay: 1000,
        _namespace: NAMESPACE,
        preview: bookmarkingCommandPreview(NODE_TYPE_ARCHIVE),
        execute: bookmarkingCommand(NODE_TYPE_ARCHIVE)

    });


    cmdAPI.makeCaptureCommand = CmdUtils.makeCaptureCommand = function (options) {
        let node_type = options.type === "bookmark"
            ? NODE_TYPE_BOOKMARK
            : NODE_TYPE_ARCHIVE;

        let action = options.type === "bookmark"
            ? "Bookmark"
            : "Archive";

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

        if (options.ignore_args) { // workaround for stray selection
            options.__scr_ignore_args = options.ignore_args;
            delete options.ignore_args;
        }

        options = Object.assign(options, {
            arguments: bookmarkingArgs,
            description: options.description || (action + " a web-page or selection to Scrapyard."),
            previewDelay: options.previewDelay || 1000,
            preview: bookmarkingCommandPreview(node_type),
            execute: bookmarkingCommand(node_type)
        });

        CmdUtils.CreateCommand(options);
    };

    let scrapyard_commands = [shelfCmd, scrapyardCmd, bookmarkCmd, archiveCmd];
    let ishell_id = browser.runtime.getManifest().applications?.gecko?.id;
    let scrapyard_id = ishell_id?.includes("-we")
        ? "scrapyard-we@firefox"
        : "scrapyard@firefox";

    shellSettings.load(settings => {
        chrome.management.onInstalled.addListener((info) => {
            if (info.id === scrapyard_id) {
                settings.scrapyard_presents(true, () => chrome.runtime.reload())
            }
        });

        chrome.management.onUninstalled.addListener((info) => {
            if (info.id === scrapyard_id) {
                settings.scrapyard_presents(false, () => chrome.runtime.reload());
            }
        });

        async function scrapyardPresents() {
            try {
                return !!(await browser.runtime.sendMessage(scrapyard_id, {type: "SCRAPYARD_GET_VERSION"}));
            }
            catch (e) {
                return false;
            }
        }

        async function checkForScrapyard(retry = 1) {
            //console.log(`Checking for Scrapyard, retry ${retry}`);

            let scrapyard_presents = await scrapyardPresents();

            if (scrapyard_presents) {
                settings.scrapyard_presents(true)

                if (CmdManager.commands.indexOf(scrapyard_commands[0]) < 0)
                    CmdManager.commands = [...CmdManager.commands, ...scrapyard_commands];
            }
            else {
                if (retry < 10) {
                    setTimeout(() => checkForScrapyard(retry + 1), 1000);
                }
                else {
                    settings.scrapyard_presents(false);
                }
            }
        }

        checkForScrapyard();
    });
}

