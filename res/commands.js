var {escapeHtml} = Utils;
var commandCategoryCount = 0;

function setupHelp(clickee, help) {
    var toggler = jQuery(clickee).click(function toggleHelp() {
        jQuery(help)[(this.off ^= 1) ? "slideUp" : "slideDown"]();
        [this.textContent, this.bin] = [this.bin, this.textContent];
    })[0];
    toggler.textContent = "Show help";
    toggler.bin = "Hide help";
    toggler.off = true;
}

function A(url, text, className, attrs) {
    var a = document.createElement("a");
    a.href = url;
    a.textContent = text || url;
    if (className) a.className = className;
    for (let attr in attrs) a.setAttribute(attr, attrs[attr]);
    return a;
}

function actionLink(text, action) {
    return jQuery("<span></span>").text(text).click(action).addClass("action")
}

function fillTableCellForFeed(cell, feed, subtext) {
    cell.append(
        A("#", feed, ""),
        "<br/>");
    cell.append(jQuery('<div class="meta">' +
        '<div class="author">' + subtext + '</div>'
        + '</div>'))
}

function formatMetaData(md) {
    var contributors = md.contributors || (md.contributor? [md.contributor]: []);
    var authors = md.authors || (md.author? [md.author]: []);

    if (authors && contributors.length > 0)
        authors = authors.concat(contributors);

    var {license, homepage} = md;
    function span(data, format, klass, lkey) {
        return !data ? "" : (
        '<span class="' + klass + '">'
        + format(data) +
        '</span>')
    }

    var result = ('<div class="meta">'
        + (license? license + ' ': '')
        + (license && authors.length > 0? ' | ': '')
        + (authors.length > 0? 'Authors: ': '')
        + span(authors, formatAuthors, "author", "createdby")
        + (homepage? ' <a href="' + homepage + '"><img src="/res/icons/homepage.png"></a>': '')
        + '</div>');
    return result;

}

function formatAuthors(authors) {
    return ([].concat(authors)).map(a => formatAuthor(a)).join(", ");
}

function formatAuthor(authorData) {
    if (!authorData) return "";

    if (typeof authorData === "string") return escapeHtml(authorData);

    var authorMarkup = "";
    if ("name" in authorData && !("email" in authorData)) {
        authorMarkup += escapeHtml(authorData.name) + " ";
    }
    else if ("email" in authorData) {
        var ee = escapeHtml(authorData.email);
        authorMarkup += (
            '<a href="mailto:' + ee + '">' +
            ("name" in authorData ? escapeHtml(authorData.name) : ee) +
            '</a>');
    }
    return authorMarkup;
}

function formatUrl(url) {
    var hu = escapeHtml(url);
    return hu.link(hu);
}

function compareByName(a, b) {
    if (a.name < b.name)
        return -1;
    if (a.name > b.name)
        return 1;
    return 0;
}

function fillTableRowForCmd(row, cmd, className) {
    var {name, names} = cmd;

    var checkBoxCell = $('<td><input type="checkbox"/></td>');
    (checkBoxCell.find("input")
        .val(cmd.id)
        .bind("change", (e) => {
            cmd.disabled = !e.target.checked;
            if (cmd.disabled)
                CmdManager.disableCommand(cmd);
            else
                CmdManager.enableCommand(cmd);
        })
        [cmd.disabled ? "removeAttr" : "attr"]("checked", "checked"));

    var cmdElement = jQuery(
        '<td class="command"><img class="favicon" src="'
        + escapeHtml((!("icon" in cmd) || cmd["icon"] === "http://example.com/favicon.ico")? "/res/icons/logo.svg": cmd.icon) + '"/>' +
        ('<a class="id" name="' + escapeHtml(cmd.id) + '"></a>' +
            '<span class="name">' + escapeHtml(name) + '</span>') +
        '<span class="description"></span>' +
        (names.length < 2 ? "" :
            ('<div class="synonyms-container light">' +
                 "Synonims: " +
                    ('<span class="synonyms">' +
                        escapeHtml(names.slice(1).join(", ")) +
                        '</span>') +
                '</div>')) +
        formatMetaData(cmd) +
        '<div class="help"></div>' +
        '</td>');

    if (cmd.oldAPI) {
        cmdElement.addClass("old-api").prepend(
            A("https://wiki.mozilla.org/Labs/Ubiquity/" +
                "Parser_2_API_Conversion_Tutorial", "OLD API", "badge"));
    }

    if (className) {
        checkBoxCell.addClass(className);
        cmdElement.addClass(className);
    }

    for (let key of ["description", "help"]) if (key in cmd) {
        let node = cmdElement[0].getElementsByClassName(key)[0];
        try { node.innerHTML = cmd[key] }
        catch (e) {
            let msg = 'XML error in "' + key + '" of [ ' + cmd.name + ' ]';
            console.error(msg);
        }
    }

    return row.append(checkBoxCell, cmdElement);
}

