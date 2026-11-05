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
        user = {"id": str(row["id"]), "email": row["email"]}
        if row["display_name"] is not None:
            user["display_name"] = row["display_name"]
        return user
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

    def account(self, data, session):
        identity = session["user_id"]
        if not identity:
            raise AuthError(401, "Not authenticated")
        user = self.repository.update_display_name(identity, data.display_name)
        if not user:
            raise AuthError(401, "Not authenticated")
        return public_user(user)

    def current(self, raw):
        session = self.repository.session(raw)
        if not session or not session["user_id"]:
            raise AuthError(401, "Not authenticated")
        user = self.repository.user_by_id(session["user_id"])
        if not user:
            raise AuthError(401, "Not authenticated")
        return public_user(user)

    def change_password(self, data, session, ip):
        identity = session["user_id"]
        if not identity:
            raise AuthError(401, "Not authenticated")
        user = self.repository.user_by_id(identity)
        if not user:
            raise AuthError(401, "Not authenticated")
        if not user["password_hash"]:
            # Cuenta de Google: no hay contraseña local que cambiar.
            raise AuthError(409, "Account has no password")
        retry = self.repository.consume_attempt(user["email"], ip)
        if retry:
            raise AuthError(429, "Too many requests", retry)
        with hash_slot():
            valid = verify_password(
                user["password_hash"], data.current_password.get_secret_value()
            )
            if not valid:
                raise AuthError(401, "Invalid credentials")
            encoded = HASHER.hash(data.new_password.get_secret_value())
        if not self.repository.change_password(identity, session["digest"], encoded):
            raise AuthError(401, "Not authenticated")

    def delete_account(self, data, session, ip):
        identity = session["user_id"]
        if not identity:
            raise AuthError(401, "Not authenticated")
        if data.confirmation != "BORRAR":
            raise AuthError(400, "Confirmation required")
        user = self.repository.user_by_id(identity)
        if not user:
            raise AuthError(401, "Not authenticated")
        if user["password_hash"]:
            # Misma política que el ingreso: contador compartido y un turno de
            # hash. La contraseña ausente se verifica como cadena vacía.
            retry = self.repository.consume_attempt(user["email"], ip)
            if retry:
                raise AuthError(429, "Too many requests", retry)
            candidate = (
                data.password.get_secret_value() if data.password is not None else ""
            )
            with hash_slot():
                if not verify_password(user["password_hash"], candidate):
                    raise AuthError(401, "Invalid credentials")
        # Una cuenta Google no tiene contraseña local: la confirmación alcanza.
        if not self.repository.delete_account(identity, user["email"]):
            raise AuthError(401, "Not authenticated")

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
