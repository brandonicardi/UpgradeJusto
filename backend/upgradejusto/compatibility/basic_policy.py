"""Manufacturer whole-system recommendation eligibility, no consumption estimate."""


def stock_power(check, cpu, gpu, psu):
    rating = check.read(psu, "continuous_power_w", "psu.continuous_power_w")
    minimum = check.read(
        gpu, "recommended_psu_w", "gpu.manufacturer_system_recommendation_w"
    )
    chipset_minimum = check.read(
        gpu, "nvidia_recommended_psu_w", "gpu.nvidia_system_recommendation_w"
    )
    platform = check.read(cpu, "cpu_platform", "cpu.platform")
    cpu_class = check.read(cpu, "cpu_tdp_class_w", "cpu.documented_tdp_class_w")
    family = check.read(cpu, "cpu_stock_family", "cpu.documented_stock_family")
    reference_platform = check.read(
        gpu, "psu_reference_platform", "gpu.psu_reference_platform"
    )
    reference_class = check.read(
        gpu, "psu_reference_cpu_tdp_class_w", "gpu.psu_reference_cpu_tdp_class_w"
    )
    basis = check.read(gpu, "psu_recommendation_basis", "gpu.psu_recommendation_basis")
    reference = check.read(gpu, "psu_reference_system", "gpu.psu_reference_system")
    eligible = (
        platform == "AM4"
        and family == "Ryzen5000"
        and reference_platform in ("AM4", "AM5")
        and type(cpu_class) is int
        and 0 < cpu_class <= 65
        and type(reference_class) is int
        and reference_class >= 105
        and basis == "manufacturer_whole_system_minimum"
        and isinstance(reference, str)
        and bool(reference.strip())
    )
    if not eligible:
        check.missing.append("psu.manufacturer_system_recommendation_applicability")
    elif rating is not None and minimum is not None and chipset_minimum is not None:
        check.failed = rating < max(minimum, chipset_minimum)
    return check.result(
        (
            "basic-stock-policy-1: capacidad continua≥MAX(ASUS modelo exacto,NVIDIA chipset); margen ya contenido, sin reserva añadida",
            "Aplicabilidad inferida explícita: Ryzen5000 AM4 stock clase TDP≤65W frente a referencia Ryzen9 clase≥105W; clase TDP NO es consumo DC máximo ni garantía universal",
            "ASUS refiere CPU y GPU completamente overclockeados sin identificar CPU; NVIDIA identifica sistema de referencia. Se toma el mayor umbral bajo régimen stock declarado",
            "Sin OC/PBO, una GPU, un NVMe, hasta cuatro ventiladores; sin cargas adicionales altas",
            "No se suman TDP, placa50W/RAM10W ni coeficientes arbitrarios; no es medición eléctrica",
        )
    )
