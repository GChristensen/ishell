let shell_last_input_text = "";
let suggestions;

class SuggestionManager {
    constructor(parser, max_suggestions) {
        this._max_suggestions = max_suggestions;
        this._selected_suggestion = 0;
        this._selected_sentence = null;
        this._suggestions = null;
        this._parser = parser;
    }

    reset() {
        this._selected_suggestion = -1;
        this._selected_sentence = null;
    }

    hasSelection() {
        return !!this._selected_sentence;
    }

    get selection() {
        return this._selected_sentence;
    }

    get activeCommand() {
        if (this._selected_sentence)
            return this._selected_sentence.getCommand();

        return null;
    }

    autocompleteSelection() {
        if (this._selected_sentence)
            return this._selected_sentence.completionText.trim();

        return "";
    }

    _ensureSelectionInRange() {
        let in_range = false;

        // Don't navigate outside boundaries of the list of matches
        if (this._suggestions && this._selected_suggestion >= this._suggestions.length) {
            this._selected_suggestion = this._suggestions.length - 1;
        }
        else if (this._suggestions && this._selected_suggestion < 0) {
            this._selected_suggestion = 0;
        }
        else if (this._suggestions)
            in_range = true;

        return in_range;
    }

    _getNextCommandIndex(asc) {
        let index = this._selected_suggestion + (asc? 1: -1);

        // Don't navigate outside boundaries of the list of matches
        if (this._suggestions && index >= this._suggestions.length) {
            index = 0;
        }
        else if (index < 0) {
            index = this._suggestions.length - 1;
        }
        else if (!this._suggestions)
            return -1;

        return index;
    }

    _selectCommand(index) {
        this._ensureSelectionInRange();
        if (this._selected_suggestion != index) {
            let previous_command_index = this._selected_suggestion;
            this._selected_suggestion = index;
            this._selected_sentence = this._suggestions[index];

            $("#suggestion-item-" + previous_command_index).parent().removeClass("selected");
            $(`#suggestion-item-${index}`).parent().addClass('selected');

            shell_autocomplete();
            shell_set_preview(this.activeCommand?.description);
            this._showPreview(this._selected_sentence);
        }
    }

    advanceSelection(asc) {
        this._selectCommand(this._getNextCommandIndex(asc))
    }

    show(text) {
        const query = this._parser.newQuery(text, null, this._max_suggestions, true);

        query.onResults = () => {
            this._suggestions = query.suggestionList;
            this._ensureSelectionInRange();

            // We have matches, show a list
            if (this._suggestions.length > 0) {
                let suggestions_div = document.createElement('div');
                let suggestions_list = document.createElement('ul');
                let old_selection = this._selected_sentence;

                for (let i in this._suggestions) {
                    var s = this._suggestions[i];
                    var li = document.createElement('LI');
                    li.innerHTML = `<div id="suggestion-item-${i}">
                                        <table cellspacing="1" cellpadding="1">
                                            <tr>
                                                <td>${shell_decorate_icon(s.icon)}</td>
                                                <td>${s.displayHtml}</td>
                                            </tr>
                                        </table>
                                    </div>`;
                    if (i == this._selected_suggestion) {
                        li.setAttribute('class', 'selected');
                        this._selected_sentence = s;
                    }
                    suggestions_list.appendChild(li);
                }

                suggestions_div.appendChild(suggestions_list);
                shell_suggestion_elt().innerHTML = suggestions_div.innerHTML; // shouldn't clear the preview

                for (let i in this._suggestions)
                    jQuery(`#suggestion-item-${i}`).click((e) => {
                        this._selectCommand(i);
                    });

                if (old_selection && !this._selected_sentence.equalCommands(old_selection) || !old_selection)
                    shell_set_preview(this._selected_sentence.getCommand().description);

                this._showPreview(this._selected_sentence);
            } else {
                shell_default_state()
            }
        };

        query.run(); // WARNING: callback suggestions may make several calls of onResults
    }

    _showPreview(sentence) {
        if (sentence == null)
            return;

        let command = sentence.getCommand();
        if (!command || !command.preview)
            return;

        switch(typeof command.preview)
        {
            case 'undefined':
                shell_set_preview(command.description, true);
                break;
            case 'string':
                shell_set_preview(command.preview, true);
                break;
            default:
                let commandPreview = ()=> {
                    // zoom overflow dirty fix
                    $("#shell-command-preview").css("overflow-y", "auto");
                    try {
                        shell_preview_elt().dispatchEvent(new Event("preview-change"));
                        CmdManager.callPreview(sentence, shell_preview_elt())
                    } catch (e) {
                        console.error(e)
                    }
                };

                if (typeof command.require !== 'undefined')
                    CmdUtils.loadScripts(command.require, () => commandPreview());
                else if (typeof command.requirePopup !== 'undefined')
                    CmdUtils.loadScripts(command.requirePopup, () => commandPreview(), window);
                else
                    commandPreview();
        }
    }

