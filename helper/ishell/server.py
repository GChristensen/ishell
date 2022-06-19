import traceback
import threading
import socket
import logging
import time
import os

from contextlib import closing
from functools import wraps

import flask
from flask import request, abort
from werkzeug.serving import make_server

# !!!!!!vvvv
DEBUG = True

app = flask.Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
log = logging.getLogger('werkzeug')
log.disabled = True
app.logger.disabled = not DEBUG

###
LOG_FILE = '../.local/helper.log'
if DEBUG:
    logging.basicConfig(filename=LOG_FILE, encoding='utf-8', level=logging.DEBUG)
###

auth_token = None
host = "localhost"
httpd = None

message_mutex = threading.Lock()


class Httpd(threading.Thread):

    def __init__(self, app, port):
        threading.Thread.__init__(self)
        self.srv = make_server(host, port, app, True)
        self.ctx = app.app_context()
        self.ctx.push()

    def run(self):
        self.srv.serve_forever()

    def shutdown(self):
        self.srv.shutdown()


def start(options):
    global httpd
    global auth_token
    port = options["port"]
    auth_token = options["auth"]

    try:
        wait_for_port(port)
    except Exception as e:
        logging.debug(e)

    httpd = Httpd(app, port)
    #httpd.setDaemon(True)
    httpd.start()


def stop():
    global httpd
    httpd.shutdown()


def port_available(port):
    with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
        sock.settimeout(0.1)
        result = sock.connect_ex(("127.0.0.1", port))
        if result == 0:
            return False
        else:
            return True

        
def wait_for_port(port): 
    ctr = 50
    
    while ctr > 0 and not port_available(port):
        ctr -= 1
        time.sleep(0.1)
        

def requires_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not request.authorization or request.authorization["password"] != auth_token:
            return abort(401)
        return f(*args, **kwargs)
    return decorated


###
#if DEBUG:
if True:
    @app.errorhandler(500)
    def handle_500(e=None):
        return traceback.format_exc(), 500
###


@app.after_request
def add_header(r):
    r.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    r.headers["Pragma"] = "no-cache"
    r.headers["Expires"] = "0"
    r.headers['Cache-Control'] = 'public, max-age=0'
    return r


from . import server_scripts
from . import server_user


@app.route("/")
def root():
    return "iShell helper application"


@app.route("/exit")
@requires_auth
def exit_app():
    os._exit(0)

