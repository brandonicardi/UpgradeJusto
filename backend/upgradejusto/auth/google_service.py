"""GIS orchestration; no external claims become authorization without verification."""

from upgradejusto.auth.google_verifier import GoogleVerifier, client_id
from upgradejusto.auth.security import token
from upgradejusto.auth.service import AuthError, public_user


class GoogleService:
    def __init__(self, repository, verifier=None):
        self.repository, self.verifier = repository, verifier

    @staticmethod
    def audience():
        audience = client_id()
        if audience is None:
            raise AuthError(503, "Google sign-in unavailable")
        return audience

    def issue(self, session, origin, ip):
        audience = self.audience()
        nonce = token()
        result, retry = self.repository.issue(
            session["digest"], origin, audience, ip, nonce
        )
        if retry:
            raise AuthError(429, "Too many requests", retry)
        return {
            "attempt_id": result["id"],
            "nonce": nonce,
            "expires_at": result["expires_at"],
        }

    def login(self, session, origin, data):
        audience = self.audience()
        claim = self.repository.claim(
            session["digest"], data.attempt_id, origin, audience
        )
        verifier = (
            self.verifier if self.verifier is not None else GoogleVerifier(audience)
        )
        profile = verifier.verify(
            data.credential.get_secret_value(), claim["nonce_hash"]
        )
        raw, csrf = token(), token()
        user = self.repository.complete(claim, profile, raw, csrf)
        return public_user(user), raw
