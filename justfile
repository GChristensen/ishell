set windows-shell := ["sh", "-cu"]

python := if os_family() == "windows" { "python" } else { "python3" }

test: commands
    cd addon; cmd //c start web-ext run -p "$FIREFOX_PROFILES/debug.ishell" --keep-profile-changes

test-nightly: commands
    cd addon; cmd //c start web-ext run -p "$FIREFOX_PROFILES/debug.ishell.nightly" --firefox=nightly --keep-profile-changes

test-parser:
    node ./scripts/test_parser.mjs

set-version version:
    echo {{version}} > ./addon/version.txt

get-version:
    @cat ./addon/version.txt

sign: commands firefox-mv2
    cd addon; web-ext sign --channel unlisted -a ../build -i web-ext-artifacts .web-extension-id *.mv2* *.mv3* background_worker.js mv3_scripts.js version.txt `cat $HOME/.amo/creds`

build: commands && firefox-mv2
    cd addon; {{python}} ../scripts/mkmanifest.py manifest.json.mv2 manifest.json `cat version.txt` --public
    cd addon; web-ext build -a ../build -i web-ext-artifacts .web-extension-id *.mv2* *.mv3* background_worker.js mv3_scripts.js version.txt

build-chrome: commands chrome-mv3
    rm -f build/ishell-chrome-*.zip
    7za a build/ishell-chrome-`cat ./addon/version.txt`.zip ./addon/* -xr!web-ext-artifacts -xr!.web-extension-id -xr!*.mv2* -xr!*.mv3* -xr!version.txt

commands:
    {{python}} ./scripts/mkcommands.py commands
    {{python}} ./scripts/mkcommands.py commands-user

firefox-mv2:
    cd addon; {{python}} ../scripts/mkmanifest.py manifest.json.mv2 manifest.json `cat version.txt`

firefox-mv3:
    cd addon; {{python}} ../scripts/mkmanifest.py manifest.json.mv3 manifest.json `cat version.txt`

chrome-mv3:
    cd addon; {{python}} ../scripts/mkmanifest.py manifest.json.mv3.chrome manifest.json `cat version.txt`

backend-cli:
    cd backend; cp -r ./ishell ./cli-installer/ishell_backend/
    echo "DEBUG = False" > ./backend/cli-installer/ishell_backend/ishell/server_debug.py
    cd backend; cp -r ./manifests ./cli-installer/ishell_backend/
    cd backend; cp -r ./ishell_backend.cmd ./cli-installer/ishell_backend/
    cd backend; cp -r ./ishell_backend.sh ./cli-installer/ishell_backend/
    cd backend; rm -r -f ./cli-installer/ishell_backend/manifests/debug_manifest*
    cd backend; cp -r ./setup.py ./cli-installer/ishell_backend/
    cd backend; rm -f ishell-backend.tgz
    cd backend; 7za.exe a -ttar -so -an ./cli-installer/* -xr!__pycache__ | 7za.exe a -si ishell-backend.tgz
    cd backend; rm ./cli-installer/ishell_backend/setup.py
    cd backend; rm -r -f ./cli-installer/ishell_backend/ishell
    cd backend; rm -r -f ./cli-installer/ishell_backend/manifests
    cd backend; rm -r -f ./cli-installer/ishell_backend/ishell_backend.cmd
    cd backend; rm -r -f ./cli-installer/ishell_backend/ishell_backend.sh

landing:
    cd landing; npm run build