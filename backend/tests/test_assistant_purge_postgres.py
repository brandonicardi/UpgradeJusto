"""Purge de conversaciones en baja de cuenta: una sola transacción, cascada PG."""

from uuid import uuid4

import sqlalchemy as sa

from upgradejusto.assistant.models import MessageCreate
from upgradejusto.assistant.repository import Repository
from upgradejusto.assistant.tables import conversations, messages
from upgradejusto.auth.repository import AuthRepository
from upgradejusto.auth.security import HASHER
from upgradejusto.persistence.schema import users


def test_purge_deletes_owner_conversations_and_messages_cascade(pg_engine):
    owner_target = uuid4()
    owner_other = uuid4()
    email_target = f"assistant-purge-target-{uuid4().hex}@example.test"
    email_other = f"assistant-purge-other-{uuid4().hex}@example.test"
    password_hash = HASHER.hash("synthetic-purge-password")

    auth = AuthRepository(pg_engine)
    auth.register(owner_target, email_target, password_hash)
    auth.register(owner_other, email_other, password_hash)

    repo = Repository(pg_engine)
    cid_target = repo.create(owner_target, "Conversación a borrar")["id"]
    cid_other = repo.create(owner_other, "Conversación ajena")["id"]
    repo.begin(
        owner_target,
        cid_target,
        MessageCreate(content="mensaje", client_request_id=uuid4()),
    )

    try:
        with pg_engine.begin() as conn:
            assert (
                conn.scalar(
                    sa.select(sa.func.count())
                    .select_from(conversations)
                    .where(conversations.c.owner_id == owner_target)
                )
                == 1
            )
            assert (
                conn.scalar(
                    sa.select(sa.func.count())
                    .select_from(messages)
                    .where(messages.c.conversation_id == cid_target)
                )
                == 2
            )

            repo.purge(conn, owner_target)

            assert (
                conn.scalar(
                    sa.select(sa.func.count())
                    .select_from(conversations)
                    .where(conversations.c.owner_id == owner_target)
                )
                == 0
            )
            assert (
                conn.scalar(
                    sa.select(sa.func.count())
                    .select_from(messages)
                    .where(messages.c.conversation_id == cid_target)
                )
                == 0
            )
            assert (
                conn.scalar(
                    sa.select(sa.func.count())
                    .select_from(conversations)
                    .where(conversations.c.owner_id == owner_other)
                )
                == 1
            )

        with pg_engine.connect() as conn:
            assert (
                conn.scalar(
                    sa.select(sa.func.count())
                    .select_from(conversations)
                    .where(conversations.c.owner_id == owner_target)
                )
                == 0
            )
            assert (
                conn.scalar(
                    sa.select(sa.func.count())
                    .select_from(messages)
                    .where(messages.c.conversation_id == cid_target)
                )
                == 0
            )
            assert (
                conn.scalar(
                    sa.select(sa.func.count())
                    .select_from(conversations)
                    .where(conversations.c.owner_id == owner_other)
                )
                == 1
            )
            assert (
                conn.scalar(
                    sa.select(sa.func.count())
                    .select_from(messages)
                    .where(messages.c.conversation_id == cid_other)
                )
                == 0
            )
    finally:
        with pg_engine.begin() as conn:
            conn.execute(
                messages.delete().where(
                    messages.c.conversation_id.in_([cid_target, cid_other])
                )
            )
            conn.execute(
                conversations.delete().where(
                    conversations.c.owner_id.in_([owner_target, owner_other])
                )
            )
            conn.execute(
                users.delete().where(users.c.id.in_([owner_target, owner_other]))
            )
