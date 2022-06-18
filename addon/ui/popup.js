import {settings} from "../settings.js";
import {CommandList} from "./command_list.js";
import {PreviewList} from "./preview_list.js";
import {cmdManager, contextMenuManager as contextMenu} from "../ishell.js";

let popup;

$(initPopup);

async function initPopup() {
    await settings.load();
    await cmdManager.initializeCommandsOnPopup(document);
    await ContextUtils.updateActiveTab();

    popup = new PopupWindow();

    cmdAPI.dbglog("iShell popup initialized");
}

$(window).on("unload", function() {
    popup.addCurrentInputToHistory();
});

class PopupWindow {
    constructor() {
        this._lastInput = "";
        this.cmdline = document.getElementById('shell-input');
        this.pblock = document.getElementById('shell-command-preview');
        this.sblock = document.getElementById('shell-command-suggestions');

        this._enhancePBlock();

        this._commandList = new CommandList(this, settings.max_suggestions());

        this.loadInput()
        this.generateSuggestions();

        cmdAPI.getCommandLine = () => this.getInput();
        cmdAPI.setCommandLine = text => this.setCommand(text);

        document.addEventListener('keydown', this.onKeyDown.bind(this), false);
        document.addEventListener('keyup', this.onKeyUp.bind(this), false);
    }

    _enhancePBlock() {
        // add a handy set method to populate innerHTML of the preview area
        // TODO: meddle with a proxy
        if (!this.pblock.set)
            this.pblock.set = function (html) {this.innerHTML = html};
        else
            console.error("Preview element has a 'set' property:", this.pblock.set);

        // wraps html text into a div with some margins
        if (!this.pblock.text)
            this.pblock.text = function (html) {this.innerHTML = `<div class="description">${html}</div>`};
        else
            console.error("Preview element has a 'text' property:", this.pblock.text);

        // wraps html text into a div with some margins
        if (!this.pblock.error)
            this.pblock.error = function (html) {this.innerHTML = `<div class="description error">${html}</div>`};
        else
            console.error("Preview element has an 'error' property:", this.pblock.error);
    }

    displayHelp() {
        const html = 
            `<div class='description'>Type the name of a command and press Enter to execute it.
                Use the <b>help</b> command for assistance.
                <p>
                   <div class='help-heading'>Keyboard Shortcuts</div>
                   <span class='keys'>Tab</span> - complete the current input<br>
                   <span class='keys'>Ctrl+C</span> - copy the preview content to clipboard<br>
                   <span class='keys'>Ctrl+Alt+Enter</span> - add the selected command to context menu<br>
                   <span class='keys'>Ctrl+Alt+\\</span> - show command history<br>
                   <span class='keys'>Ctrl+Alt+&ltkey&gt;</span> - select the list item prefixed with the &ltkey&gt;<br>
                   <span class='keys'>&#8593;/&#8595;</span> - cycle through command suggestions<br>
                   <span class='keys'>Ctrl+&#8593;/&#8595;</span> - scroll through preview list items<br>
                   <span class='keys'>F5</span> - reload the extension
                </p>
             </div>`;

        this.setPreviewContent(html);
    }

    loadInput() {
        if (contextMenu.selectedContextMenuCommand) {
            this.setInput(contextMenu.selectedContextMenuCommand);
            contextMenu.selectedContextMenuCommand = null;

            if (settings.remember_context_menu_commands())
                this.persistInput();
        }
        else {
            const lastCommand = settings.shell_last_command();
            this.setInput(lastCommand || "");
            this.cmdline.select();
        }
    }

    setInput(text) {
        this.cmdline.value = text;
    }

    getInput() {
        return this.cmdline.value;
    }

    persistInput() {
        this._lastInput = this.getInput();
        return settings.shell_last_command(this._lastInput);
    }

    autocomplete() {
        let completion = this._commandList.getAutocompletion();
        let input = this.getInput();

        if (input && completion && completion.length < 100 && input.trim() !== completion) {
            this.setInput(completion);
            this.persistInput();
        }
    }

    async addCurrentInputToHistory() {
        await this.commandHistoryPush(this.getInput());
        await this._commandList.strengthenMemory();
    }

    setCommand(text) {
        this.setInput(text);
        this.persistInput();
        this.generateSuggestions();
    }

    setSuggestionsContent(html) {
        this.sblock.innerHTML = html;
    }

    generateSuggestions() {
        this._commandList.generateSuggestions(this.getInput());
    }

