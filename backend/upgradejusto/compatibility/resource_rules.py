"""Deterministic resource predicates. Nominal catalogs are not installed maps."""

from .models import Fact
from .rules import _result


class Checks:
    def __init__(self, rule_id):
        self.rule_id = rule_id
        self.refs, self.missing, self.facts = [], [], []
        self.failed = False

    def observed(self, observation, path):
        if observation is not None:
            self.refs.extend(observation.evidence)
        if (
            observation is None
            or observation.status != "documented"
            or not observation.evidence
        ):
            self.missing.append(path)
            return False
        return True

    def field(self, observation, name, path):
        if not self.observed(observation, path):
            return None
        value = getattr(observation, name)
        return self.need(value, path)

    def need(self, value, path):
        if value is None:
            self.missing.append(path)
        return value

    def compare(self, name, left, right, predicate):
        if left is not None and right is not None:
            passed = predicate(left, right)
            self.failed |= not passed
            self.facts.append(Fact(name=name, value=passed))

    def inventory(self, inventory, path):
        valid = self.observed(inventory, path)
        if inventory is None:
            return {}
        if not valid or inventory.complete is not True:
            self.missing.append(path + ".complete")
        if inventory.occupancy is None:
            self.missing.append(path + ".occupancy")
            return {}
        if not valid:
            return {}
        return {
            item.resource_id: item.occupant_id
            for item in inventory.occupancy
            if self.observed(item, path + ".resource")
        }

    def result(self, not_applicable=False):
        state = (
            "fail"
            if self.failed
            else "unknown"
            if self.missing
            else "not_applicable"
            if not_applicable
            else "pass"
        )
        return _result(
            self.rule_id,
            state,
            self.facts,
            self.refs,
            ("Inventario instalado completo documenta ausencia de almacenamiento",)
            if state == "not_applicable"
            else (),
            self.missing,
        )


def _block(config, name, rule_id):
    checks = Checks(rule_id)
    block = getattr(config.resources, name) if config.resources is not None else None
    if block is None:
        checks.missing.append(name)
    return checks, block


def _usable(c, resource_id, occupant_id, occupancy, path):
    if resource_id not in occupancy:
        c.missing.append(path)
    else:
        # Membership plus documented observation distinguishes explicitly free None
        # from a missing/unknown map entry.
        available = (
            occupancy[resource_id] is None or occupancy[resource_id] == occupant_id
        )
        c.compare("resource_available", available, True, lambda a, b: a == b)


def _disabled(c, blockers, occupancy, path):
    if blockers is None:
        c.missing.append(path + ".disabled_by")
        return
    for resource_id in blockers:
        if resource_id not in occupancy:
            c.missing.append(path + ".shared_occupancy")
        else:
            c.compare(
                "resource_shared_free",
                occupancy[resource_id] is None,
                True,
                lambda a, b: a == b,
            )


