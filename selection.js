function __shell_get_sel() {
    let sel = window.getSelection();

    if (sel && !sel.isCollapsed) {
        let div = document.createElement('div');

        try {
            for (let i = 0; i < sel.rangeCount; ++i) {
                let range = sel.getRangeAt(i);

                if (range.isCollapsed)
                    continue;

                let parent = range.commonAncestorContainer.nodeType === 3
                    ? range.commonAncestorContainer.parentNode
                    : range.commonAncestorContainer;

                parent = parent.cloneNode(false);

                div.appendChild(parent);
                div.appendChild(range.cloneContents());
            }
        }
        catch (e) {
            console.log(e);
        }

        return {text: sel.toString(), html: div.innerHTML};
    }
}

__shell_get_sel();
