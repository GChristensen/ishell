import {cmdManager} from "../../ishell.js";
import {settings} from "../../settings.js";
import {setupHelp} from "./utils.js";
import {repository} from "../../storage.js";
import {BUILTIN_NAMESPACES, NAMESPACE_SCRAPYARD} from "../../commands/_namespaces.js";

window.escapeHtml = Utils.escapeHtml;

const BUILTIN_AUTHOR = "by iShell Authors";

const commandTable = jQuery("#commands-and-feeds-table");
var commandCategoryCount = 0;

$(initPage);

async function initPage() {
    setupHelp("#show-hide-help", "#cmdlist-help-div");
    buildTable();
}

async function buildTable() {
    const builtinCommands = cmdManager.builtinCommands.sort(compareByName);
    const userCommands = cmdManager.userCommands.sort(compareByName);
    const commandCount = builtinCommands.length + userCommands.length;

    jQuery("#num-commands").text(commandCount);

    let namespacesToList = [...BUILTIN_NAMESPACES];

    if (!settings.scrapyard_presents())
        namespacesToList.splice(namespacesToList.indexOf(NAMESPACE_SCRAPYARD), 1);

    for (const namespace of namespacesToList)
        insertNamespace(namespace, builtinCommands);

    if (settings.enable_more_commands())
        insertNamespace("More Commands", builtinCommands);

    const makeEditorLink = n => `<a href="edit.html?${encodeURI(n)}" target="_blank">Open in editor</a>`;

    insertNamespace("default", userCommands, makeEditorLink("default"));

    let userNamespaces = await repository.fetchUserScriptNamespaces();
    userNamespaces = userNamespaces.filter(n => !!n && n !== "default");
    userNamespaces = userNamespaces.sort((a, b) => a.localeCompare(b, undefined, {sensitivity: 'base'}));

    for (const n of userNamespaces)
        insertNamespace(n, userCommands, makeEditorLink(n));

    jQuery("#num-cats").text(commandCategoryCount);
}

function insertNamespace(ns, commands, subtext = BUILTIN_AUTHOR) {
    let namespace = commands.filter(c => c._namespace === ns).sort(compareByName);
    if (namespace.length)
        insertCommands(ns, subtext, namespace, commandTable);
}

function insertCommands(namespace, subtext, commands, table) {
    const aRow = jQuery("<tr></tr>");
    const feedElement = jQuery('<td class="topcell command-feed" ' + 'rowspan="' + commands.length + '"></td>');

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
        + (authors.length > 0? 'Authors: ': '')
        + span(authors, formatAuthors, "author", "createdby")
        + (homepage? ' <a href="' + homepage + '"><img src="/ui/icons/homepage.png"></a>': '')
        + (license && (authors.length > 0 || homepage)? ' | ': '')
        + (license? license + ' ': '')
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
                cmdManager.disableCommand(cmd);
            else
                cmdManager.enableCommand(cmd);
        })
        [cmd.disabled ? "removeAttr" : "attr"]("checked", "checked"));

    var cmdElement = jQuery(
        '<td class="command"><img class="favicon" src="'
        + escapeHtml((!("icon" in cmd) || cmd["icon"] === "http://example.com/favicon.ico")? "/ui/icons/logo.svg": cmd.icon) + '"/>' +
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
