"""Synthetic local predicates, NOT real hardware positives or PostgreSQL evidence."""

from copy import deepcopy

import pytest
from pydantic import ValidationError
from test_recommendations import base

from upgradejusto.catalog.dataset import COMPONENTS, DATASET_VERSION
from upgradejusto.compatibility.application import resolve_configuration
from upgradejusto.compatibility.evaluation import evaluate_d
from upgradejusto.compatibility.models import (
    EvidenceRef,
    PartInstance,
    ResolvedConfiguration,
)
from upgradejusto.compatibility.resource_models import (
    ElectricalChannel,
    ElectricalLoad,
    ElectricalSource,
    FrontAdapter,
    FrontInput,
    FrontPort,
    FrontRoute,
    FunctionCount,
    GpuInterface,
    Inventory,
    Link,
    Observed,
    Occupation,
    PcieInput,
    PcieSlot,
    PowerAssignment,
    PowerInput,
    RailLimit,
    ResourceInputs,
    StorageDevice,
    StorageInput,
    StorageInstallation,
    StoragePort,
)
from upgradejusto.pcs.models import ComponentGroup

REF = EvidenceRef(
    source_id="SYNTHETIC_RESOURCE_TEST",
    url="https://example.org/synthetic-resource-test",
    locator="Synthetic predicates only; no commercial hardware assertion",
    consulted_on="2026-10-25",
)
OBS = {"evidence": (REF,)}


def inventory(**occupations):
    return Inventory(
        complete=True,
        occupancy=tuple(
            Occupation(resource_id=k, occupant_id=v, **OBS)
            for k, v in occupations.items()
        ),
        **OBS,
    )


def configuration(**blocks):
    return ResolvedConfiguration(
        pc_revision="synthetic-1",
        data_revision="synthetic-resources-1",
        parts=tuple(
            PartInstance(instance_id=k, part_id=k, category=v)
            for k, v in (
                ("cpu", "cpu"),
                ("board", "motherboard"),
                ("gpu", "gpu"),
                ("psu", "psu"),
                ("case", "case"),
                ("disk", "other"),
                ("disk2", "other"),
                ("fan", "other"),
            )
        ),
        resources=ResourceInputs(**blocks),
    )


def evaluated(config, rule_id):
    result = evaluate_d(config)
    assert result.rules_version == "cu05-25-resources.1"
    assert len(result.coverage.required) == 12
    assert not result.coverage.complete
    assert result.verdict != "compatible"
    return next(r for r in result.rule_results if r.rule_id == rule_id)


def pcie_input():
    shared = Link(generation=3, lanes=16)
    return PcieInput(
        cpu_instance_id="cpu",
        motherboard_instance_id="board",
        gpu=GpuInterface(
            instance_id="gpu",
            physical_lanes=16,
            generation=5,
            supported_links=(shared, Link(generation=5, lanes=16)),
            **OBS,
        ),
        slots=(
            PcieSlot(
                resource_id="PCIE1",
                physical_lanes=16,
                cpu_instance_id="cpu",
                supported_links=(shared,),
                disabled_by=("SHARED",),
                **OBS,
            ),
        ),
        selected_slot_id="PCIE1",
        selection_observation=Observed(**OBS),
        inventory=inventory(PCIE1="gpu", SHARED=None),
    )


def test_pcie_explicit_negotiation_not_generation_equality_local_pass():
    config = configuration(pcie=pcie_input())
    before = deepcopy(config.model_dump())
    assert evaluated(config, "R03").state == "pass"
    assert config.model_dump() == before


def test_pcie_known_width_fail_preserves_unknown_link_and_pending_families():
    data = pcie_input().model_dump()
    data["slots"][0]["physical_lanes"] = 4
    data["gpu"]["supported_links"] = None
    config = configuration(pcie=PcieInput.model_validate(data))
    result = evaluated(config, "R03")
    assert result.state == "fail"
    assert "pcie.gpu.supported_links" in result.missing_fields
    assert evaluate_d(config).verdict == "incompatible"
    assert "implementation.R05" in evaluate_d(config).missing_fields


