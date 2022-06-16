(function (global, factory) {
   // typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
   // typeof define === 'function' && define.amd ? define(factory) :
    (global.Rainbow = factory());
}(this, function () { 'use strict';

    function PseudoWorker(handler) {
        var messageListeners = [];
        var errorListeners = [];
        var workerMessageListeners = [];
        var workerErrorListeners = [];
        var postMessageListeners = [];
        var terminated = false;
        var script = true;
        var workerSelf;

        var api = this;

        // custom each loop is for IE8 support
        function executeEach(arr, fun) {
            var i = -1;
            while (++i < arr.length) {
                if (arr[i]) {
                    fun(arr[i]);
                }
            }
        }

        function callErrorListener(err) {
            return function (listener) {
                listener({
                    type: 'error',
                    error: err,
                    message: err.message
                });
            };
        }

        function addEventListener(type, fun) {
            if (type === 'message') {
                messageListeners.push(fun);
            } else if (type === 'error') {
                errorListeners.push(fun);
            }
        }

        function removeEventListener(type, fun) {
            var listeners;
            if (type === 'message') {
                listeners = messageListeners;
            } else if (type === 'error') {
                listeners = errorListeners;
            } else {
                return;
            }
            var i = -1;
            while (++i < listeners.length) {
                var listener = listeners[i];
                if (listener === fun) {
                    delete listeners[i];
                    break;
                }
            }
        }

        function postError(err) {
            var callFun = callErrorListener(err);
            if (typeof api.onerror === 'function') {
                callFun(api.onerror);
            }
            if (workerSelf && typeof workerSelf.onerror === 'function') {
                callFun(workerSelf.onerror);
            }
            executeEach(errorListeners, callFun);
            executeEach(workerErrorListeners, callFun);
        }

        function runPostMessage(msg, transfer) {
            function callFun(listener) {
                try {
                    listener({data: msg, ports: transfer});
                } catch (err) {
                    postError(err);
                }
            }
            if (workerSelf && typeof workerSelf.onmessage === 'function') {
                callFun(workerSelf.onmessage);
            }
            executeEach(workerMessageListeners, callFun);
        }

        function postMessage(msg, transfer) {
            if (typeof msg === 'undefined') {
                throw new Error('postMessage() requires an argument');
            }
            if (terminated) {
                return;
            }
            if (!script) {
                postMessageListeners.push({msg: msg, transfer: (transfer ? transfer : undefined)});
                return;
            }
            runPostMessage(msg, transfer);
        }

        function terminate() {
            terminated = true;
        }

        function workerPostMessage(msg) {
            if (terminated) {
                return;
            }
            function callFun(listener) {
                listener({
                    data: msg
                });
            }
            if (typeof api.onmessage === 'function') {
                callFun(api.onmessage);
            }
            executeEach(messageListeners, callFun);
        }

        function workerAddEventListener(type, fun) {
            /* istanbul ignore else */
            if (type === 'message') {
                workerMessageListeners.push(fun);
            } else if (type === 'error') {
                workerErrorListeners.push(fun);
            }
        }

        workerSelf = {
            postMessage: workerPostMessage,
            addEventListener: workerAddEventListener,
            close: terminate
        };

        workerSelf.onmessage = handler.bind(workerSelf);

        api.postMessage = postMessage;
        api.addEventListener = addEventListener;
        api.removeEventListener = removeEventListener;
        api.terminate = terminate;

        return api;
    }

    /**
     * Browser Only - Gets the language for this block of code
     *
     * @param {Element} block
     * @return {string|null}
     */
    function getLanguageForBlock(block) {

        // If this doesn't have a language but the parent does then use that.
        //
        // This means if for example you have: <pre data-language="php">
        // with a bunch of <code> blocks inside then you do not have
        // to specify the language for each block.
        var language = block.getAttribute('data-language') || block.parentNode.getAttribute('data-language');

        // This adds support for specifying language via a CSS class.
        //
        // You can use the Google Code Prettify style: <pre class="lang-php">
        // or the HTML5 style: <pre><code class="language-php">
        if (!language) {
            var pattern = /\blang(?:uage)?-(\w+)/;
            var match = block.className.match(pattern) || block.parentNode.className.match(pattern);

            if (match) {
                language = match[1];
            }
        }

        if (language) {
            return language.toLowerCase();
        }

        return null;
    }

    /**
     * Determines if two different matches have complete overlap with each other
     *
     * @param {number} start1   start position of existing match
     * @param {number} end1     end position of existing match
     * @param {number} start2   start position of new match
     * @param {number} end2     end position of new match
     * @return {boolean}
     */
    function hasCompleteOverlap(start1, end1, start2, end2) {

        // If the starting and end positions are exactly the same
        // then the first one should stay and this one should be ignored.
        if (start2 === start1 && end2 === end1) {
            return false;
        }

        return start2 <= start1 && end2 >= end1;
    }

    /**
     * Encodes < and > as html entities
     *
     * @param {string} code
     * @return {string}
     */
    function htmlEntities(code) {
        return code.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&(?![\w\#]+;)/g, '&amp;');
    }

    /**
     * Finds out the position of group match for a regular expression
     *
     * @see http://stackoverflow.com/questions/1985594/how-to-find-index-of-groups-in-match
     * @param {Object} match
     * @param {number} groupNumber
     * @return {number}
     */
    function indexOfGroup(match, groupNumber) {
        var index = 0;

        for (var i = 1; i < groupNumber; ++i) {
            if (match[i]) {
                index += match[i].length;
            }
        }

        return index;
    }

    /**
     * Determines if a new match intersects with an existing one
     *
     * @param {number} start1    start position of existing match
     * @param {number} end1      end position of existing match
     * @param {number} start2    start position of new match
     * @param {number} end2      end position of new match
     * @return {boolean}
     */
    function intersects(start1, end1, start2, end2) {
        if (start2 >= start1 && start2 < end1) {
            return true;
        }

        return end2 > start1 && end2 < end1;
    }

    /**
     * Sorts an objects keys by index descending
     *
     * @param {Object} object
     * @return {Array}
     */
    function keys(object) {
        var locations = [];

        for (var location in object) {
            if (object.hasOwnProperty(location)) {
                locations.push(location);
            }
        }

        // numeric descending
        return locations.sort(function (a, b) { return b - a; });
    }

    /**
     * Substring replace call to replace part of a string at a certain position
     *
     * @param {number} position         the position where the replacement
     *                                  should happen
     * @param {string} replace          the text we want to replace
     * @param {string} replaceWith      the text we want to replace it with
     * @param {string} code             the code we are doing the replacing in
     * @return {string}
     */
    function replaceAtPosition(position, replace, replaceWith, code) {
        var subString = code.substr(position);

        // This is needed to fix an issue where $ signs do not render in the
        // highlighted code
        //
        // @see https://github.com/ccampbell/rainbow/issues/208
        replaceWith = replaceWith.replace(/\$/g, '$$$$');

        return code.substr(0, position) + subString.replace(replace, replaceWith);
    }

    /**
     * Creates a usable web worker from an anonymous function
     *
     * @param {Function} fn
     * @param {Prism} Prism
     * @return {Worker}
     */
    function createWorker(fn, Prism) {
        return new PseudoWorker(rainbowWorker);
    }

    /**
     * Prism is a class used to highlight individual blocks of code
     *
     * @class
     */
    var Prism = function Prism(options) {
        /**
         * Object of replacements to process at the end of the processing
         *
         * @type {Object}
         */
        var replacements = {};

        /**
         * Language associated with this Prism object
         *
         * @type {string}
         */
        var currentLanguage;

        /**
         * Object of start and end positions of blocks to be replaced
         *
         * @type {Object}
         */
        var replacementPositions = {};

        /**
         * Determines if the match passed in falls inside of an existing match.
         * This prevents a regex pattern from matching inside of another pattern
         * that matches a larger amount of code.
         *
         * For example this prevents a keyword from matching `function` if there
         * is already a match for `function (.*)`.
         *
         * @param {number} startstart position of new match
         * @param {number} end  end position of new match
         * @return {boolean}
         */
        function _matchIsInsideOtherMatch(start, end) {
            for (var key in replacementPositions) {
                key = parseInt(key, 10);

                // If this block completely overlaps with another block
                // then we should remove the other block and return `false`.
                if (hasCompleteOverlap(key, replacementPositions[key], start, end)) {
                    delete replacementPositions[key];
                    delete replacements[key];
                }

                if (intersects(key, replacementPositions[key], start, end)) {
                    return true;
                }
            }

            return false;
        }

        /**
         * Takes a string of code and wraps it in a span tag based on the name
         *
         * @param {string} name    name of the pattern (ie keyword.regex)
         * @param {string} code    block of code to wrap
         * @param {string} globalClass class to apply to every span
         * @return {string}
         */
        function _wrapCodeInSpan(name, code) {
            var className = name.replace(/\./g, ' ');

            var globalClass = options.globalClass;
            if (globalClass) {
                className += " " + globalClass;
            }

            return ("<span class=\"" + className + "\">" + code + "</span>");
        }

        /**
         * Process replacements in the string of code to actually update
         * the markup
         *
         * @param {string} code     the code to process replacements in
         * @return {string}
         */
        function _processReplacements(code) {
            var positions = keys(replacements);
            for (var i = 0, list = positions; i < list.length; i += 1) {
                var position = list[i];

                var replacement = replacements[position];
                code = replaceAtPosition(position, replacement.replace, replacement.with, code);
            }
            return code;
        }

        /**
         * It is so we can create a new regex object for each call to
         * _processPattern to avoid state carrying over when running exec
         * multiple times.
         *
         * The global flag should not be carried over because we are simulating
         * it by processing the regex in a loop so we only care about the first
         * match in each string. This also seems to improve performance quite a
         * bit.
         *
         * @param {RegExp} regex
         * @return {string}
         */
        function _cloneRegex(regex) {
            var flags = '';

            if (regex.ignoreCase) {
                flags += 'i';
            }

            if (regex.multiline) {
                flags += 'm';
            }

            return new RegExp(regex.source, flags);
        }

        /**
         * Matches a regex pattern against a block of code, finds all matches
         * that should be processed, and stores the positions of where they
         * should be replaced within the string.
         *
         * This is where pretty much all the work is done but it should not
         * be called directly.
         *
         * @param {Object} pattern
         * @param {string} code
         * @param {number} offset
         * @return {mixed}
         */
        function _processPattern(pattern, code, offset) {
            if ( offset === void 0 ) offset = 0;

            var regex = pattern.pattern;
            if (!regex) {
                return false;
            }

            // Since we are simulating global regex matching we need to also
            // make sure to stop after one match if the pattern is not global
            var shouldStop = !regex.global;

            regex = _cloneRegex(regex);
            var match = regex.exec(code);
            if (!match) {
                return false;
            }

            // Treat match 0 the same way as name
            if (!pattern.name && pattern.matches && typeof pattern.matches[0] === 'string') {
                pattern.name = pattern.matches[0];
                delete pattern.matches[0];
            }

            var replacement = match[0];
                var startPos = match.index + offset;
            var endPos = match[0].length + startPos;

            // In some cases when the regex matches a group such as \s* it is
            // possible for there to be a match, but have the start position
            // equal the end position. In those cases we should be able to stop
            // matching. Otherwise this can lead to an infinite loop.
            if (startPos === endPos) {
                return false;
            }

            // If this is not a child match and it falls inside of another
            // match that already happened we should skip it and continue
            // processing.
            if (_matchIsInsideOtherMatch(startPos, endPos)) {
                return {
                    remaining: code.substr(endPos - offset),
                    offset: endPos
                };
            }

            /**
             * Callback for when a match was successfully processed
             *
             * @param {string} repl
             * @return {void}
             */
            function onMatchSuccess(repl) {

                // If this match has a name then wrap it in a span tag
                if (pattern.name) {
                    repl = _wrapCodeInSpan(pattern.name, repl);
                }

                // For debugging
                // console.log('Replace ' + match[0] + ' with ' + replacement + ' at position ' + startPos + ' to ' + endPos);

                // Store what needs to be replaced with what at this position
                replacements[startPos] = {
                    'replace': match[0],
                    'with': repl
                };

                // Store the range of this match so we can use it for
                // comparisons with other matches later.
                replacementPositions[startPos] = endPos;

                if (shouldStop) {
                    return false;
                }

                return {
                    remaining: code.substr(endPos - offset),
                    offset: endPos
                };
            }

            /**
             * Helper function for processing a sub group
             *
             * @param {number} groupKey  index of group
             * @return {void}
             */
            function _processGroup(groupKey) {
                var block = match[groupKey];

                // If there is no match here then move on
                if (!block) {
                    return;
                }

                var group = pattern.matches[groupKey];
                var language = group.language;

                /**
                 * Process group is what group we should use to actually process
                 * this match group.
                 *
                 * For example if the subgroup pattern looks like this:
                 *
                 * 2: {
                 * 'name': 'keyword',
                 * 'pattern': /true/g
                 * }
                 *
                 * then we use that as is, but if it looks like this:
                 *
                 * 2: {
                 * 'name': 'keyword',
                 * 'matches': {
                 *      'name': 'special',
                 *      'pattern': /whatever/g
                 *  }
                 * }
                 *
                 * we treat the 'matches' part as the pattern and keep
                 * the name around to wrap it with later
                 */
                var groupToProcess = group.name && group.matches ? group.matches : group;

                /**
                 * Takes the code block matched at this group, replaces it
                 * with the highlighted block, and optionally wraps it with
                 * a span with a name
                 *
                 * @param {string} passedBlock
                 * @param {string} replaceBlock
                 * @param {string|null} matchName
                 */
                var _getReplacement = function(passedBlock, replaceBlock, matchName) {
                    replacement = replaceAtPosition(indexOfGroup(match, groupKey), passedBlock, matchName ? _wrapCodeInSpan(matchName, replaceBlock) : replaceBlock, replacement);
                    return;
                };

                // If this is a string then this match is directly mapped
                // to selector so all we have to do is wrap it in a span
                // and continue.
                if (typeof group === 'string') {
                    _getReplacement(block, block, group);
                    return;
                }

                var localCode;
                var prism = new Prism(options);

                // If this is a sublanguage go and process the block using
                // that language
                if (language) {
                    localCode = prism.refract(block, language);
                    _getReplacement(block, localCode);
                    return;
                }

                // The process group can be a single pattern or an array of
                // patterns. `_processCodeWithPatterns` always expects an array
                // so we convert it here.
                localCode = prism.refract(block, currentLanguage, groupToProcess.length ? groupToProcess : [groupToProcess]);
                _getReplacement(block, localCode, group.matches ? group.name : 0);
            }

            // If this pattern has sub matches for different groups in the regex
            // then we should process them one at a time by running them through
            // the _processGroup function to generate the new replacement.
            //
            // We use the `keys` function to run through them backwards because
            // the match position of earlier matches will not change depending
            // on what gets replaced in later matches.
            var groupKeys = keys(pattern.matches);
            for (var i = 0, list = groupKeys; i < list.length; i += 1) {
                var groupKey = list[i];

                _processGroup(groupKey);
            }

            // Finally, call `onMatchSuccess` with the replacement
            return onMatchSuccess(replacement);
        }

        /**
         * Processes a block of code using specified patterns
         *
         * @param {string} code
         * @param {Array} patterns
         * @return {string}
         */
        function _processCodeWithPatterns(code, patterns) {
            for (var i = 0, list = patterns; i < list.length; i += 1) {
                var pattern = list[i];

                var result = _processPattern(pattern, code);
                while (result) {
                    result = _processPattern(pattern, result.remaining, result.offset);
                }
            }

            // We are done processing the patterns so we should actually replace
            // what needs to be replaced in the code.
            return _processReplacements(code);
        }

        /**
         * Returns a list of regex patterns for this language
         *
         * @param {string} language
         * @return {Array}
         */
        function getPatternsForLanguage(language) {
            var patterns = options.patterns[language] || [];
            while (options.inheritenceMap[language]) {
                language = options.inheritenceMap[language];
                patterns = patterns.concat(options.patterns[language] || []);
            }

            return patterns;
        }

        /**
         * Takes a string of code and highlights it according to the language
         * specified
         *
         * @param {string} code
         * @param {string} language
         * @param {object} patterns optionally specify a list of patterns
         * @return {string}
         */
        function _highlightBlockForLanguage(code, language, patterns) {
            currentLanguage = language;
            patterns = patterns || getPatternsForLanguage(language);
            return _processCodeWithPatterns(htmlEntities(code), patterns);
        }

        this.refract = _highlightBlockForLanguage;
    };

    function rainbowWorker(e) {
        var self = this;
        var message = e.data;

        var prism = new Prism(message.options);
        var result = prism.refract(message.code, message.lang);

        self.postMessage({
            id: message.id,
            lang: message.lang,
            result: result
        });
    }

    /**
     * An array of the language patterns specified for each language
     *
     * @type {Object}
     */
    var patterns = {};

    /**
     * An object of languages mapping to what language they should inherit from
     *
     * @type {Object}
     */
    var inheritenceMap = {};

    /**
     * A mapping of language aliases
     *
     * @type {Object}
     */
    var aliases = {};

    /**
     * Representation of the actual rainbow object
     *
     * @type {Object}
     */
    var Rainbow = {};

    /**
     * Callback to fire after each block is highlighted
     *
     * @type {null|Function}
     */
    var onHighlightCallback;

    /**
     * Counter for block ids
     * @see https://github.com/ccampbell/rainbow/issues/207
     */
    var id = 0;

    var cachedWorker = null;
    function _getWorker() {
        if (cachedWorker === null) {
            cachedWorker = createWorker(rainbowWorker, Prism);
        }

        return cachedWorker;
    }

    /**
     * Helper for matching up callbacks directly with the
     * post message requests to a web worker.
     *
     * @param {object} message      data to send to web worker
     * @param {Function} callback   callback function for worker to reply to
     * @return {void}
     */
    function _messageWorker(message, callback) {
        var worker = _getWorker();

        function _listen(e) {
            if (e.data.id === message.id) {
                callback(e.data);
                worker.removeEventListener('message', _listen);
            }
        }

        worker.addEventListener('message', _listen);
        worker.postMessage(message);
    }

    /**
     * Browser Only - Handles response from web worker, updates DOM with
     * resulting code, and fires callback
     *
     * @param {Element} element
     * @param {object} waitingOn
     * @param {Function} callback
     * @return {void}
     */
    function _generateHandler(element, waitingOn, callback) {
        return function _handleResponseFromWorker(data) {
            element.innerHTML = data.result;
            element.classList.remove('loading');
            element.classList.add('rainbow-show');

            if (element.parentNode.tagName === 'PRE') {
                element.parentNode.classList.remove('loading');
                element.parentNode.classList.add('rainbow-show');
            }

            // element.addEventListener('animationend', (e) => {
            //     if (e.animationName === 'fade-in') {
            //         setTimeout(() => {
            //             element.classList.remove('decrease-delay');
            //         }, 1000);
            //     }
            // });

            if (onHighlightCallback) {
                onHighlightCallback(element, data.lang);
            }

            if (--waitingOn.c === 0) {
                callback();
            }
        };
    }

    /**
     * Gets options needed to pass into Prism
     *
     * @param {object} options
     * @return {object}
     */
    function _getPrismOptions(options) {
        return {
            patterns: patterns,
            inheritenceMap: inheritenceMap,
            aliases: aliases,
            globalClass: options.globalClass,
            delay: !isNaN(options.delay) ? options.delay : 0
        };
    }

    /**
     * Gets data to send to webworker
     *
     * @param  {string} code
     * @param  {string} lang
     * @return {object}
     */
    function _getWorkerData(code, lang) {
        var options = {};
        if (typeof lang === 'object') {
            options = lang;
            lang = options.language;
        }

        lang = aliases[lang] || lang;

        var workerData = {
            id: id++,
            code: code,
            lang: lang,
            options: _getPrismOptions(options)
        };

        return workerData;
    }

    /**
     * Browser Only - Sends messages to web worker to highlight elements passed
     * in
     *
     * @param {Array} codeBlocks
     * @param {Function} callback
     * @return {void}
     */
    function _highlightCodeBlocks(codeBlocks, callback) {
        var waitingOn = { c: 0 };
        for (var i = 0, list = codeBlocks; i < list.length; i += 1) {
            var block = list[i];

            var language = getLanguageForBlock(block);
            if (block.classList.contains('rainbow') || !language) {
                continue;
            }

            // This cancels the pending animation to fade the code in on load
            // since we want to delay doing this until it is actually
            // highlighted
            block.classList.add('loading');
            block.classList.add('rainbow');

            // We need to make sure to also add the loading class to the pre tag
            // because that is how we will know to show a preloader
            if (block.parentNode.tagName === 'PRE') {
                block.parentNode.classList.add('loading');
            }

            var globalClass = block.getAttribute('data-global-class');
            var delay = parseInt(block.getAttribute('data-delay'), 10);

            ++waitingOn.c;
            _messageWorker(_getWorkerData(block.innerHTML, { language: language, globalClass: globalClass, delay: delay }), _generateHandler(block, waitingOn, callback));
        }

        if (waitingOn.c === 0) {
            callback();
        }
    }

    function _addPreloader(preBlock) {
        var preloader = document.createElement('div');
        preloader.className = 'preloader';
        for (var i = 0; i < 7; i++) {
            preloader.appendChild(document.createElement('div'));
        }
        preBlock.appendChild(preloader);
    }

    /**
     * Browser Only - Start highlighting all the code blocks
     *
     * @param {Element} node       HTMLElement to search within
     * @param {Function} callback
     * @return {void}
     */
    function _highlight(node, callback) {
        callback = callback || function() {};

        // The first argument can be an Event or a DOM Element.
        //
        // I was originally checking instanceof Event but that made it break
        // when using mootools.
        //
        // @see https://github.com/ccampbell/rainbow/issues/32
        node = node && typeof node.getElementsByTagName === 'function' ? node : document;

        var preBlocks = node.getElementsByTagName('pre');
        var codeBlocks = node.getElementsByTagName('code');
        var finalPreBlocks = [];
        var finalCodeBlocks = [];

        // First loop through all pre blocks to find which ones to highlight
        for (var i = 0, list = preBlocks; i < list.length; i += 1) {
            var preBlock = list[i];

            _addPreloader(preBlock);

            // Strip whitespace around code tags when they are inside of a pre
            // tag.  This makes the themes look better because you can't
            // accidentally add extra linebreaks at the start and end.
            //
            // When the pre tag contains a code tag then strip any extra
            // whitespace.
            //
            // For example:
            //
            // <pre>
            //      <code>var foo = true;</code>
            // </pre>
            //
            // will become:
            //
            // <pre><code>var foo = true;</code></pre>
            //
            // If you want to preserve whitespace you can use a pre tag on
            // its own without a code tag inside of it.
            if (preBlock.getElementsByTagName('code').length) {

                // This fixes a race condition when Rainbow.color is called before
                // the previous color call has finished.
                if (!preBlock.getAttribute('data-trimmed')) {
                    preBlock.setAttribute('data-trimmed', true);
                    preBlock.innerHTML = preBlock.innerHTML.trim();
                }
                continue;
            }

            // If the pre block has no code blocks then we are going to want to
            // process it directly.
            finalPreBlocks.push(preBlock);
        }

        // @see http://stackoverflow.com/questions/2735067/how-to-convert-a-dom-node-list-to-an-array-in-javascript
        // We are going to process all <code> blocks
        for (var i$1 = 0, list$1 = codeBlocks; i$1 < list$1.length; i$1 += 1) {
            var codeBlock = list$1[i$1];

            finalCodeBlocks.push(codeBlock);
        }

        _highlightCodeBlocks(finalCodeBlocks.concat(finalPreBlocks), callback);
    }

    /**
     * Callback to let you do stuff in your app after a piece of code has
     * been highlighted
     *
     * @param {Function} callback
     * @return {void}
     */
    function onHighlight(callback) {
        onHighlightCallback = callback;
    }

    /**
     * Extends the language pattern matches
     *
     * @param {string} language            name of language
     * @param {object} languagePatterns    object of patterns to add on
     * @param {string|undefined} inherits  optional language that this language
     *                                     should inherit rules from
     */
    function extend(language, languagePatterns, inherits) {

        // If we extend a language again we shouldn't need to specify the
        // inheritance for it. For example, if you are adding special highlighting
        // for a javascript function that is not in the base javascript rules, you
        // should be able to do
        //
        // Rainbow.extend('javascript', [ … ]);
        //
        // Without specifying a language it should inherit (generic in this case)
        if (!inheritenceMap[language]) {
            inheritenceMap[language] = inherits;
        }

        patterns[language] = languagePatterns.concat(patterns[language] || []);
    }

    function remove(language) {
        delete inheritenceMap[language];
        delete patterns[language];
    }

    /**
     * Starts the magic rainbow
     *
     * @return {void}
     */
    function color() {
        var args = [], len = arguments.length;
        while ( len-- ) args[ len ] = arguments[ len ];


        // If you want to straight up highlight a string you can pass the
        // string of code, the language, and a callback function.
        //
        // Example:
        //
        // Rainbow.color(code, language, function(highlightedCode, language) {
        //     // this code block is now highlighted
        // });
        if (typeof args[0] === 'string') {
            var workerData = _getWorkerData(args[0], args[1]);
            _messageWorker(workerData, (function(cb) {
                return function(data) {
                    if (cb) {
                        cb(data.result, data.lang);
                    }
                };
            }(args[2])));
            return;
        }

        // If you pass a callback function then we rerun the color function
        // on all the code and call the callback function on complete.
        //
        // Example:
        //
        // Rainbow.color(function() {
        //     console.log('All matching tags on the page are now highlighted');
        // });
        if (typeof args[0] === 'function') {
            _highlight(0, args[0]);
            return;
        }

        // Otherwise we use whatever node you passed in with an optional
        // callback function as the second parameter.
        //
        // Example:
        //
        // var preElement = document.createElement('pre');
        // var codeElement = document.createElement('code');
        // codeElement.setAttribute('data-language', 'javascript');
        // codeElement.innerHTML = '// Here is some JavaScript';
        // preElement.appendChild(codeElement);
        // Rainbow.color(preElement, function() {
        //     // New element is now highlighted
        // });
        //
        // If you don't pass an element it will default to `document`
        _highlight(args[0], args[1]);
    }

    /**
     * Method to add an alias for an existing language.
     *
     * For example if you want to have "coffee" map to "coffeescript"
     *
     * @see https://github.com/ccampbell/rainbow/issues/154
     * @param {string} alias
     * @param {string} originalLanguage
     * @return {void}
     */
    function addAlias(alias, originalLanguage) {
        aliases[alias] = originalLanguage;
    }

    /**
     * public methods
     */
    Rainbow = {
        extend: extend,
        remove: remove,
        onHighlight: onHighlight,
        addAlias: addAlias,
        color: color
    };

    document.addEventListener('DOMContentLoaded', function (event) {
        if (!Rainbow.defer) {
            Rainbow.color(event);
        }
    }, false);

    var Rainbow$1 = Rainbow;

    return Rainbow$1;
}));