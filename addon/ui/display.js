function setBlock(html) {
    this.innerHTML = html
}

function textBlock(block, html) {
    this.innerHTML = `<div class="description">${html}</div>`
}

function errorBlock(block, html) {
    this.innerHTML = `<div class="description error">${html}</div>`
}

function htmlListBlock(...args) {
    if (typeof args[0] === "string") {
        const prefix = args.shift();
        args = [prefix, this, ...args];
    }
    else
        args = [this, ...args];

    cmdAPI.htmlPreviewList(...args);
}

function objectListBlock(...args) {
    if (typeof args[0] === "string") {
        const prefix = args.shift();
        args = [prefix, this, ...args];
    }
    else
        args = [this, ...args];

    cmdAPI.objectPreviewList(...args);
}

class DisplayHandler {
    getPrototypeOf(target) {
        return Object.getPrototypeOf(target);
    }

    get(target, property, receiver) {
        switch (property) {
            case "_element":
                return target;
            case "set":
                return v => setBlock.call(target, v);
            case "text":
                return v => textBlock.call(target, v);
            case "error":
                return v => errorBlock.call(target, v);
            case "htmlList":
                return (...args) => htmlListBlock.call(target, ...args);
            case "objectList":
                return (...args) => objectListBlock.call(target, ...args);
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

    has(target, key) {
        return key in target;
    }
}

export function createDisplayProxy(block) {
    // a real proxy does not work nicely with some advanced jQuery features
    //return new Proxy(block, new DisplayHandler());

    block.set = setBlock;
    block.text = textBlock;
    block.error = textBlock;
    block.htmlList = htmlListBlock;
    block.objectList = objectListBlock;

    return block;
}