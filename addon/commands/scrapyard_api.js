// Scrapyard automation API

export let SCRAPYARD_ID = "scrapyard-we@firefox";

if (navigator.userAgent.includes("Chrome"))
    SCRAPYARD_ID = "jlpgjeiblkojkaedoobnfkgobdddimon";

export async function getVersion() {
    return await browser.runtime.sendMessage(SCRAPYARD_ID, {
        type: "SCRAPYARD_GET_VERSION"
    });
}

export async function openBatchSession() {
    return await browser.runtime.sendMessage(SCRAPYARD_ID, {
        type: "SCRAPYARD_OPEN_BATCH_SESSION"
    });
}

export async function closeBatchSession() {
    return await browser.runtime.sendMessage(SCRAPYARD_ID, {
        type: "SCRAPYARD_CLOSE_BATCH_SESSION"
    });
}

export async function addBookmark(options) {
    return await browser.runtime.sendMessage(SCRAPYARD_ID, {
        type: "SCRAPYARD_ADD_BOOKMARK",
        ...options
    });
}

export async function addArchive(options) {
    return await browser.runtime.sendMessage(SCRAPYARD_ID, {
        type: "SCRAPYARD_ADD_ARCHIVE",
        ...options
    });
}

export async function addNotes(options) {
    return await browser.runtime.sendMessage(SCRAPYARD_ID, {
        type: "SCRAPYARD_ADD_NOTES",
        ...options
    });
}

export async function addSeparator(options) {
    return await browser.runtime.sendMessage(SCRAPYARD_ID, {
        type: "SCRAPYARD_ADD_SEPARATOR",
        ...options
    });
}

export async function packPage(options) {
    return await browser.runtime.sendMessage(SCRAPYARD_ID, {
        type: "SCRAPYARD_PACK_PAGE",
        ...options
    });
}

export async function getItem(options) {
    return await browser.runtime.sendMessage(SCRAPYARD_ID, {
        type: "SCRAPYARD_GET_UUID",
        ...options
    });
}

export async function getItemContent(options) {
    return await browser.runtime.sendMessage(SCRAPYARD_ID, {
        type: "SCRAPYARD_GET_UUID_CONTENT",
        ...options
    });
}

export async function listItems(options) {
    if (options.uuid)
        return await browser.runtime.sendMessage(SCRAPYARD_ID, {
            type: "SCRAPYARD_LIST_UUID",
            ...options
        });
    else if (options.path)
        return await browser.runtime.sendMessage(SCRAPYARD_ID, {
            type: "SCRAPYARD_LIST_PATH",
            ...options
        });
}

export async function getSelection() {
    return await browser.runtime.sendMessage(SCRAPYARD_ID, {
        type: "SCRAPYARD_GET_SELECTION"
    });
}

export async function updateItem(options) {
    return await browser.runtime.sendMessage(SCRAPYARD_ID, {
        type: "SCRAPYARD_UPDATE_UUID",
        ...options
    });
}

export async function deleteItem(options) {
    return await browser.runtime.sendMessage(SCRAPYARD_ID, {
        type: "SCRAPYARD_REMOVE_UUID",
        ...options
    });
}

export async function browseItem(options) {
    return await browser.runtime.sendMessage(SCRAPYARD_ID, {
        type: "SCRAPYARD_BROWSE_UUID",
        ...options
    });
}

export function _setScrapyardId(value) {
    SCRAPYARD_ID = value;
}

