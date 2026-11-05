"""Política CU01; sin HTTP ni acceso a datos."""

import hashlib
import re
import secrets
from contextlib import contextmanager
from threading import BoundedSemaphore

from argon2 import PasswordHasher, Type, profiles
from argon2.exceptions import InvalidHashError, VerificationError
from pydantic import BaseModel, ConfigDict, SecretStr, field_validator

HASHER = PasswordHasher.from_parameters(profiles.RFC_9106_LOW_MEMORY)
HASH_SLOTS = BoundedSemaphore(2)
# Inicialización única, nunca hash por petición de usuario inexistente.
DUMMY_HASH = HASHER.hash(secrets.token_urlsafe(32))


class HashBusy(Exception):
    pass


@contextmanager
def hash_slot():
    if not HASH_SLOTS.acquire(blocking=False):
        raise HashBusy
    try:
        yield
    finally:
        HASH_SLOTS.release()


def normalize_email(value: str) -> str:
    value = value.strip(" \t\r\n\v\f")
    if not value.isascii() or len(value) > 254 or value.count("@") != 1:
        raise ValueError("Invalid email")
    local, domain = value.split("@")
    if (
        not re.fullmatch(r"[A-Za-z0-9._+\-]{1,64}", local)
        or local.startswith(".")
        or local.endswith(".")
        or ".." in local
    ):
        raise ValueError("Invalid email")
    labels = domain.split(".")
    if len(labels) < 2 or any(
        not re.fullmatch(r"[A-Za-z0-9](?:[A-Za-z0-9\-]{0,61}[A-Za-z0-9])?", label)
        for label in labels
    ):
        raise ValueError("Invalid email")
    return value.lower()


class AccountUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)
    display_name: str

    @field_validator("display_name")
    @classmethod
    def display_name_policy(cls, value: str) -> str:
        value = value.strip()
        if not value or len(value) > 200 or "\0" in value:
            raise ValueError("Invalid display name")
        return value


def password_policy(raw: str) -> None:
    try:
        valid = 12 <= len(raw) <= 128 and len(raw.encode("utf-8")) <= 512
    except UnicodeEncodeError:
        valid = False
    if not valid or "\0" in raw:
        raise ValueError("Invalid password")


class PasswordChange(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)
    current_password: SecretStr
    new_password: SecretStr

    @field_validator("current_password")
    @classmethod
    def current_password_present(cls, value: SecretStr) -> SecretStr:
        # Sin política de longitud: una actual corta o larga igual llega al
        # servicio y recibe el error general, nunca un 422 que la delate.
        raw = value.get_secret_value()
        if not raw or "\0" in raw:
            raise ValueError("Invalid password")
        return value

    @field_validator("new_password")
    @classmethod
    def new_password_policy(cls, value: SecretStr) -> SecretStr:
        password_policy(value.get_secret_value())
        return value


class AccountDeletion(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)
    # Campo con default para que la ausencia de la palabra sea un 400 del
    # servicio, nunca un 422 que revele nada sobre la cuenta.
    confirmation: str = ""
    password: SecretStr | None = None


class Credentials(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)
    email: str
    password: SecretStr

    @field_validator("email")
    @classmethod
    def email_policy(cls, value: str) -> str:
        return normalize_email(value)

    @field_validator("password")
    @classmethod
    def password_policy(cls, value: SecretStr) -> SecretStr:
        password_policy(value.get_secret_value())
        return value


def token() -> str:
    return secrets.token_urlsafe(32)


def digest(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def verify_password(encoded: str, password: str) -> bool:
    try:
        return HASHER.verify(encoded, password)
    except (VerificationError, InvalidHashError):
        return False


assert HASHER.type == Type.ID
