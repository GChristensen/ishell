const PREFIX = location.origin + "/pull_script/";
self.onfetch = e => {
    const {url} = e.request;
    if (url.startsWith(PREFIX)) {
        const script = decodeURIComponent(url.slice(PREFIX.length));
        e.respondWith(new Response(script, {
            headers: {'Content-Type': 'text/javascript'},
        }));
    }
};
