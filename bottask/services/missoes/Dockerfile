FROM python:3.12-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
COPY src ./src
RUN useradd --create-home app && mkdir -p /data && chown app /data
USER app
EXPOSE 3001
HEALTHCHECK --interval=15s --timeout=5s --retries=3 CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:3001/health', timeout=3)" || exit 1
CMD ["python", "-m", "src.server"]
