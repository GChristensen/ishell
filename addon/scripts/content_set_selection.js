// https://stackoverflow.com/questions/667951/how-to-get-nodes-lying-inside-a-range-with-javascript/7931003#7931003
// http://jsfiddle.net/b3Fk5/2/

function replaceSelectedText(replacementText) {
    var sel, range;
    sel = window.getSelection();
    var activeElement = document.activeElement;
    if (activeElement.nodeName == "TEXTAREA" ||
        (activeElement.nodeName == "INPUT" && (activeElement.type.toLowerCase() == "text"
            || activeElement.type.toLowerCase() == "search"))) {
        var val = activeElement.value, start = activeElement.selectionStart, end = activeElement.selectionEnd;
        activeElement.value = val.slice(0, start) + replacementText + val.slice(end);
    } else {
        if (sel.rangeCount) {
            range = sel.getRangeAt(0);

            for (let i = 0; i < sel.rangeCount; ++i)
                sel.getRangeAt(i).deleteContents();

            var el = document.createElement("div");
            el.innerHTML = replacementText;
            var frag = document.createDocumentFragment(), node, lastNode;
            while ( (node = el.firstChild) ) {
                lastNode = frag.appendChild(node);
            }
            range.insertNode(frag);
        } else {
            sel.deleteFromDocument();
        }
    }
}

function messageListener(message) {
    switch (message.type) {
        case "replaceSelectedText":
            replaceSelectedText(message.text);
            chrome.runtime.onMessage.removeListener(messageListener);
            break;
    }
}

chrome.runtime.onMessage.addListener(messageListener);