def pcie(config):
    c, data = _block(config, "pcie", "R03")
    if data is None:
        return c.result()
    c.need(data.cpu_instance_id, "pcie.cpu_instance")
    c.need(data.motherboard_instance_id, "pcie.motherboard_instance")
    occupancy = c.inventory(data.inventory, "pcie.inventory")
    gpu = data.gpu
    width = c.field(gpu, "physical_lanes", "pcie.gpu.physical_lanes")
    generation = c.field(gpu, "generation", "pcie.gpu.generation")
    if generation is not None:
        c.facts.append(Fact(name="pcie_gpu_generation", value=generation))
    device_links = c.field(gpu, "supported_links", "pcie.gpu.supported_links")
    c.need(data.selected_slot_id, "pcie.selected_slot")
    selection_valid = c.observed(
        data.selection_observation, "pcie.selection_observation"
    )
    slot = next((s for s in data.slots if s.resource_id == data.selected_slot_id), None)
    slot_width = c.field(slot, "physical_lanes", "pcie.slot.physical_lanes")
    host_links = c.field(slot, "supported_links", "pcie.slot.cpu_supported_links")
    if slot is not None:
        if slot.cpu_instance_id is None or slot.cpu_instance_id != data.cpu_instance_id:
            c.missing.append("pcie.slot.cpu_applicability")
            host_links = None
        if selection_valid and c.observed(slot, "pcie.slot"):
            _disabled(c, slot.disabled_by, occupancy, "pcie.slot")
        if selection_valid and gpu is not None:
            _usable(
                c, slot.resource_id, gpu.instance_id, occupancy, "pcie.slot.occupation"
            )
    if selection_valid:
        c.compare("pcie_physical_fit", width, slot_width, lambda a, b: a <= b)
    # Only an explicitly documented common link is acceptable. Different maximum
    # generations alone are not a failure and never create a negotiation table.
    if selection_valid and device_links is not None and host_links is not None:
        common = bool(set(device_links) & set(host_links))
        if (
            common
            or gpu.supported_links_exhaustive is True
            and slot.supported_links_exhaustive is True
        ):
            c.compare("pcie_negotiable_link", common, True, lambda a, b: a == b)
        else:
            c.missing.append("pcie.additional_link_support")
    return c.result()


