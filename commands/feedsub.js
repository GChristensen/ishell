CmdUtils.CreateCommand({
    names: ["feedsub"],
    uuid: "A2910385-002A-4BBE-AA22-9E92FC06352B",
    _namespace: "Syndication",
    description: "Subscribe to a RSS feed in Feedly.",
    help: `The command uses the URL opened in the current tab. 
            Direct feed links, Instagram, Tumblr, Twitter and Youtube are supported.`,
    icon: "/res/icons/feedly.png",
    builtIn: true,
    preview: "Subscribe using Feedly",
    execute: function () {
      const feedlySubUrl = "https://feedly.com/i/subscription/feed/"; 
      let url = CmdUtils.getLocation();
      if (/twitter.com\//.test(url)) {
        let m = url.match(/twitter.com\/([^\/]*)/);
        let uid = m? m[1]: null;
        if (uid) {
          CmdUtils.addTab(feedlySubUrl
                          + encodeURIComponent("https://twitrss.me/twitter_user_to_rss/?user=" + uid));
        }
      }
	  else if (/tumblr.com/.test(url)) {
        let m = url.match(/([^.]*.tumblr.com)/);
        let uid = m? m[1]: null;
        if (uid) {
          CmdUtils.addTab(feedlySubUrl
                          + encodeURIComponent(uid + "/rss"));
        }
      }
      else if (/instagram.com\//.test(url)) {
          let m = url.match(/instagram.com\/([^\/]*)/);
          let uid = m? m[1]: null;
          if (uid) {
              CmdUtils.addTab(feedlySubUrl
                  + encodeURIComponent("https://rsshub.app/instagram/user/" + uid));
          }
      }
      else if (/youtube.com\//.test(url)) {
        let m = url.match(/youtube.com\/channel\/([^\/]*)/);
        let uid = m? m[1]: null;
        if (uid) {
          CmdUtils.addTab(feedlySubUrl
                          + encodeURIComponent("https://www.youtube.com/feeds/videos.xml?channel_id=" + uid));
        }
        else {
            let m = url.match(/youtube.com\/user\/([^\/]*)/);
            let uid = m? m[1]: null;
            CmdUtils.addTab(feedlySubUrl
                + encodeURIComponent("https://www.youtube.com/feeds/videos.xml?user=" + uid));
        }
      }
      else {
          CmdUtils.addTab(feedlySubUrl + encodeURIComponent(url));
      }
    }
});
