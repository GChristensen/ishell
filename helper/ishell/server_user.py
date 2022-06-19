from .server import app, requires_auth

# a sample custom Flask handler
# @requires_auth annotation means that only iShell will be able to call it
@app.route("/ping", methods=['GET'])
@requires_auth
def ping():
    return "pong"