def power_connectors(config):
    c, data = _block(config, "power", "R06.otros_conectores")
    if data is None:
        return c.result()
    c.need(data.psu_instance_id, "power.psu_instance")
    c.need(data.motherboard_instance_id, "power.motherboard_instance")
    occupancy = c.inventory(data.inventory, "power.inventory")
    c.need(data.additional_loads, "power.additional_loads")
    if not data.sources:
        c.missing.append("power.sources")
    if not data.required_loads:
        c.missing.append("power.required_loads")
    for category in ("motherboard", "gpu"):
        owner = getattr(data, category + "_instance_id")
        if owner is not None and not any(
            load.owner_instance_id == owner for load in data.required_loads
        ):
            c.missing.append("power." + category + "_power_requirements")
    c.need(data.assignments, "power.assignments")
    sources = {s.resource_id: s for s in data.sources}
    known_loads = {
        load.resource_id
        for load in (*data.required_loads, *(data.additional_loads or ()))
    }
    for source_id in sources:
        if source_id not in occupancy:
            c.missing.append("power.inventory.source_occupancy")
        elif (
            occupancy[source_id] is not None and occupancy[source_id] not in known_loads
        ):
            c.missing.append("power.inventory.unresolved_loads")
    assignments = {a.load_id: a for a in data.assignments or ()}
    rails = {r.resource_id: r for r in data.rails or ()}
    c.need(data.rails, "power.rail_limits")
    currents, unknown_rails, branches = {}, set(), {}
    unresolved_demand = (
        data.additional_loads is None
        or data.inventory is None
        or data.inventory.complete is not True
        or data.inventory.status != "documented"
    )
    for index, load in enumerate(
        (*data.required_loads, *(data.additional_loads or ()))
    ):
        load_valid = c.observed(load, "power.load.specification")
        if load_valid:
            fields = (
                ("channels",) if load.kind == "ATX24" else ("current_ma", "voltage_mv")
            )
            for field in fields:
                c.need(getattr(load, field), f"power.loads.{index}.{field}")
        assignment = assignments.get(load.resource_id)
        if assignment is None:
            c.missing.append(f"power.loads.{index}.assignment")
            unresolved_demand = True
            continue
        source = sources[assignment.source_id]
        source_valid = c.observed(source, "power.source.specification")
        route_valid = c.observed(assignment, "power.assignment.observation")
        if not source_valid or not route_valid:
            unresolved_demand = True
            continue
        if load_valid:
            c.compare(
                "power_electrical_kind", source.kind, load.kind, lambda a, b: a == b
            )
        _usable(
            c,
            source.resource_id,
            load.resource_id,
            occupancy,
            "power.source.occupation",
        )
        if source.owner_instance_id == data.psu_instance_id:
            owner = c.need(
                assignment.cable_psu_instance_id, "power.assignment.cable_set_owner"
            )
            c.compare(
                "power_cable_set_owner",
                owner,
                data.psu_instance_id,
                lambda a, b: a == b,
            )
        available = c.need(
            assignment.available_length_mm, "power.assignment.available_length_mm"
        )
        required = c.need(
            assignment.required_length_mm, "power.assignment.required_length_mm"
        )
        c.compare("power_cable_reach", required, available, lambda a, b: a <= b)
        if not load_valid:
            unresolved_demand = True
            if source.rail_id is not None:
                unknown_rails.add(source.rail_id)
            continue
        if load.independent_group is not None:
            branch = c.need(source.branch_id, "power.source.branch_id")
            if branch is not None:
                used = branches.setdefault(load.independent_group, set())
                c.compare(
                    "power_independent_branches",
                    branch in used,
                    False,
                    lambda a, b: a == b,
                )
                used.add(branch)
        if source.kind == "ATX24" or load.kind == "ATX24":
            demand_channels = c.need(load.channels, "power.load.multi_rail_demands")
            supply_channels = c.need(source.channels, "power.source.multi_rail_limits")
            if demand_channels is None or supply_channels is None:
                unresolved_demand = True
                continue
            available_channels = {ch.rail_id: ch for ch in supply_channels}
            if not demand_channels:
                c.missing.append("power.load.multi_rail_demands")
                unresolved_demand = True
            for demand in demand_channels:
                supply = available_channels.get(demand.rail_id)
                if supply is None:
                    c.missing.append("power.source.rail_limit")
                    unknown_rails.add(demand.rail_id)
                    unresolved_demand = True
                    continue
                c.compare(
                    "power_voltage",
                    demand.voltage_mv,
                    supply.voltage_mv,
                    lambda a, b: a == b,
                )
                c.compare(
                    "power_connector_current",
                    demand.current_ma,
                    supply.current_ma,
                    lambda a, b: a <= b,
                )
                currents[demand.rail_id] = (
                    currents.get(demand.rail_id, 0) + demand.current_ma
                )
        else:
            voltage = c.need(load.voltage_mv, "power.load.voltage_mv")
            source_voltage = c.need(source.voltage_mv, "power.source.voltage_mv")
            c.compare("power_voltage", voltage, source_voltage, lambda a, b: a == b)
            current = c.need(load.current_ma, "power.load.current_ma")
            maximum = c.need(source.max_current_ma, "power.source.max_current_ma")
            c.compare("power_connector_current", current, maximum, lambda a, b: a <= b)
            rail_id = c.need(source.rail_id, "power.source.rail_id")
            if rail_id is None:
                unresolved_demand = True
            if rail_id is not None:
                if current is None:
                    unknown_rails.add(rail_id)
                else:
                    currents[rail_id] = currents.get(rail_id, 0) + current
    for rail_id, current in currents.items():
        maximum = c.field(
            rails.get(rail_id), "max_current_ma", "power.rail.max_current_ma"
        )
        # A known subtotal above a rail limit fails even with other unknown loads.
        if (
            not unresolved_demand
            and rail_id not in unknown_rails
            or maximum is not None
            and current > maximum
        ):
            c.compare("power_rail_current", current, maximum, lambda a, b: a <= b)
    return c.result()


