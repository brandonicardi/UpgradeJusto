"""Bounded local security settings; invalid deployment configuration fails closed."""

import os


def setting(name, default, low, high):
    raw = os.environ.get(name, str(default))
    if not raw.isascii() or not raw.isdigit() or len(raw) > 8:
        raise ValueError("Invalid security limit configuration")
    value = int(raw)
    if not low <= value <= high:
        raise ValueError("Invalid security limit configuration")
    return value
