# Ensure this is built from the project root directory!
# Example: docker build -f backend/Dockerfile .

FROM python:3.11-slim

# Allow statements and log messages to immediately appear in the Knative logs
ENV PYTHONUNBUFFERED True

WORKDIR /app

# Copy the requirements file and install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire backend and frontend directories 
# (Necessary since we are serving frontend files from the backend app.py)
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Switch working directory to run the app
WORKDIR /app/backend

# Expose the default Cloud Run port
EXPOSE 8080

# Run the web service on container startup using gunicorn
# 1 worker and 8 threads is ideal for Cloud Run free tier (which allocates default CPUs)
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "1", "--threads", "8", "--timeout", "0", "app:app"]
