#!/bin/sh
export PYTHONPATH=$(dirname "$0")
python3 -u -c "import ishell.helper; ishell.helper.main()"