const _MANIFEST = chrome.runtime.getManifest() // chrome.runtime should be used for compatibility

window._BACKGROUND_PAGE = !!_MANIFEST.applications?.gecko;

window._MANIFEST_VERSION = _MANIFEST.manifest_version;

window._MANIFEST_V3 = window._MANIFEST_VERSION === 3;

window._tm = (name = "timer") => console.time(name);

window._te = (name = "timer") => console.timeEnd(name);