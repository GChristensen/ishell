import threading
from flask import request, Response, abort

from . import browser
from .server import app, requires_auth, message_mutex

payload_mutex = threading.Lock()
payloads = dict()


@app.route("/push_script", methods=['POST'])
@requires_auth
def echo_push():
    payload_mutex.acquire()
    payloads[request.form["key"]] = request.form["text"]
    payload_mutex.release()
    return "", 204


@app.route("/pull_script/<key>", methods=['GET'])
def echo_pull(key):
    payload = payloads[key]

    payload_mutex.acquire()
    del payloads[key]
    payload_mutex.release()

    return Response(payload, mimetype='text/javascript')
