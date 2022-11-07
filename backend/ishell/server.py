import shutil
import tempfile
import traceback
import threading
import socket
import logging
import time
import os

from contextlib import closing
from functools import wraps
from pathlib import Path

import flask
from flask import request, abort, send_file
from werkzeug.serving import make_server

from .server_debug import DEBUG


app = flask.Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

accessLog = logging.getLogger('werkzeug')
accessLog.disabled = True

#app.logger.disabled = not DEBUG

backend_log_file = None

auth_token = None
host = "localhost"
port = None
httpd = None

message_mutex = threading.Lock()


class Httpd(threading.Thread):

    def __init__(self, app, port, daemon):
        threading.Thread.__init__(self, daemon=daemon)
        self.srv = make_server(host, port, app, True)
        self.ctx = app.app_context()
        self.ctx.push()

    def run(self):
        self.srv.serve_forever()

    def shutdown(self):
        self.srv.shutdown()


def start(options):
    global port
    global httpd
    global auth_token
    port = options["port"]
    auth_token = options["auth"]

    try:
        clean_temp_directory()
        enable_logging()
        wait_for_port(port)
    except Exception as e:
        logging.debug(e)

    daemon = not options.get("server", None)
    httpd = Httpd(app, port, daemon)
    httpd.start()

    logging.info("Server initialized.")


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


def enable_logging():
    global backend_log_file

    backend_log_file = os.path.join(get_temp_directory(), "backend.log")
    logging.basicConfig(filename=backend_log_file, encoding="utf-8", level=logging.DEBUG,
                        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")


def get_temp_directory():
    temp_directory_path = os.path.join(tempfile.gettempdir(), f"iShell_{port}")

    if not os.path.exists(temp_directory_path):
        Path(temp_directory_path).mkdir(parents=True, exist_ok=True)

    return temp_directory_path


def clean_temp_directory():
    temp_directory = get_temp_directory()

    if os.path.exists(temp_directory):
        try:
            shutil.rmtree(temp_directory)
        except Exception as e:
            logging.exception(e)


from . import server_scripts
from . import server_user


@app.route("/")
def root():
    return "iShell backend application"

@app.route("/_close_browser", methods=['GET'])
@requires_auth
def close_browser():
    import os
    import psutil
    import win32api
    import win32con
    import win32gui
    import win32process

    pid = os.getpid()
    firefox = psutil.Process(pid).parent().parent()
    firefox_tree = firefox.children(recursive=True)
    firefox_pids = [p.pid for p in firefox_tree]
    firefox_pids.append(firefox.pid)

    def enumHandler(hwnd, lParam):
        [_, pid] = win32process.GetWindowThreadProcessId(hwnd)
        if pid in firefox_pids:
            win32api.SendMessage(hwnd, win32con.WM_CLOSE)

    win32gui.EnumWindows(enumHandler, None)

    return "", 204


@app.route("/exit")
@requires_auth
def exit_app():
    os._exit(0)


@app.route("/backend_log")
def helper_log():
    if app.logger.disabled:
        return "", 404
    else:
        return send_file(backend_log_file, mimetype="text/plain")
