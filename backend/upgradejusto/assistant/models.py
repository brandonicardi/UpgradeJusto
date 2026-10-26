from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, StringConstraints


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class ConversationCreate(Input):
    title: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)
    ]


class MessageCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    content: Annotated[
        str,
        StringConstraints(
            strict=True, strip_whitespace=True, min_length=1, max_length=8000
        ),
    ]
    client_request_id: UUID