    // called when command has changed preview by setting innerHTMl
    invalidatePreview() {
        this.pblock.dispatchEvent(new Event("preview-change"));
    }

    setPreviewContent(html, wrap) {
        if (typeof html !== "undefined") {
            wrap = wrap || (html.indexOf("<") === -1 && html.indexOf(">") === -1);
            html = wrap ? '<div class="description">' + html + '</div>' : html;
        }

        this.invalidatePreview();
        this.pblock.innerHTML = html || "";
    }

    reset() {
        this._commandList.reset();
        this.displayHelp();
    }

    async execute() {
        const selectionList = new PreviewList(this.pblock);
        const previewSelection = selectionList.getSelectedElement();

        if (previewSelection) {
            ContextUtils.activateTab = true;
            this.executePreviewItem(previewSelection, true)
        }
        else
            await this.executeCurrentCommand();

        window.close();
    }

    async executeCurrentCommand() {
        await this.commandHistoryPush(this.getInput());
        await this._commandList.executeSelection();
    }

    executePreviewItem(object, activate) {
        if (object.length > 0) {
            if (object[0].href)
                browser.tabs.create({ "url": object[0].href, active: activate });
            else
                object.click();
        }
    }

    async showHistory() {
        const history = await this.getCommandHistory();

        this.invalidatePreview();
        cmdAPI.previewList(this.pblock, history, (i, e) => {
            this.setCommand(history[i]);
        });
    }

    advanceSuggestionSelection(direction) {
        this._lastInput = "";
        this._commandList.advanceSelection(direction);
    }

    advancePreviewSelection(direction) {
        const selectionList = new PreviewList(this.pblock);
        selectionList.advanceSelection(direction);
    }

    selectPreviewItem(keyCode) {
        const object = $("[accessKey='" + String.fromCharCode(keyCode).toLowerCase() + "']");
        this.executePreviewItem(object);
    }

    scrollPreview(direction) {
        this.pblock.scrollBy(0, (direction? -1: 1) * this.pblock.clientHeight - 20);
    }

    async commandHistoryPush(input) {
        if (input) {
            input = input.trim();

            let history = await settings.get("command_history");

            if (!history)
                history = [];

            ADD_ITEM: {
                if (history.length && history[0].toUpperCase() === input.toUpperCase())
                    break ADD_ITEM;

                history = [input, ...history];

                if (history.length > settings.max_history_items())
                    history.splice(history.length - 1, 1);

                await settings.set("command_history", history);
            }
        }
    }

    async getCommandHistory() {
        return settings.get("command_history");
    }

    async onKeyDown(evt) {
        if (!evt) return;
        let keyCode = evt.keyCode;

        // On TAB, autocomplete
        if (keyCode === 9) {
            evt.preventDefault();
            this.autocomplete();
            return;
        }

        // On ENTER, execute the given command
        if (keyCode === 13) {
            if (await Utils.easterListener(this.getInput()))
                return;

            if (evt.ctrlKey && evt.altKey) {
                this._commandList.addContextMenuItem(this.getInput());
                return;
            }

            await this.execute();
            return;
        }

        // /
        if (keyCode === 220) {
            if (evt.ctrlKey && evt.altKey) {
                await this.showHistory();
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
            if (evt.ctrlKey)
                this.advancePreviewSelection(false);
            else
                this.advanceSuggestionSelection(false);
            return;
        }
        // Cursor Down
        else if (keyCode === 40) {
            evt.preventDefault();
            if (evt.ctrlKey)
                this.advancePreviewSelection(true);
            else
                this.advanceSuggestionSelection(true);
            return;
        }

        // execute events from preview lists
        if (evt.ctrlKey && evt.altKey && keyCode >= 40 && keyCode <= 90) {
            this.selectPreviewItem(keyCode);
            return;
        }

        // Ctrl+C copies preview to clipboard
        if (keyCode === 67 && evt.ctrlKey) {
            cmdAPI.setClipboard(this.pblock.innerText);
            return;
        }

        // PGUP/PGDOWN
        if (keyCode === 33 || keyCode === 34) {
            this.scrollPreview(keyCode === 33);
            return;
        }
        
        this._lastInput = this.getInput();
    }

    onKeyUp(evt) {
        if (!evt) return;
        let keyCode = evt.keyCode;
        if (this.getInput() === this._lastInput) return;

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

        this.persistInput();
        this.generateSuggestions();
    }
}