def storage(config):
    c, data = _block(config, "storage", "R09")
    if data is None:
        return c.result()
    c.need(data.motherboard_instance_id, "storage.motherboard_instance")
    occupancy = c.inventory(data.inventory, "storage.inventory")
    c.need(data.devices, "storage.devices")
    c.need(data.installations, "storage.installations")
    ports = {p.resource_id: p for p in data.ports}
    known_devices = {device.instance_id for device in data.devices or ()}
    power = config.resources.power
    electrical_sources = {s.resource_id: s for s in power.sources} if power else {}
    electrical_loads = (
        {
            load.resource_id: load
            for load in (*power.required_loads, *(power.additional_loads or ()))
        }
        if power
        else {}
    )
    power_assignments = (
        {a.source_id: a for a in power.assignments or ()} if power else {}
    )
    known_occupants = known_devices | {
        load.resource_id
        for load in electrical_loads.values()
        if load.owner_instance_id in known_devices
    }
    if any(
        occupant is not None and occupant not in known_occupants
        for occupant in occupancy.values()
    ):
        c.missing.append("storage.inventory.unresolved_devices")
    installations = {i.device_id: i for i in data.installations or ()}
    for device in data.devices or ():
        c.observed(device, "storage.device.specification")
        installation = installations.get(device.instance_id)
        if not c.observed(installation, "storage.device.installation"):
            continue
        port = ports.get(installation.port_id)
        protocol = c.field(device, "protocol", "storage.device.protocol")
        protocols = c.field(port, "protocols", "storage.port.protocols")
        size = c.field(device, "size", "storage.device.size")
        sizes = c.field(port, "sizes", "storage.port.mounting_sizes")
        if protocol is not None and protocols is not None:
            if protocol in protocols or port.protocols_exhaustive is True:
                c.compare("storage_protocol", protocol, protocols, lambda a, b: a in b)
            else:
                c.missing.append("storage.port.additional_protocol_support")
        if size is not None and sizes is not None:
            if size in sizes or port.sizes_exhaustive is True:
                c.compare("storage_mount_size", size, sizes, lambda a, b: a in b)
            else:
                c.missing.append("storage.port.additional_mounting_sizes")
        if port is not None and c.observed(port, "storage.port"):
            _disabled(c, port.disabled_by, occupancy, "storage.port")
            _usable(
                c,
                port.resource_id,
                device.instance_id,
                occupancy,
                "storage.port.occupation",
            )
        retention = c.need(installation.retention, "storage.installation.retention")
        retentions = c.field(port, "retentions", "storage.port.retentions")
        c.compare("storage_retention", retention, retentions, lambda a, b: a in b)
        power_kind = c.need(installation.power_kind, "storage.installation.power_kind")
        if size is not None:
            expected_power = (
                "SATA-power" if size in ("2.5-inch", "3.5-inch") else "slot"
            )
            c.compare(
                "storage_power_kind", power_kind, expected_power, lambda a, b: a == b
            )
        power_id = c.need(
            installation.power_resource_id, "storage.installation.power_resource"
        )
        if power_id is not None:
            occupant_id = device.instance_id
            bound = power_kind == "slot"
            if power_kind == "SATA-power":
                source = electrical_sources.get(power_id)
                assignment = power_assignments.get(power_id)
                source_valid = c.observed(
                    source, "storage.installation.electrical_source"
                )
                route_valid = c.observed(
                    assignment, "storage.installation.power_assignment"
                )
                if assignment is not None:
                    load = electrical_loads[assignment.load_id]
                    load_valid = c.observed(
                        load, "storage.installation.electrical_load"
                    )
                    occupant_id = load.resource_id
                    bound = source_valid and route_valid and load_valid
            if bound:
                _usable(
                    c,
                    power_id,
                    occupant_id,
                    occupancy,
                    "storage.installation.power_occupation",
                )
        temperature = c.need(
            installation.temperature_c, "storage.installation.temperature_c"
        )
        maximum = c.field(
            device, "max_temperature_c", "storage.device.max_temperature_c"
        )
        c.compare("storage_temperature", temperature, maximum, lambda a, b: a <= b)
    if data.devices == () and data.installations == ():
        for port in data.ports:
            _usable(c, port.resource_id, None, occupancy, "storage.absence.occupation")
            if occupancy.get(port.resource_id) is not None:
                c.failed = True
    return c.result(not_applicable=data.devices == () and data.installations == ())


