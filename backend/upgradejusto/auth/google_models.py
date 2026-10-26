"""GIS ID-token input only; no client identity, email or token_type authorization."""

from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import Field, SecretStr, StrictStr

from upgradejusto.pcs.models import InputModel


class GoogleCredential(InputModel):
    attempt_id: UUID
    credential: Annotated[SecretStr, Field(min_length=1, max_length=7600)]


class GoogleAttemptInput(InputModel):
    pass


class GoogleConfig(InputModel):
    enabled: bool
    client_id: str | None


class GoogleChallenge(InputModel):
    attempt_id: UUID
    nonce: Annotated[StrictStr, Field(min_length=43, max_length=43)]
    expires_at: datetime


class GooglePublicUser(InputModel):
    id: UUID
    email: str | None
    auth_provider: Literal["google"]
    display_name: str | None
