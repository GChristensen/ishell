if (!globalThis.browser)
    globalThis.browser = chrome;

const _MANIFEST = chrome.runtime.getManifest();

globalThis._BACKGROUND_PAGE = !!_MANIFEST.background?.page;

globalThis._MANIFEST_VERSION = _MANIFEST.manifest_version;

globalThis._MANIFEST_V3 = globalThis._MANIFEST_VERSION === 3;

globalThis._log = console.log;

globalThis._tm = (name = "timer") => console.time(name);

globalThis._te = (name = "timer") => console.timeEnd(name);