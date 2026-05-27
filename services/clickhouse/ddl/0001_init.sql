-- tradeX — ClickHouse initial DDL
-- Full DDL + materialized views added incrementally as the pipeline emits events.
-- See docs/SOLUTION_ARCHITECTURE.md §13.5 for the analytics data model.

CREATE DATABASE IF NOT EXISTS tradex_analytics;
USE tradex_analytics;

-- signal_events — one row per signal lifecycle event (parsed, queued, executed, skipped)
CREATE TABLE IF NOT EXISTS signal_events
(
    event_id    UUID,
    user_id     UUID,
    channel_id  UUID,
    signal_id   UUID,
    event_type  LowCardinality(String),
    occurred_at DateTime64(3, 'UTC'),
    payload     String CODEC(ZSTD(1))
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(occurred_at)
ORDER BY (user_id, occurred_at, event_id)
TTL occurred_at + INTERVAL 2 YEAR;
