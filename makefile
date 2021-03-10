test:
	start web-ext run -p "$(HOME)/../firefox/debug.ishell" --keep-profile-changes

sign:
	web-ext sign -i _layouts media makefile web-ext-artifacts .web-extension-id *.md *.iml *.yml updates.json `cat $(HOME)/.amo/creds`

build:
	web-ext build -i _layouts media makefile web-ext-artifacts .web-extension-id *.md *.iml *.yml updates.json
