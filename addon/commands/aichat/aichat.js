import {Marked} from "../../lib/marked.js";
import {markedHighlight} from "../../lib/marked-highlight.js";
import {loadCSS, loadScript} from "../../utils_browser.js";
import {sleep} from "../../utils.js";
import {settings} from "../../settings.js";

export const namespace = new CommandNamespace(CommandNamespace.AI);

export class AIChat {
    #modeIconSrc;

    //load(storage) {}

    init(doc /* popup document */, storage) {
        this.doc = doc;
        this.$$ = doc.defaultView.$;
    }

    async preview(_, display, storage) {
        if (this.$$(`#aichat-root-container[data-uuid="${this.uuid}"]`).length === 0) {
            await this.#initSyntaxHighlighting(this.doc);
            await this.#initUI(display, storage);
        }
    }

    async #initUI(display, storage) {
        const $$ = this.$$;
        display.innerHTML = await display.fetchText("/commands/aichat/aichat.html");
        $$(`#aichat-root-container`).attr("data-uuid", this.uuid);

        $$("#aichat-input-text-user, #aichat-input-text-system").on("input",  function() {
            $$(this).height(1);
            const totalHeight = $$(this).prop('scrollHeight')
                - parseInt($$(this).css('padding-top'))
                - parseInt($$(this).css('padding-bottom'));
            $$(this).height(totalHeight);
        });

        if (settings.platform.chrome) {
            $$("#aichat-input-text-system, #aichat-input-text-user").css("font-size", "100%");
        }

        const systemPromptText = storage.systemPromptText();
        if (systemPromptText) {
            $$("#aichat-input-text-system").val(systemPromptText).trigger("input");
        }
        if (storage.showSystemPrompt()) {
            $$("#aichat-system-prompt-toggle").prop("src", "/ui/icons/down-triangle.svg");
            $$("#aichat-input-text-system").show();
        }

        const selectionText = cmdAPI.getSelection();
        const promptText = selectionText || storage.promptText();
        if (promptText) {
            $$("#aichat-input-text-user").val(promptText).trigger("input");
        }

        if (!selectionText) {
            const outputText = this.#renderChatHistory(storage);
            if (outputText)
                $$("#aichat-output-text").html(outputText);
        }

        $$(this.doc).on("input", "#aichat-input-text-user", e => {
            storage.promptText(e.target.value);
        });

        $$("#aichat-input-text-system").on("input", e => {
            storage.systemPromptText(e.target.value);
        });

        $$("#aichat-system-prompt-toggle").on("click", e => {
            let showSystemPrompt = storage.showSystemPrompt();
            showSystemPrompt = !showSystemPrompt;
            $$("#aichat-input-text-system").toggle().trigger("input");
            $$("#aichat-system-prompt-toggle").prop("src", `/ui/icons/down-triangle${showSystemPrompt ? "" : "-s"}.svg`);
            storage.showSystemPrompt(showSystemPrompt);
        });

        const isConversation = storage.conversationMode();
        this.#setUpModeButton(isConversation);
        $$("#aichat-mode-button").on("click", this.#toggleChatMode.bind(this, $$, display, storage));

        $$("#aichat-clear-button").on("click", this.#clearOutput.bind(this, $$, display, storage));

        this.initUI(display, storage);

        await sleep(500);
        $$("#aichat-input-text-user").focus();
    }

    initUI(display, storage) {}

    async #initSyntaxHighlighting(doc) {
        const wnd = doc.defaultView;

        loadCSS(doc, "__hljs_monokai__", "/lib/highlight/monokai.css");
        await loadScript(doc, "__hljs__", "/lib/highlight/highlight.js");

        this.marked = new Marked(
            markedHighlight({
                langPrefix: 'hljs language-',
                highlight(code, lang, info) {
                    const language = wnd.hljs.getLanguage(lang) ? lang : 'plaintext';
                    return wnd.hljs.highlight(code, { language }).value;
                }
            })
        );
    }

    #clearOutput($$, display, storage) {
        const inputTextUser = $$("#aichat-input-text-user");
        const conversationInput = inputTextUser.parent().prop("id") !== "aichat-root-container";

        storage.chatHistory([]);
        inputTextUser.val("").trigger("input");

        if (conversationInput) {
            inputTextUser.removeClass("aichat-conversation-input");
            inputTextUser.detach();
        }

        $$("#aichat-output-text").html("");

