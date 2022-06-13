from .server import app, requires_auth

@app.route("/ping", methods=['GET'])
@requires_auth
def ping():
    return "pong"

