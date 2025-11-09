#!/bin/bash

set -e

python manage.py migrate --noinput

PORT=${PORT:-8080}
echo "[start.sh] Starting Gunicorn on port $PORT"
exec gunicorn project.wsgi --bind 0.0.0.0:$PORT --timeout 120 --log-file -