def front_functions(config):
    c, data = _block(config, "front", "R10")
    if data is None:
        return c.result()
    c.need(data.motherboard_instance_id, "front.motherboard_instance")
    c.need(data.case_instance_id, "front.case_instance")
    occupancy = c.inventory(data.inventory, "front.inventory")
    c.need(data.required_functions, "front.required_functions")
    valid_requirements = (
        bool(data.requirements_evidence) and data.requirements_status == "documented"
    )
    if not valid_requirements:
        c.missing.append("front.requirements_evidence")
    else:
        c.refs.extend(data.requirements_evidence)
    c.need(data.routes, "front.routes")
    headers = {p.resource_id: p for p in data.headers}
    adapters = {a.resource_id: a for a in data.adapters or ()}
    routes = {r.cable_id: r for r in data.routes or ()}
    counts = {}
    complete_case = c.observed(data.case_observation, "front.case.specification")
    for index, cable in enumerate(data.cables):
        valid_cable = c.observed(cable, "front.cable.specification")
        complete_case &= valid_cable
        if valid_cable:
            for function in cable.functions:
                counts[function.function] = (
                    counts.get(function.function, 0) + function.count
                )
        route = routes.get(cable.resource_id)
        if not c.observed(route, f"front.cables.{index}.route"):
            continue
        header = headers.get(route.header_id)
        if not c.observed(header, "front.header.specification") or not valid_cable:
            continue
        _usable(
            c,
            header.resource_id,
            cable.resource_id,
            occupancy,
            "front.header.occupation",
        )
        channels = c.need(header.channels, "front.header.channels")
        function_count = sum(f.count for f in cable.functions)
        c.compare(
            "front_header_channels", function_count, channels, lambda a, b: a <= b
        )
        available = c.need(route.available_length_mm, "front.route.available_length_mm")
        required = c.need(route.required_length_mm, "front.route.required_length_mm")
        c.compare("front_cable_reach", required, available, lambda a, b: a <= b)
        rates = [header.max_rate_mbps, cable.max_rate_mbps]
        if route.adapter_id is None:
            c.compare(
                "front_electrical_kind", header.kind, cable.kind, lambda a, b: a == b
            )
        else:
            adapter = adapters.get(route.adapter_id)
            if not c.observed(adapter, "front.adapter.specification"):
                continue
            c.compare(
                "front_adapter_input",
                header.kind,
                adapter.input_kind,
                lambda a, b: a == b,
            )
            c.compare(
                "front_adapter_output",
                adapter.output_kind,
                cable.kind,
                lambda a, b: a == b,
            )
            envelope = c.need(adapter.envelope_mm, "front.adapter.envelope_mm")
            clearance = c.need(
                route.available_clearance_mm, "front.adapter.available_clearance_mm"
            )
            c.compare(
                "front_adapter_clearance", envelope, clearance, lambda a, b: a <= b
            )
            rates.append(adapter.max_rate_mbps)
            channels = c.need(adapter.channels, "front.adapter.channels")
            c.compare(
                "front_adapter_channels", function_count, channels, lambda a, b: a <= b
            )
        for function in cable.functions:
            if function.function not in ("usb_a", "usb_c"):
                continue
            required_functions = [
                f
                for f in data.required_functions or ()
                if f.function == function.function
            ]
            minimums = [f.minimum_rate_mbps for f in required_functions]
            if (
                not minimums
                or any(v is None for v in minimums)
                or any(v is None for v in rates)
            ):
                c.missing.append("front.usb.rate_evidence")
            elif valid_requirements:
                c.facts.append(
                    Fact(
                        name="front_effective_rate_mbps", value=min(rates), unit="Mb/s"
                    )
                )
                c.compare(
                    "front_usb_rate", min(rates), max(minimums), lambda a, b: a >= b
                )
    if complete_case and data.required_functions is not None and valid_requirements:
        for function in data.required_functions:
            c.compare(
                "front_function_preserved",
                counts.get(function.function, 0),
                function.count,
                lambda a, b: a >= b,
            )
    return c.result()
