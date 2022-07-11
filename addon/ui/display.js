class DisplayHandler {
    get(target, property, receiver) {
        switch (property) {
            case "_element":
                return target;
            case "set":
                return v => this._set(target, v);
            case "text":
                return v => this._text(target, v);
            case "error":
                return v => this._error(target, v);
            case "htmlList":
                return (...args) => this._htmlList(target, ...args);
            case "objectList":
                return (...args) => this._objectList(target, ...args);
            default:
                let value = target[property];
                if (typeof value === "function")
                    value = value.bind(target);
                return value;
        }
    }

    set(target, property, value, receiver) {
        return Reflect.set(target, property, value, target);
    }

    _set(block, html) {
        block.innerHTML = html
    }

    _text(block, html) {
        block.innerHTML = `<div class="description">${html}</div>`
    }

    _error(block, html) {
        block.innerHTML = `<div class="description error">${html}</div>`
    }

    _htmlList(...args) {
        if (typeof args[1] === "string") {
            const block = args.shift();
            const prefix = args.shift();
            args = [prefix, block, ...args];
        }

        cmdAPI.htmlPreviewList(...args);
    }

    _objectList(...args) {
        if (typeof args[1] === "string") {
            const block = args.shift();
            const prefix = args.shift();
            args = [prefix, block, ...args];
        }

        cmdAPI.objectPreviewList(...args);
    }
}

export function createDisplayProxy(block) {
    return new Proxy(block, new DisplayHandler());
}