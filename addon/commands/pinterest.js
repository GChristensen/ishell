import {sleep} from "../utils.js";

export const namespace = new CommandNamespace(CommandNamespace.SYNDICATION, true);

/**
 @label board
 @nountype
 */
export function noun_type_board(text, html, _, selectionIndices) {
    let suggs = [], boards = this._command.deref().boards;

    if (boards) {
        suggs = boards.map(b => cmdAPI.makeSugg(b.name, b.name, b, 1, selectionIndices));
        suggs = cmdAPI.grepSuggs(text, suggs);
    }

    cmdAPI.addSugg(suggs, text, html, null, suggs.length? .001 : 1, selectionIndices);
    return suggs;
}

/**
    To create a pin, fill in the arguments and click on an image in the preview area
    or press the corresponding Ctrl+Alt+&lt;key&gt; combination. A user should be
    logged in to Pinterest to use this command. Execute the command to open the 
    chosen board.

    # Syntax
    **pinterest** [*description*] **to** *board* [**of** *dimension*]

    # Arguments
    - *description* - a comment to the pin being created.
    - *board* - a name of the board to attach the pin to. Created if not exists.
    - *size* - minimal size of the images displayed in the command preview.
      500 pixels is the default.

    # Examples
    **pinterest** **to** *cats* **of** *1000* *Nice kitty*

    @command
    @markdown
    @delay 1000
    @icon /ui/icons/pinterest.png
    @description Pin images to a board on Pinterest.
    @uuid 06364E1A-7A38-4590-86F6-6CA7AECD971F
 */
export class Pinterest {
    #storage;
    #pinterestAPI;
    #boards = [];
    #boardsLoaded;

    constructor(args) {
        noun_type_board._command = new WeakRef(this);
        args[OBJECT] = {nountype: noun_arb_text, label: "description"};
        args[TO]     = {nountype: noun_type_board, label: "board"};
        args[OF]     = {nountype: noun_type_number, label: "size"};
        args[AS]     = {nountype: ["repin"], label: "option"};
    }

    async load(storage) {
        this.#storage = storage;
        this.#boards = storage.boards() || [];
    }

    get pinterestAPI() { // ! Async property.
        return this.#getPinterestAPI();
    }

    async #getPinterestAPI() {
        if (!this.#pinterestAPI)
            this.#pinterestAPI = await new PinterestAPI();
        return this.#pinterestAPI;
    }

    get boards() {
        this.#loadBoards();
        return this.#boards;
    }

