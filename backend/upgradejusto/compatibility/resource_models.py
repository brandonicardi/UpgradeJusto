"""Typed resolved resources, internal only. No client results or installed defaults."""

from typing import Annotated, Literal, Self

from pydantic import Field, model_validator

from .observations import DomainModel, EvidenceRef, EvidenceStatus, Text

Positive = Annotated[int, Field(gt=0)]
Lanes = Literal[1, 4, 8, 16]
Generation = Literal[1, 2, 3, 4, 5]
ElectricalKind = Literal[
    "ATX24", "EPS8", "EPS4", "PCIe8", "GPU16", "SATA-power", "fan4"
]
FrontKind = Literal["USB19", "USB-Key-A", "HD_AUDIO", "power-switch", "reset-switch"]
FrontFunction = Literal[
    "usb_a", "usb_c", "audio_combined", "audio_separate", "power", "reset"
]
Protocol = Literal["pcie_nvme", "sata"]
DeviceSize = Literal["2242", "2260", "2280", "2.5-inch", "3.5-inch"]


def distinct(values, label):
    if len(values) != len(set(values)):
        raise ValueError("Duplicate " + label)


class Observed(DomainModel):
    status: EvidenceStatus = "documented"
    evidence: tuple[EvidenceRef, ...] = ()


class Occupation(Observed):
    resource_id: Text
    # None explicitly records a free resource, unlike an omitted occupancy map.
    occupant_id: Text | None


class Inventory(Observed):
    complete: bool | None = None
    occupancy: tuple[Occupation, ...] | None = None

    @model_validator(mode="after")
    def unique_resources(self) -> Self:
        if self.occupancy is not None:
            distinct(tuple(o.resource_id for o in self.occupancy), "resource IDs")
        return self


class Link(DomainModel):
    generation: Generation
    lanes: Lanes


class GpuInterface(Observed):
    instance_id: Text
    physical_lanes: Lanes | None = None
    generation: Generation | None = None
    supported_links: tuple[Link, ...] | None = None
    supported_links_exhaustive: bool | None = None


class PcieSlot(Observed):
    resource_id: Text
    physical_lanes: Lanes | None = None
    # Only an exact CPU/board table may supply these, not board generation alone.
    supported_links: tuple[Link, ...] | None = None
    supported_links_exhaustive: bool | None = None
    cpu_instance_id: Text | None = None
    disabled_by: tuple[Text, ...] | None = None


class PcieInput(DomainModel):
    cpu_instance_id: Text | None = None
    motherboard_instance_id: Text | None = None
    gpu: GpuInterface | None = None
    slots: tuple[PcieSlot, ...] = ()
    selected_slot_id: Text | None = None
    selection_observation: Observed | None = None
    inventory: Inventory | None = None

    @model_validator(mode="after")
    def unique_slots(self) -> Self:
        distinct(tuple(s.resource_id for s in self.slots), "PCIe slots")
        return self


class ElectricalChannel(DomainModel):
    rail_id: Text
    voltage_mv: Positive
    current_ma: Positive


class ElectricalSource(Observed):
    resource_id: Text
    owner_instance_id: Text
    kind: ElectricalKind
    voltage_mv: Positive | None = None
    max_current_ma: Positive | None = None
    rail_id: Text | None = None
    branch_id: Text | None = None
    channels: tuple[ElectricalChannel, ...] | None = None

    @model_validator(mode="after")
    def unique_channels(self) -> Self:
        distinct(tuple(c.rail_id for c in self.channels or ()), "source channels")
        return self


class ElectricalLoad(Observed):
    resource_id: Text
    owner_instance_id: Text
    kind: ElectricalKind
    voltage_mv: Positive | None = None
    current_ma: Positive | None = None
    independent_group: Text | None = None
    channels: tuple[ElectricalChannel, ...] | None = None

    @model_validator(mode="after")
    def unique_channels(self) -> Self:
        distinct(tuple(c.rail_id for c in self.channels or ()), "load channels")
        return self