@pytest.mark.parametrize("missing", ["inventory", "selection_observation"])
def test_pcie_installed_context_unknown(missing):
    data = pcie_input().model_dump()
    data[missing] = None
    assert (
        evaluated(configuration(pcie=PcieInput.model_validate(data)), "R03").state
        == "unknown"
    )


def test_pcie_conflict_does_not_supply_link_or_geometry():
    data = pcie_input().model_dump()
    data["slots"][0].update(status="conflict", physical_lanes=1)
    assert (
        evaluated(configuration(pcie=PcieInput.model_validate(data)), "R03").state
        == "unknown"
    )


def test_disjoint_partial_link_tables_are_unknown_not_generation_rejection():
    data = pcie_input().model_dump()
    data["gpu"]["supported_links"] = (Link(generation=5, lanes=16),)
    assert (
        evaluated(configuration(pcie=PcieInput.model_validate(data)), "R03").state
        == "unknown"
    )
    data["gpu"]["supported_links_exhaustive"] = True
    data["slots"][0]["supported_links_exhaustive"] = True
    assert (
        evaluated(configuration(pcie=PcieInput.model_validate(data)), "R03").state
        == "fail"
    )


def power_input():
    return PowerInput(
        psu_instance_id="psu",
        motherboard_instance_id="board",
        gpu_instance_id="gpu",
        sources=(
            ElectricalSource(
                resource_id="EPS",
                owner_instance_id="psu",
                kind="EPS8",
                voltage_mv=12000,
                max_current_ma=1000,
                rail_id="R12",
                branch_id="B1",
                **OBS,
            ),
            ElectricalSource(
                resource_id="PCI",
                owner_instance_id="psu",
                kind="PCIe8",
                voltage_mv=12000,
                max_current_ma=1000,
                rail_id="R12",
                branch_id="B2",
                **OBS,
            ),
        ),
        required_loads=(
            ElectricalLoad(
                resource_id="board_power",
                owner_instance_id="board",
                kind="EPS8",
                voltage_mv=12000,
                current_ma=400,
                **OBS,
            ),
            ElectricalLoad(
                resource_id="gpu_power",
                owner_instance_id="gpu",
                kind="PCIe8",
                voltage_mv=12000,
                current_ma=600,
                **OBS,
            ),
        ),
        additional_loads=(),
        rails=(RailLimit(resource_id="R12", max_current_ma=1000, **OBS),),
        inventory=inventory(EPS="board_power", PCI="gpu_power"),
        assignments=(
            PowerAssignment(
                source_id="EPS",
                load_id="board_power",
                cable_psu_instance_id="psu",
                available_length_mm=600,
                required_length_mm=500,
                **OBS,
            ),
            PowerAssignment(
                source_id="PCI",
                load_id="gpu_power",
                cable_psu_instance_id="psu",
                available_length_mm=500,
                required_length_mm=500,
                **OBS,
            ),
        ),
    )


def test_power_exact_rail_boundary_local_pass_not_r05_approval():
    config = configuration(power=power_input())
    assert evaluated(config, "R06.otros_conectores").state == "pass"
    assert "implementation.R05" in evaluate_d(config).missing_fields


@pytest.mark.parametrize("change", ["kind", "rail", "cable_owner", "reach", "branch"])
def test_power_known_fail_without_interchanging_eight_pin_kinds(change):
    data = power_input().model_dump()
    if change == "kind":
        data["sources"][1]["kind"] = "EPS8"
    elif change == "rail":
        data["required_loads"][1]["current_ma"] = 601
    elif change == "cable_owner":
        data["assignments"][1]["cable_psu_instance_id"] = "removed_psu"
    elif change == "reach":
        data["assignments"][1]["required_length_mm"] = 501
    else:
        for load in data["required_loads"]:
            load["independent_group"] = "synthetic_independent_requirement"
        data["sources"][1]["branch_id"] = "B1"
    assert (
        evaluated(
            configuration(power=PowerInput.model_validate(data)), "R06.otros_conectores"
        ).state
        == "fail"
    )


