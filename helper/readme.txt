Installation for Custom Flask Handler Development (any manifest)

1. Make sure that Python 3.7+ is your default Python implementation.
2. Place the contents of the archive anywhere it feels convenient.
3. Register helper.cmd or a similar script for your shell as a Firefox
   native messaging host. See Mozilla documentation:
   https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_manifests
4. See ishell/server_user.py for more details.


Installation on Linux for User Commands Support (MV3)

MV3 version of the add-on supports user-provided commands only
with the helper application installed.

1. Make sure that Python 3.7+ is your default Python implementation.
2. In su shell use "pip install ." command from this directory
   (without quotes) to install the ishell_helper script.
3. Copy ".mozilla" folder to your home directory, change the "path"
   property in the JSON manifest if necessary. The exact location of the
   script may be revealed by the "pip uninstall ishell_helper" command.
   A full absolute path is required.
