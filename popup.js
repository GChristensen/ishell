let shell_last_command = "";
let shell_selected_command = 0;
let shell_selected_sentence;
let shell_suggestions;
let shell_parser;

// closes ishell popup, it's needed to be defined here to work in Firefox
CmdUtils.closePopup = function closePopup() {
    window.close();
};

CmdUtils.getCommandLine = shell_get_input;
CmdUtils.setCommandLine = function (text) {
    shell_set_input(text);
    shell_save_input();
    shell_show_matching_commands();
    shell_last_command = shell_get_input();
};

function shell_preview_el() {
    return document.getElementById('shell-command-preview');
}

function shell_suggestion_el() {
    return document.getElementById('shell-suggestion-panel');
}

// // sets preview panel, prepend allows to add new contnet to the top separated by HR
function shell_set_preview(v, prepend) {
    v = v || "";
    prepend = prepend === true;
    var el = shell_preview_el();
    if (!el) return;
    v = (v.indexOf("<") >= 0 || v.indexOf(">") >= 0)? v: '<div id="shell-help-wrapper">' + v + '</div>';
    shell_preview_el().dispatchEvent(new Event("preview-change"));
    el.innerHTML = v + (prepend ? "<hr/>" + el.innerHTML : "");
    //if (v!="") shell_set_suggestions("");
}

// sets suttestion panel, prepend allows to add new contnet to the top separated by HR
function shell_set_suggestions(v, prepend, hide) {
    v = v || (hide? "": "<ul/>");
    prepend = prepend === true;
    var el = shell_suggestion_el();
    if (!el) return;
    el.innerHTML = v + (prepend ? "<hr/>" + el.innerHTML : "");
    if (v!="") shell_set_preview("");
}

// clears tip, result and preview panels
function shell_clear() {
    shell_set_suggestions("");
    shell_set_preview("");
}

function shell_get_input() {
    var input = document.getElementById('shell-input');
    if (!input) {
        shell_selected_command = -1;
        return '';
    }
    return input.value;
}

function shell_set_input(text) {
    let input = document.getElementById('shell-input');
    input.value = text;
}

function shell_autocomplete() {
    if (shell_selected_sentence) {
        let completion = shell_selected_sentence.completionText.trim();
        let input = shell_get_input();
        if (input && completion && completion.length < 100 && input.trim() !== completion)
            shell_set_input(completion);
    }
}

function shell_show_preview(sentence, args) {
    if (sentence == null)
        return;

    var command = sentence.getCommand();
    if (!command || !command.preview)
        return;

    switch(typeof command.preview)
    {
        case 'undefined':
            shell_set_preview( command.description );
            break;
        case 'string':
            shell_set_preview( command.preview );
            break;
        default:
            var pfunc = ()=>{
                // zoom overflow dirty fix
                $("#shell-command-preview").css("overflow-y", "auto");
                try {
                    shell_preview_el().dispatchEvent(new Event("preview-change"));
                    CmdManager.callPreview(sentence, shell_preview_el())
                } catch (e) {
                   console.error(e)
                }
            };

            if (typeof command.require !== 'undefined')
                CmdUtils.loadScripts(command.require, () => pfunc());
            else if (typeof command.requirePopup !== 'undefined')
                CmdUtils.loadScripts(command.requirePopup, () => pfunc(), window);
            else
                pfunc();
    }
}

function shell_execute(input) {
    if (shell_selected_sentence) {
        CmdManager.commandHistoryPush(input);
        CmdUtils.closePopup();
        CmdManager.callExecute(shell_selected_sentence)
            .then(() => {
                CmdUtils._internalClearSelection();
            });
    }
}

function shell_help() {
    var html = "<div id='shell-help-wrapper'>Type the name of a command and press Enter to execute it. "
        + "Use <b>help</b> command for assistance.";
    html += "<p>";
    html += "<div class='shell-help-heading'>Keyboard Shortcuts</div>";
    html += "<span class='keys'>Ctrl+C</span> - copy preview to clipboard<br>";
    html += "<span class='keys'>Ctrl+Alt+Enter</span> - add selected command to context menu<br>";
    html += "<span class='keys'>Ctrl+Alt+\\</span> - open command history<br>";
    html += "<span class='keys'>Ctrl+Alt+&ltkey&gt;</span> - select list item prefixed with &ltkey&gt;<br>";
    html += "<span class='keys'>&#8593;/&#8595;</span> - cycle through command suggestions<br>";
    html += "<span class='keys'>F5</span> - reload the extension</div>";

    shell_set_preview(html);
}

