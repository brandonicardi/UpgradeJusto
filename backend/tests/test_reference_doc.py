"""The chat document comes from the same tables the engine reads."""

from upgradejusto.assistant.reference_doc import document, revision, rows


def test_document_explains_what_the_engine_knows():
    text = document()
    assert "AM4" in text and "DDR4" in text and "B550" in text
    assert "RTX 3060: consume alrededor de 170 W y pide una fuente de 550 W." in text


def test_rows_are_stable_and_bounded():
    first, second = rows(), rows()
    assert [row["id"] for row in first] == [row["id"] for row in second]
    assert len({row["id"] for row in first}) == len(first)
    assert 10 <= len(first) <= 200
    assert all(row["revision"] == revision() for row in first)
    assert all(len(row["content"]) <= 1500 for row in first)
