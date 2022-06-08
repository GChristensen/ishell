import json

from . import server, browser

VERSION = "0.1"

def main():
    msg = browser.get_message()

    if msg["type"] == "INITIALIZE":
        server.start(msg)
        browser.send_message(json.dumps({"type": "INITIALIZED", "version": VERSION}))


if __name__ == "__main__":
    main()
