@echo off
set PYTHONPATH=%~dp0
python -u -c "import ishell.helper; ishell.helper.main()"
