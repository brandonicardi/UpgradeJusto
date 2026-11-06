"""R01 pura: socket, identidad/revisión exacta y soporte CPU/placa documentado.

La variante ``cpu_support`` conserva la relación BIOS del motor stock. La
variante ``cpu_support_documented`` no lee ni evalúa la BIOS: exige la misma
fila exacta con evidencia y nunca falla por una BIOS anterior declarada.
"""

from .models import Fact, ResolvedConfiguration
from .rules import _result


def _support(config: ResolvedConfiguration, evaluate_bios: bool):
    data = config.cpu_support
    if data is None:
        categories = {part.category for part in config.parts}
        missing = tuple(
            f"cpu_support.{category}"
            for category in ("cpu", "motherboard")
            if category not in categories
        ) or ("cpu_support",)
        return _result("R01", "unknown", (), (), (), missing)
    parts = {part.instance_id: part for part in config.parts}
    cpu = parts[data.cpu_instance_id]
    board = parts[data.motherboard_instance_id]
    facts = [
        Fact(name="cpu_model", value=cpu.model),
        Fact(name="motherboard_model", value=board.model),
    ]
    if evaluate_bios:
        facts.append(Fact(name="installed_bios_declared", value=data.installed_bios))
    refs, missing, observations = [], [], {}
    failed = False
    for name in ("cpu_socket", "motherboard_socket", "applicable_revision"):
        observation = getattr(data, name)
        path = "cpu_support." + name
        if observation is not None:
            refs.extend(observation.evidence)
            facts.append(Fact(name=name, value=observation.value))
        if (
            observation is None
            or observation.value is None
            or observation.status != "documented"
            or not observation.evidence
        ):
            missing.append(path)
        else:
            observations[name] = observation.value
    if "cpu_socket" in observations and "motherboard_socket" in observations:
        failed = observations["cpu_socket"] != observations["motherboard_socket"]
    if not cpu.model:
        missing.append("cpu_support.cpu_model")
    if not board.model:
        missing.append("cpu_support.motherboard_variant")
    rows = tuple(
        row
        for row in data.support_rows
        if row.cpu_model == cpu.model
        and row.motherboard_model == board.model
        and row.applicable_revision == observations.get("applicable_revision")
    )
    if len(rows) != 1 or not rows[0].evidence:
        missing.append("cpu_support.exact_support_row")
        if evaluate_bios and data.installed_bios is not None:
            missing.append("cpu_support.bios_relation")
    else:
        row = rows[0]
        refs.extend(row.evidence)
        if evaluate_bios:
            facts.append(Fact(name="minimum_bios", value=row.minimum_bios))
            if data.installed_bios == row.minimum_bios:
                facts.append(Fact(name="bios_requirement_met", value=True))
            elif data.installed_bios in row.earlier_bios:
                failed = True
                facts.append(Fact(name="bios_requirement_met", value=False))
            elif data.installed_bios is not None:
                missing.append("cpu_support.bios_relation")
    if evaluate_bios:
        if data.installed_bios is None:
            missing.append("cpu_support.installed_bios")
        conditions = (
            "BIOS instalada declarada por usuario; no es evidencia curada de instalación",
            "BIOS anterior falla requisito de soporte; no afirma imposibilidad física de POST",
        )
    else:
        conditions = (
            "Soporte documentado del modelo exacto de CPU en el modelo exacto de placa; "
            "el socket por sí solo no alcanza",
            "La versión de BIOS no se evalúa ni cambia este resultado",
        )
    return _result(
        "R01",
        "fail" if failed else "unknown" if missing else "pass",
        facts,
        refs,
        conditions,
        missing,
    )


def cpu_support(config: ResolvedConfiguration):
    """Stock R01: socket, exact row and documented BIOS relation."""
    return _support(config, evaluate_bios=True)


def cpu_support_documented(config: ResolvedConfiguration):
    """Essential R01: exact CPU/board support without reading or judging BIOS."""
    return _support(config, evaluate_bios=False)
