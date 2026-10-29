FROM golang:1.24-bookworm AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o app .

FROM python:3.12-slim-bookworm
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY --from=builder /app/app ./app
COPY internal/ ./internal/
ENV TEXT_ANALYSIS_PYTHON=python3
ENV PYTHONUNBUFFERED=1
CMD ["./app"]

