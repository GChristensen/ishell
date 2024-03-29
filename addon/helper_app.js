import {hasCSRPermission} from "./utils_browser.js";
import {fetchJSON, fetchWithTimeout, isBackground, isChrome} from "./utils.js";

const platformChrome = isChrome();

class HelperApp {
    #host;
    #hostPort;
    #serverOnline;

    constructor() {
        this.auth = crypto.randomUUID();
        this.version = undefined;
    }

    async configure() {
        const config = await fetchJSON("/helper_app.json");
        this.#host = config.host + ":" + config.port;
        this.#hostPort = config.port;
    }

    get #portNumber() {
        if (this.#hostPort)
            return this.#hostPort;

        return (async () => {
            await this.configure();
            return this.#hostPort;
        })();
    }

    async getPort() {
        if (this.port) {
            return this.port;
        }
        else {
            this.port = new Promise(async (resolve, reject) => {
                const port = browser.runtime.connectNative("ishell_helper");

                port.onDisconnect.addListener(error => {
                    resolve(null);
                    this.port = null;
                });

                let initListener = (response) => {
                    response = JSON.parse(response);
                    if (response.type === "INITIALIZED") {
                        port.onMessage.removeListener(initListener);
                        port.onMessage.addListener(HelperApp.incomingMessages.bind(this))
                        this.port = port;
                        this.version = response.version;
                        resolve(port);
                    }
                }

                port.onMessage.addListener(initListener);

                try {
                    port.postMessage({
                        type: "INITIALIZE",
                        port: await this.#portNumber,
                        auth: this.auth
                    });
                }
                catch (e) {
                    //console.error(e, e.name)
                    resolve(null);
                    this.port = null;
                }
            });

            return this.port;
        }
    }

    async probe(verbose) {
        if (isBackground())
            return this._probe(verbose);
        else if (platformChrome)
            return chrome.runtime.sendMessage({type: "helperAppProbe", verbose});
    }

    async _probe(verbose = false) {
        if (!await hasCSRPermission())
            return false;

        const presents = !!await this.getPort();

        if (!presents && verbose)
            displayMessage("Can not connect to the helper application.")

        return presents;
    }

    async _probeServer() {
        try {
            await this.#portNumber;
            const init = {timeout: 500};
            this.injectAuth(init);

            const response = await fetchWithTimeout(this.url("/"), init);
            this.#serverOnline = response.ok;
            return this.#serverOnline;
        } catch (e) {
            console.error(e);
        }
    }

    getVersion() {
        if (this.port) {
            if (!this.version)
                return "0.1";
            return this.version;
        }
    }

    async hasVersion(version, msg) {
        if (!(await this.probe())) {
            if (msg)
                displayMessage(msg);
            return false;
        }

        let installed = this.getVersion();

        if (installed) {
            if (installed.startsWith(version))
                return true;

            version = version.split(".").map(d => parseInt(d));
            installed = installed.split(".").map(d => parseInt(d));
            installed.length = version.length;

            for (let i = 0; i < version.length; ++i) {
                if (installed[i] > version[i])
                    return true;
            }

            if (msg)
                displayMessage(msg);
            return false;
        }
    }

    static async incomingMessages(msg) {
        // msg = JSON.parse(msg);
        // switch (msg.type) {
        //
        // }
    }

    url(path) {
        return `${this.#host}${path.startsWith("/")? "": "/"}${path}`;
    }

    injectAuth(init) {
        init = init || {};
        init.headers = init.headers || {};
        init.headers["Authorization"] = "Basic " + btoa("default:" + this.auth);
        return init;
    }

    fetch(path, init) {
        init = this.injectAuth(init);
        return window.fetch(this.url(path), init);
    }

    async post(path, fields) {
        let form = new FormData();

        for (const [k, v] of Object.entries(fields))
            form.append(k, v + "");

        const init = this.injectAuth({method: "POST", body: form});

        return this.fetch(path, init);
    }

}

export const helperApp = new HelperApp();

if (platformChrome && isBackground()) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === "helperAppGetBackgroundAuth") {
            sendResponse(helperApp.auth);
        }
        else if (message.type === "helperAppProbe") {
            helperApp.probe(message.verbose).then(result => sendResponse(result));
            return true;
        }
    });
}
else if (platformChrome) {
    chrome.runtime.sendMessage({type: "helperAppGetBackgroundAuth"}).then(auth => helperApp.auth = auth);
}
