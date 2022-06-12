import "../api_background.js";
import {settings} from "../settings.js";
import {SuggestionManager} from "./suggestions.js";
import {cmdManager, contextMenuManager as contextMenu} from "../ishell.js";

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

        this._suggestions = new SuggestionManager(this, cmdManager, settings.max_suggestions());

        let input = this.loadInput()
        this._suggestions.displaySuggestions(input);
    }

    // used from suggestion manager
    populateSuggestions(html) {
        this._suggestions_element.innerHTML = html;
    }

    // used from input handler
    displaySuggestions(input) {
        this.persistInput()
        this._suggestions.displaySuggestions(input);
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

    get lastInput() {
        return this._last_input_text;
    }

    set lastInput(text) {
        this._last_input_text = text;
    }

    getInput() {
        return this._input_element.value;
    }

    setInput(text) {
        this._input_element.value = text;
    }

    setCommandLine(text) {
        this.setInput(text);
        this.displaySuggestions(text);
    }

    persistInput() {
        const input = this.getInput();
        settings.shell_last_command(input);
        this.lastInput = input;
    }

    loadInput() {
        if (contextMenu.selectedContextMenuCommand) {
            this.setInput(contextMenu.selectedContextMenuCommand);
            contextMenu.selectedContextMenuCommand = null;

            if (settings.remember_context_menu_commands())
                this.persistInput();

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

    autocomplete() {
        this._suggestions.autocompleteInput();
    }

    addContextMenuItem(input) {
        if (this._suggestions.hasSelection() && input) {
            const commandText = this._suggestions.autocompleteSelection();

            if (!contextMenu.getContextMenuCommand(commandText))
                contextMenu.addContextMenuCommand(this._suggestions.activeCommand, input.trim(), commandText);
        }
    }

    async execute(input) {
        await cmdManager.commandHistoryPush(input);
        await this._suggestions.executeSelection();
        window.close();
    }

    async showHistory() {
        const history = await cmdManager.commandHistory();

        this.invalidatePreview();
        CmdUtils.previewList(this.pblock, history, (i, e) => {
            this.setInput(history[i]);
            this._suggestions.displaySuggestions(history[i]);
        });
    }

    advanceSelection(direction) {
        this.lastInput = "";
        this._suggestions.advanceSelection(direction);
    }

    selectListItem(keyCode) {
        let items = jQuery("[accessKey='" + String.fromCharCode(keyCode).toLowerCase() + "']");
        if (items.length > 0) {
            if (items[0].href)
                chrome.tabs.create({ "url": items[0].href, active: false });
            else
                items.click();
        }
    }

    addCurrentInputToHistory() {
        cmdManager.commandHistoryPush(this.getInput());
        this._suggestions.strengthenMemory();
    }
}

let popup;

async function keydown_handler(evt) {
    if (!evt) return;
    let keyCode = evt.keyCode;
    const input = popup.getInput();

    // On TAB, autocomplete
    if (keyCode === 9) {
        evt.preventDefault();
        popup.autocomplete();
        return;
    }

    // On ENTER, execute the given command
    if (keyCode === 13) {
        if (await Utils.easterListener(input))
            return;

        if (evt.ctrlKey && evt.altKey) {
            popup.addContextMenuItem(input);
            return;
        }

        await popup.execute(input);
        return;
    }

    // /
    if (keyCode === 220) {
        if (evt.ctrlKey && evt.altKey) {
            await popup.showHistory();
            return;
        }
    }

    // On F5 restart extension
    if (keyCode === 116) {
        chrome.runtime.reload();
        return;
    }

    // Cursor up
    if (keyCode === 38) {
        evt.preventDefault();
        popup.advanceSelection(false);
        return;
    }
    // Cursor Down
    else if (keyCode === 40) {
        evt.preventDefault();
        popup.advanceSelection(true);
        return;
    }

    // execute events from preview lists
    if (evt.ctrlKey && evt.altKey && keyCode >= 40 && keyCode <= 90) {
        popup.selectListItem(keyCode);
        return;
    }

    // Ctrl+C copies preview to clipboard
    if (keyCode === 67 && evt.ctrlKey) {
        CmdUtils.setClipboard(popup.pblock.innerText);
        return;
    }

    if (keyCode === 33 || keyCode === 34) {
        console.log(evt);
        popup.pblock.scrollBy(0, (keyCode === 33? -1: 1) * popup.pblock.clientHeight - 20);
    }

    popup.lastInput = input;
}

function keyup_handler(evt) {
    if (!evt) return;
    let keyCode = evt.keyCode;
    let input = popup.getInput();
    if (input === popup.lastInput) return;

    if (evt.ctrlKey || evt.altKey)
        return;

    // Cursor up
    if (keyCode == 38) {
        return;
    }
    // Cursor Down
    else if (keyCode == 40) {
        return;
    }

    popup.displaySuggestions(input);
}

async function initPopup() {
    await settings.load();

    await cmdManager.initializeCommandsOnPopup(document);

    await CmdUtils._updateActiveTab();

    popup = new PopupWindow();

    document.addEventListener('keydown', keydown_handler, false);
    document.addEventListener('keyup', keyup_handler, false);

    cmdAPI.dbglog("iShell popup initialized");
}

$(document).ready(initPopup);

$(window).on('beforeunload', function() {
    popup.addCurrentInputToHistory();
});

cmdAPI.getCommandLine = () => popup.getInput();
cmdAPI.setCommandLine = text => popup.setCommandLine(text);