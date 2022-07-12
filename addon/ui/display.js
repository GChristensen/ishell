export function createDisplayProxy(block) {
    // a real proxy does not work nicely with some advanced jQuery features
    // probably because jQuery expects a reference to a node that presents in the document
    //return new Proxy(block, new DisplayHandler());

    block.set = setBlock;
    block.text = textBlock;
    block.error = errorBlock;
    block.fetch = fetchBlock;
    block.fetchText = fetchTextBlock;
    block.fetchJSON = fetchJSONBlock;
    block.htmlList = htmlListBlock;
    block.objectList = objectListBlock;

    return block;
}

function setBlock(html) {
    this.innerHTML = html
}

function textBlock(html) {
    this.innerHTML = `<div class="description">${html}</div>`
}

function errorBlock(html) {
    this.innerHTML = `<div class="description error">${html}</div>`
}

function fetchBlock(...args) {
    args = [this, ...args];

    return cmdAPI.previewFetch(...args);
}

async function fetchTextBlock(...args) {
    args = [this, ...args];

    const response = await cmdAPI.previewFetch(...args);

    if (response.ok)
        return response.text();
}

async function fetchJSONBlock(...args) {
    args = [this, ...args];

    const response = await cmdAPI.previewFetch(...args);

    if (response.ok)
        return response.json();
}

function htmlListBlock(...args) {
    if (typeof args[0] === "string") {
        const prefix = args.shift();
        args = [prefix, this, ...args];
    }
    else
        args = [this, ...args];

    return cmdAPI.htmlPreviewList(...args);
}

function objectListBlock(...args) {
    if (typeof args[0] === "string") {
        const prefix = args.shift();
        args = [prefix, this, ...args];
    }
    else
        args = [this, ...args];

    return cmdAPI.objectPreviewList(...args);
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
            case "fetch":
                return (...args) => fetchBlock.call(target, ...args);
            case "fetchText":
                return (...args) => fetchTextBlock.call(target, ...args);
            case "fetchJSON":
                return (...args) => fetchJSONBlock.call(target, ...args);
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