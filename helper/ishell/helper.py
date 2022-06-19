import sys
import json

from . import server, browser

VERSION = "0.1"


def main():
    if len(sys.argv) > 1 and sys.argv[1].startswith("--server"):
        start_server()
    else:
        init_helper()


def start_server():
    port = sys.argv[1].split(":")
    params = dict(port=port[1], auth="default")
    server.start(params)


def init_helper():
    msg = browser.get_message()

    if msg["type"] == "INITIALIZE":
        server.start(msg)
        browser.send_message(json.dumps({"type": "INITIALIZED", "version": VERSION}))


if __name__ == "__main__":
    main()