    async #loadBoards() {
        if (!this.#boardsLoaded){
            const pinterestAPI = await this.pinterestAPI;
            if (pinterestAPI.isAuthorized) {
                this.#boards = await pinterestAPI.getBoards() || [];
                this.#boards = this.#boards.map(b => ({name: b.name, id: b.id}));
                this.#storage.boards(this.#boards);
                this.#boardsLoaded = true;
            }
        }
    }

    async preview({OBJECT: {text: title}, OF: {text: dimension}, TO}, display, storage) {
        dimension = dimension || 500;
        const extractedImages = await this.#extractImagesFromPage(dimension);

        if (extractedImages?.length) {
            let imageList
            const imageHandler = i => {
                const board = TO?.data || TO?.text;
                const imageURL = extractedImages[i].url;
                if (!this.#isImagePinned(imageList, imageURL)
                        && this.#createPin(board, title, imageURL))
                    this.#setImagePinned(imageList, imageURL);
            };

            const style = `.image-dimensions {
                position: absolute; bottom: 0; right: 0;
                padding: 0 3px 1px 2px; border-top-left-radius: 6px;
                opacity: 0.7; color: #000; background-color: #fff;
                margin-bottom: 4px; 
            }`;

            const imageURLs = extractedImages.map(i => i.url);
            imageList = display.imageList(imageURLs, imageHandler, style);
            this.#displayImageDimensions(imageList, extractedImages);
        }
        else
            display.text(`No images larger than ${dimension}px found.`)
    }

    async #extractImagesFromPage(dimension) {
        const params = {func: extractImagesUserScript, args: [dimension], jQuery: true};
        try {
            const [{result}] = await cmdAPI.executeScript(params);
            return result;
        } catch (e) {
            console.error(e);
        }
    }

    #displayImageDimensions(imageList, extractedImages) {
        $("img", imageList).each(function() {
            const image = extractedImages.find(i => i.url === this.src);
            const title = `${image.width}x${image.height}`;
            $(this).parent().append(`<div class="image-dimensions">${title}</div>`);
        });
    }

    async #createPin(board, description, imageURL) {
        if (!board) {
            cmdAPI.notifyError("No board is selected.");
            return false;
        }

        if (typeof board === "string")
            board = await this.#createBoard(board);

        if (board) {
            const link = cmdAPI.getLocation();
            const pinterestAPI = await this.pinterestAPI;
            const success = await pinterestAPI.checkAuthorization()
                    && await pinterestAPI.createPin(board.id, description, link, imageURL);

            if (success) {
                cmdAPI.notify("Successfully pinned image.");
                return true;
            }
            else
                cmdAPI.notifyError("Error creating pin.");
        }
    }

    async #createBoard(name) {
        const pinterestAPI = await this.pinterestAPI;
        const board = await pinterestAPI.checkAuthorization() && await pinterestAPI.createBoard(name);

        if (board) {
            this.#boards.push(board);
            return board;
        }
        else
            cmdAPI.notifyError("Error creating board.");
    }

    #isImagePinned(imageList, imageURL) {
        const pinnedImages = $(imageList).data().images || [];
        return pinnedImages.some(i => i === imageURL);
    }

    #setImagePinned(imageList, imageURL) {
        imageList = $(imageList);
        const pinnedImages = imageList.data().images || [];
        pinnedImages.push(imageURL);
        imageList.data(pinnedImages);
    }

    async execute(args, storage) {
        const option = args.AS?.text;

        if (option === "repin")
            return this.#repinPinterestURL(args);
        else
            return this.#openPinterestPage(args);
    }

    async #openPinterestPage(args) {
        this.#pinterestAPI = null;
        this.#boardsLoaded = false;

        const pinterestAPI = await this.pinterestAPI;

        if (await pinterestAPI.checkAuthorization()) {
            if (args.TO?.data)
                cmdAPI.addTab(pinterestAPI.getBoardURL(args.TO.data));
            else
                cmdAPI.addTab(pinterestAPI.userProfileURL);
        }
        else
            cmdAPI.addTab(pinterestAPI.PINTEREST_URL);
    }

    async #repinPinterestURL(args) {
        const pinterestAPI = await this.pinterestAPI;
        const link = cmdAPI.getLocation();

        if (pinterestAPI.isPinURL(link)) {
            if (await pinterestAPI.checkAuthorization()) {
                let board = args.TO?.data || args.TO?.text;

                if (typeof board === "string")
                    board = await this.#createBoard(board);

                if (board) {
                    const success = await pinterestAPI.createRepin(board.id, args.OBJECT.text, link);

                    if (success)
                        cmdAPI.notify("Successfully repinned image.");
                    else
                        cmdAPI.notifyError("Error creating pin.");
                }
                else
                    cmdAPI.notifyError("No board is selected.");
            }
        }
        else
            cmdAPI.notifyError("It seems that this page is not a pin.");
    }
}

function extractImagesUserScript(dimension) {
    dimension = parseInt(dimension);

    let images = $("img").filter(function () {
        return this.naturalWidth >= dimension || this.naturalHeight >= dimension;
    });

    const bySizeDesc = (a, b) => Math.max(b.naturalWidth, b.naturalHeight)
                               - Math.max(a.naturalWidth, a.naturalHeight)

    images = images.toArray().sort(bySizeDesc);

    return images.map(i => ({url: i.src, width: i.naturalWidth, height: i.naturalHeight}));
}


export class PinterestAPI {
    PINTEREST_URL = "https://www.pinterest.com";

    #userName;

    constructor() {
        return this.authorize().then(() => this);
    }

    async authorize() {
        const json = await this.#fetchPinterestJSON("/resource/UserSettingsResource/get/");
        const userDetails = this.#handleResponse(json);
        if (userDetails)
            this.#userName = userDetails.username;
    }

    async checkAuthorization() {
        if (!this.isAuthorized) {
            await this.authorize();
            if (!this.isAuthorized) {
                cmdAPI.notifyError("The user is not logged in to Pinterest.")
                throw new Error("Pinterest is unauthorized");
            }
        }
        return this.isAuthorized;
    }

    get isAuthorized() {
        return !!this.#userName;
    }

    isPinterestURL(url) {
        return url.startsWith(this.PINTEREST_URL);
    }

    isPinURL(url) {
        return url.startsWith(`${this.PINTEREST_URL}/pin/`);
    }

