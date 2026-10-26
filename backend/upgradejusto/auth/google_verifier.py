"""Official google-auth verification with fixed, bounded x509 transport.

No token-driven certificate/JWKS URL, no TLS bypass and no token logging.
Imports of the new official dependency remain lazy until Build syncs its lock.
"""

import base64
import json
import math
import os
import re
import secrets
import threading
from dataclasses import dataclass
from time import monotonic, time
from types import SimpleNamespace

import httpx

from upgradejusto.assistant.provider import tls_context
from upgradejusto.auth.security import digest, normalize_email
from upgradejusto.auth.service import AuthError

CERT_URL = "https://www.googleapis.com/oauth2/v1/certs"
ISSUER = "https://accounts.google.com"
MAX_CERT_BYTES = 1048576


def client_id():
    value = os.environ.get("UJ_GOOGLE_CLIENT_ID", "")
    if not value:
        return None
    if len(value) > 200 or not re.fullmatch(
        r"[A-Za-z0-9_-]+\.apps\.googleusercontent\.com", value
    ):
        raise AuthError(503, "Google sign-in unavailable")
    return value


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate JSON member")
        result[key] = value
    return result


@dataclass(frozen=True)
class CertificateReply:
    status: int
    data: bytes
    headers: dict


class FixedCertificateSession:
    """Session interface used by official google.auth.transport.requests.Request."""

    def request(self, method, url, **kwargs):
        if method.upper() != "GET" or url != CERT_URL:
            raise AuthError(503, "Google verification unavailable")
        deadline = monotonic() + 5
        # Existing explicit trust policy is retained; environment proxies are not
        # allowed to turn this fixed public-key fetch into another destination.
        with httpx.Client(
            verify=tls_context(),
            timeout=2,
            follow_redirects=False,
            trust_env=False,
        ) as client:
            with client.stream("GET", CERT_URL) as response:
                if response.status_code != 200:
                    raise AuthError(503, "Google verification unavailable")
                body = bytearray()
                for chunk in response.iter_bytes():
                    if (
                        monotonic() >= deadline
                        or len(body) + len(chunk) > MAX_CERT_BYTES
                    ):
                        raise AuthError(503, "Google verification unavailable")
                    body.extend(chunk)
                if monotonic() >= deadline:
                    raise AuthError(503, "Google verification unavailable")
                # Official requests transport consumes only these response attrs.
                return SimpleNamespace(
                    status_code=200,
                    content=bytes(body),
                    headers=dict(response.headers),
                )

    def close(self):
        pass


class CertificateRequest:
    def __init__(self, transport=None):
        self.transport = transport
        self.lock = threading.Lock()
        self.cached, self.expires = None, 0.0

    def __call__(self, url, method="GET", **kwargs):
        if url != CERT_URL or method.upper() != "GET":
            raise AuthError(503, "Google verification unavailable")
        if not self.lock.acquire(timeout=1):
            raise AuthError(503, "Google verification unavailable")
        try:
            if self.cached is not None and monotonic() < self.expires:
                return self.cached
            if self.transport is None:
                from google.auth.transport.requests import Request

                self.transport = Request(session=FixedCertificateSession())
            reply = self.transport(CERT_URL, method="GET", timeout=2)
            if reply.status != 200 or len(reply.data) > MAX_CERT_BYTES:
                raise AuthError(503, "Google verification unavailable")
            certs = json.loads(reply.data, object_pairs_hook=unique_object)
            # Reject JWKS shape: google-auth's JWKS branch can use another
            # transport. We accept only its fixed x509 endpoint/map path.
            if (
                not isinstance(certs, dict)
                or not certs
                or "keys" in certs
                or len(certs) > 100
            ):
                raise AuthError(503, "Google verification unavailable")
            if any(
                not isinstance(key, str)
                or not isinstance(value, str)
                or len(key) > 200
                or len(value) > 65536
                for key, value in certs.items()
            ):
                raise AuthError(503, "Google verification unavailable")
            from cryptography import x509

            for certificate in certs.values():
                x509.load_pem_x509_certificate(certificate.encode("ascii"))
            headers = {key.lower(): value for key, value in reply.headers.items()}
            control = headers.get("cache-control", "").lower()
            age = headers.get("age", "0")
            match = re.search(r"(?:^|,)\s*max-age\s*=\s*(\d+)", control)
            ttl = min(3600, int(match[1])) if match and len(match[1]) < 10 else 0
            ttl = max(0, ttl - (int(age) if age.isdigit() and len(age) < 10 else ttl))
            if "no-store" in control or "no-cache" in control:
                ttl = 0
            self.cached = CertificateReply(200, reply.data, dict(reply.headers))
            self.expires = monotonic() + ttl
            return self.cached
        except AuthError:
            raise
        except Exception:
            raise AuthError(503, "Google verification unavailable") from None
        finally:
            self.lock.release()


