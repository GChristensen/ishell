import {settings} from "../settings.js";
import {CommandList} from "./command_list.js";
import {PreviewList} from "./preview_list.js";
import {cmdManager, contextMenuManager as contextMenu} from "../ishell.js";
import {createDisplayProxy} from "./display.js";

let popup;

$(initPopup);

async function initPopup() {
    await settings.load();
    await cmdManager.initializeCommandsOnPopup(document);
    await ContextUtils.updateActiveTab();

    popup = new PopupWindow();

    const input = popup.loadInput();
    popup.generateSuggestions(input);

    cmdAPI.dbglog("iShell popup initialized");
}

$(window).on("unload", function() {
    popup.addCurrentInputToHistory();
});

class PopupWindow {
    constructor() {
        this._lastInput = "";
        this.cmdline = document.getElementById('shell-input');
        this.sblock = document.getElementById('shell-command-suggestions');
        this.pblock = document.getElementById('shell-command-preview');
        this.pblock = createDisplayProxy(this.pblock);

        this._commandList = new CommandList(this, settings.max_suggestions());

        cmdAPI.getCommandLine = () => this.getInput();
        cmdAPI.setCommandLine = text => this.setCommand(text);
        cmdAPI.closeCommandLine = () => window.close();

        document.addEventListener('keydown', this.onKeyDown.bind(this), false);
        document.addEventListener('keyup', this.onKeyUp.bind(this), false);
    }

    loadInput() {
        let input = contextMenu.selectedContextMenuCommand;

        if (input) {
            this.setInput(input);
            contextMenu.selectedContextMenuCommand = null;

            if (settings.remember_context_menu_commands())
                this.persistInput();
        }
        else {
            input = settings.shell_last_command() || "";
            this.setInput(input);
            this.cmdline.select();
        }

        return input;
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
        this.generateSuggestions(text);
    }

    setSuggestionsContent(html) {
        this.sblock.innerHTML = html;
    }

    generateSuggestions(input) {
        input = input || this.getInput()
        this._commandList.generateSuggestions(input);
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

    displayHelp() {
        const html =
            `<div class='description'>Type the name of a command and press Enter to execute it.
                Use the <b>help</b> command for assistance.
                <p>
                   <div class='help-heading'>Keyboard Shortcuts</div>
                   <span class='keys'>Tab</span> - complete the current input.<br>
                   <span class='keys'>Ctrl+C</span> - copy the preview content to the clipboard.<br>
                   <span class='keys'>Ctrl+Alt+Enter</span> - add the selected command to context menu.<br>
                   <span class='keys'>Ctrl+Alt+\\</span> - show command history.<br>
                   <span class='keys'>Ctrl+Alt+&ltkey&gt;</span> - select the list item prefixed with the &lt;key&gt;.<br>
                   <span class='keys'>&#8593;/&#8595;</span> - cycle through command suggestions.<br>
                   <span class='keys'>Ctrl+&#8593;/&#8595;</span> - scroll through preview list items.<br>
                   <span class='keys'>F5</span> - reload the extension.
                   ${this._formatAnnouncement()}
                </p>
             </div>`;

        this.setPreviewContent(html);

        $(".announcement").on("click", PopupWindow._handleAnnouncementClick);
    }

    _formatAnnouncement() {
        const ann = settings.pending_announcement();
        if (ann)
            return `<div class="announcement">
                        <span class="announcement-bell">&#x1F514;</span>
                        <a href="${ann.href}" target="_blank">${ann.text}</a>
                    </div>`;

        return "";
    }

    static _handleAnnouncementClick() {
        settings.pending_announcement(null);
        setTimeout(() => window.close(), 500);
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