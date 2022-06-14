import {executeScript} from "../../utils_browser.js";

export class ContextUtils {
    static activeTab;
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
                if (selection) {
                    this.selectedText = selection.result?.text;
                    this.selectedHtml = selection.result?.html;
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

    static async updateActiveTab() {
        this.activeTab = null;
        this.clearSelection();

        try {
            let tabs = await browser.tabs.query({active: true, currentWindow: true})
            if (tabs.length) {
                let tab = tabs[0];
                if (tab.url.match('^blob://') || tab.url.match('^https?://') || tab.url.match('^file://')) {
                    this.activeTab = tab;
                    await this.getSelection(tab.id);
                }
            }
        }
        catch (e) {
            console.error(e);
        }
    };
}