    get userProfileURL() {
        if (this.#userName)
            return `${this.PINTEREST_URL}/${this.#userName}`;
    }

    getBoardURL(board) {
        const boardURL = board.name.replace(/ /g, "-").toLowerCase();
        return this.userProfileURL + `/${boardURL}`
    }

    async #fetchPinterestJSON(url, params, method) {
        url = `${this.PINTEREST_URL}${url}`;

        const init = {method: method || "get"};

        if (params) {
            params = new URLSearchParams(params).toString();

            if (init.method === "get")
                url = `${url}?${params}`;
            else
                init.body = params;
        }

        if (method === "post")
            init.headers = {
                "X-CSRFToken": await this.#getCSRFToken(url),
                "Content-Type": "application/x-www-form-urlencoded"
            };

        let json;
        try {
            const response = await fetch(url, init);

            if (response.redirected)
                this.PINTEREST_URL = new URL(response.url).origin;

            json = response.json();
        } catch (e) {
            console.error(e);
        }

        return json;
    }

    async #getCSRFToken(url) {
        const csrfTokenCookie = await browser.cookies.get({
            url: url,
            name: "csrftoken"
        });
        return csrfTokenCookie.value;
    }

    async #postPinterestJSON(url, params) {
        return this.#fetchPinterestJSON(url, params, "post")
    }

    #printError(error) {
        if (error) {
            const status = error.http_status;
            const message = error.message + " " + (error.message_detail || "");
            console.error(`Pinterest API error: HTTP status ${status}, (${message})`);
        }
        else
            console.error(`Pinterest API error: unknown`);
    }

    #handleResponse(json) {
        const success = json?.resource_response?.status === "success";

        if (success)
            return json.resource_response.data;
        else
            this.#printError(json?.resource_response?.error);
    }

    async #getBoardsPage(bookmark) {
        const pinterestOptions = {
            "options": {
                "username": this.#userName,
                "page_size": 100,
                "privacy_filter": "all",
                "field_set_key": "detailed",
                "group_by":"mix_public_private",
                "no_fetch_context_on_resource": false
            },
            "context": {}
        };

        if (bookmark)
            pinterestOptions.options.bookmarks = [bookmark];

        const params = {data: JSON.stringify(pinterestOptions)};
        const json = await this.#fetchPinterestJSON("/resource/BoardsResource/get/", params);

        if (json?.resource_response?.status === "success")
            return [json.resource_response.data, json.resource_response.bookmark];
        else {
            this.#printError(json?.resource_response?.error);
            return [null, null];
        }
    }

    async getBoards() {
        let boards = [], page, bookmark;

        do {
            [page, bookmark] = await this.#getBoardsPage(bookmark);
            if (page?.length)
                boards = [...boards, ...page];
        } while (bookmark);

        if (boards.length)
            return boards;
    }

    async createBoard(name) {
        const pinterestOptions = {
            "options": {
                "name": name,
                "description": "",
                "privacy": "public",
                "no_fetch_context_on_resource": false
            },
            "context": {}
        };

        const params = {
            source_url: `/${this.#userName}/`,
            data: JSON.stringify(pinterestOptions)
        };

        const json = await this.#postPinterestJSON("/resource/BoardResource/create/", params);
        await sleep(200);

        return this.#handleResponse(json);
    }

    async createPin(boardId, description, link, imageURL) {
        const pinterestOptions = {
            "options": {
                "board_id": boardId,
                "field_set_key": "create_success",
                "skip_pin_create_log": true,
                "description": description,
                "link": link,
                "title": "",
                "image_url": imageURL,
                "method": "scraped",
                "scrape_metric": {"source": "www_url_scrape"},
                "user_mention_tags": [],
                "no_fetch_context_on_resource": false
            },
            "context":{}
        };

        const params = {
            source_url: "/pin-builder/",
            data: JSON.stringify(pinterestOptions)
        };

        const json = await this.#postPinterestJSON("/resource/PinResource/create/", params);
        return !!this.#handleResponse(json);
    }

    async createRepin(boardId, description, link) {
        link = link.replace(/\/$/, "");
        const pinID = link.split("/").at(-1);

        const pinterestOptions = {
            "options": {
                "description": description,
                "pin_id": pinID,
                "title": "",
                "board_id": boardId,
                "no_fetch_context_on_resource": false
            }, "context": {}
        };

        const params = {
            source_url: `/pin/${pinID}/`,
            data: JSON.stringify(pinterestOptions)
        };

        const json = await this.#postPinterestJSON("/resource/RepinResource/create/", params);
        return !!this.#handleResponse(json);
    }
}
