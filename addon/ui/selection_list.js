
export class SelectionList {
    #container;

    constructor(container) {
        this.#container = container;
    }

    advanceSelection(direction) {
        const list = this.#getPreviewList();
        if (!list)
            return;

        let selection = list.element.data("selection") || {index: -1};
        const nextIndex = selection.index + (direction? 1: -1);

        if (this.#isSelectionOverrun(nextIndex, direction, list))
            return;

        let currentItem;
        let nextItem;

        if (this.#isSelectionInRange(selection.index, direction, list))
            currentItem = this.#getPreviewListItem(list, selection.index);

        selection.index = nextIndex;

        if (this.#isSelectionInRange(selection.index, direction, list))
            nextItem = this.#getPreviewListItem(list, selection.index);

        if (currentItem && selection.bgColor)
            currentItem.element.css("background-color", selection.bgColor);

        if (nextItem) {
            selection.bgColor = nextItem.element.css("background-color");
            nextItem.element.css("background-color", "#404040");
            this.#scrollListItemIntoView(nextItem, direction);
        }

        list.element.data("selection", selection);
    }

    getSelectedElement() {
        const list = this.#getPreviewList();
        let selection = list?.element.data("selection");

        if (selection && selection.index < list.length && selection.index >= 0) {
            const selectedItem = this.#getPreviewListItem(list, selection.index);
            const selectedElement = selectedItem.element.attr("accesskey")? selectedItem.element: null;
            return selectedElement || $("[accesskey]", selectedItem.element);
        }
    }

    #isSelectionOverrun(index, direction, list) {
        return direction && index > list.length || !direction && index < -1
    }

    #isSelectionInRange(index, direction, list) {
        return direction && index < list.length || !direction && index >= 0
    }

    #LIST_TYPE_SEARCH = "search";
    #LIST_TYPE_PREVIEW = "preview";
    #LIST_TYPE_GENERIC = "generic";

    #getPreviewList() {
        const searchListDL = $("dl", this.#container);
        const previewListOL = $("ol#preview-list", this.#container);
        const genericList = $(".search-result-list", this.#container);
        let result;

        if (searchListDL.length) {
            const items = $("dt", searchListDL);
            result = {
                element: searchListDL,
                type: this.#LIST_TYPE_SEARCH,
                length:items.length,
                descriptions: $("dd", searchListDL.element),
                items
            }
        }
        else if (previewListOL.length) {
            const items = $("li.preview-list-item", previewListOL);
            result = {
                element: previewListOL,
                type: this.#LIST_TYPE_PREVIEW,
                length: items.length,
                items
            }
        }
        else if (genericList.length) {
            const items = $(".search-result-item", genericList);
            result = {
                element: genericList,
                type: this.#LIST_TYPE_GENERIC,
                length: items.length,
                items
            }
        }

        return result;
    }

    #getPreviewListItem(list, index) {
        if (list.type === this.#LIST_TYPE_SEARCH) {
            return {
                element: list.items.eq(index),
                bottom: list.descriptions.eq(index),
                type: list.type
            }
        }
        else {
            return {
                element: list.items.eq(index),
                bottom: list.items.eq(index),
                type: list.type
            }
        }
    }

    #scrollListItemIntoView(item, direction) {
        if (!item)
            return;

        const scroll = direction? item.bottom[0]: item.element[0];
        const rectElem = scroll.getBoundingClientRect()
        const rectContainer = this.#container.getBoundingClientRect();

        if (rectElem.bottom > rectContainer.bottom)
            scroll.scrollIntoView(false);

        if (rectElem.top < rectContainer.top)
            scroll.scrollIntoView();
    }
}