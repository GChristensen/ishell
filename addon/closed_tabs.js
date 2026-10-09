// Maintains a log of recently closed tabs (browser.sessions.getRecentlyClosed is limited to 25 items).
// Should be imported at the top level of a background script.

export const CLOSED_TABS_KEY = "closed-tabs";
const OPEN_TABS_KEY = "closed-tabs-open";
const MAX_CLOSED_TABS = 100;
const SAVE_DELAY = 1000;

// tabs.onRemoved does not provide tab properties, so they are cached here.
// The cache is mirrored to the session storage because MV3 background scripts may be suspended.
const sessionStorage = browser.storage.session;
let openTabs;
let saveTimeout;
let logQueue = Promise.resolve();

browser.tabs.onCreated.addListener(tab => updateTab(tab));
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url || changeInfo.title || changeInfo.favIconUrl || changeInfo.status === "complete")
        updateTab(tab);
});
browser.tabs.onRemoved.addListener(tabId => {
    logQueue = logQueue.then(() => logClosedTab(tabId)).catch(e => console.error(e));
});

loadOpenTabs();

function loadOpenTabs() {
    if (!openTabs)
        openTabs = (async () => {
            const cached = sessionStorage
                ? (await sessionStorage.get(OPEN_TABS_KEY))?.[OPEN_TABS_KEY] || {}
                : {};

            for (const tab of await browser.tabs.query({}))
                cached[tab.id] = cached[tab.id] || tabInfo(tab);

            return cached;
        })();

    return openTabs;
}

function tabInfo(tab) {
    if (!tab.incognito && isLoggable(tab.url))
        return {url: tab.url, title: tab.title, favIconUrl: tab.favIconUrl};
}

function isLoggable(url) {
    return url && /^(https?|file|ftp):/i.test(url);
}

async function updateTab(tab) {
    const tabs = await loadOpenTabs();
    const info = tabInfo(tab);

    if (info) {
        // preserve the favicon of the page if it is not yet known after a navigation
        if (!info.favIconUrl && tabs[tab.id]?.url === info.url)
            info.favIconUrl = tabs[tab.id].favIconUrl;
        tabs[tab.id] = info;
    }
    else
        delete tabs[tab.id];

    saveOpenTabs();
}

function saveOpenTabs() {
    if (!sessionStorage)
        return;

    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
        await sessionStorage.set({[OPEN_TABS_KEY]: await openTabs});
    }, SAVE_DELAY);
}

async function logClosedTab(tabId) {
    const tabs = await loadOpenTabs();
    const info = tabs[tabId];

    delete tabs[tabId];
    saveOpenTabs();

    if (info) {
        let closedTabs = await getClosedTabs();
        closedTabs = closedTabs.filter(t => t.url !== info.url);
        closedTabs.unshift({...info, closedAt: Date.now()});
        await setClosedTabs(closedTabs.slice(0, MAX_CLOSED_TABS));
    }
}

export async function getClosedTabs() {
    return (await browser.storage.local.get(CLOSED_TABS_KEY))?.[CLOSED_TABS_KEY] || [];
}

function setClosedTabs(closedTabs) {
    return browser.storage.local.set({[CLOSED_TABS_KEY]: closedTabs});
}
