"""Hardware reference for the chat: generated from the tables the engine reads.

python -m upgradejusto.assistant.reference_doc --config PATH [--write-doc PATH]

One source, two uses: the engine reads the facts and the chat retrieves this text
to explain them. It cannot drift, and it is explanation, never a verdict.
"""

import argparse
import hashlib
from pathlib import Path

from sqlalchemy.dialects.postgresql import insert

from upgradejusto.compatibility.reference_knowledge import table
from upgradejusto.persistence.runtime import runtime_engine

from .rag import config, embed
from .tables import chunks

SOURCE_ID = "conocimiento-hardware"
TITLE = "Conocimiento general de hardware de UpgradeJusto"
URL = (
    "https://github.com/brandonicardi/UpgradeJusto/blob/reorganizacion/"
    "docs/conocimiento-hardware.md"
)
GROUP = 6
GENERATIONS = {
    "zen": "Ryzen 1000 y APU 2000",
    "zen+": "Ryzen 2000 y APU 3000",
    "zen2": "Ryzen 3000 y 4000",
    "zen3": "Ryzen 5000",
    "zen4": "Ryzen 7000 y 8000",
    "zen5": "Ryzen 9000",
    "ultra2": "Core Ultra serie 200",
    **{
        f"intel{number}": f"Intel Core de {number}.ª generación"
        for number in range(8, 15)
    },
}
GUIDE = (
    (
        "Cómo saber si un procesador entra en una placa",
        "El procesador y la placa tienen que usar el mismo zócalo, y el chipset de "
        "la placa tiene que admitir esa generación. Algunas placas viejas necesitan "
        "actualizar la BIOS para una generación más nueva.",
    ),
    (
        "Cómo saber si la memoria sirve",
        "La memoria tiene que ser de la misma generación que acepta la placa: DDR4 "
        "o DDR5 no se pueden mezclar ni cambiar entre sí. La cantidad de ranuras y "
        "el máximo de memoria dependen de cada modelo de placa.",
    ),
    (
        "Cómo saber si alcanza la fuente",
        "La fuente tiene que tener, como mínimo, la potencia recomendada para el "
        "sistema completo que publica el fabricante de la placa de video. Los "
        "cables de alimentación varían según el modelo: conviene chequearlos.",
    ),
    (
        "Qué depende de cada modelo",
        "El largo de la placa de video, el espacio en el gabinete, los conectores y "
        "las ranuras varían entre modelos del mismo chip. Por eso la app avisa que "
        "los chequees: un dato de referencia no los puede confirmar.",
    ),
)


def platform_sections():
    for platform in table("plataformas")["platforms"]:
        memory = " o ".join(platform["memory"])
        lines = []
        for chipset, generations in platform["chipsets"].items():
            names = ", ".join(GENERATIONS[item] for item in generations)
            lines.append(f"{chipset}: {names}.")
        yield (
            f"Plataforma {platform['socket']}",
            f"El zócalo {platform['socket']} usa memoria {memory}. "
            "Chipsets y procesadores que admiten: " + " ".join(lines),
        )


def gpu_sections():
    rows = [
        row
        for row in table("gpus").get("gpus", ())
        if row.get("psu_w") is not None or row.get("tdp_w") is not None
    ]
    for start in range(0, len(rows), GROUP):
        group = rows[start : start + GROUP]
        lines = []
        for row in group:
            parts = []
            if row.get("tdp_w") is not None:
                parts.append(f"consume alrededor de {row['tdp_w']} W")
            if row.get("psu_w") is not None:
                parts.append(f"pide una fuente de {row['psu_w']} W")
            lines.append(f"{row['chip']}: {' y '.join(parts)}.")
        yield (
            f"Placas de video: {group[0]['chip']} a {group[-1]['chip']}",
            " ".join(lines),
        )


def sections():
    yield from GUIDE
    yield from platform_sections()
    yield from gpu_sections()


def document():
    lines = [f"# {TITLE}", ""]
    lines.append(
        "Generado desde las tablas de `compatibility/conocimiento/`. Son datos por "
        "familia de hardware, con fuente en cada tabla; no reemplazan la ficha del "
        "modelo exacto."
    )
    for title, body in sections():
        lines += ["", f"## {title}", "", body]
    return "\n".join(lines) + "\n"


def revision():
    return hashlib.sha256(document().encode("utf-8")).hexdigest()


def rows():
    current = revision()
    result = []
    for position, (title, body) in enumerate(sections(), 1):
        locator = f"section:{position}"
        key = hashlib.sha256(f"{SOURCE_ID}:{current}:{locator}".encode()).hexdigest()
        result.append(
            dict(
                id=key,
                source_id=SOURCE_ID,
                revision=current,
                url=URL,
                title=f"{TITLE}: {title}",
                locator=locator,
                content=f"{title}. {body}",
            )
        )
    return result


def ingest(engine, manifest):
    selected = rows()
    vectors = embed(manifest, [row["content"] for row in selected])
    with engine.begin() as conn:
        for row, vector in zip(selected, vectors, strict=True):
            conn.execute(
                insert(chunks)
                .values(
                    **row,
                    encoder_revision=manifest.encoder.revision,
                    embedding=vector,
                )
                .on_conflict_do_nothing(index_elements=[chunks.c.id])
            )
    return len(selected)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    parser.add_argument("--write-doc")
    args = parser.parse_args()
    if args.write_doc:
        Path(args.write_doc).write_text(document(), encoding="utf-8")
    print(f"reference_chunks={ingest(runtime_engine(), config(args.config))}")


if __name__ == "__main__":
    main()
