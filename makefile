test:
	cd addon; start web-ext run -p "$(HOME)/../firefox/debug.ishell" --keep-profile-changes

test-nightly:
	cd addon; start web-ext run -p "$(HOME)/../firefox/debug.ishell.nightly" --firefox=nightly --keep-profile-changes

ign:
	cd addon; web-ext sign -i _layouts media makefile web-ext-artifacts .web-extension-id *.md *.iml *.yml updates.json `cat $(HOME)/.amo/creds`

build:
	cd addon; web-ext build -i _layouts media makefile web-ext-artifacts .web-extension-id *.md *.iml *.yml updates.json

.PHONY: helper
helper:
	cd helper; rm -r -f build
	cd helper; rm -r -f dist
	cd helper; rm -f *.exe
	cd helper; rm -f *.zip
	cd helper; rm -f *.spec
	cd helper; pyinstaller ishell_helper.py
	cd helper; makensis setup.nsi