class RailLimit(Observed):
    resource_id: Text
    max_current_ma: Positive | None = None


class PowerAssignment(Observed):
    source_id: Text
    load_id: Text
    # For PSU cables, the observed compatible cable-set owner must match the PSU.
    cable_psu_instance_id: Text | None = None
    available_length_mm: Positive | None = None
    required_length_mm: Positive | None = None


class PowerInput(DomainModel):
    psu_instance_id: Text | None = None
    motherboard_instance_id: Text | None = None
    gpu_instance_id: Text | None = None
    sources: tuple[ElectricalSource, ...] = ()
    required_loads: tuple[ElectricalLoad, ...] = ()
    additional_loads: tuple[ElectricalLoad, ...] | None = None
    rails: tuple[RailLimit, ...] | None = None
    inventory: Inventory | None = None
    assignments: tuple[PowerAssignment, ...] | None = None

    @model_validator(mode="after")
    def unique_resources(self) -> Self:
        distinct(tuple(s.resource_id for s in self.sources), "power sources")
        loads = (*self.required_loads, *(self.additional_loads or ()))
        distinct(tuple(s.resource_id for s in loads), "power loads")
        distinct(
            tuple(s.resource_id for s in (*self.sources, *loads)),
            "electrical resource IDs",
        )
        if self.rails is not None:
            distinct(tuple(r.resource_id for r in self.rails), "rails")
        if self.assignments is not None:
            distinct(
                tuple(a.source_id for a in self.assignments), "power source assignments"
            )
            distinct(
                tuple(a.load_id for a in self.assignments), "power load assignments"
            )
            if any(
                a.source_id not in {s.resource_id for s in self.sources}
                for a in self.assignments
            ):
                raise ValueError("Unresolved power source")
            if any(
                a.load_id not in {s.resource_id for s in loads}
                for a in self.assignments
            ):
                raise ValueError("Unresolved power load")
        return self


class StoragePort(Observed):
    resource_id: Text
    protocols: tuple[Protocol, ...] | None = None
    protocols_exhaustive: bool | None = None
    sizes: tuple[DeviceSize, ...] | None = None
    sizes_exhaustive: bool | None = None
    retentions: tuple[Literal["screw", "latch", "tray"], ...] | None = None
    disabled_by: tuple[Text, ...] | None = None


class StorageDevice(Observed):
    instance_id: Text
    protocol: Protocol | None = None
    size: DeviceSize | None = None
    max_temperature_c: Annotated[int, Field(gt=0, le=150)] | None = None


class StorageInstallation(Observed):
    device_id: Text
    port_id: Text
    retention: Literal["screw", "latch", "tray"] | None = None
    temperature_c: Annotated[int, Field(ge=-30, le=150)] | None = None
    power_resource_id: Text | None = None
    power_kind: Literal["slot", "SATA-power"] | None = None


class StorageInput(DomainModel):
    motherboard_instance_id: Text | None = None
    ports: tuple[StoragePort, ...] = ()
    devices: tuple[StorageDevice, ...] | None = None
    installations: tuple[StorageInstallation, ...] | None = None
    inventory: Inventory | None = None

    @model_validator(mode="after")
    def unique_resources(self) -> Self:
        distinct(tuple(p.resource_id for p in self.ports), "storage ports")
        if self.devices is not None:
            distinct(tuple(d.instance_id for d in self.devices), "storage devices")
        if self.installations is not None:
            distinct(
                tuple(i.port_id for i in self.installations), "storage port assignments"
            )
            distinct(
                tuple(i.device_id for i in self.installations),
                "storage device assignments",
            )
            distinct(
                tuple(
                    i.power_resource_id
                    for i in self.installations
                    if i.power_resource_id is not None
                ),
                "storage physical power connectors",
            )
            if any(
                i.power_kind == "slot"
                and i.power_resource_id is not None
                and i.power_resource_id != i.port_id
                for i in self.installations
            ):
                raise ValueError("Storage slot power must refer to its own port")
            if self.devices is not None and any(
                i.device_id not in {d.instance_id for d in self.devices}
                for i in self.installations
            ):
                raise ValueError("Unresolved storage device")
        return self


