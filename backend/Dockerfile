FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Copy requirements from build context root (the compose build sets context to ./backend)
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy the entire build context into the image
COPY . /app

CMD ["bash", "-lc", "python manage.py runserver 0.0.0.0:8000"]
