import {cmdManager, contextMenuManager as contextMenu} from "../ishell.js";

export class CommandList {
    #popup;
    #parser;
    #suggestions;
    #maxSuggestions;
    #previousSelection;
    #selectedSuggestion = 0;

    constructor(popup, maxSuggestions) {
        this.#maxSuggestions = maxSuggestions;
        this.#parser = cmdManager.makeParser();
        this.#popup = new WeakRef(popup);
    }

    getAutocompletion() {
        return this.selection?.completionText?.trim() || "";
    }

    get selection() {
        if (this.#suggestions && this.#selectedSuggestion >= 0 && this.#selectedSuggestion < this.#suggestions.length)
            return this.#suggestions[this.#selectedSuggestion];
    }

    advanceSelection(direction) {
        this.#previousSelection = this.#selectedSuggestion;
        this.#selectedSuggestion = this._incrementSelectionIndex(this.#selectedSuggestion, direction);
        this._selectCommand(this.#selectedSuggestion);
    }

    executeSelection() {
        if (this.selection) {
            return cmdManager.callExecute(this.selection)
                .then(() => {
                    ContextUtils.clearSelection();
                });
        }
    }

    generateSuggestions(input) {
        if (input)
            this._populateSuggestionList(input); // will also show command preview
        else
            this._popup.reset();
    }

    strengthenMemory() {
        if (this.selection)
            this.#parser.strengthenMemory(this.selection);
    }

    addContextMenuItem(input) {
        if (this.selection && input) {
            const commandText = this.getAutocompletion();

            if (!contextMenu.getContextMenuCommand(commandText))
                contextMenu.addContextMenuCommand(this.selection.getCommand(), input.trim(), commandText);
        }
    }

    reset() {
        this.#selectedSuggestion = 0;
        this._popup.setSuggestionsContent("<ul/>");
    }

    get _popup() {
        return this.#popup.deref();
    }

    _incrementSelectionIndex(index, direction) {
        let nextIndex = index + (direction? 1: -1);

        if (this.#suggestions && nextIndex >= this.#suggestions.length)
            nextIndex = 0;
        else if (nextIndex < 0)
            nextIndex = this.#suggestions.length - 1;
        else if (!this.#suggestions)
            return -1;

        return nextIndex;
    }
    
    _ensureSelectionInRange() {
        if (this.#suggestions && this.#selectedSuggestion >= this.#suggestions.length)
            this.#selectedSuggestion = this.#suggestions.length - 1;
        else if (this.#suggestions && this.#selectedSuggestion < 0)
            this.#selectedSuggestion = 0;
    }

    _selectCommand(index) {
        this._ensureSelectionInRange();

        $("#suggestion-item-" + this.#previousSelection).parent().removeClass("selected");
        $(`#suggestion-item-${index}`).parent().addClass('selected');

        this._popup.autocomplete();
        this._popup.setPreviewContent(this.selection?.getCommand()?.description, true);
        this._showCommandPreview(this.selection);

    }

    _populateSuggestionList(input) {
        const previousSelection = this.selection;
        const query = this.#parser.newQuery(input, null, this.#maxSuggestions, true);

        query.onResults = () => {
            this.#suggestions = query.suggestionList.slice();

            if (this.#suggestions.length && this.#suggestions.length > this.#maxSuggestions)
                this.#suggestions.splice(this.#maxSuggestions);

            this._ensureSelectionInRange();

            if (this.#suggestions.length > 0) {
                const suggestionListHTML = this._generateSuggestionHtml(this.#suggestions);
                this._popup.setSuggestionsContent(suggestionListHTML);

                for (const i in this.#suggestions)
                    $(`#suggestion-item-${i}`).click(() => this._selectCommand(i));

                if (!previousSelection?.equalCommands(this.selection))
                    this._popup.setPreviewContent(this.selection.getCommand().description, true);

                this._showCommandPreview(this.selection);
            }
            else {
                this._popup.reset();
            }
        };

        query.run(); // WARNING: callback suggestions may make several calls of onResults
    }

    _generateSuggestionHtml(suggestions) {
        const suggestionLIs = suggestions.reduce((acc, s, i) => acc +
                `<li${this.#selectedSuggestion === i? ` class="selected"`: ""}> 
                 <div id="suggestion-item-${i}" class="suggestion-item">        
                     <div class="suggestion-icon">${this._decorateIcon(s.icon)}</div>
                     <div class="suggestion-text">${s.displayHtml}</div>
                 </div>
             </li>`,
            "")

        return `<ul>${suggestionLIs}</ul>`;
    }

    _decorateIcon(icon) {
        if (!icon || icon === "http://example.com/favicon.ico")
            icon = '/ui/icons/logo.svg';

        icon = '<img class="suggestion-icon" src="' + icon + '" alt=""> ';
        return icon;
    }

    _showCommandPreview(sentence) {
        if (sentence == null)
            return;

        let command = sentence.getCommand();
        if (!command || !command.preview)
            return;

        switch (typeof command.preview) {
            case 'undefined':
                this._popup.setPreviewContent(command.description, true);
                break;
            case 'string':
                this._popup.setPreviewContent(command.preview, true);
                break;
            default:
                this._popup.invalidatePreview();
                cmdManager.callPreview(sentence, this._popup.pblock);
        }
    }

}