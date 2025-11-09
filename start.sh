#!/bin/bash

set -e

python manage.py migrate

PORT=${PORT:-8000}
gunicorn project.wsgi --bind 0.0.0.0:$PORT --timeout 120 --log-file -
