import {repository} from "../../../storage.js";

export class SuggestionMemory {
    constructor() {
    }

    toString() {
        return "[object SuggestionMemory]"
    }

    // === {{{ SuggestionMemory#remember(input, suggestion, ammount) }}}
    // Increases the strength of the association between {{{input}}} and
    // {{{suggestion}}}.
    async remember(input, suggestion, amount) {
        amount = +amount || 1;

        const memory = (await repository.getSuggestionMemory(input)) || {input, scores: {}};

        if (suggestion in memory.scores) {
            memory.scores[suggestion] += amount;
        }
        else {
            memory.scores[suggestion] = amount;
        }

        return repository.setSuggestionMemory(memory);
    }

    // === {{{ SuggestionMemory#getScore(input, suggestion) }}} ===
    // === {{{ SuggestionMemory#setScore(input, suggestion, score) }}} ===
    // Gets/Sets the number of times that {{{suggestion}}} has been associated
    // with {{{input}}}.
    async getScore(input, suggestion) {
        const memory = await repository.getSuggestionMemory(input);
        if (memory)
            return memory.scores[suggestion] || 0

        return 0;
    }

    setScore(input, suggestion, score) {
        //return this.remember(input, suggestion, score - this.getScore(input, suggestion));
    }

    // === {{{ SuggestionMemory#wipe(input, suggestion) }}} ===
    // Wipes the specified entry out of this suggestion memory instance.
    // Omitting both {{{input}}} and {{{suggestion}}} deletes everything.
    // Be careful with this.
    wipe(input, suggestion) {
    }
}
