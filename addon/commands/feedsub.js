export const _namespace = {name: CMD_NS.SYNDICATION, annotated: true};

/**
 The command uses the URL opened in the current tab.
 Can also subscribe to YouTube users and channels.

 @command
 @icon /ui/icons/feedly.png
 @description Subscribe to RSS feeds in Feedly.
 @uuid A2910385-002A-4BBE-AA22-9E92FC06352B
 */
export class Feedsub {
    async execute() {
        const feedlySubURL = "https://feedly.com/i/subscription/feed/";
        const url = cmdAPI.getLocation();

        if (/youtube.com\//.test(url)) {
            const youTubeFeedURL = "https://www.youtube.com/feeds/videos.xml";
            const m = url.match(/youtube.com\/(channel|user)\/([^\/]*)/);
            const paramName = m?.[1] === "channel"? "?channel_id=": "?user=";
            const uid = m?.[2];

            if (uid) {
                const feedURL = encodeURIComponent(`${youTubeFeedURL}${paramName}${uid}`)
                cmdAPI.addTab(`${feedlySubURL}${feedURL}`);
            }
        }
        else {
            let feedURL = url;
            try {
                feedURL = await this.#extractFeedURL() || url;
            } catch (e) {
                console.error(e);
            }

            CmdUtils.addTab(feedlySubURL + encodeURIComponent(feedURL));
        }
    }

    async #extractFeedURL() {
        const [{result}] = await cmdAPI.executeScript({func: extractFeedURLContent});
        return result;
    }
}

function extractFeedURLContent() {
    return document.querySelector(`link[type*="application/rss+xml"]
            , link[type*="application/rdf+xml"]
            , link[type*="application/atom+xml"]
            , link[type*="application/xml"]
            , link[type*="text/xml"]`)
        .href;
}


