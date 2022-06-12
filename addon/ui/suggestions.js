
export class SuggestionManager {
    #popup;

    constructor(popup, cmdManager, max_suggestions) {
        this._cmdManager = cmdManager;
        this._max_suggestions = max_suggestions;
        this._selected_suggestion = 0;
        this._selected_sentence = null;
        this._suggestions = null;
        this._parser = cmdManager.makeParser();
        this.#popup = new WeakRef(popup);
    }

    get _popup() {
        return this.#popup.deref();
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

        switch (typeof command.preview) {
            case 'undefined':
                this._popup.setPreview(command.description, true);
                break;
            case 'string':
                this._popup.setPreview(command.preview, true);
                break;
            default:
                this._popup.invalidatePreview();
                this._cmdManager.callPreview(sentence, this._popup.pblock);
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
            icon = '/ui/icons/logo.svg';
        }
        icon = '<img class="suggestion-icon" src="' + icon + '" alt=""> ';
        return icon;
    }

    _generateSuggestionHtml(suggestions) {
        let suggestions_div = document.createElement('div');
        let suggestions_list = document.createElement('ul');

        for (let i in suggestions) {
            var s = suggestions[i];
            var li = document.createElement('LI');
            li.innerHTML = `<div id="suggestion-item-${i}" class="suggestion-item">        
                                <div class="suggestion-icon">${this._decorateIcon(s.icon)}</div>
                                <div class="suggestion-text">${s.displayHtml}</div>
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
            }
            else {
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
            return this._cmdManager.callExecute(this.selection)
                .then(() => {
                    ContextUtils.clearSelection();
                });
        }
    }

    strengthenMemory() {
        if (this.selection)
            this._parser.strengthenMemory(this.selection);
    }
}