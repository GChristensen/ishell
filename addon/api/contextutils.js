import {executeScript} from "../utils_browser.js";

export class ContextUtils {
    static selectedText = "";
    static selectedHtml = "";

    static async getSelection(tabId) {
        this.selectedText = "";
        this.selectedHtml = "";

        let results;

        try {
            results = await executeScript(tabId, {file: "/scripts/content_get_selection.js", allFrames: true});
        }
        catch (e) {
            console.error(e)
        }

        if (results && results.length)
            for (let selection of results) {
                if (_MANIFEST_V3)
                    selection = selection?.result;

                if (selection) {
                    this.selectedText = selection.text;
                    this.selectedHtml = selection.html;
                    break;
                }
            }
    };

    static async setSelection(tabId, text) {
        await executeScript(tabId, { file: "/scripts/content_set_selection.js" } );
        return browser.tabs.sendMessage(tabId, {type: "replaceSelectedText", text});
    }

    static clearSelection() {
        this.selectedText = "";
        this.selectedHtml = "";
    };

    static getSelectionObject(context) {
        return {text: this.selectedText, html: this.selectedHtml, fake: false};
    }
}