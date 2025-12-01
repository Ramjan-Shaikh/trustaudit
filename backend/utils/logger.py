# backend/utils/logger.py
"""
Simple logger utility used by agents.
Provides `log_action(kind, payload)` to append structured logs to a file
and print a short message to stdout. This is intentionally small and
safe (no external deps).
"""

import json
import os
from datetime import datetime
from typing import Any

LOG_PATH = os.getenv("TRUSTAUDIT_LOG", os.path.join(os.path.dirname(__file__), "..", "logs", "trustaudit.log"))
# Ensure logs directory exists
os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)


def _safe_serialize(obj: Any) -> Any:
    """Attempt to make objects JSON serializable in a best-effort way."""
    try:
        json.dumps(obj)
        return obj
    except Exception:
        # fallbacks for common non-serializables
        try:
            return str(obj)
        except Exception:
            return "<unserializable>"


def log_action(kind: str, payload: Any, level: str = "INFO"):
    """
    Append a structured log line to LOG_PATH (JSONL) and print a short message.
    - kind: short type e.g. "EXECUTOR", "AUDIT", "MEMORY"
    - payload: dict-like payload (will be JSON-serialized)
    - level: log level string
    """
    timestamp = datetime.utcnow().isoformat() + "Z"
    safe_payload = _safe_serialize(payload)

    entry = {
        "ts": timestamp,
        "level": level,
        "kind": kind,
        "payload": safe_payload,
    }

    # Print compact message for dev console
    try:
        print(f"[{timestamp}] {level} {kind}: {getattr(payload, 'get', lambda k, d=None: None)('verdict', payload if isinstance(payload, (str,int,float)) else '')}")
    except Exception:
        print(f"[{timestamp}] {level} {kind}")

    # Append to JSONL log file
    try:
        with open(LOG_PATH, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(entry, default=str, ensure_ascii=False) + "\n")
    except Exception as e:
        # If logging to file fails, print error but don't crash app
        print(f"[{timestamp}] ERROR logger: failed to write log: {e}")
# backward compatibility alias
log_event = log_action
