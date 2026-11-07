"""Identity is whole-token model resolution, never substring matching."""

from pathlib import Path

import pytest

from upgradejusto.assistant.rag import manifest_from_corpus, resolve

ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture(scope="module")
def manifest():
    return manifest_from_corpus(ROOT, 0.5)


def ids(manifest, query):
    return resolve(manifest, query)


def test_exact_models_resolve_to_their_own_source(manifest):
    assert ids(manifest, "¿RAM máxima de la ASRock B550M Pro4?")[0] == {
        "asrock-b550m-pro4-manual"
    }
    assert ids(manifest, "¿Salidas de video de la B550 Pro4?")[0] == {
        "asrock-b550-pro4-manual"
    }
    assert ids(manifest, "Kingston KVR32N22D8/16 latencia")[0] == {
        "kingston-kvr32n22d8-16"
    }


def test_similar_model_and_suffix_variants_do_not_match(manifest):
    found, near = ids(manifest, "¿Cuánta RAM soporta la ASRock B550M Pro4 SE?")
    assert found == set() and near == {"asrock-b550m-pro4-manual"}
    assert ids(manifest, "RTX 4060 Ti consumo")[0] == set()
    assert ids(manifest, "Placa B550 con 4 ranuras")[0] == set()
    assert ids(manifest, "Gabinete Fractal Pop Air")[0] == set()


def test_negated_mention_is_not_the_asked_model(manifest):
    query = "Gabinete Fractal Pop Air (el modelo anterior, no el Pop 2 Air)"
    assert ids(manifest, query)[0] == set()
    assert ids(manifest, "Gabinete Fractal Pop 2 Air")[0] == {
        "fractal-pop-2-air-product-sheet"
    }


def test_general_question_resolves_no_specific_source(manifest):
    assert ids(manifest, "¿Cómo sé si la memoria sirve en mi placa?") == (set(), set())
