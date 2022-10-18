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

.PHONY: helper-clean
helper-clean:
	cd helper; rm -r -f build
	cd helper; rm -r -f dist
	cd helper; rm -f *.spec

.PHONY: helper-win
helper-win:
	make helper-clean
	cd helper; rm -f *.exe
	cd helper; rm -f *.zip
	echo "DEBUG = False" > ./helper/ishell/server_debug.py
	cd helper; pyinstaller ishell_helper.py
	cd helper; makensis setup.nsi
	echo "DEBUG = True" > ./helper/ishell/server_debug.py
	make helper-clean


.PHONY: helper-cli
helper-cli:
	cd helper; cp -r ./ishell ./cli-installer/ishell_helper/
	echo "DEBUG = False" > ./helper/cli-installer/ishell_helper/ishell/server_debug.py
	cd helper; cp -r ./manifests ./cli-installer/ishell_helper/
	cd helper; cp -r ./ishell_helper.cmd ./cli-installer/ishell_helper/
	cd helper; cp -r ./ishell_helper.sh ./cli-installer/ishell_helper/
	cd helper; rm -r -f ./cli-installer/ishell_helper/manifests/debug_manifest*
	cd helper; cp -r ./setup.py ./cli-installer/ishell_helper/
	cd helper; rm -f ishell-helper.tgz
	cd helper; 7za.exe a -ttar -so -an ./cli-installer/* -xr!__pycache__ | 7za.exe a -si ishell-helper.tgz
	cd helper; rm ./cli-installer/ishell_helper/setup.py
	cd helper; rm -r -f ./cli-installer/ishell_helper/ishell
	cd helper; rm -r -f ./cli-installer/ishell_helper/manifests
	cd helper; rm -r -f ./cli-installer/ishell_helper/ishell_helper.cmd
	cd helper; rm -r -f ./cli-installer/ishell_helper/ishell_helper.sh
