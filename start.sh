#!/bin/bash
cd backend
python manage.py migrate
gunicorn project.wsgi --log-file -
