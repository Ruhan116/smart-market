#!/bin/bash
python manage.py migrate
gunicorn project.wsgi --log-file -
