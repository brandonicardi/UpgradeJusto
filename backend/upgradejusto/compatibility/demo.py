"""Ejemplos reproducibles sin servidor, red ni escritura de configuraciones."""

import json

from .evaluation import evaluate
from .examples import demo_examples


def main() -> None:
    payload = [
        {
            "example_id": example.example_id,
            "kind": example.kind,
            "description": example.description,
            "evaluation": evaluate(example.configuration).model_dump(mode="json"),
        }
        for example in demo_examples()
    ]
    print(json.dumps(payload, ensure_ascii=True, indent=2, allow_nan=False))


if __name__ == "__main__":
    main()
