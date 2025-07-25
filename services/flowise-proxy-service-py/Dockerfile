# Use official Python slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /project_root

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    libmagic1 \
    libmagic-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /project_root
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run Uvicorn with optimal configuration
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
