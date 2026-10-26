"""Additive nominal extract from identified F03/F06/F07/F09–F13/F22.

No installed maps, auxiliary devices, CPU link tables, GPU lane counts or CP14-E
are inferred. Published evidence is guarded by the same exact envelope as R02/R07.
"""

from .platform_curation import references
from .resource_models import (
    ElectricalLoad,
    ElectricalSource,
    FrontInput,
    FrontPort,
    FunctionCount,
    GpuInterface,
    Observed,
    PcieInput,
    PcieSlot,
    PowerInput,
    ResourceInputs,
    StorageInput,
    StoragePort,
)

RESOURCE_EXTRACT_VERSION = "resource-evidence-25.1"


def resolve_resources(parts, catalog):
    def selected(category):
        items = [p for p in parts if p.category == category]
        return items[0] if len(items) == 1 else None

    def evidence(part):
        if part is None:
            return ()
        return references(catalog[part.part_id], catalog)

    cpu, board, gpu, psu, case = (
        selected(c) for c in ("cpu", "motherboard", "gpu", "psu", "case")
    )
    board_refs, gpu_refs, psu_refs, case_refs = (
        evidence(p) for p in (board, gpu, psu, case)
    )
    board_known = (
        board is not None and board.part_id in ("P03", "P18") and bool(board_refs)
    )
    slots, storage_ports, sources, loads, headers, cables = [], [], [], [], [], []
    if board_known:
        slots.append(
            PcieSlot(resource_id="PCIE1", physical_lanes=16, evidence=board_refs)
        )
        storage_ports.extend(
            (
                StoragePort(
                    resource_id="M2_1",
                    protocols=("pcie_nvme",),
                    sizes=("2280",),
                    disabled_by=(),
                    evidence=board_refs,
                ),
                StoragePort(
                    resource_id="M2_2",
                    disabled_by=("SATA3_5", "SATA3_6"),
                    evidence=board_refs,
                ),
                StoragePort(
                    resource_id="SATA3_5",
                    protocols=("sata",),
                    disabled_by=("M2_2",),
                    evidence=board_refs,
                ),
                StoragePort(
                    resource_id="SATA3_6",
                    protocols=("sata",),
                    disabled_by=("M2_2",),
                    evidence=board_refs,
                ),
            )
        )
        for resource_id, kind in (("ATXPWR1", "ATX24"), ("ATX12V1", "EPS8")):
            loads.append(
                ElectricalLoad(
                    resource_id=resource_id,
                    owner_instance_id=board.instance_id,
                    kind=kind,
                    evidence=board_refs,
                )
            )
        for resource_id, current in (
            ("CPU_FAN1", 1000),
            ("CHA_FAN1", 2000),
            ("CHA_FAN2", 2000),
            ("CHA_FAN3", 2000),
            ("CHA_FAN4", 2000),
        ):
            sources.append(
                ElectricalSource(
                    resource_id=resource_id,
                    owner_instance_id=board.instance_id,
                    kind="fan4",
                    max_current_ma=current,
                    evidence=board_refs,
                )
            )
        for resource_id, kind, rate, channels in (
            ("F_USB3_1_2", "USB19", 5000, 2),
            ("F_USB3_3_4", "USB19", 5000, 2),
            ("HD_AUDIO1", "HD_AUDIO", None, 1),
            ("PANEL1_power", "power-switch", None, 1),
            ("PANEL1_reset", "reset-switch", None, 1),
        ):
            # Names here are P03's documented resources; do not alias P18 headers.
            if board.part_id == "P03":
                headers.append(
                    FrontPort(
                        resource_id=resource_id,
                        kind=kind,
                        max_rate_mbps=rate,
                        channels=channels,
                        evidence=board_refs,
                    )
                )
    gpu_spec = None
    if gpu is not None:
        generation = {"P06": 4, "P15": 5}.get(gpu.part_id) if gpu_refs else None
        gpu_spec = GpuInterface(
            instance_id=gpu.instance_id,
            generation=generation,
            evidence=gpu_refs,
            status="documented" if gpu_refs else "unknown",
        )
        kind = {"P06": "PCIe8", "P15": "GPU16"}.get(gpu.part_id)
        if kind is not None and gpu_refs:
            loads.append(
                ElectricalLoad(
                    resource_id="GPU_power",
                    owner_instance_id=gpu.instance_id,
                    kind=kind,
                    evidence=gpu_refs,
                )
            )
    if psu is not None and psu_refs:
        if psu.part_id == "P07":
            definitions = (
                ("CX_ATX1", "ATX24", None),
                ("CX_EPS1", "EPS8", None),
                ("CX_PCI1_a", "PCIe8", "CX_PCI1"),
                ("CX_PCI1_b", "PCIe8", "CX_PCI1"),
            )
        elif psu.part_id == "P08":
            # Conflicting spare PCIe counts/rail ratings are intentionally omitted.
            definitions = (
                ("RM_ATX1", "ATX24", None),
                ("RM_EPS1", "EPS8", None),
                ("RM_EPS2", "EPS8", None),
                ("RM_16N1", "GPU16", "RM_16N1"),
            )
        else:
            definitions = ()
        for resource_id, kind, branch_id in definitions:
            sources.append(
                ElectricalSource(
                    resource_id=resource_id,
                    owner_instance_id=psu.instance_id,
                    kind=kind,
                    branch_id=branch_id,
                    evidence=psu_refs,
                )
            )
    case_observation = None
    if case is not None and case_refs and case.part_id in ("P09", "P10"):
        definitions = (
            (
                ("case_USB_A", "USB19", "usb_a", 1, 5000),
                ("case_USB_C", "USB-Key-A", "usb_c", 1, 5000),
                ("case_audio", "HD_AUDIO", "audio_combined", 1, None),
                ("case_power", "power-switch", "power", 1, None),
            )
            if case.part_id == "P09"
            else (
                ("case_USB_A", "USB19", "usb_a", 2, 5000),
                ("case_audio", "HD_AUDIO", "audio_separate", 1, None),
                ("case_power", "power-switch", "power", 1, None),
                ("case_reset", "reset-switch", "reset", 1, None),
            )
        )
        case_observation = Observed(evidence=case_refs)
        for resource_id, kind, function, count, rate in definitions:
            cables.append(
                FrontPort(
                    resource_id=resource_id,
                    kind=kind,
                    functions=(FunctionCount(function=function, count=count),),
                    max_rate_mbps=rate,
                    evidence=case_refs,
                )
            )
    return ResourceInputs(
        pcie=PcieInput(
            cpu_instance_id=cpu.instance_id if cpu else None,
            motherboard_instance_id=board.instance_id if board else None,
            gpu=gpu_spec,
            slots=tuple(slots),
        ),
        power=PowerInput(
            psu_instance_id=psu.instance_id if psu else None,
            motherboard_instance_id=board.instance_id if board else None,
            gpu_instance_id=gpu.instance_id if gpu else None,
            sources=tuple(sources),
            required_loads=tuple(loads),
        ),
        storage=StorageInput(
            motherboard_instance_id=board.instance_id if board else None,
            ports=tuple(storage_ports),
        ),
        front=FrontInput(
            motherboard_instance_id=board.instance_id if board else None,
            case_instance_id=case.instance_id if case else None,
            headers=tuple(headers),
            cables=tuple(cables),
            case_observation=case_observation,
        ),
    )
