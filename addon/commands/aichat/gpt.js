import {AIChat} from "./aichat.js";
import {settings} from "../../settings.js";

export const namespace = new AnnotatedCommandNamespace(CommandNamespace.AI);

const MAX_TOKENS = 4096;

const GPT_MODELS = {
    "gpt-3.5": "gpt-3.5-turbo",
    "gpt-4": "gpt-4",
    "gpt-4-turbo": "gpt-4-turbo-preview",
};

/**
     This command uses <a href="https://openai.com/pricing" target="_blank">OpenAI API</a> to communicate with GPT
     language models. Please provide the authorization API key on the <a href="/ui/options/options.html">iShell
     options page</a>. Press Ctrl+&lt;Enter&gt; to open the popup in a new tab. All command arguments are optional.

     # Syntax
     **gpt** [**with** *model*] [**by** *tokens*] [**at** *temperature*]

     # Arguments
     - *model* - language model to use. Available models:
        - **gpt-3.5** - gpt-3.5-turbo
        - **gpt-4** - gpt-4
        - **gpt-4-turbo** - gpt-4-turbo-preview
     - *tokens* - maximum number of tokens in the prompt and output. The current limit is 4096.
     - *temperature* - sampling temperature. A floating point value between 0 and 2.

     # Examples
     **gpt** **with** *3.5* **by** *1000* **at** *0.7*

     @command
     @sticky
     @markdown
     @license GPL
     @delay 1500
     @icon /ui/icons/openai.svg
     @description Chat with OpenAI GPT models.
     @author g/christensen
     @uuid 315AE92F-3674-4E74-8689-A62657DD970F
 */
export class Gpt extends AIChat {

    constructor(args) {
        super(args);
        //args[OBJECT] = {nountype: noun_arb_text, label: "text"}; // object
        //args[FOR]    = {nountype: noun_arb_text, label: "text"}; // subject
        //args[TO]     = {nountype: noun_arb_text, label: "text"}; // goal
        //args[FROM]   = {nountype: noun_arb_text, label: "text"}; // source
        //args[NEAR]   = {nountype: noun_arb_text, label: "text"}; // location
        args[WITH]   = {nountype: GPT_MODELS, label: "model"}; // instrument
        //args[IN]     = {nountype: noun_arb_text, label: "text"}; // format
        //args[OF]     = {nountype: noun_arb_text, label: "text"}; // modifier
        //args[AS]     = {nountype: noun_arb_text, label: "text"}; // alias
        args[BY]     = {nountype: noun_type_number, label: "tokens"}; // cause
        args[AT]     = {nountype: noun_type_number, label: "temperature"}; // time
        //args[ON]     = {nountype: noun_arb_text, label: "text"}; // dependency
    }

