Unicode True

!define APPNAME "iShell Helper"
!define VERSION "0.1"

!define APPNAMEANDVERSION "${APPNAME} ${VERSION}"

; Main Install settings
Name "${APPNAMEANDVERSION}"
InstallDir "$PROGRAMFILES\${APPNAME}"
InstallDirRegKey HKLM "Software\${APPNAME}" ""
OutFile "ishell-helper-${VERSION}_x86_64.exe"

; Use compression
SetCompressor LZMA

; Modern interface settings
!include "MUI.nsh"

!define MUI_ICON ".\assets\ishell.ico"
!define MUI_UNICON ".\assets\ishell.ico"

!define MUI_HEADERIMAGE

!define MUI_HEADERIMAGE_BITMAP "${NSISDIR}\Contrib\Graphics\Header\win.bmp"
!define MUI_HEADERIMAGE_UNBITMAP "${NSISDIR}\Contrib\Graphics\Header\win.bmp"

!define MUI_WELCOMEFINISHPAGE_BITMAP ".\assets\ishell.bmp"
!define MUI_UNWELCOMEFINISHPAGE_BITMAP ".\assets\ishell.bmp"

!define MUI_ABORTWARNING

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; Set languages (first is default language)
!insertmacro MUI_LANGUAGE "English"

function StrReplace
  Exch $0 ;this will replace wrong characters
  Exch
  Exch $1 ;needs to be replaced
  Exch
  Exch 2
  Exch $2 ;the original string
  Push $3 ;counter
  Push $4 ;temp character
  Push $5 ;temp string
  Push $6 ;length of string that need to be replaced
  Push $7 ;length of string that will replace
  Push $R0 ;tempstring
  Push $R1 ;tempstring
  Push $R2 ;tempstring
  StrCpy $3 "-1"
  StrCpy $5 ""
  StrLen $6 $1
  StrLen $7 $0
  Loop:
  IntOp $3 $3 + 1
  Loop_noinc:
  StrCpy $4 $2 $6 $3
  StrCmp $4 "" ExitLoop
  StrCmp $4 $1 Replace
  Goto Loop
  Replace:
  StrCpy $R0 $2 $3
  IntOp $R2 $3 + $6
  StrCpy $R1 $2 "" $R2
  StrCpy $2 $R0$0$R1
  IntOp $3 $3 + $7
  Goto Loop_noinc
  ExitLoop:
  StrCpy $0 $2
  Pop $R2
  Pop $R1
  Pop $R0
  Pop $7
  Pop $6
  Pop $5
  Pop $4
  Pop $3
  Pop $2
  Pop $1
  Exch $0
FunctionEnd

!include LogicLib.nsh

!macro UninstallExisting exitcode uninstcommand
    Push `${uninstcommand}`
    Call UninstallExisting
    Pop ${exitcode}
!macroend
Function UninstallExisting
    Exch $1 ; uninstcommand
    Push $2 ; Uninstaller
    Push $3 ; Len
    StrCpy $3 ""
    StrCpy $2 $1 1
    StrCmp $2 '"' qloop sloop
    sloop:
        StrCpy $2 $1 1 $3
        IntOp $3 $3 + 1
        StrCmp $2 "" +2
        StrCmp $2 ' ' 0 sloop
        IntOp $3 $3 - 1
        Goto run
    qloop:
        StrCmp $3 "" 0 +2
        StrCpy $1 $1 "" 1 ; Remove initial quote
        IntOp $3 $3 + 1
        StrCpy $2 $1 1 $3
        StrCmp $2 "" +2
        StrCmp $2 '"' 0 qloop
    run:
        StrCpy $2 $1 $3 ; Path to uninstaller
        StrCpy $1 161 ; ERROR_BAD_PATHNAME
        GetFullPathName $3 "$2\.." ; $InstDir
        #IfFileExists "$2" 0 +4
        #ExecWait '"$2" /S _?=$3' $1 ; This assumes the existing uninstaller is a NSIS uninstaller, other uninstallers don't support /S nor _?=
        RMDir /r "$3"
        #IntCmp $1 0 "" +2 +2 ; Don't delete the installer if it was aborted
        #Delete "$2" ; Delete the uninstaller
        #RMDir "$3" ; Try to delete $InstDir
        #RMDir "$3\.." ; (Optional) Try to delete the parent of $InstDir
    #Pop $3
    #Pop $2
    #Exch $1 ; exitcode
    StrCpy $1 0
    Exch $1
FunctionEnd

Section "iShell Helper" Section1

    ReadRegStr $0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "UninstallString"
    ${If} $0 != ""
    ${AndIf} ${Cmd} `MessageBox MB_YESNO|MB_ICONQUESTION "Uninstall previous version?" /SD IDYES IDYES`
        !insertmacro UninstallExisting $0 '"$0"'
        ${If} $1 <> 0
            MessageBox MB_YESNO|MB_ICONSTOP "Failed to uninstall, continue anyway?" /SD IDYES IDYES +2
                Abort
        ${EndIf}
    ${EndIf}

	; Set Section properties
	SetOverwrite on

	; Set Section Files and Shortcuts
	SetOutPath "$INSTDIR\"
	File "assets\ishell.ico"
	File /r "dist/ishell_helper\"

	Push '$INSTDIR\ishell_helper.exe'
    Push "\"
    Push "/"
    Call StrReplace
    Pop $1

	FileOpen $0 manifest.json w
	FileWrite $0 '{$\n'
    FileWrite $0 '"name": "ishell_helper",$\n'
    FileWrite $0 '"description": "iShell helper application",$\n'
    FileWrite $0 '"path": "$1",$\n'
    FileWrite $0 '"type": "stdio",$\n'
    FileWrite $0 '"allowed_extensions": [ "ishell@gchristensen.github.io", "ishell-we@gchristensen.github.io" ]$\n'
    FileWrite $0 '}$\n'
    FileClose $0

SectionEnd

Section -FinishSection

    WriteRegStr HKCU "Software\Mozilla\NativeMessagingHosts\ishell_helper" "" "$INSTDIR\manifest.json"

	WriteRegStr HKLM "Software\${APPNAME}" "" "$INSTDIR"
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "DisplayName" "${APPNAME}"
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "UninstallString" "$INSTDIR\uninstall.exe"
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "DisplayIcon" "$INSTDIR\ishell.ico"
	WriteUninstaller "$INSTDIR\uninstall.exe"

    CreateDirectory "$SMPROGRAMS\${APPNAME}"
	CreateShortCut "$SMPROGRAMS\${APPNAME}\Uninstall.lnk" "$INSTDIR\uninstall.exe"
SectionEnd

; Modern install component descriptions
#!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
#	!insertmacro MUI_DESCRIPTION_TEXT ${Section1} ""
#!insertmacro MUI_FUNCTION_DESCRIPTION_END

;Uninstall section
Section Uninstall

	;Remove from registry...
	DeleteRegKey HKCU "Software\Mozilla\NativeMessagingHosts\ishell_helper"
	DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}"
	DeleteRegKey HKLM "SOFTWARE\${APPNAME}"

	; Delete self
	Delete "$INSTDIR\uninstall.exe"

	; Delete Shortcuts
	Delete "$SMPROGRAMS\${APPNAME}\Uninstall.lnk"

	; Remove remaining directories
	RMDir /r "$SMPROGRAMS\${APPNAME}"
	RMDir /r "$INSTDIR\"

SectionEnd

; On initialization
Function .onInit

	#!insertmacro MUI_LANGDLL_DISPLAY

FunctionEnd

BrandingText "iShell Helper"

; eof