async function shell_show_command_history() {
    const history = await CmdManager.commandHistory();

    shell_preview_el().dispatchEvent(new Event("preview-change"));
    CmdUtils.previewList(shell_preview_el(), history, (i, e) => {
        shell_set_input(history[i]);
        shell_show_matching_commands();
    });
}

function shell_make_context_menu_cmd() {
    let input = shell_get_input();
    if (shell_selected_sentence && input) {
        let command = shell_selected_sentence.completionText.trim();

        if (!CmdManager.getContextMenuCommand(command)) {
            CmdManager.addContextMenuCommand(shell_selected_sentence.getCommand(), input.trim(), command);
        }
    }
}

function shell_focus() {
    el = document.getElementById('shell-input');
    if (el.createTextRange) {
        var oRange = el.createTextRange();
        oRange.moveStart("character", 0);
        oRange.moveEnd("character", el.value.length);
        oRange.select();
    } else if (el.setSelectionRange) {
        el.setSelectionRange(0, el.value.length);
    }
    el.focus();
}

// TODO: refactor evil side effects
function shell_ensure_command_in_range() {
    let in_range = false;
    // Don't navigate outside boundaries of the list of matches
    if (shell_suggestions && shell_selected_command >= shell_suggestions.length) {
        shell_selected_command = shell_suggestions.length - 1;
    }
    else if (shell_suggestions && shell_selected_command < 0) {
        shell_selected_command = 0;
    }
    else if (shell_suggestions)
        in_range = true;

    return in_range;
}

// TODO: refactor evil side effects
function get_next_comand_index(asc) {
    let index = shell_selected_command + (asc? 1: -1);

    // Don't navigate outside boundaries of the list of matches
    if (shell_suggestions && index >= shell_suggestions.length) {
        index = 0;
    }
    else if (index < 0) {
        index = shell_suggestions.length - 1;
    }
    else if (!shell_suggestions)
        return -1;

    return index;
}

function shell_select_command(index) {
    shell_ensure_command_in_range();
    if (shell_selected_command != index) {
        let previous_command = shell_selected_command;
        shell_selected_command = index;
        shell_selected_sentence = shell_suggestions[shell_selected_command];

        jQuery("#suggestion-item-" + previous_command).parent().removeClass("selected");
        var elt = jQuery(`#suggestion-item-${index}`);
        elt.parent().addClass('selected');

        shell_autocomplete();
        shell_set_preview(shell_selected_sentence.getCommand().description);
        shell_show_preview(shell_selected_sentence);
    }
}

function shell_decorate_icon(icon) {
    if (!icon || icon === "http://example.com/favicon.ico") {
        icon = '/res/icons/logo.svg';
    }
    icon = '<img src="' + icon + '" border="0" alt="" align="absmiddle"> ';
    return icon;
}

function shell_default_state() {
    shell_selected_command = -1;
    shell_selected_sentence = null;
    shell_clear();
    shell_help();
}

// will also call preview
function shell_show_matching_commands(text) {
    if (!text) text = shell_get_input();

    if (text) {
        const query = shell_parser.newQuery(text, null, shellSettings.max_suggestions(), true);

        query.onResults = () => {
            shell_suggestions = query.suggestionList;

            //console.log(text);
            //console.log(shell_suggestions);

            shell_ensure_command_in_range();

            // We have matches, show a list
            if (shell_suggestions.length > 0) {
                var suggestions_div = document.createElement('div');
                var suggestions_list = document.createElement('ul');

                if (shell_selected_sentence && !shell_suggestions[shell_selected_command]
                        .equalCommands(shell_selected_sentence) || !shell_selected_sentence) {
                    shell_set_preview(shell_suggestions[shell_selected_command].getCommand().description);
                }
                shell_show_preview(shell_suggestions[shell_selected_command]);

                for (let i in shell_suggestions) {
                    var is_selected = (i == shell_selected_command);
                    var s = shell_suggestions[i];
                    var li = document.createElement('LI');
                    li.innerHTML = `<div id="suggestion-item-${i}"><table cellspacing="1" cellpadding="1">
                            <tr><td>${shell_decorate_icon(s.icon)}</td><td>${s.displayHtml}</td></tr></table></div>`;
                    if (is_selected) {
                        li.setAttribute('class', 'selected');
                        shell_selected_sentence = s;
                    }
                    suggestions_list.appendChild(li);
                }

                suggestions_div.appendChild(suggestions_list);
                shell_suggestion_el().innerHTML = suggestions_div.innerHTML; // shouldn't clear the preview
                for (let i in shell_suggestions)
                    jQuery(`#suggestion-item-${i}`).click((e) => {
                        shell_select_command(i);
                    });
            } else {
                shell_default_state()
            }
        };

        query.run();
    }
    else
        shell_default_state();
}