def test_power_unknown_current_not_zero_conflicting_route_not_failure():
    data = power_input().model_dump()
    data["required_loads"][1]["current_ma"] = None
    result = evaluated(
        configuration(power=PowerInput.model_validate(data)), "R06.otros_conectores"
    )
    assert (
        result.state == "unknown" and "power.load.current_ma" in result.missing_fields
    )
    data = power_input().model_dump()
    data["sources"][1]["kind"] = "EPS8"
    data["assignments"][1]["status"] = "conflict"
    assert (
        evaluated(
            configuration(power=PowerInput.model_validate(data)), "R06.otros_conectores"
        ).state
        == "unknown"
    )


def test_power_multi_rail_atx_not_collapsed_to_single_voltage():
    data = power_input().model_dump()
    data["sources"][0]["kind"] = data["required_loads"][0]["kind"] = "ATX24"
    data["sources"][0]["channels"] = (
        ElectricalChannel(rail_id="R12", voltage_mv=12000, current_ma=500),
        ElectricalChannel(rail_id="R5", voltage_mv=5000, current_ma=200),
    )
    data["required_loads"][0]["channels"] = (
        ElectricalChannel(rail_id="R12", voltage_mv=12000, current_ma=400),
        ElectricalChannel(rail_id="R5", voltage_mv=5000, current_ma=100),
    )
    data["rails"] = (
        *data["rails"],
        RailLimit(resource_id="R5", max_current_ma=200, **OBS),
    )
    assert (
        evaluated(
            configuration(power=PowerInput.model_validate(data)), "R06.otros_conectores"
        ).state
        == "pass"
    )
    data["required_loads"][0]["channels"] = None
    result = evaluated(
        configuration(power=PowerInput.model_validate(data)), "R06.otros_conectores"
    )
    assert (
        result.state == "unknown"
        and "power.load.multi_rail_demands" in result.missing_fields
    )


def test_duplicate_power_connector_rejected_before_evaluation():
    data = power_input().model_dump()
    data["assignments"][1]["source_id"] = "EPS"
    with pytest.raises(ValidationError):
        PowerInput.model_validate(data)


def test_connector_cannot_be_assigned_again_by_the_legacy_adapter_route():
    data = configuration(power=power_input()).model_dump()
    data["adapter_route"] = {
        "gpu_instance_id": "gpu",
        "psu_instance_id": "psu",
        "mode": "pcie8_adapter",
        "assignments": ({"input_id": "adapter_A", "connector_id": "PCI"},),
    }
    with pytest.raises(ValidationError):
        ResolvedConfiguration.model_validate(data)


@pytest.mark.parametrize("current", [True, "1000", 0, -1])
def test_current_is_strict_positive_integer_or_unknown(current):
    data = power_input().model_dump()
    data["sources"][0]["max_current_ma"] = current
    with pytest.raises(ValidationError):
        PowerInput.model_validate(data)


def test_header_current_known_fail_does_not_disappear_with_unknown_other_loads():
    data = power_input().model_dump()
    data["sources"] = (
        *data["sources"],
        ElectricalSource(
            resource_id="HEADER",
            owner_instance_id="board",
            kind="fan4",
            voltage_mv=12000,
            max_current_ma=1000,
            rail_id="FAN_RAIL",
            **OBS,
        ),
    )
    data["additional_loads"] = (
        ElectricalLoad(
            resource_id="fan_load",
            owner_instance_id="fan",
            kind="fan4",
            voltage_mv=12000,
            current_ma=1001,
            **OBS,
        ),
    )
    data["inventory"] = inventory(EPS="board_power", PCI="gpu_power", HEADER="fan_load")
    data["assignments"] = (
        *data["assignments"],
        PowerAssignment(
            source_id="HEADER",
            load_id="fan_load",
            available_length_mm=300,
            required_length_mm=200,
            **OBS,
        ),
    )
    # No rail rating exists for this synthetic header feed, but its individual
    # connector overload is already known and must dominate that missing limit.
    result = evaluated(
        configuration(power=PowerInput.model_validate(data)), "R06.otros_conectores"
    )
    assert result.state == "fail"
    assert "power.rail.max_current_ma" in result.missing_fields


