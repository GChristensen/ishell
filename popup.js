let popup;
let suggestions;


class SuggestionManager {
    constructor(popup, parser, max_suggestions) {
        this._max_suggestions = max_suggestions;
        this._selected_suggestion = 0;
        this._selected_sentence = null;
        this._suggestions = null;
        this._parser = parser;
        this._popup = popup;
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

    autocompleteInput() {
        if (this.hasSelection()) {
            let completion = this.autocompleteSelection();
            let input = this._popup.getInput();
            if (input && completion && completion.length < 100 && input.trim() !== completion)
                this._popup.setInput(completion);
        }
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

    _showCommandPreview(sentence) {
        if (sentence == null)
            return;

        let command = sentence.getCommand();
        if (!command || !command.preview)
            return;

        switch(typeof command.preview)
        {
            case 'undefined':
                this._popup.setPreview(command.description, true);
                break;
            case 'string':
                this._popup.setPreview(command.preview, true);
                break;
            default:
                let previewCallback = () => {
                    // zoom overflow dirty fix
                    $("#shell-command-preview").css("overflow-y", "auto");
                    this._popup.invalidatePreview();
                    CmdManager.callPreview(sentence, this._popup.pblock);
                };

                // Command require and requirePopup properties are currently undocumented
                // The properties should specify arrays of URLs to be loaded in the background or popup pages
                // respectively. This may require modification of CSP manifest settings and addon rebuild
                if (typeof command.require !== 'undefined')
                    CmdUtils.loadScripts(command.require, previewCallback);
                else if (typeof command.requirePopup !== 'undefined')
                    CmdUtils.loadScripts(command.requirePopup, previewCallback, window);
                else
                    previewCallback();
        }
    }

    _selectCommand(index) {
        this._ensureSelectionInRange();
        if (this._selected_suggestion != index) {
            let previous_command_index = this._selected_suggestion;
            this._selected_suggestion = index;
            this._selected_sentence = this._suggestions[index];

            $("#suggestion-item-" + previous_command_index).parent().removeClass("selected");
            $(`#suggestion-item-${index}`).parent().addClass('selected');

            this.autocompleteInput();
            this._popup.setPreview(this.activeCommand?.description, true);
            this._showCommandPreview(this._selected_sentence);
        }
    }

    advanceSelection(asc) {
        this._selectCommand(this._getNextCommandIndex(asc))
    }

    _resetWindow() {
        this.reset();
        this._popup.reset();
        this._popup.displayHelp();
    }

    _decorateIcon(icon) {
        if (!icon || icon === "http://example.com/favicon.ico") {
            icon = '/res/icons/logo.svg';
        }
        icon = '<img src="' + icon + '" border="0" alt="" align="absmiddle"> ';
        return icon;
    }

    _generateSuggestionHtml(suggestions) {
        let suggestions_div = document.createElement('div');
        let suggestions_list = document.createElement('ul');

        for (let i in suggestions) {
            var s = suggestions[i];
            var li = document.createElement('LI');
            li.innerHTML = `<div id="suggestion-item-${i}">
                                        <table cellspacing="1" cellpadding="1">
                                            <tr>
                                                <td>${this._decorateIcon(s.icon)}</td>
                                                <td>${s.displayHtml}</td>
                                            </tr>
                                        </table>
                                    </div>`;
            if (i == this._selected_suggestion) {
                li.setAttribute('class', 'selected');
            }
            suggestions_list.appendChild(li);
        }

        suggestions_div.appendChild(suggestions_list);

        return suggestions_div.innerHTML;
    }

    _populateSuggestionList(user_input) {
        const query = this._parser.newQuery(user_input, null, this._max_suggestions, true);

        query.onResults = () => {
            this._suggestions = query.suggestionList.slice();

            if (this._suggestions.length && this._suggestions.length > this._max_suggestions)
                this._suggestions.splice(this._max_suggestions);

            this._ensureSelectionInRange();

            if (this._suggestions.length > 0) {
                let suggestion_html = this._generateSuggestionHtml(this._suggestions);
                this._popup.populateSuggestions(suggestion_html);

                for (let i in this._suggestions)
                    jQuery(`#suggestion-item-${i}`).click((e) => {
                        this._selectCommand(i);
                    });

                let old_selection = this._selected_sentence;
                this._selected_sentence = this._suggestions[this._selected_suggestion];

                if (old_selection && !this._selected_sentence.equalCommands(old_selection) || !old_selection)
                    this._popup.setPreview(this._selected_sentence.getCommand().description, true);

                this._showCommandPreview(this._selected_sentence);
            } else {
                this._resetWindow();
            }
        };

        query.run(); // WARNING: callback suggestions may make several calls of onResults
    }

    displaySuggestions(input) {
        if (input)
            this._populateSuggestionList(input); // will also show command preview
        else
            this._resetWindow();
    }

    executeSelection() {
        if (this.selection) {
            CmdManager.callExecute(this.selection)
                .then(() => {
                    CmdUtils._internalClearSelection();
                });
        }
    }

    strengthenMemory() {
        if (this.selection)
            this._parser.strengthenMemory(this.selection);
    }
}


class PopupWindow {
    constructor() {
        this._last_input_text = "";
        this._input_element = document.getElementById('shell-input');
        this._preview_element = document.getElementById('shell-command-preview');
        this._suggestions_element = document.getElementById('shell-suggestion-panel');

        // add a handy set method to populate innerHTML of the preview area
        if (!this._preview_element.set)
            this._preview_element.set = function (html) {this.innerHTML = html};

        // wraps html text into a div with some margins
        if (!this._preview_element.wrap)
            this._preview_element.wrap = function (html) {this.innerHTML = `<div class="description">${html}</div>`};
    }

    populateSuggestions(html) {
        this._suggestions_element.innerHTML = html;
    }

    invalidatePreview() {
        this._preview_element.dispatchEvent(new Event("preview-change"));
    }

    setPreview(html, wrap) {
        if (typeof html !== "undefined") {
            wrap = wrap || (html.indexOf("<") === -1 && html.indexOf(">") === -1);
            html = wrap ? '<div id="shell-help-wrapper">' + html + '</div>' : html;
        }

        this.invalidatePreview();
        this._preview_element.innerHTML = html || "";
    }

    get pblock() {
        return this._preview_element;
    }

    reset() {
        this._suggestions_element.innerHTML = "<ul/>";
        this.setPreview();
    }

    getInput() {
        return this._input_element.value;
    }

    rememberInput() {
        this._last_input_text = this._input_element.value;
    }

    get lastInput() {
        return this._last_input_text;
    }

    set lastInput(text) {
        this._last_input_text = text;
    }

    setInput(text) {
        this._input_element.value = text;
    }

    saveInput() {
        shellSettings.shell_last_command(this._input_element.value);
        popup.rememberInput();
    }

    loadInput() {
        if (CmdManager.selectedContextMenuCommand) {
            this.setInput(CmdManager.selectedContextMenuCommand);
            CmdManager.selectedContextMenuCommand = null;
            if (shellSettings.remember_context_menu_commands())
                this.saveInput();
            return this._input_element.value;
        }
        else {
            let input = shellSettings.shell_last_command() || "";
            this._input_element.value = input;
            this._input_element.select();
            return input;
        }
    }

    displayHelp() {
        let html = "<div id='shell-help-wrapper'>Type the name of a command and press Enter to execute it. "
            + "Use the <b>help</b> command for assistance.";
        html += "<p>";
        html += "<div class='shell-help-heading'>Keyboard Shortcuts</div>";
        html += "<span class='keys'>Ctrl+C</span> - copy the preview content to clipboard<br>";
        html += "<span class='keys'>Ctrl+Alt+Enter</span> - add the selected command to context menu<br>";
        html += "<span class='keys'>Ctrl+Alt+\\</span> - show command history<br>";
        html += "<span class='keys'>Ctrl+Alt+&ltkey&gt;</span> - select the list item prefixed with the &ltkey&gt;<br>";
        html += "<span class='keys'>&#8593;/&#8595;</span> - cycle through command suggestions<br>";
        html += "<span class='keys'>F5</span> - reload the extension</div>";

        this.setPreview(html);
    }
}

async function keydown_handler(evt) {
	// measure the input 
	//CmdUtils.inputUpdateTime = performance.now();

    if (!evt) return;
    let kc = evt.keyCode;

    // On TAB, autocomplete
    if (kc === 9) {
        evt.preventDefault();
        suggestions.autocompleteInput();
        return;
    }

    // On ENTER, execute the given command
    if (kc === 13) {
        let input = popup.getInput();

        if (Utils.easterListener(input))
            return;

        if (evt.ctrlKey && evt.altKey) {
            // make context menu item
            if (suggestions.hasSelection() && input) {
                let command_text = suggestions.autocompleteSelection();

                if (!CmdManager.getContextMenuCommand(command_text))
                    CmdManager.addContextMenuCommand(suggestions.activeCommand, input.trim(), command_text);
            }
            return;
        }

        CmdManager.commandHistoryPush(input);
        suggestions.executeSelection();
        window.close();
        return;
    }

    if (kc === 220) {
        if (evt.ctrlKey && evt.altKey) {
            const history = await CmdManager.commandHistory();

            popup.invalidatePreview();
            CmdUtils.previewList(popup.pblock, history, (i, e) => {
                popup.setInput(history[i]);
                suggestions.displaySuggestions(history[i]);
            });
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
        popup.lastInput = "";
        suggestions.advanceSelection(false);
        return;
    }
    // Cursor Down
    else if (kc === 40) {
        evt.preventDefault();
        popup.lastInput = "";
        suggestions.advanceSelection(true);
        return;
    }

    // execute events from preview lists
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
        CmdUtils.setClipboard(popup.pblock.innerText);
        return;
    }

    if (kc === 33 || kc === 34) {
        popup.pblock.scrollBy(0, (kc === 33? -1: 1) * popup.pblock.clientHeight - 20);
    }

    popup.rememberInput();
}

function keyup_handler(evt) {
    if (!evt) return;
    let kc = evt.keyCode;
    let input = popup.getInput();
    if (input === popup.lastInput) return;

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

    popup.saveInput()
    suggestions.displaySuggestions(input);
}

async function initPopup(settings) {
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

    popup = new PopupWindow();
    suggestions = new SuggestionManager(popup, CmdManager.makeParser(), settings.max_suggestions());

    let input = popup.loadInput()
    suggestions.displaySuggestions(input);

    CmdUtils.deblog("hello from iShell");

    document.addEventListener('keydown', keydown_handler, false);
    document.addEventListener('keyup', keyup_handler, false);
}

$(window).on('load', () => shellSettings.load(settings => initPopup(settings)));

$(window).on('unload', function() {
    CmdManager.commandHistoryPush(popup.getInput());
    suggestions.strengthenMemory();
});


cmdAPI.getCommandLine = CmdUtils.getCommandLine = () => popup.getInput();
cmdAPI.setCommandLine = CmdUtils.setCommandLine = function (text) {
    popup.setInput(text);
    popup.saveInput();
    suggestions.displaySuggestions(text);
};
