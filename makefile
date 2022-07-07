test:
	cd addon; start web-ext run -p "$(HOME)/../firefox/debug.ishell" --keep-profile-changes

test-nightly:
	cd addon; start web-ext run -p "$(HOME)/../firefox/debug.ishell.nightly" --firefox=nightly --keep-profile-changes

sign:
	cd addon; web-ext sign -i web-ext-artifacts .web-extension-id *.mv2* *.mv3* background_worker.js mv3_scripts.js `cat $(HOME)/.amo/creds`

build:
	cd addon; web-ext build -i web-ext-artifacts .web-extension-id *.mv2* *.mv3* background_worker.js mv3_scripts.js

.PHONY: helper
helper:
	cd helper; rm -r -f build
	cd helper; rm -r -f dist
	cd helper; rm -f *.exe
	cd helper; rm -f *.zip
	cd helper; rm -f *.spec
	cd helper; pyinstaller ishell_helper.py
	cd helper; makensis setup.nsi
