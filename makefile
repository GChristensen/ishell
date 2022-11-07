test:
	cd addon; start web-ext run -p "$(HOME)/../firefox/debug.ishell" --keep-profile-changes

test-nightly:
	cd addon; start web-ext run -p "$(HOME)/../firefox/debug.ishell.nightly" --firefox=nightly --keep-profile-changes

sign:
	make firefox-mv2
	cd addon; web-ext sign -a ../build -i web-ext-artifacts .web-extension-id *.mv2* *.mv3* background_worker.js mv3_scripts.js version.txt `cat $(HOME)/.amo/creds`

.PHONY: build
build:
	cd addon; python ../scripts/mkmanifest.py manifest.json.mv2 manifest.json `cat version.txt` --public
	cd addon; web-ext build -a ../build -i web-ext-artifacts .web-extension-id *.mv2* *.mv3* background_worker.js mv3_scripts.js version.txt
	make firefox-mv2

.PHONY: build-chrome
build-chrome:
	make chrome-mv3
	rm -f build/ishell-chrome-*.zip
	7za a build/ishell-chrome-`cat ./addon/version.txt`.zip ./addon/* -xr!web-ext-artifacts -xr!.web-extension-id -xr!*.mv2* -xr!*.mv3* -xr!version.txt

.PHONY: firefox-mv2
firefox-mv2:
	cd addon; python ../scripts/mkmanifest.py manifest.json.mv2 manifest.json `cat version.txt`

.PHONY: firefox-mv3
firefox-mv3:
	cd addon; python ../scripts/mkmanifest.py manifest.json.mv3 manifest.json `cat version.txt`

.PHONY: chrome-mv3
chrome-mv3:
	cd addon; python ../scripts/mkmanifest.py manifest.json.mv3.chrome manifest.json `cat version.txt`

.PHONY: backend-clean
backend-clean:
	cd backend; rm -r -f build
	cd backend; rm -r -f dist
	cd backend; rm -f *.spec

.PHONY: backend-win
backend-win:
	make backend-clean
	cd backend; rm -f *.exe
	cd backend; rm -f *.zip
	echo "DEBUG = False" > ./backend/ishell/server_debug.py
	cd backend; pyinstaller ishell_backend.py
	cd backend; makensis setup.nsi
	echo "DEBUG = True" > ./backend/ishell/server_debug.py
	make backend-clean


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
