"""Read-only candidate/history review. Emits locations and counts, never values.

This heuristic inventory is not a secret-scanner certification. Human diff review
remains required before selecting files; this program never stages or publishes.
"""

import hashlib
import json
import re
import subprocess
from pathlib import Path
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / ".local/revision37"
PATTERNS = {
    "provider_token": re.compile(rb"gsk_[A-Za-z0-9]{20,}|sk-proj-[A-Za-z0-9_-]{20,}"),
    "github_token": re.compile(
        rb"gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}"
    ),
    "private_key": re.compile(rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "literal_secret_assignment": re.compile(
        rb"(?i)(?:password|secret|token|api_key)[\"']?\s*[:=]\s*[\"'][A-Za-z0-9+/=_-]{20,}[\"']"
    ),
    "email_in_source": re.compile(rb"(?i)[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}"),
    "credential_url": re.compile(
        rb"postgres(?:ql)?(?:\+psycopg)?://[^\s\"'<>]+:[^\s\"'<>]+@"
    ),
    "personal_path": re.compile(
        rb"(?:[A-Za-z]:[\\/](?:Users|Proyectos)[\\/]|/home/|/Users/)"
    ),
    "internal_session_id": re.compile(rb"\bses_[A-Za-z0-9]{12,}\b"),
    "conversation_export": re.compile(
        rb"<conversation-checkpoint>|<recent-context>|\"sessionID\"\s*:"
    ),
}
EXCLUDED = re.compile(
    r"(^|/)(?:\.local|\.tools|\.opencode|node_modules|\.venv|material-privado|output|tmp)/|(?:^|/)\.env(?:\.|$)"
)


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT)


def inspect(data, location):
    findings = []
    for kind, pattern in PATTERNS.items():
        for match in pattern.finditer(data):
            findings.append(
                {
                    "kind": kind,
                    "location": location,
                    "line": data.count(b"\n", 0, match.start()) + 1,
                }
            )
    return findings


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    names = sorted(
        set(
            git("ls-files", "--cached", "--others", "--exclude-standard", "-z")
            .decode()
            .split("\0")
        )
        - {""}
    )
    candidates, excluded, findings = [], [], []
    for name in names:
        if EXCLUDED.search(name) and not name.endswith(".env.example"):
            excluded.append(name)
            continue
        path = ROOT / name
        if not path.is_file():
            continue
        data = path.read_bytes()
        candidates.append(
            {
                "path": name,
                "bytes": len(data),
                "sha256": hashlib.sha256(data).hexdigest(),
            }
        )
        findings.extend(inspect(data, {"kind": "worktree", "path": name}))
    history = []
    seen = set()
    for commit in git("rev-list", "--reverse", "HEAD").decode().splitlines():
        history.append(commit)
        entries = git("ls-tree", "-r", "-z", commit).split(b"\0")
        for entry in entries:
            if not entry:
                continue
            header, raw_name = entry.split(b"\t", 1)
            mode, kind, blob = header.split()
            if kind != b"blob" or blob in seen:
                continue
            seen.add(blob)
            name = raw_name.decode()
            findings.extend(
                inspect(
                    git("cat-file", "blob", blob.decode()),
                    {"kind": "history", "commit": commit, "path": name},
                )
            )
    author_name = git("config", "--get", "user.name").decode().strip()
    author_email = git("config", "--get", "user.email").decode().strip()
    prior = git("log", "-5", "--format=%an%x00%ae").decode().splitlines()
    report = {
        "head": git("rev-parse", "HEAD").decode().strip(),
        "branch": git("branch", "--show-current").decode().strip(),
        "audited_history": history,
        "history_unique_blobs": len(seen),
        "candidates": candidates,
        "excluded_tracked_or_candidate_paths": excluded,
        "findings": findings,
        "identity": {
            "configured": bool(author_name and author_email),
            "matches_all_five_prior": all(
                row == author_name + "\0" + author_email for row in prior
            ),
            "email_is_github_noreply": author_email.endswith(
                "@users.noreply.github.com"
            ),
        },
    }
    destination = (
        OUT / f"publication-review-{report['head'][:8]}-{uuid4().hex[:8]}.json"
    )
    with destination.open("x", encoding="utf-8") as stream:
        stream.write(json.dumps(report, ensure_ascii=False, indent=2))
    counts = {kind: sum(hit["kind"] == kind for hit in findings) for kind in PATTERNS}
    print(
        json.dumps(
            {
                "candidate_files": len(candidates),
                "audited_commits": len(history),
                "history_unique_blobs": len(seen),
                "excluded_candidates": len(excluded),
                "finding_counts": counts,
                "identity": report["identity"],
                "report": destination.relative_to(ROOT).as_posix(),
            }
        )
    )


if __name__ == "__main__":
    main()
