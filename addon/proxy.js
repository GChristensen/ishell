import {snakeCaseToCamelCase} from "./utils.js";

class ReceiveHandler {
    constructor(camelCase = true) {
        this.methods = new Map();
        this.listener = null;
        this.camelCase = camelCase;
    }

    set(target, key, value, receiver) {
        this.methods.set(key, value);
        return true;
    }

    get(target, key, receiver) {
        if (key === "startListener") {
            return isAsync => {
                if (!this.listener) {
                    this.listener = this._createListener(isAsync);
                    target._handler.addListener(this.listener);
                }
            };
        }
        else if (key === "methods") {
            return this.methods;
        }
    }

    _createListener(isAsync) {
        if (_BACKGROUND_PAGE)
            return isAsync
                ? async (...args) => this._dispatch.apply(this, args)
                : (...args) => this._dispatch.apply(this, args);
        else
            return (...args) => this._dispatch.apply(this, args);
    }

    _dispatch() {
        const [message] = arguments;
        const type = this.camelCase? message.type: snakeCaseToCamelCase(message.type);
        const method = this.methods.get(type);

        if (method) {
            if (_BACKGROUND_PAGE)
                return method.apply(null, arguments);
            else {
                const sendResponse = arguments[2];
                const result = method.apply(null, arguments);

                if (result instanceof Promise) {
                    result.then(sendResponse);
                    return true;
                }
                else
                    sendResponse(result);
            }
        }
        else
            ;//console.error(`No method for message type: ${message.type}`);
    }
}

export let receive = new Proxy({_handler: browser.runtime.onMessage}, new ReceiveHandler());
export let receiveExternal = new Proxy({_handler: browser.runtime.onMessageExternal}, new ReceiveHandler(false));


export let send = new Proxy({}, {
    get(target, key, receiver) {
        const type = key;

        return val => {
            const payload = val || {};
            //console.log(payload)
            //console.trace()
            payload.type = type;

            return browser.runtime.sendMessage(payload);
        };
    }
});

export let sendLocal = new Proxy({_receiver: receive}, {
    get(target, key, receiver) {
        const type = key;

        return (val) => {
            const payload = val || {};
            payload.type = type;

            if (target._receiver.methods.has(type)) {
                const method = target._receiver.methods.get(type);
                return method.apply(null, [payload]);
            }
            else
                return browser.runtime.sendMessage(payload);
        };
    }
});

