"""Stable completed-stage identity for progress, independent of prices.

Snapshot stages have no stored id of their own. The key is the SHA-256 of the
canonical semantic content only: name, canonical actions, materials, the
occurrence ordinal that tells two identical stages apart, and the total number
of stages sharing that same content in this snapshot. Carrying that total is
what keeps a mark from moving: if the multiset of identical stages shrinks or
grows, every key of the group changes and none of its old marks is shown,
because losing a mark is safer than inheriting a deleted stage's mark. Prices,
offers, evaluations, costs, timestamps, plan revisions and ``position`` are
excluded because they change on every recalculation. A stage that survives a
recalculation unchanged therefore keeps its key; an edited or removed stage
loses it and its old mark is ignored, never transferred.
"""

import hashlib
import json
from decimal import Decimal


def _canonical(semantic):
    return json.dumps(
        semantic, sort_keys=True, separators=(",", ":"), ensure_ascii=False
    )


def _signature(stage):
    """Semantic content shared by two stages that only differ in price/order."""
    return _canonical(
        {
            "name": stage["name"],
            "actions": stage["actions"],
            "materials": stage.get("materials", []),
        }
    )


def _semantic(stage, occurrence, count):
    return {
        "name": stage["name"],
        "actions": stage["actions"],
        "materials": stage.get("materials", []),
        "occurrence": occurrence,
        "count": count,
    }


def stage_key(stage, occurrence=0, count=1):
    """Return the 64-char hex identity of one snapshot stage.

    ``occurrence`` is the ordinal among stages with identical semantic content
    and ``count`` the total of such stages in the snapshot; a unique stage is
    ``occurrence=0, count=1``. Both are part of the hash, so changing either
    yields a different key instead of reusing an old mark.
    """
    canonical = _canonical(_semantic(stage, occurrence, count))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def snapshot_keys(snapshot):
    """Return ``{stage_key: position}`` for every stage of one snapshot.

    Identical stages are told apart by their occurrence ordinal in snapshot
    order, and each key also records how many stages share that signature, so
    a recalculation that adds or removes one of them changes every key of that
    group and surfaces none of its old marks. Only the current revision's
    snapshot should be passed; historical marks never transfer.
    """
    stages = snapshot.get("stages", [])
    totals = {}
    for stage in stages:
        signature = _signature(stage)
        totals[signature] = totals.get(signature, 0) + 1
    seen, keys = {}, {}
    for stage in stages:
        signature = _signature(stage)
        occurrence = seen.get(signature, 0)
        seen[signature] = occurrence + 1
        keys[stage_key(stage, occurrence, totals[signature])] = stage["position"]
    return keys


def money_progress(snapshot, keys, marks):
    """Return ``(spent_ars, remaining_ars)`` as ``"0.00"`` strings, or ``None``.

    Spent is the sum of the stage totals of every marked stage and remaining the
    sum of the unmarked ones, both taken from the prices frozen in the snapshot
    (ARS, Decimal). A side is ``None`` when any stage that belongs to it has no
    known total: an unknown price is never read as zero. ``keys`` is the
    ``stage_keys`` list aligned by index with ``snapshot["stages"]``.
    """
    spent, remaining = Decimal(0), Decimal(0)
    spent_known = remaining_known = True
    for key, stage in zip(keys, snapshot.get("stages", []), strict=True):
        total = stage.get("cost", {}).get("total_ars")
        if key in marks:
            if total is None:
                spent_known = False
            else:
                spent += Decimal(total)
        elif total is None:
            remaining_known = False
        else:
            remaining += Decimal(total)
    return (
        f"{spent:.2f}" if spent_known else None,
        f"{remaining:.2f}" if remaining_known else None,
    )