        if (conversationInput) {
            inputTextUser.insertAfter($$("#aichat-input-text-system"));
            inputTextUser.focus();
        }
    }

    #toggleChatMode($$, display, storage) {
        let isConversation = storage.conversationMode();
        isConversation = !isConversation;
        this.#setUpModeButton(isConversation);
        storage.conversationMode(isConversation);
    }

    #setUpModeButton(mode) {
        this.$$("#aichat-mode-button").text(mode? "Chat": "Q&A");
        this.$$("#aichat-chat-icon").prop("src", mode? "/ui/icons/conversation-chat.svg": "/ui/icons/conversation-qa.svg");
    }

    async execute(args, storage) {
        this.#showProcessingAnimation(true);

        try {
            const isConversation = storage.conversationMode();
            if (!isConversation)
                await storage.chatHistory([]);

            const params = {
                prompt: this.$$("#aichat-input-text-user").val(),
                systemPrompt: this.$$("#aichat-input-text-system").val(),
            };

            const data = await this.generateText(storage, args, params);

            if (data?.output) {
                storage.promptText(data.prompt);
                await this.saveChatMessage(storage, "user", data.prompt);
                await this.saveChatMessage(storage, "assistant", data.output);
                await this.#appendChatMessage(storage, data);
                await this.#displayStatus(storage, data);
            }
            else if (data?.error) {
                await this.#appendChatMessage(storage, data);
            }
        }
        finally {
           this.#showProcessingAnimation(false);
        }
    }

    async generateText(args, storage) {
        await sleep(3000);

        return {
            model: "mock-model"
            , prompt: "lorem ipsum"
            , output: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam non nisl vitae lorem posuere " +
                "vestibulum et varius mi. Vestibulum elementum leo mi, vel ultricies mauris sagittis eget. " +
                "Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. " +
                "Pellentesque finibus eleifend pharetra. Mauris tristique, dolor id semper euismod, magna elit " +
                "egestas arcu, vitae tristique neque lectus vitae nisl. Etiam accumsan ligula sem, ut vulputate sem " +
                "sodales id. Morbi auctor dictum suscipit. Mauris velit felis, tincidunt sit amet dictum vel, maximus " +
                "eu eros. Sed sed lectus nulla. Pellentesque ut mi quis odio efficitur efficitur."
        }
    }

    #showProcessingAnimation(processing) {
        if (processing) {
            this.#modeIconSrc = this.$$("#aichat-chat-icon").prop("src");
            this.$$("#aichat-chat-icon").prop("src", "/ui/icons/loading-gear.svg");
        }
        else
            this.$$("#aichat-chat-icon").prop("src", this.#modeIconSrc);
    }

    getChatHistory(storage) {
        return storage.chatHistory() || [];
    }

    async saveChatMessage(storage, role, message) {
        const chatHistory = this.getChatHistory(storage);

        chatHistory.push({
            role: role,
            content: message
        });
        return storage.chatHistory(chatHistory);
    }

    #renderChatHistory(storage) {
        const $$ = this.$$;
        const isConversation = storage.conversationMode();
        const chatHistory = this.getChatHistory(storage);
        let result = "";

        if (chatHistory.length) {
            if (isConversation) {
                for (const message of chatHistory) {
                    if (message.role === "user")
                        message.content = cmdAPI.escapeHtml(message.content);

                    const html = this.marked.parse(message.content);
                    result += `<div class="aichat-message aichat-role-${message.role}">${html}</div>`;
                }

                const userInput = $$("#aichat-input-text-user");
                if (userInput.length) {
                    userInput.addClass("aichat-conversation-input");
                    result += userInput[0].outerHTML;
                    userInput.detach();
                }
            }
            else {
                const message = chatHistory[chatHistory.length - 1];
                const html = this.marked.parse(message.content);
                result += `<div class="aichat-message aichat-role-assistant">${html}</div>`;
            }
        }

        return result;
    }

    #appendChatMessage(storage, data) {
        const $$ = this.$$;
        const textDiv = $$("#aichat-output-text");
        const inputTextUser = $$("#aichat-input-text-user");
        const inputTextUserAtRoot = inputTextUser.parent().prop("id") === "aichat-root-container";
        const isConversation = storage.conversationMode();

        if (!isConversation) { // Q&A mode
            if (!inputTextUserAtRoot) { // Just changed from the chat mode to Q&A, raise the input
                inputTextUser.removeClass("aichat-conversation-input");
                inputTextUser.detach();
                inputTextUser.insertAfter($$("#aichat-input-text-system"));
                inputTextUser.focus();
            }

            if (data.output) {
                const output = this.marked.parse(data.output);
                textDiv.html(`<div class="aichat-message aichat-role-assistant">${output}</div>`);
            }
            else if (data.error) {
                const errorText = this.processError(data);
                let output = this.marked.parse(errorText);
                textDiv.html(`<div class="aichat-message aichat-role-error error">${output}</div>`);
            }
            return;
        }

        inputTextUser.val(""); // Chat mode
        if (inputTextUserAtRoot) { // Just changed to the chat mode from Q&A, put the input down
            inputTextUser.detach();
            textDiv.append(inputTextUser);

            const chatHistory = this.getChatHistory(storage); // And prepend the first user prompt
            if (chatHistory.length) {
                const message = chatHistory[0];
                message.content = cmdAPI.escapeHtml(message.content);
                const html = this.marked.parse(message.content);
                textDiv.prepend(`<div class="aichat-message aichat-role-${message.role}">${html}</div>`);
            }
        }

        let prompt = cmdAPI.escapeHtml(data.prompt);
        prompt = this.marked.parse(prompt);
        $$(`<div class="aichat-message aichat-role-user">${prompt}</div>`).insertBefore(inputTextUser);

        if (data.output) {
            const output = this.marked.parse(data.output);
            $$(`<div class="aichat-message aichat-role-assistant">${output}</div>`).insertBefore(inputTextUser);
        }
        else if (data.error) {
            const errorText = this.processError(data);
            let output = this.marked.parse(errorText);
            $$(`<div class="aichat-message aichat-role-error error">${output}</div>`).insertBefore(inputTextUser);
        }

        const userMessage = $$(".aichat-role-user", textDiv).last();
        const outputContainer = $$("#aichat-output-container");

        outputContainer.animate({
            scrollTop: userMessage.offset().top - outputContainer.offset().top + outputContainer.scrollTop()
        });
    }

    processError(data) {
        return data.error;
    }

    async #displayStatus(storage, data) {
        const html = await this.getStatusHtml(storage, data);

        if (html) {
            this.$$("#aichat-status-info-container").html(html);
        }
    }

    async getStatusHtml(storage, data) {
        return "";
    }
}

globalThis.AIChat = AIChat;