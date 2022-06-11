window._DEPLOY_FIREFOX = true;

window._MANIFEST_VERSION = browser.runtime.getManifest().manifest_version;

window._MANIFEST_V3 = window._MANIFEST_VERSION === 3;

window._tm = (name = "timer") => console.time(name);

window._te = (name = "timer") => console.timeEnd(name);