function shell_keydown_handler(evt) {
	// measure the input 
	CmdUtils.inputUpdateTime = performance.now();

    if (!evt) return;
    let kc = evt.keyCode;

    // On TAB, autocomplete
    if (kc === 9) {
        evt.preventDefault();
        shell_autocomplete();
        return;
    }

    // On ENTER, execute the given command
    if (kc === 13) {
        let input = shell_get_input()
        if (Utils.easterListener(input))
            return;

        if (evt.ctrlKey && evt.altKey) {
            shell_make_context_menu_cmd();
            return;
        }

        shell_execute(input);
        return;
    }

    if (kc === 220) {
        if (evt.ctrlKey && evt.altKey) {
            shell_show_command_history();
            return;
        }
    }

    // On F5 restart extension
    if (kc === 116) {
        chrome.runtime.reload();
        return;
    }

    // Cursor up
    if (kc === 38) {
        evt.preventDefault();
        shell_last_command = "";
        shell_select_command(get_next_comand_index(false));
        return;
    }
    // Cursor Down
    else if (kc === 40) {
        evt.preventDefault();
        shell_last_command = "";
        shell_select_command(get_next_comand_index(true));
        return;
    }

    if (evt.ctrlKey && evt.altKey && kc >= 40 && kc <= 90) {
        let items = jQuery("[accessKey='" + String.fromCharCode(kc).toLowerCase() + "']");
        if (items.length > 0) {
            if (items[0].href)
                chrome.tabs.create({ "url": items[0].href, active: false });
            else
                items.click();
        }
        return;
    }

    // Ctrl+C copies preview to clipboard
    if (kc === 67 && evt.ctrlKey) {
        //ackgroundPage.console.log("copy to clip");
        var el = shell_preview_el();
        if (!el) return;
        CmdUtils.setClipboard( el.innerText );
        return;
    }

    if (kc === 33 || kc === 34) {
        let pblock = shell_preview_el();
        pblock.scrollBy(0, (kc === 33? -1: 1) * pblock.clientHeight - 20);
    }

    shell_last_command = shell_get_input();
}

function shell_keyup_handler(evt) {
    if (!evt) return;
    var kc = evt.keyCode;
    if (shell_last_command == shell_get_input()) return;

    if (evt.ctrlKey || evt.altKey)
        return;

    // Cursor up
    if (kc == 38) {
        return;
    }
    // Cursor Down
    else if (kc == 40) {
        return;
    }

    shell_save_input();
    shell_show_matching_commands();
    shell_last_command = shell_get_input();
}

function shell_save_input() {
	const input = document.getElementById('shell-input');
    shellSettings.shell_last_command(input.value);
}

function shell_load_input() {
    if (CmdManager.selectedContextMenuCommand) {
        shell_set_input(CmdManager.selectedContextMenuCommand);
        CmdManager.selectedContextMenuCommand = null;
        if (shellSettings.remember_context_menu_commands())
            shell_save_input();
    }
    else {
        const input = document.getElementById('shell-input');
        input.value = shellSettings.shell_last_command() || "";
        input.select();
    }
}

function initPopup(settings) {
    shell_parser = CmdManager.makeParser();

    for (let cmd of CmdManager.commands) {
        try {
            if (cmd.init) {
                CmdManager.initCommand(cmd, cmd.init, document);
            }
        }
        catch (e) {
            console.log(e.message);
        }
    }

    CmdUtils.updateActiveTab(() => {
        shell_load_input()
        shell_show_matching_commands();
        CmdUtils.deblog("hello from iShell");
    });

    // Add event handler to window
    document.addEventListener('keydown', shell_keydown_handler, false);
    document.addEventListener('keyup', shell_keyup_handler, false);
}

$(window).on('load', () => shellSettings.load(settings => initPopup(settings)));

$(window).on('unload', function() {
    CmdManager.commandHistoryPush(shell_get_input());

    if (shell_selected_sentence)
        shell_parser.strengthenMemory(shell_selected_sentence);
});