class FunctionCount(DomainModel):
    function: FrontFunction
    count: Positive
    minimum_rate_mbps: Positive | None = None


class FrontPort(Observed):
    resource_id: Text
    kind: FrontKind
    functions: tuple[FunctionCount, ...] = ()
    max_rate_mbps: Positive | None = None
    channels: Positive | None = None

    @model_validator(mode="after")
    def unique_functions(self) -> Self:
        distinct(tuple(f.function for f in self.functions), "cable functions")
        return self


class FrontAdapter(Observed):
    resource_id: Text
    input_kind: FrontKind
    output_kind: FrontKind
    max_rate_mbps: Positive | None = None
    envelope_mm: Positive | None = None
    channels: Positive | None = None


class FrontRoute(Observed):
    header_id: Text
    cable_id: Text
    adapter_id: Text | None = None
    available_length_mm: Positive | None = None
    required_length_mm: Positive | None = None
    available_clearance_mm: Positive | None = None


class FrontInput(DomainModel):
    motherboard_instance_id: Text | None = None
    case_instance_id: Text | None = None
    headers: tuple[FrontPort, ...] = ()
    cables: tuple[FrontPort, ...] = ()
    case_observation: Observed | None = None
    adapters: tuple[FrontAdapter, ...] | None = None
    # Taken from an explicit prior functional requirement, never a global pass flag.
    required_functions: tuple[FunctionCount, ...] | None = None
    requirements_evidence: tuple[EvidenceRef, ...] = ()
    requirements_status: EvidenceStatus = "documented"
    inventory: Inventory | None = None
    routes: tuple[FrontRoute, ...] | None = None

    @model_validator(mode="after")
    def unique_resources(self) -> Self:
        distinct(tuple(p.resource_id for p in self.headers), "front headers")
        distinct(tuple(p.resource_id for p in self.cables), "front cables")
        if self.required_functions is not None:
            distinct(
                tuple(f.function for f in self.required_functions), "front functions"
            )
        if self.adapters is not None:
            distinct(tuple(a.resource_id for a in self.adapters), "front adapters")
        distinct(
            tuple(
                p.resource_id
                for p in (*self.headers, *self.cables, *(self.adapters or ()))
            ),
            "front resource IDs",
        )
        if self.routes is not None:
            distinct(
                tuple(r.header_id for r in self.routes), "front header assignments"
            )
            distinct(tuple(r.cable_id for r in self.routes), "front cable assignments")
            used = tuple(r.adapter_id for r in self.routes if r.adapter_id is not None)
            distinct(used, "front adapter assignments")
            if any(
                r.header_id not in {h.resource_id for h in self.headers}
                for r in self.routes
            ):
                raise ValueError("Unresolved front header")
            if any(
                r.cable_id not in {c.resource_id for c in self.cables}
                for r in self.routes
            ):
                raise ValueError("Unresolved front cable")
        return self


