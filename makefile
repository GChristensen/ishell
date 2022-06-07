test:
	cd addon; start web-ext run -p "$(HOME)/../firefox/debug.ishell" --keep-profile-changes

test-nightly:
	cd addon; start web-ext run -p "$(HOME)/../firefox/debug.ishell.nightly" --firefox=nightly --keep-profile-changes

ign:
	cd addon; web-ext sign -i _layouts media makefile web-ext-artifacts .web-extension-id *.md *.iml *.yml updates.json `cat $(HOME)/.amo/creds`

build:
	cd addon; web-ext build -i _layouts media makefile web-ext-artifacts .web-extension-id *.md *.iml *.yml updates.json