    initUI(display, storage) {
        this.$$(this.doc).on("click", "#gpt-login-link", this.#getOpenAISessionToken.bind(this));
    }

    processError(data) {
        let result = "ERROR: " + data.error;

        if (data.error.includes("This model's maximum context length is"))
            result += " Use the iShell command argument 'by' to specify the token limit.";
        else if (data.error.includes("You didn't provide an API key."))
            result += " Please see the <a href=\"/ui/options/options.html\" target='_blank'>iShell options page</a>" +
                " for more details.";

        return result;
    }

    async generateTextStream(storage, args, params) {
        const defaultModel = GPT_MODELS[cmdAPI.settings.gpt_default_model] || "gpt-3.5-turbo";
        const model = args.WITH?.data || defaultModel;
        const maxTokens = args.BY?.text? parseInt(args.BY?.text): null;
        const temperature = args.AT?.text? parseFloat(args.AT?.text): null;
        const chatHistory = this.getChatHistory(storage);

        const requestBody = {
            model: model,
            messages: [
                ...chatHistory,
                {
                    role: "user",
                    content: params.prompt
                }
            ],
            n: 1
        };

        if (maxTokens)
            requestBody.max_tokens = maxTokens;

        if (params.systemPrompt) {
            const systemMsg = {
                role: "system",
                content: params.systemPrompt
            };
            requestBody.messages = [systemMsg, ...requestBody.messages];
        }

        if (temperature)
            requestBody.temperature = temperature;

        let response;
        try {
            const apiUrl = "https://api.openai.com/v1/chat/completions";
            response = await this.#openaiAPIRequest(apiUrl, requestBody);
        } catch (e) {
            return {
                _model: model,
                error: e.error?.message || e.message
            };
        }

        return {
            output: "",
            _model: model,
            _response: response
        };
    }

    async processStreamResponse(data, outputDiv) {
        const reader = data._response.body?.pipeThrough(new TextDecoderStream()).getReader();
        let output = "";
        let tokens = 0;

        while (true) {
            const chunk = await reader?.read();
            if (chunk?.done) break;

            //_log(chunk?.value)

            const data = chunk?.value
                ?.replace(/^data: /, "")
                ?.split(/\n\ndata: /);

            for (const token of data) {
                //_log(token)
                try {
                    const tokenObject = JSON.parse(token);
                    if (tokenObject.choices[0].finish_reason)
                        break;
                    output += tokenObject.choices[0]?.delta?.content || "";
                    tokens += 1;
                } catch (e) {
                    output += String.fromCharCode(0x2753);
                }

                try {
                    const html = this.marked.parse(output);
                    outputDiv.html(html);

                    const scroll= outputDiv.closest("#aichat-output-container");
                    scroll.stop(true, false).animate({scrollTop: scroll.prop("scrollHeight")});
                } catch (e) {
                    console.error(e);
                }
            }
        }

        data.output = output;
        data._usage = {total_tokens: tokens};

        return data;
    }

    async getStatusHtml(storage, data) {
        const balance = await this.#openaiGetBalance(storage);
        const balanceHtml = balance || `<a href="https://platform.openai.com/usage" id="gpt-login-link" 
                target="_blank" class="action-link" title="Login OpenAI"><span class="flat-emoji">&#x1F511;</span></a>`
        const tokens = data._usage?.total_tokens;

        return `
        <div id="aichat-status-model-label"><span class="flat-emoji" title="Language model">&#x1F9E0;</span>&nbsp;<!--
        --><span title="Language model">${data._model}</span></div>&nbsp;|&nbsp;<!--
        --><div id="aichat-status-tokens-label" class="flat-emoji" title="Consumed tokens">&#x1F3F7;&#xFE0F;&nbsp;<span
                    id="aichat-status-tokens" title="Consumed tokens">${tokens}</span>&nbsp;|&nbsp;</div><!--
        --><div id="aichat-status-balance-label"><span class="flat-emoji" title="Balance" class="flat-emoji" 
                title="Balance">&#x1F4B0;&nbsp;</span><!--
            --><span id="aichat-status-balance" title="Balance">${balanceHtml}</span></div>`;
    }

    async #openaiGetBalance(storage) {
        const apiUrl = "https://api.openai.com/dashboard/billing/credit_grants";
        const sessionToken = storage.openAISessionToken();
        const response = sessionToken && sessionToken !== "null"
            ? await this.#openaiAPIRequest(apiUrl, "", "get", sessionToken)
            : null;

        if (response && response.ok) {
            const data = await response.json();
            if (data.total_available)
                return "$" + data.total_available;
        }
    }

    #getOpenAISessionToken(e) {
        e.preventDefault();

        this._headerListener = this.#headersListener.bind(this);

        browser.webRequest.onSendHeaders.addListener(
            this._headerListener,
            { urls: ["https://api.openai.com/dashboard/billing/usage*"] },
            ["requestHeaders"]
        );

        if (settings.platform.chrome) {
            cmdAPI.notify("Make sure you logged into OpenAI when clicking this link.")
        }

        return browser.tabs.create({ "url": e.target.closest("a").href, active: !settings.platform.chrome });
    }

    // Automatically store OpenAI session token in the local storage to use in the billing API latter.
    // As OpenAI says, currently, there is no other way.
    async #headersListener(details) {
        const bearer = details.requestHeaders.find(h => h.name === "Authorization")?.value?.split(" ")?.[1];
        if (bearer && bearer !== "null") {
            this.storage.openAISessionToken(bearer);
            browser.webRequest.onSendHeaders.removeListener(this._headerListener);
        }
    }

    async #openaiAPIRequest(apiUrl, options, method = "post", sessionToken = null) {
        const apiKey = cmdAPI.settings.openai_api_key;

        const requestOptions = {
            method: method,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${sessionToken || apiKey}`
            }
        };

        if (options) {
            options.stream = true;
            requestOptions.body = JSON.stringify(options);
        }
        else if (method.toLowerCase() !== "get") {
            requestOptions.body = "{}";
        }

        const response = await fetch(apiUrl, requestOptions);

        if (!response.ok)
            throw await response.json();

        return response;
    }
}