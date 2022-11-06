export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve,  ms))
}

export function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

export function camelCaseToSnakeCase(str) {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1_$2').toUpperCase();
}

export function snakeCaseToCamelCase(str) {
    return str.toLowerCase()
        .replace(/(_)([a-z])/g, (_match, _p1, p2) => p2.toUpperCase())
}

export function merge(to, from) {
    for (const [k, v] of Object.entries(from)) {
        if (!to.hasOwnProperty(k))
            to[k] = v;
    }
    return to;
}

export function delegate (object, method) {
    return function () {
        return method.apply(object, arguments);
    }
}

// injects legacy API into the global namespace
export async function injectModules(modules) {
    return loadModules(modules, true);
}

// imports modules for side effects
export async function loadModules(modules, inject = false) {
    for (const module of modules) {
        const namespace = await import(module);
        if (inject)
            injectModule(namespace);
    }
}

export function injectModule(namespace) {
    for (const key of Object.keys(namespace))
        globalThis[key] = namespace[key];
}

export async function fetchText(url, init, _fetch = window.fetch) {
    const response = await _fetch(url, init);

    if (response.ok) {
        const contentType = response.headers.get("content-type");

        let encoding;
        let result;

        if (contentType) {
            const charset = contentType.match(/;\s*charset=([^;]+)/i);
            if (charset)
                encoding = charset[1].toLowerCase();

            if (encoding === "utf-8")
                encoding = null;
        }

        if (encoding) {
            const buffer = await response.arrayBuffer();
            const decoder = new TextDecoder(encoding);

            result = decoder.decode(buffer);
        }
        else
            result = await response.text();

        return result;
    }
}


export async function fetchJSON(url, init) {
    const response = await fetch(url, init);

    if (response.ok)
        return response.json();
}

export async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 10000 } = options;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(resource, {
        ...options,
        signal: controller.signal
    });

    clearTimeout(id);

    return response;
}

export const CONTEXT_BACKGROUND = 0;
export const CONTEXT_FOREGROUND = 1;

export function getContextType() {
    return typeof WorkerGlobalScope !== "undefined" || window.location.pathname === "/background.html"
        ? CONTEXT_BACKGROUND
        : CONTEXT_FOREGROUND;
}

export function isBackground() {
    return getContextType() === CONTEXT_BACKGROUND;
}

export function isChrome() {
    return navigator.userAgent.indexOf("Chrome") >= 0;
}