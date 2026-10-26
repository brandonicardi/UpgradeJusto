"""CU01: identidad resuelta en servidor, nunca por payload."""

import secrets
import uuid

from upgradejusto.auth.security import (
    DUMMY_HASH,
    HASHER,
    hash_slot,
    token,
    verify_password,
)


class AuthError(Exception):
    def __init__(self, status, detail, retry=None):
        self.status, self.detail, self.retry = status, detail, retry


def public_user(row):
    if row["email"] is not None:
        return {"id": str(row["id"]), "email": row["email"]}
    return {
        "id": str(row["id"]),
        "email": row["profile_email"],
        "auth_provider": "google",
        "display_name": row["display_name"],
    }


class AuthService:
    def __init__(self, repository):
        self.repository = repository

    def csrf(self, raw, ip):
        session = self.repository.session(raw)
        if session:
            return session["csrf_token"], None
        raw, csrf = token(), token()
        retry = self.repository.create_session(raw, csrf, ip)
        if retry:
            raise AuthError(429, "Too many requests", retry)
        return csrf, raw

    def authorize_post(self, raw, csrf, origin, expected):
        if origin != expected or not csrf:
            raise AuthError(403, "Forbidden")
        session = self.repository.session(raw)
        if not session or not secrets.compare_digest(
            session["csrf_token"].encode(), csrf.encode()
        ):
            raise AuthError(403, "Forbidden")
        return session

    def current(self, raw):
        session = self.repository.session(raw)
        if not session or not session["user_id"]:
            raise AuthError(401, "Not authenticated")
        user = self.repository.user_by_id(session["user_id"])
        if not user:
            raise AuthError(401, "Not authenticated")
        return public_user(user)

    def credentials(self, data, ip, session, *, register):
        retry = self.repository.consume_attempt(data.email, ip)
        if retry:
            raise AuthError(429, "Too many requests", retry)
        password = data.password.get_secret_value()
        with hash_slot():
            if register:
                encoded = HASHER.hash(password)
                identity = uuid.uuid4()
                if not self.repository.register(identity, data.email, encoded):
                    raise AuthError(409, "Email already registered")
                return {"id": str(identity), "email": data.email}, None
            user = self.repository.user_by_email(data.email)
            encoded = (
                user["password_hash"] if user and user["password_hash"] else DUMMY_HASH
            )
            valid = verify_password(encoded, password)
            if not valid or not user or not user["password_hash"]:
                raise AuthError(401, "Invalid credentials")
            replacement = (
                HASHER.hash(password) if HASHER.check_needs_rehash(encoded) else None
            )
        raw, csrf = token(), token()
        if not self.repository.rotate(
            session["digest"], raw, csrf, user["id"], replacement
        ):
            raise AuthError(403, "Forbidden")
        return public_user(user), raw