def storage_input():
    return StorageInput(
        motherboard_instance_id="board",
        ports=(
            StoragePort(
                resource_id="M2_2",
                protocols=("pcie_nvme",),
                protocols_exhaustive=True,
                sizes=("2280",),
                sizes_exhaustive=True,
                retentions=("screw",),
                disabled_by=("SATA3_5", "SATA3_6"),
                **OBS,
            ),
        ),
        devices=(
            StorageDevice(
                instance_id="disk",
                protocol="pcie_nvme",
                size="2280",
                max_temperature_c=70,
                **OBS,
            ),
        ),
        installations=(
            StorageInstallation(
                device_id="disk",
                port_id="M2_2",
                retention="screw",
                temperature_c=45,
                power_resource_id="M2_2",
                power_kind="slot",
                **OBS,
            ),
        ),
        inventory=inventory(M2_2="disk", SATA3_5=None, SATA3_6=None),
    )


def test_storage_local_pass_and_explicit_shared_conflict_preserves_unknown():
    assert evaluated(configuration(storage=storage_input()), "R09").state == "pass"
    data = storage_input().model_dump()
    data["inventory"] = inventory(M2_2="disk", SATA3_5="unresolved_disk", SATA3_6=None)
    data["installations"][0]["temperature_c"] = None
    result = evaluated(configuration(storage=StorageInput.model_validate(data)), "R09")
    assert result.state == "fail"
    assert "storage.installation.temperature_c" in result.missing_fields


@pytest.mark.parametrize("exhaustive,expected", [(None, "unknown"), (True, "fail")])
def test_storage_partial_supported_set_never_proves_unsupported(exhaustive, expected):
    data = storage_input().model_dump()
    data["devices"][0]["protocol"] = "sata"
    data["ports"][0]["protocols_exhaustive"] = exhaustive
    assert (
        evaluated(configuration(storage=StorageInput.model_validate(data)), "R09").state
        == expected
    )


def test_storage_no_devices_is_not_absence_without_explicit_inventory():
    data = storage_input().model_dump()
    data.update(devices=(), installations=(), inventory=None)
    assert (
        evaluated(configuration(storage=StorageInput.model_validate(data)), "R09").state
        == "unknown"
    )
    data["inventory"] = inventory(M2_2=None, SATA3_5=None, SATA3_6=None)
    result = evaluated(configuration(storage=StorageInput.model_validate(data)), "R09")
    assert result.state == "not_applicable" and result.conditions and result.evidence


def sata_pair():
    """Two physical SATA plugs on ONE branch; never two uses of one plug."""
    power = power_input().model_dump()
    storage_ports, devices, installations = [], [], []
    sources, loads, assignments = [], [], []
    occupations = {"EPS": "board_power", "PCI": "gpu_power"}
    storage_occupations = {}
    for index, device_id in enumerate(("disk", "disk2"), 1):
        port_id = f"SATA{index}"
        source_id = f"SATA_PWR{index}"
        load_id = device_id + "_power"
        sources.append(
            ElectricalSource(
                resource_id=source_id,
                owner_instance_id="psu",
                kind="SATA-power",
                voltage_mv=5000,
                max_current_ma=1000,
                rail_id="R5",
                branch_id="ONE_SHARED_BRANCH",
                **OBS,
            )
        )
        loads.append(
            ElectricalLoad(
                resource_id=load_id,
                owner_instance_id=device_id,
                kind="SATA-power",
                voltage_mv=5000,
                current_ma=200,
                **OBS,
            )
        )
        assignments.append(
            PowerAssignment(
                source_id=source_id,
                load_id=load_id,
                cable_psu_instance_id="psu",
                available_length_mm=400,
                required_length_mm=300,
                **OBS,
            )
        )
        storage_ports.append(
            StoragePort(
                resource_id=port_id,
                protocols=("sata",),
                protocols_exhaustive=True,
                sizes=("2.5-inch",),
                sizes_exhaustive=True,
                retentions=("tray",),
                disabled_by=(),
                **OBS,
            )
        )
        devices.append(
            StorageDevice(
                instance_id=device_id,
                protocol="sata",
                size="2.5-inch",
                max_temperature_c=70,
                **OBS,
            )
        )
        installations.append(
            StorageInstallation(
                device_id=device_id,
                port_id=port_id,
                power_resource_id=source_id,
                power_kind="SATA-power",
                retention="tray",
                temperature_c=40,
                **OBS,
            )
        )
        occupations[source_id] = load_id
        storage_occupations.update({port_id: device_id, source_id: load_id})
    power.update(
        sources=(*power["sources"], *sources),
        additional_loads=tuple(loads),
        assignments=(*power["assignments"], *assignments),
        rails=(
            *power["rails"],
            RailLimit(resource_id="R5", max_current_ma=1000, **OBS),
        ),
        inventory=inventory(**occupations),
    )
    return PowerInput.model_validate(power), StorageInput(
        motherboard_instance_id="board",
        ports=tuple(storage_ports),
        devices=tuple(devices),
        installations=tuple(installations),
        inventory=inventory(**storage_occupations),
    )


