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

    popup = await new PopupWindow();

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

        cmdAPI.getCommandLine = () => this.getInput();
        cmdAPI.setCommandLine = text => this.setCommand(text);
        cmdAPI.closeCommandLine = () => window.close();

        ContextUtils.arrowSelection = false;

        document.addEventListener('keydown', this.onKeyDown.bind(this), false);
        document.addEventListener('keyup', this.onKeyUp.bind(this), false);

        return new CommandList(this, settings.max_suggestions())
            .then(commandList => {
                this._commandList = commandList;
                return this;
            });
    }

    async initialize() {
        return this._commandList.initialize();
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

    setCommand(text) {
        this.setInput(text);
        this.persistInput();
        this.generateSuggestions(text);
    }

    removeCommandArguments() {
        let input = this.getInput();
        input = input.split(" ")[0];
        this.setInput(input + " ");
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
        cmdManager.commandHistoryPush(this.getInput());
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
            ContextUtils.arrowSelection = true;
            this.executePreviewItem(previewSelection, true)
        }
        else
            await this.executeCurrentCommand();

        window.close();
    }

    async executeCurrentCommand() {
        return this._commandList.executeSelection();
    }

    executePreviewItem(object, activate) {
        if (object.length > 0) {
            if (object[0].href)
                browser.tabs.create({ "url": object[0].href, active: !!activate });
            else
                object.click();
        }
    }

    async showHistory() {
        const history = cmdManager.getCommandHistory();

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

    selectPreviewItem(char) {
        const object = $("[accessKey='" + char.toLowerCase() + "']");
        this.executePreviewItem(object);
    }

    scrollPreview(direction) {
        this.pblock.scrollBy(0, (direction? -1: 1) * this.pblock.clientHeight - 20);
    }

    async setPreviousCommand() {
        const history = cmdManager.getCommandHistory();

        this._historyPos = this._historyPos === undefined? -1: this._historyPos;
        this._historyPos += 1;

        if (this._historyPos === 0 && history[this._historyPos] === this.getInput())
            this._historyPos += 1;

        if (this._historyPos > history.length - 1)
            this._historyPos = history.length - 1;

        cmdAPI.setCommandLine(history[this._historyPos])
    }

    async setNextCommand() {
        const history = cmdManager.getCommandHistory();

        this._historyPos = this._historyPos === undefined? 0: this._historyPos;
        this._historyPos -= 1;

        if (this._historyPos >= 0)
            cmdAPI.setCommandLine(history[this._historyPos])
        else
            this._historyPos = undefined;
    }

    displayHelp() {
        const html =
            `<div class='description'>Type the name of a command and press Enter to execute it.
                Use the <b>help</b> command for assistance.
                <p>
                   <div class='help-heading'>Keyboard Shortcuts</div>
                   <span class='keys'>Tab</span> - complete the current input.<br>
                   <span class='keys'>Alt+Backspace</span> - clear the command arguments.<br>
                   <span class='keys'>Ctrl+C</span> - copy the preview content to the clipboard.<br>
                   <span class='keys'>Ctrl+Alt+Enter</span> - add the selected command to the context menu.<br>
                   <span class='keys'>Ctrl+Alt+\\</span> - show the command history.<br>
                   <span class='keys'>Alt+P/Alt+N</span> - switch to the previous/next command.<br>
                   <span class='keys'>Ctrl+Alt+&ltkey&gt;</span> - select the list item prefixed with the &lt;key&gt;.<br>
                   <span class='keys'>&#8593;/&#8595;</span> - cycle through the command suggestions.<br>
                   <span class='keys'>Ctrl+&#8593;/&#8595;</span> - scroll through the preview list items.<br>
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
        let keyCode = evt.code;

        if (keyCode === "Backspace" && evt.altKey) {
            evt.preventDefault();
            this.removeCommandArguments();
            return;
        }

        if (keyCode === "Tab") {
            evt.preventDefault();
            this.autocomplete();
            return;
        }

        if (keyCode === "Enter") {
            if (await Utils.easterListener(this.getInput()))
                return;

            if (evt.ctrlKey && evt.altKey) {
                this._commandList.addContextMenuItem(this.getInput());
                return;
            }

            await this.execute();
            return;
        }

        if (keyCode === "Backslash" && evt.ctrlKey && evt.altKey) {
            await this.showHistory();
            return;
        }

        if (keyCode === "KeyP" && evt.altKey) {
            await this.setPreviousCommand();
            return;
        }

        if (keyCode === "KeyN" && evt.altKey) {
            await this.setNextCommand();
            return;
        }

        if (keyCode === "F5") {
            chrome.runtime.reload();
            return;
        }

        if (keyCode === "ArrowUp") {
            evt.preventDefault();
            if (evt.ctrlKey)
                this.advancePreviewSelection(false);
            else
                this.advanceSuggestionSelection(false);
            return;
        }
        else if (keyCode === "ArrowDown") {
            evt.preventDefault();
            if (evt.ctrlKey)
                this.advancePreviewSelection(true);
            else
                this.advanceSuggestionSelection(true);
            return;
        }

        if (keyCode === "KeyC" && evt.ctrlKey) {
            cmdAPI.setClipboard(this.pblock.innerText);
            return;
        }

        if (keyCode === "PageUp" || keyCode === "PageDown") {
            this.scrollPreview(keyCode === "PageUp");
            return;
        }

        // execute events from the preview lists
        if (evt.ctrlKey && evt.altKey && /^[a-z\d]$/i.test(evt.key)) {
            this.selectPreviewItem(evt.key);
            return;
        }
        
        this._lastInput = this.getInput();
    }

    onKeyUp(evt) {
        if (!evt) return;
        let keyCode = evt.code;
        if (this.getInput() === this._lastInput) return;

        if (evt.ctrlKey || evt.altKey)
            return;

        if (keyCode === "ArrowUp")
            return;
        else if (keyCode === "ArrowDown")
            return;

        this.persistInput();
        this.generateSuggestions();
    }
}