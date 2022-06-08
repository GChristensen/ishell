window._MANIFEST_VERSION = browser.runtime.getManifest().manifest_version;

window._MANIFEST_V3 = window._MANIFEST_VERSION === 3;

window._HELPER_APP_HOST = browser.runtime.getManifest().content_security_policy.extension_pages
    .split(";")[0]
    .split(" ").at(-1);

window._HELPER_APP_PORT = parseInt(window._HELPER_APP_HOST.split(":").at(-1))