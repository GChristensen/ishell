cmdAPI.createCaptureCommand({  // Capture the current tab to Scrapyard
    name: "my-capture-command",
    uuid: "%%UUID%%",
    type: "archive",  // also "bookmark"
    path: "My Shelf/My Folder",  // default path of the bookmark or archive
 // tags: "my,tags",  // default tags
 // todo: "TODO",  // also "WAITING", "POSTPONED", etc...
 // due: "YYYY-MM-DD",  // todo deadline
 // details: "bookmark details",  // arbitrary text
 // selector: ".article-body",  // capture only elements matching the selectors
 // filter: ".ads,video",  // remove elements matched by the filter selectors
 // style: "body {padding: 0;}"  // add custom CSS style
});
