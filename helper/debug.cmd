@echo off
set PYTHONPATH=%~dp0
set PATH=D:\software\dev\python;%PATH%
python -u -c "import ishell.helper; ishell.helper.main()"
