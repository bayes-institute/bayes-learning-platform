FROM python:3.12-slim AS runtime
WORKDIR /application

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

RUN addgroup --system platform && adduser --system --ingroup platform platform
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app

USER platform
EXPOSE 8080
CMD ["sh", "-c", "exec uvicorn app.main:application --host 0.0.0.0 --port ${PORT:-8080}"]
