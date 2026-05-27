# tradeX — Python worker Dockerfile (templated per worker)
# Build arg WORKER_NAME selects which worker in apps/workers/ to build.

FROM python:3.12-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --upgrade pip uv

WORKDIR /app

ARG WORKER_NAME
ENV WORKER_NAME=${WORKER_NAME}

COPY apps/workers/${WORKER_NAME}/pyproject.toml apps/workers/${WORKER_NAME}/
RUN cd apps/workers/${WORKER_NAME} && uv pip install --system -e .

COPY apps/workers/${WORKER_NAME}/ apps/workers/${WORKER_NAME}/

RUN addgroup --system --gid 1001 python && adduser --system --uid 1001 --ingroup python worker
USER worker

WORKDIR /app/apps/workers/${WORKER_NAME}
CMD ["python", "-m", "src.main"]
