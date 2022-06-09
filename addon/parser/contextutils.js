// Stub for ContextUtils

export class ContextUtils {
    static getSelectionObject(context) {
        return {text: CmdUtils.selectedText, html: CmdUtils.selectedHtml, fake: false};
    }
}