def test_storage_rejects_one_physical_sata_plug_for_two_disks():
    _, storage = sata_pair()
    data = storage.model_dump()
    data["installations"][1]["power_resource_id"] = "SATA_PWR1"
    data["inventory"] = inventory(
        SATA1="disk",
        SATA2="disk2",
        SATA_PWR1=None,
    )
    with pytest.raises(ValidationError, match="storage physical power connectors"):
        StorageInput.model_validate(data)


def test_distinct_sata_plugs_on_same_branch_pass_local_without_mutation():
    power, storage = sata_pair()
    config = configuration(power=power, storage=storage)
    before = deepcopy(config.model_dump())
    assert evaluated(config, "R09").state == "pass"
    assert evaluated(config, "R06.otros_conectores").state == "pass"
    assert config.model_dump() == before


def test_storage_sata_power_requires_matching_electrical_source_and_load():
    power, storage = sata_pair()
    result = evaluated(configuration(storage=storage), "R09")
    assert result.state == "unknown"
    assert "storage.installation.electrical_source" in result.missing_fields
    for change in ("kind", "owner"):
        data = power.model_dump()
        if change == "kind":
            data["sources"][-1]["kind"] = "EPS8"
        else:
            data["additional_loads"][1]["owner_instance_id"] = "gpu"
        with pytest.raises(ValidationError):
            ResourceInputs(power=PowerInput.model_validate(data), storage=storage)


def test_storage_slot_power_cannot_borrow_another_slot():
    data = storage_input().model_dump()
    data["installations"][0]["power_resource_id"] = "OTHER_M2"
    with pytest.raises(ValidationError, match="own port"):
        StorageInput.model_validate(data)


def test_cross_family_free_vs_occupied_inventory_rejected_before_evaluation():
    power, storage = sata_pair()
    data = storage.model_dump()
    data["ports"][0]["resource_id"] = "SATA3_5"
    data["installations"][0]["port_id"] = "SATA3_5"
    data["inventory"] = inventory(
        SATA3_5="disk",
        SATA2="disk2",
        SATA_PWR1="disk_power",
        SATA_PWR2="disk2_power",
    )
    storage = StorageInput.model_validate(data)
    data = pcie_input().model_dump()
    data["slots"][0]["disabled_by"] = ("SATA3_5",)
    data["inventory"] = inventory(PCIE1="gpu", SATA3_5=None)
    pcie = PcieInput.model_validate(data)
    assert evaluated(configuration(pcie=pcie), "R03").state == "pass"
    assert evaluated(configuration(power=power, storage=storage), "R09").state == "pass"
    with pytest.raises(ValidationError, match="cross-family inventory"):
        configuration(pcie=pcie, power=power, storage=storage)


@pytest.mark.parametrize("change", ["unknown", "conflict", "parent", "evidence"])
def test_overlapping_unknown_inventory_never_inherits_documented_free(change):
    data = inventory(SHARED=None).model_dump()
    if change == "parent":
        data["status"] = "unknown"
    elif change == "evidence":
        data["occupancy"][0]["evidence"] = ()
    else:
        data["occupancy"][0]["status"] = change
    with pytest.raises(ValidationError, match="cross-family inventory"):
        ResourceInputs(
            pcie=PcieInput(inventory=Inventory.model_validate(data)),
            storage=StorageInput(inventory=inventory(SHARED=None)),
        )
    uncertain = Inventory.model_validate(data)
    config = configuration(
        pcie=PcieInput(inventory=uncertain),
        storage=StorageInput(inventory=uncertain),
    )
    assert evaluated(config, "R03").state == "unknown"
    assert evaluated(config, "R09").state == "unknown"


