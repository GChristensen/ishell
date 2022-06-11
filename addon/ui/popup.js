import "../api_background.js";
import {settings} from "../settings.js";
import {SuggestionManager} from "./suggestions.js";
import {cmdManager, contextMenuManager as contextMenu} from "../ishell.js";

let popup;
let suggestions;

class PopupWindow {
    constructor() {
        this._last_input_text = "";
        this._input_element = document.getElementById('shell-input');
        this._preview_element = document.getElementById('shell-command-preview');
        this._suggestions_element = document.getElementById('shell-command-suggestions');

        // add a handy set method to populate innerHTML of the preview area
        if (!this._preview_element.set)
            this._preview_element.set = function (html) {this.innerHTML = html};
        else
            console.error("Preview element has set property:", this._preview_element.set);

        // wraps html text into a div with some margins
        if (!this._preview_element.text)
            this._preview_element.text = function (html) {this.innerHTML = `<div class="description">${html}</div>`};
        else
            console.error("Preview element has text property:", this._preview_element.text);

        // wraps html text into a div with some margins
        if (!this._preview_element.error)
            this._preview_element.error = function (html) {this.innerHTML = `<div class="description error">${html}</div>`};
        else
            console.error("Preview element has error property:", this._preview_element.error);
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
        settings.shell_last_command(this._input_element.value);
        popup.rememberInput();
    }

    loadInput() {
        if (contextMenu.selectedContextMenuCommand) {
            this.setInput(contextMenu.selectedContextMenuCommand);
            contextMenu.selectedContextMenuCommand = null;

            if (settings.remember_context_menu_commands())
                this.saveInput();

            return this._input_element.value;
        }
        else {
            let input = settings.shell_last_command() || "";
            this._input_element.value = input;
            this._input_element.select();
            return input;
        }
    }

    displayHelp() {
        let html = "<div id='shell-help-wrapper'>Type the name of a command and press Enter to execute it. "
            + "Use the <b>help</b> command for assistance.";
        html += "<p><div class='shell-help-heading'>Keyboard Shortcuts</div>";
        html += "<span class='keys'>Tab</span> - complete the current input<br>";
        html += "<span class='keys'>Ctrl+C</span> - copy the preview content to clipboard<br>";
        html += "<span class='keys'>Ctrl+Alt+Enter</span> - add the selected command to context menu<br>";
        html += "<span class='keys'>Ctrl+Alt+\\</span> - show command history<br>";
        html += "<span class='keys'>Ctrl+Alt+&ltkey&gt;</span> - select the list item prefixed with the &ltkey&gt;<br>";
        html += "<span class='keys'>&#8593;/&#8595;</span> - cycle through command suggestions<br>";
        html += "<span class='keys'>F5</span> - reload the extension</div></p>";

        this.setPreview(html);
    }
}

async function keydown_handler(evt) {
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

        if (await Utils.easterListener(input))
            return;

        if (evt.ctrlKey && evt.altKey) {
            // make context menu item
            if (suggestions.hasSelection() && input) {
                let command_text = suggestions.autocompleteSelection();

                if (!contextMenu.getContextMenuCommand(command_text))
                    contextMenu.addContextMenuCommand(suggestions.activeCommand, input.trim(), command_text);
            }
            return;
        }

        cmdManager.commandHistoryPush(input);
        await suggestions.executeSelection();
        window.close();
        return;
    }

    if (kc === 220) {
        if (evt.ctrlKey && evt.altKey) {
            const history = await cmdManager.commandHistory();

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

async function initPopup() {
    await settings.load();

    await cmdManager.initializeCommandsPopup(document);

    await CmdUtils._updateActiveTab();

    popup = new PopupWindow();
    suggestions = new SuggestionManager(popup, cmdManager, settings.max_suggestions());

    let input = popup.loadInput()
    suggestions.displaySuggestions(input);

    document.addEventListener('keydown', keydown_handler, false);
    document.addEventListener('keyup', keyup_handler, false);

    CmdUtils.deblog("iShell popup initialized");
}

$(document).ready(initPopup);

$(window).on('beforeunload', function() {
    cmdManager.commandHistoryPush(popup.getInput());
    suggestions.strengthenMemory();
});

cmdAPI.getCommandLine = CmdUtils.getCommandLine = () => popup.getInput();
cmdAPI.setCommandLine = CmdUtils.setCommandLine = function (text) {
    popup.setInput(text);
    popup.saveInput();
    suggestions.displaySuggestions(text);
};