    executeSelection() {
        if (this._selected_sentence) {
            CmdManager.callExecute(this.selection)
                .then(() => {
                    CmdUtils._internalClearSelection();
                });
        }
    }

    strengthenMemory() {
        if (this._selected_sentence)
            this._parser.strengthenMemory(this._selected_sentence);
    }
}


// closes ishell popup, it's needed to be defined here to work in Firefox
CmdUtils.closePopup = function closePopup() {
    window.close();
};

CmdUtils.getCommandLine = shell_get_input;
CmdUtils.setCommandLine = function (text) {
    shell_set_input(text);
    shell_save_input();
    shell_show_suggestions();
    shell_last_input_text = shell_get_input();
};

function shell_preview_elt() {
    return document.getElementById('shell-command-preview');
}

function shell_suggestion_elt() {
    return document.getElementById('shell-suggestion-panel');
}

function shell_set_preview(html, wrap) {
    html = html || "";
    wrap = wrap || (html.indexOf("<") === -1 && html.indexOf(">") === -1);
    html = wrap? '<div id="shell-help-wrapper">' + html + '</div>': html;

    let elt = shell_preview_elt();
    elt.dispatchEvent(new Event("preview-change"));
    elt.innerHTML = html;
}

function shell_clear_suggestions() {
    let elt = shell_suggestion_elt();
    elt.innerHTML = "<ul/>";
}

// clears tip, result and preview panels
function shell_clear() {
    shell_clear_suggestions();
    shell_set_preview("");
}

function shell_get_input() {
    var input = document.getElementById('shell-input');
    if (!input) {
        suggestions.reset();
        return '';
    }
    return input.value;
}

function shell_set_input(text) {
    let input = document.getElementById('shell-input');
    input.value = text;
}

function shell_autocomplete() {
    if (suggestions.hasSelection()) {
        let completion = suggestions.autocompleteSelection();
        let input = shell_get_input();
        if (input && completion && completion.length < 100 && input.trim() !== completion)
            shell_set_input(completion);
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

    shell_preview_elt().dispatchEvent(new Event("preview-change"));
    CmdUtils.previewList(shell_preview_elt(), history, (i, e) => {
        shell_set_input(history[i]);
        shell_show_suggestions();
    });
}

function shell_make_context_menu_cmd() {
    let input = shell_get_input();
    if (suggestions.hasSelection() && input) {
        let command = suggestions.autocompleteSelection();

        if (!CmdManager.getContextMenuCommand(command)) {
            CmdManager.addContextMenuCommand(suggestions.activeCommand, input.trim(), command);
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

function shell_decorate_icon(icon) {
    if (!icon || icon === "http://example.com/favicon.ico") {
        icon = '/res/icons/logo.svg';
    }
    icon = '<img src="' + icon + '" border="0" alt="" align="absmiddle"> ';
    return icon;
}

function shell_default_state() {
    suggestions.reset();
    shell_clear();
    shell_help();
}

function shell_show_suggestions(text) {
    if (!text) text = shell_get_input();

    if (text)
        suggestions.show(text); // will also call preview
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

        CmdManager.commandHistoryPush(input);
        CmdUtils.closePopup();
        suggestions.executeSelection();
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
        shell_last_input_text = "";
        suggestions.advanceSelection(false);
        return;
    }
    // Cursor Down
    else if (kc === 40) {
        evt.preventDefault();
        shell_last_input_text = "";
        suggestions.advanceSelection(true);
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
        var el = shell_preview_elt();
        if (!el) return;
        CmdUtils.setClipboard( el.innerText );
        return;
    }

    if (kc === 33 || kc === 34) {
        let pblock = shell_preview_elt();
        pblock.scrollBy(0, (kc === 33? -1: 1) * pblock.clientHeight - 20);
    }

    shell_last_input_text = shell_get_input();
}

function shell_keyup_handler(evt) {
    if (!evt) return;
    var kc = evt.keyCode;
    if (shell_last_input_text === shell_get_input()) return;

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
    shell_show_suggestions();
    shell_last_input_text = shell_get_input();
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

async function initPopup(settings) {

    // add a handy set method to set innerHTML
    let display = shell_preview_elt();
    if (!display.set)
        display.set = function (html) {this.innerHTML = html};

    suggestions = new SuggestionManager(CmdManager.makeParser(), settings.max_suggestions());

    for (let cmd of CmdManager.commands) {
        try {
            if (cmd.init) {
                await CmdManager.initCommand(cmd, cmd.init, document);
            }
        }
        catch (e) {
            console.log(e.message);
        }
    }

    await CmdUtils.updateActiveTab();

    shell_load_input()
    shell_show_suggestions();

    CmdUtils.deblog("hello from iShell");

    // Add event handler to window
    document.addEventListener('keydown', shell_keydown_handler, false);
    document.addEventListener('keyup', shell_keyup_handler, false);
}

$(window).on('load', () => shellSettings.load(settings => initPopup(settings)));

$(window).on('unload', function() {
    CmdManager.commandHistoryPush(shell_get_input());
    suggestions.strengthenMemory();
});