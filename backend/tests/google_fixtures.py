"""Ephemeral RSA test keys/certificates. Not real Google credentials or proof."""

import json
from datetime import UTC, datetime, timedelta
from time import time

import pytest
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID

from upgradejusto.auth.google_verifier import CERT_URL, CertificateReply

CLIENT_ID = "synthetic-38b1.apps.googleusercontent.com"


class SyntheticCrypto:
    def __init__(self):
        private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        now = datetime.now(UTC)
        subject = x509.Name(
            [x509.NameAttribute(NameOID.COMMON_NAME, "unit-only.example.test")]
        )
        certificate = (
            x509.CertificateBuilder()
            .subject_name(subject)
            .issuer_name(subject)
            .public_key(private.public_key())
            .serial_number(x509.random_serial_number())
            .not_valid_before(now - timedelta(minutes=1))
            .not_valid_after(now + timedelta(days=1))
            .sign(private, hashes.SHA256())
        )
        self.private = private.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        )
        self.certificate = certificate.public_bytes(serialization.Encoding.PEM).decode(
            "ascii"
        )

    def signed(self, nonce_value, *, headers=None, **changes):
        import jwt

        now = int(time())
        claims = {
            "iss": "https://accounts.google.com",
            "aud": CLIENT_ID,
            "iat": now,
            "exp": now + 3600,
            "sub": "synthetic-subject",
            "nonce": nonce_value,
            "email": "synthetic-google@example.test",
            "email_verified": True,
            "name": "Synthetic Google profile",
            **changes,
        }
        return jwt.encode(
            claims,
            self.private,
            algorithm="RS256",
            headers={
                "kid": "synthetic-key",
                "typ": "JWT",
                **(headers or {}),
            },
        )

    def transport(self, headers=None):
        crypto = self

        class SyntheticPublicCertificates:
            def __init__(self):
                self.calls = 0

            def __call__(self, url, method="GET", **kwargs):
                assert url == CERT_URL and method == "GET"
                self.calls += 1
                return CertificateReply(
                    200,
                    json.dumps({"synthetic-key": crypto.certificate}).encode(),
                    headers or {"cache-control": "max-age=3600"},
                )

        return SyntheticPublicCertificates()


@pytest.fixture(scope="module")
def rsa_material():
    return SyntheticCrypto()
