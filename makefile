test:
	cd addon; start web-ext run -p "$(HOME)/../firefox/debug.ishell" --keep-profile-changes

test-nightly:
	cd addon; start web-ext run -p "$(HOME)/../firefox/debug.ishell.nightly" --firefox=nightly --keep-profile-changes

sign:
	make firefox-mv2
	cd addon; web-ext sign -i web-ext-artifacts .web-extension-id *.mv2* *.mv3* background_worker.js mv3_scripts.js version.txt `cat $(HOME)/.amo/creds`

build:
	cd addon; python ../scripts/mkmanifest.py manifest.json.mv2 manifest.json `cat version.txt` --public
	cd addon; web-ext build -i web-ext-artifacts .web-extension-id *.mv2* *.mv3* background_worker.js mv3_scripts.js version.txt
	make firefox-mv2

build-chrome:
	make chrome-mv3
	rm -f iShell.zip
	7za a iShell.zip ./addon/* -xr!web-ext-artifacts -xr!*.mv2* -xr!*.mv3* -xr!version.txt

.PHONY: firefox-mv2
firefox-mv2:
	cd addon; python ../scripts/mkmanifest.py manifest.json.mv2 manifest.json `cat version.txt`

.PHONY: firefox-mv3
firefox-mv3:
	cd addon; python ../scripts/mkmanifest.py manifest.json.mv3 manifest.json `cat version.txt`

.PHONY: chrome-mv3
chrome-mv3:
	cd addon; python ../scripts/mkmanifest.py manifest.json.mv3.chrome manifest.json `cat version.txt`

.PHONY: helper
helper:
	cd helper; rm -r -f build
	cd helper; rm -r -f dist
	cd helper; rm -f *.exe
	cd helper; rm -f *.zip
	cd helper; rm -f *.spec
	cd helper; pyinstaller ishell_helper.py
	cd helper; makensis setup.nsi