class ResourceInputs(DomainModel):
    pcie: PcieInput | None = None
    power: PowerInput | None = None
    storage: StorageInput | None = None
    front: FrontInput | None = None

    def inventory_observations(self):
        observations = {}
        for block in (self.pcie, self.power, self.storage, self.front):
            inventory = block.inventory if block is not None else None
            if inventory is None:
                continue
            for item in inventory.occupancy or ():
                signature = (
                    inventory.status,
                    bool(inventory.evidence),
                    item.status,
                    bool(item.evidence),
                    item.occupant_id,
                )
                if item.resource_id in observations:
                    if observations[item.resource_id] != signature:
                        raise ValueError("Inconsistent cross-family inventory")
                observations[item.resource_id] = signature
        return observations

    @model_validator(mode="after")
    def coherent_resources(self) -> Self:
        # Reject ambiguous overlaps as input errors, never as hardware failures.
        # Evidence URLs may differ, but value and evidence status must agree.
        observations = self.inventory_observations()
        definitions = {}

        def register(resource_id, signature):
            if resource_id in definitions and definitions[resource_id] != signature:
                raise ValueError("Inconsistent global resource type or owner")
            definitions[resource_id] = signature

        if self.pcie is not None:
            for slot in self.pcie.slots:
                register(slot.resource_id, ("pcie", self.pcie.motherboard_instance_id))
        if self.storage is not None:
            for port in self.storage.ports:
                register(
                    port.resource_id, ("storage", self.storage.motherboard_instance_id)
                )
        if self.front is not None:
            for role, ports in (
                ("header", self.front.headers),
                ("cable", self.front.cables),
            ):
                for port in ports:
                    register(port.resource_id, (role, port.kind))
            for adapter in self.front.adapters or ():
                register(
                    adapter.resource_id,
                    ("adapter", adapter.input_kind, adapter.output_kind),
                )
        sources, loads, assignments = {}, {}, {}
        if self.power is not None:
            for source in self.power.sources:
                register(
                    source.resource_id,
                    ("electrical", source.owner_instance_id, source.kind),
                )
                sources[source.resource_id] = source
            for load in (
                *self.power.required_loads,
                *(self.power.additional_loads or ()),
            ):
                register(load.resource_id, ("load", load.owner_instance_id, load.kind))
                loads[load.resource_id] = load
            for rail in self.power.rails or ():
                register(rail.resource_id, ("rail",))
            for assignment in self.power.assignments or ():
                assignments[assignment.source_id] = assignment
                observation = observations.get(assignment.source_id)
                if (
                    observation is not None
                    and observation[:4] == ("documented", True, "documented", True)
                    and observation[4] not in (None, assignment.load_id)
                    and assignment.status == "documented"
                    and assignment.evidence
                ):
                    raise ValueError("Power assignment contradicts resource occupation")
        if self.storage is not None:
            for installation in self.storage.installations or ():
                if installation.power_kind != "SATA-power":
                    continue
                resource_id = installation.power_resource_id
                if resource_id is None:
                    continue
                if resource_id in definitions and resource_id not in sources:
                    raise ValueError("Storage power must refer to an electrical source")
                source = sources.get(resource_id)
                if source is not None and source.kind != "SATA-power":
                    raise ValueError("Storage connector electrical kind mismatch")
                assignment = assignments.get(resource_id)
                if assignment is not None:
                    load = loads[assignment.load_id]
                    if (
                        load.owner_instance_id != installation.device_id
                        or load.kind != "SATA-power"
                    ):
                        raise ValueError("Storage connector assigned to another load")
        return self

    def part_references(self):
        refs = []
        for block in (self.pcie, self.power, self.storage, self.front):
            if block is not None:
                for category in ("cpu", "motherboard", "psu", "gpu", "case"):
                    identity = getattr(block, category + "_instance_id", None)
                    if identity is not None:
                        refs.append((identity, category))
        if self.pcie is not None and self.pcie.gpu is not None:
            refs.append((self.pcie.gpu.instance_id, "gpu"))
        if self.pcie is not None:
            refs.extend(
                (s.cpu_instance_id, "cpu")
                for s in self.pcie.slots
                if s.cpu_instance_id is not None
            )
        if self.power is not None:
            for source in self.power.sources:
                category = (
                    "motherboard"
                    if source.owner_instance_id == self.power.motherboard_instance_id
                    else "psu"
                )
                refs.append((source.owner_instance_id, category))
            for load in (
                *self.power.required_loads,
                *(self.power.additional_loads or ()),
            ):
                category = (
                    "motherboard"
                    if load.owner_instance_id == self.power.motherboard_instance_id
                    else "gpu"
                    if load.owner_instance_id == self.power.gpu_instance_id
                    else "other"
                )
                refs.append((load.owner_instance_id, category))
        if self.storage is not None:
            refs.extend((d.instance_id, "other") for d in self.storage.devices or ())
        return tuple(refs)
