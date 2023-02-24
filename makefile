PYTHON := $(if $(filter $(OS),Windows_NT),python,python3)

test:
	make commands
	cd addon; start web-ext run -p "$(FIREFOX_PROFILES)/debug.ishell" --keep-profile-changes

test-nightly:
	make commands
	cd addon; start web-ext run -p "$(FIREFOX_PROFILES)/debug.ishell.nightly" --firefox=nightly --keep-profile-changes

.PHONY: set-version
set-version:
	echo $(filter-out $@,$(MAKECMDGOALS)) > ./addon/version.txt

.PHONY: get-version
get-version:
	@cat ./addon/version.txt

sign:
	make commands
	make firefox-mv2
	cd addon; web-ext sign -a ../build -i web-ext-artifacts .web-extension-id *.mv2* *.mv3* background_worker.js mv3_scripts.js version.txt `cat $(HOME)/.amo/creds`

.PHONY: build
build:
	make commands
	cd addon; $(PYTHON) ../scripts/mkmanifest.py manifest.json.mv2 manifest.json `cat version.txt` --public
	cd addon; web-ext build -a ../build -i web-ext-artifacts .web-extension-id *.mv2* *.mv3* background_worker.js mv3_scripts.js version.txt
	make firefox-mv2

.PHONY: build-chrome
build-chrome:
	make commands
	make chrome-mv3
	rm -f build/ishell-chrome-*.zip
	7za a build/ishell-chrome-`cat ./addon/version.txt`.zip ./addon/* -xr!web-ext-artifacts -xr!.web-extension-id -xr!*.mv2* -xr!*.mv3* -xr!version.txt

.PHONY: commands
commands:
	$(PYTHON) ./scripts/mkcommands.py commands
	$(PYTHON) ./scripts/mkcommands.py commands-user

.PHONY: firefox-mv2
firefox-mv2:
	cd addon; $(PYTHON) ../scripts/mkmanifest.py manifest.json.mv2 manifest.json `cat version.txt`

.PHONY: firefox-mv3
firefox-mv3:
	cd addon; $(PYTHON) ../scripts/mkmanifest.py manifest.json.mv3 manifest.json `cat version.txt`

.PHONY: chrome-mv3
chrome-mv3:
	cd addon; $(PYTHON) ../scripts/mkmanifest.py manifest.json.mv3.chrome manifest.json `cat version.txt`

.PHONY: backend-cli
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

%:
	@: