import sys
import json

from . import server, browser

VERSION = "0.1"


def main():
    if len(sys.argv) > 1 and sys.argv[1].startswith("--server"):
        run_as_server()
    else:
        run_as_cli()


def run_as_server():
    port = sys.argv[1].split(":")
    params = dict(port=int(port[1]), auth="default", server=True)
    server.start(params)


def run_as_cli():
    while True:
        msg = browser.get_message()
        process_message(msg)


def process_message(msg):
    if msg["type"] == "INITIALIZE":
        server.start(msg)
        browser.send_message(json.dumps({"type": "INITIALIZED", "version": VERSION}))


if __name__ == "__main__":
    main()