def test_global_resource_id_cannot_be_both_pcie_and_storage_port():
    with pytest.raises(ValidationError, match="global resource type"):
        ResourceInputs(
            pcie=PcieInput(slots=(PcieSlot(resource_id="SHARED", **OBS),)),
            storage=StorageInput(ports=(StoragePort(resource_id="SHARED", **OBS),)),
        )


def test_power_assignment_cannot_override_documented_other_occupation():
    data = power_input().model_dump()
    data["inventory"] = inventory(EPS="board_power", PCI="board_power")
    with pytest.raises(ValidationError, match="contradicts resource occupation"):
        ResourceInputs(power=PowerInput.model_validate(data))


def test_legacy_adapter_inventory_cannot_disagree_with_resource_inventory():
    data = configuration(power=power_input()).model_dump()
    data["adapter_route"] = {
        "gpu_instance_id": "gpu",
        "psu_instance_id": "psu",
        "mode": "pcie8_adapter",
        "inventory": {
            "connectors": (
                {"connector_id": "PCI", "kind": "pcie8", "availability": "free"},
            ),
            "complete": True,
            **OBS,
        },
    }
    with pytest.raises(ValidationError, match="adaptador/recursos"):
        ResolvedConfiguration.model_validate(data)


def test_legacy_adapter_input_cannot_duplicate_new_power_load():
    data = configuration(power=power_input()).model_dump()
    data["adapter_route"] = {
        "gpu_instance_id": "gpu",
        "psu_instance_id": "psu",
        "mode": "pcie8_adapter",
        "assignments": ({"input_id": "board_power", "connector_id": "OTHER_PCI"},),
    }
    with pytest.raises(ValidationError, match="Entrada reutilizada"):
        ResolvedConfiguration.model_validate(data)


def test_legacy_connector_cannot_alias_storage_port_with_matching_occupation():
    data = configuration(storage=storage_input()).model_dump()
    data["adapter_route"] = {
        "gpu_instance_id": "gpu",
        "psu_instance_id": "psu",
        "mode": "pcie8_adapter",
        "inventory": {
            "connectors": (
                {
                    "connector_id": "M2_2",
                    "kind": "pcie8",
                    "availability": "occupied",
                    "occupied_by": "disk",
                },
            ),
            "complete": True,
            **OBS,
        },
    }
    with pytest.raises(ValidationError, match="Tipo global"):
        ResolvedConfiguration.model_validate(data)


def test_resource_validation_accepts_no_client_owner_and_mutates_no_owner_data():
    for blocks in ({"owner_id": "PRIVATE"}, {"user_id": "PRIVATE"}):
        before = deepcopy(blocks)
        with pytest.raises(ValidationError):
            ResourceInputs.model_validate(blocks)
        assert blocks == before


def front_input():
    return FrontInput(
        motherboard_instance_id="board",
        case_instance_id="case",
        headers=(
            FrontPort(
                resource_id="USB1", kind="USB19", max_rate_mbps=5000, channels=2, **OBS
            ),
        ),
        cables=(
            FrontPort(
                resource_id="case_USB",
                kind="USB19",
                functions=(FunctionCount(function="usb_a", count=2),),
                max_rate_mbps=5000,
                **OBS,
            ),
        ),
        case_observation=Observed(**OBS),
        required_functions=(
            FunctionCount(function="usb_a", count=2, minimum_rate_mbps=5000),
        ),
        requirements_evidence=(REF,),
        inventory=inventory(USB1="case_USB"),
        adapters=(),
        routes=(
            FrontRoute(
                header_id="USB1",
                cable_id="case_USB",
                available_length_mm=500,
                required_length_mm=400,
                **OBS,
            ),
        ),
    )


def test_front_local_pass_and_loss_not_silently_disabled():
    assert evaluated(configuration(front=front_input()), "R10").state == "pass"
    data = front_input().model_dump()
    data["required_functions"] = (
        *data["required_functions"],
        FunctionCount(function="reset", count=1),
    )
    data["inventory"] = None
    result = evaluated(configuration(front=FrontInput.model_validate(data)), "R10")
    assert result.state == "fail" and "front.inventory" in result.missing_fields
    data["case_observation"]["status"] = "conflict"
    assert (
        evaluated(configuration(front=FrontInput.model_validate(data)), "R10").state
        == "unknown"
    )