_CERTIFICATES = CertificateRequest()


class GoogleVerifier:
    def __init__(self, audience, request=None):
        self.audience = audience
        self.request = request if request is not None else _CERTIFICATES

    def verify(self, credential, nonce_hash):
        try:
            parts = credential.split(".")
            if len(parts) != 3 or any(not part for part in parts):
                raise ValueError("Not a compact ID token")
            header = json.loads(
                base64.b64decode(
                    parts[0] + "=" * (-len(parts[0]) % 4),
                    altchars=b"-_",
                    validate=True,
                ),
                object_pairs_hook=unique_object,
            )
            if not isinstance(header, dict) or header.get("alg") != "RS256":
                raise ValueError("Invalid ID token algorithm")
            if header.get("typ", "JWT") != "JWT" or any(
                key in header for key in ("jku", "x5u", "jwk", "crit")
            ):
                raise ValueError("Invalid ID token semantics")
            if not isinstance(header.get("kid"), str) or not re.fullmatch(
                r"[A-Za-z0-9_-]{1,200}", header["kid"]
            ):
                raise ValueError("Invalid key identifier")
        except Exception:
            raise AuthError(401, "Invalid Google ID token") from None
        try:
            from google.auth.exceptions import GoogleAuthError
            from google.oauth2 import id_token
        except ImportError:
            raise AuthError(503, "Google verification unavailable") from None
        try:
            claims = id_token.verify_oauth2_token(
                credential, self.request, audience=self.audience
            )
            if not isinstance(claims, dict):
                raise ValueError("Invalid claims")
            if (
                claims.get("iss") not in (ISSUER, "accounts.google.com")
                or claims.get("aud") != self.audience
            ):
                raise ValueError("Invalid issuer/audience")
            if claims.get("azp", self.audience) != self.audience:
                raise ValueError("Invalid authorized party")
            if claims.get("token_use", "id") != "id" or "token_type" in claims:
                raise ValueError("Not an ID token")
            now = time()
            issued, expiry = claims.get("iat"), claims.get("exp")
            if (
                type(issued) is not int
                or type(expiry) is not int
                or not math.isfinite(now)
                or not 0 <= issued <= now < expiry
                or expiry <= issued
            ):
                raise ValueError("Invalid token time")
            subject, nonce = claims.get("sub"), claims.get("nonce")
            if (
                not isinstance(subject, str)
                or not 1 <= len(subject) <= 255
                or not subject.isprintable()
            ):
                raise ValueError("Invalid subject")
            if (
                not isinstance(nonce, str)
                or len(nonce) > 200
                or not secrets.compare_digest(digest(nonce), nonce_hash)
            ):
                raise ValueError("Invalid nonce")
            email = None
            if claims.get("email_verified") is True and isinstance(
                claims.get("email"), str
            ):
                try:
                    email = normalize_email(claims["email"])
                except ValueError:
                    # Profile text is optional, never an identity/linking key.
                    email = None
            name = claims.get("name")
            if not isinstance(name, str) or not name.strip() or not name.isprintable():
                name = None
            elif len(name.strip()) > 200:
                name = name.strip()[:200]
            else:
                name = name.strip()
            return {
                "issuer": ISSUER,
                "subject": subject,
                "profile_email": email,
                "display_name": name,
                "expires_at": expiry,
            }
        except AuthError:
            raise
        except (GoogleAuthError, ValueError, KeyError, TypeError, OverflowError):
            raise AuthError(401, "Invalid Google ID token") from None
        except Exception:
            raise AuthError(503, "Google verification unavailable") from None