function insertNamespace(namespace, subtext, commands, table) {
    aRow = jQuery("<tr></tr>");
    feedElement = jQuery('<td class="topcell command-feed" ' + 'rowspan="' + commands.length + '"></td>');
    fillTableCellForFeed(feedElement, namespace, subtext);
    aRow.append(feedElement);

    if (commands.length > 0)
        fillTableRowForCmd(aRow, commands.shift(), "topcell command");

    table.append(aRow);

    if (commands.length > 0) {
        commands.forEach(c => {
            let aRow = jQuery("<tr></tr>");
            fillTableRowForCmd(aRow, c, "command");
            table.append(aRow);
        });
    }
    else
        aRow.append("<td class=\"topcell command\">&nbsp</td><td class=\"topcell command\">&nbsp</td>");

    commandCategoryCount += 1;
}

async function buildTable(settings) {
    let table = jQuery("#commands-and-feeds-table");

    let builtinCommands = CmdManager.commands.filter((c) => c._builtin).sort(compareByName);
    let userCommands = CmdManager.commands.filter((c) => !c._builtin).sort(compareByName);
    let commandCount = builtinCommands.length + userCommands.length;

    jQuery("#num-commands").text(commandCount);

    const BUILTIN_AUTHOR = "by iShell Authors";

    function insertBuiltinNamespace(ns) {
        let namespaced = CmdManager.commands.filter((c) => c._builtin && c._namespace === ns).sort(compareByName);
        if (namespaced.length)
            insertNamespace(ns, BUILTIN_AUTHOR, namespaced, table);
    }

    insertBuiltinNamespace("iShell");
    insertBuiltinNamespace("Browser");
    insertBuiltinNamespace("Utility");
    insertBuiltinNamespace("Search");
    insertBuiltinNamespace("Mail");
    insertBuiltinNamespace("Syndication");
    insertBuiltinNamespace("Translation");
    insertBuiltinNamespace("Scrapyard");

    if (settings.enable_more_commands())
        insertBuiltinNamespace("More Commands");

    builtinCommands = CmdManager.commands.filter((c) => c._builtin && !c._namespace).sort(compareByName);
    if (builtinCommands.length > 0)
        insertNamespace("Builtin Commands", BUILTIN_AUTHOR, builtinCommands, table);

    let userCommandsByCat = {};

    let namespaces = await DBStorage.fetchCustomScriptNamespaces();

    for (let n of namespaces) {
        if (n !== "default") {
            let commands = CmdManager.commands.filter((c) => c._namespace === n).sort(compareByName);
            userCommandsByCat[n] = commands;
        }
    }

    for (let n of Object.keys(userCommandsByCat).sort())
        insertNamespace(n, '<a href="edit.html?' + encodeURI(n)
            + '" target="_blank">Open in editor</a>', userCommandsByCat[n], table);

    var defaultCommands = CmdManager.commands.filter((c) => c._namespace === "default").sort(compareByName);
    insertNamespace("Other Commands", '<a href="edit.html?default" target="_blank">Open in editor</a>',
        defaultCommands, table);

    jQuery("#num-cats").text(commandCategoryCount);
}

jQuery(function onReady() {
    setupHelp("#show-hide-help", "#cmdlist-help-div");
    shellSettings.load(settings => buildTable(settings));
});