def test_front_adapter_rate_is_minimum_of_path_and_clearance_is_not_assumed():
    data = front_input().model_dump()
    data["cables"][0].update(
        kind="USB-Key-A",
        functions=(FunctionCount(function="usb_c", count=1),),
        max_rate_mbps=10000,
    )
    data["required_functions"] = (
        FunctionCount(function="usb_c", count=1, minimum_rate_mbps=5000),
    )
    data["routes"][0].update(adapter_id="A1", available_clearance_mm=31)
    data["adapters"] = (
        FrontAdapter(
            resource_id="A1",
            input_kind="USB19",
            output_kind="USB-Key-A",
            max_rate_mbps=10000,
            envelope_mm=30,
            channels=1,
            **OBS,
        ),
    )
    result = evaluated(configuration(front=FrontInput.model_validate(data)), "R10")
    assert result.state == "pass"
    assert any(
        f.name == "front_effective_rate_mbps" and f.value == 5000 for f in result.facts
    )
    data["routes"][0]["available_clearance_mm"] = None
    assert (
        evaluated(configuration(front=FrontInput.model_validate(data)), "R10").state
        == "unknown"
    )
    data["routes"][0]["available_clearance_mm"] = 29
    assert (
        evaluated(configuration(front=FrontInput.model_validate(data)), "R10").state
        == "fail"
    )


def test_two_cables_cannot_reuse_one_header():
    data = front_input().model_dump()
    data["cables"] = (
        *data["cables"],
        {**data["cables"][0], "resource_id": "other_cable"},
    )
    data["routes"] = (*data["routes"], {**data["routes"][0], "cable_id": "other_cable"})
    with pytest.raises(ValidationError):
        FrontInput.model_validate(data)


def test_server_resolution_nominal_only_does_not_parse_private_notes():
    selected = base()
    selected.components.extend(
        (
            ComponentGroup(category="gpu", component_id="P06", quantity=1),
            ComponentGroup(category="psu", component_id="P07", quantity=1),
            ComponentGroup(category="case", component_id="P09", quantity=1),
        )
    )
    selected.context.notes = (
        "GPU PCIE1; M2_1 occupied, all SATA empty; cables confirmed"
    )
    catalog = {p.id: p.model_copy(deep=True) for p in COMPONENTS}
    before = deepcopy(selected.model_dump())
    result = resolve_configuration(selected, catalog, 1, DATASET_VERSION)
    resources = result.resources
    assert resources.pcie.gpu.generation == 4
    assert resources.pcie.gpu.physical_lanes is None
    assert resources.pcie.selected_slot_id is None and resources.pcie.inventory is None
    assert resources.storage.devices is None and resources.storage.installations is None
    assert (
        resources.power.assignments is None and resources.power.additional_loads is None
    )
    assert (
        next(
            s for s in resources.power.sources if s.resource_id == "CPU_FAN1"
        ).max_current_ma
        == 1000
    )
    assert (
        next(
            s for s in resources.power.sources if s.resource_id == "CHA_FAN1"
        ).max_current_ma
        == 2000
    )
    assert resources.front.required_functions is None and resources.front.routes is None
    assert {p.resource_id for p in resources.front.headers if p.kind == "USB19"} == {
        "F_USB3_1_2",
        "F_USB3_3_4",
    }
    assert next(
        p for p in resources.storage.ports if p.resource_id == "M2_2"
    ).disabled_by == ("SATA3_5", "SATA3_6")
    assert result.data_revision.endswith("|resource-evidence-25.1")
    catalog["P03"].attributes["memory_type"] = None
    invalidated = resolve_configuration(selected, catalog, 1, "edited")
    assert invalidated.resources.pcie.slots == ()
    assert invalidated.resources.front.headers == ()
    assert invalidated.resources.storage.ports == ()
    assert not evaluate_d(invalidated).coverage.complete
    assert selected.model_dump() == before
