@echo off
set PYTHONPATH=%~dp0
python -u -c "import ishell.backend; ishell.backend.main()"