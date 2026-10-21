"""Extracto curado HARDWARE_DEMO: 9–31, 52–82, 84–114, 178–194.

No consulta ofertas ni fabricantes en runtime. Las notas de precio son históricas;
no convierten condiciones faltantes en disponibilidad o costes cero.
"""

from upgradejusto.catalog.models import Category, Component, Price, Source

DATASET_VERSION = "sprint31b-a-v1"


def source(id: str, url: str) -> Source:
    return Source(id=id, url=url)


def price(amount: str, observation: str) -> Price:
    return Price(amount=amount, currency="ARS", date="2026-10-20", source=observation)


COMPONENTS = (
    Component(
        id="P01",
        category=Category.CPU,
        name="AMD Ryzen 5 5600 100-100000927BOX",
        attributes={
            "socket": "AM4",
            "cores": "6",
            "threads": "12",
            "memory_type": "DDR4",
            "tdp": "65 W (no equivale a demanda DC)",
        },
        sources=(
            source(
                "F01",
                "https://www.amd.com/en/support/downloads/drivers.html/processors/ryzen/ryzen-5000-series/amd-ryzen-5-5600.html",
            ),
        ),
    ),
    Component(
        id="P02",
        category=Category.CPU,
        name="AMD Ryzen 7 5700X 100-100000926WOF",
        attributes={
            "socket": "AM4",
            "cores": "8",
            "threads": "16",
            "memory_type": "DDR4",
            "tdp": "65 W (no equivale a demanda DC)",
        },
        sources=(
            source(
                "F02",
                "https://www.amd.com/en/support/downloads/drivers.html/processors/ryzen/ryzen-5000-series/amd-ryzen-7-5700x.html",
            ),
        ),
        prices=(
            price(
                "446120",
                "O05 Best https://bestinformatica.com.ar/componentes-de-pc/procesadores/procesador-amd-ryzen-7-5700x-8-nucleos-16-hilos-hasta-46ghz-am4-100-100000926wof-457671.html | Histórico: especial, condición a confirmar; en stock observado; WOF sin cooler; envío y pasta extra sin cotizar.",
            ),
            price(
                "484913",
                "O05 Best https://bestinformatica.com.ar/componentes-de-pc/procesadores/procesador-amd-ryzen-7-5700x-8-nucleos-16-hilos-hasta-46ghz-am4-100-100000926wof-457671.html | Histórico: tarjeta; en stock observado; WOF sin cooler; condición precio especial a confirmar; envío y pasta extra sin cotizar.",
            ),
        ),
    ),
    Component(
        id="P03",
        category=Category.MOTHERBOARD,
        name="ASRock B550M Pro4 original, no Pro SE",
        attributes={
            "form_factor": "mATX 244×244 mm",
            "memory_type": "DDR4",
            "dimm_slots": "4",
            "max_memory": "128 GB",
            "installed_bios": None,
        },
        sources=(
            source("F03", "https://www.asrock.com/mb/AMD/B550M%20Pro4/index.us.asp"),
            source("F03", "https://download.asrock.com/Manual/B550M%20Pro4.pdf"),
        ),
    ),
    Component(
        id="P04",
        category=Category.RAM,
        name="Kingston KVR32N22S8/8",
        attributes={
            "capacity_per_module": "8 GB",
            "rank": "1Rx8",
            "memory_type": "DDR4-3200",
            "latency": "CL22",
            "voltage": "1,2 V",
            "module_type": "UDIMM 288 pines no ECC/unbuffered",
            "height": "31,25 mm",
        },
        sources=(
            source(
                "F05",
                "https://www.kingston.com/en/memory/client/ddr4-3200mts-non_ecc-unbuffered-dimm",
            ),
            source("F05", "https://www.kingston.com/datasheets/KVR32N22S8_8.pdf"),
        ),
    ),
    Component(
        id="P05",
        category=Category.RAM,
        name="Kingston KVR32N22D8/16",
        attributes={
            "capacity_per_module": "16 GB",
            "rank": "2Rx8",
            "memory_type": "DDR4-3200",
            "latency": "CL22",
            "voltage": "1,2 V",
            "module_type": "UDIMM 288 pines no ECC/unbuffered",
            "height": None,
        },
        sources=(
            source(
                "F05",
                "https://www.kingston.com/en/memory/client/ddr4-3200mts-non_ecc-unbuffered-dimm",
            ),
            source("F05", "https://www.kingston.com/datasheets/KVR32N22D8_16.pdf"),
        ),
        prices=(
            price(
                "383208.99",
                "O04 RMS https://rms-enlinea.com.ar/producto/memoria-ddr4-kingston-16gb-3200-mhz-kvr32n22d8-16/ | Histórico por módulo individual, no kit; dos disponibles observados; condición/recargos de pago no explicitados; envío desconocido.",
            ),
        ),
    ),
    Component(
        id="P06",
        category=Category.GPU,
        name="ASUS DUAL-RTX4060-O8G-EVO, negra OC",
        attributes={
            "length": "227,2 mm",
            "height": "123,24 mm",
            "thickness": "49,6 mm",
            "slots": "2,5",
            "vram": "8 GB",
            "interface": "PCIe 4.0",
            "power_connector": "un PCIe 8-pin",
            "recommended_psu": "550 W",
        },
        sources=(
            source(
                "F06",
                "https://www.asus.com/motherboards-components/graphics-cards/dual/dual-rtx4060-o8g-evo/techspec/",
            ),
        ),
    ),
    Component(
        id="P07",
        category=Category.PSU,
        name="Corsair CX550 2023 CP-9020277 RPS0127",
        attributes={
            "continuous_power": "550 W",
            "length": "125 mm",
            "pcie_cables": "un ramal PCIe, dos 6+2 a 500+100 mm",
            "temperature_rating": "30 °C",
        },
        sources=(
            source(
                "F09",
                "https://www.corsair.com/us/en/p/psu/cp-9020277-na/cx-series-cx550-550-watt-80-plus-bronze-atx-power-supply-cp-9020277-na",
            ),
        ),
    ),
    Component(
        id="P08",
        category=Category.PSU,
        name="Corsair RM750e 2025 CP-9020295-AR RPS0215",
        attributes={
            "continuous_power": "750 W",
            "dimensions": "140×150×86 mm",
            "standard": "ATX 3.1",
            "spare_pcie_cable_count": None,
            "evidence_note": "Conflicto F10/F11 conservado en cantidad de PCIe de repuesto",
        },
        sources=(
            source(
                "F10",
                "https://www.corsair.com/us/en/explorer/diy-builder/power-supply-units/corsair-rme-series-2025/",
            ),
            source(
                "F11",
                "https://www.corsair.com/us/en/p/psu/cp-9020295-na/rme-series-rm750e-fully-modular-low-noise-atx-power-supply-cp-9020295-na",
            ),
        ),
        prices=(
            price(
                "175898",
                "O02 Exxit https://exxit.com.ar/prod/5715/fuente-750w-corsair-rm750e--2025--cybenetics-gold-platinum-atx-3-1-full-modular-cp-9020295-ar | Histórico: IVA incluido/transferencia; stock alto observado; condición no explicitada; envío no cuantificado; financiación con recargo.",
            ),
        ),
    ),
    Component(
        id="P09",
        category=Category.CASE,
        name="Fractal Pop 2 Air Black Solid FD-C-POA2A-01",
        attributes={
            "motherboard_formats": "ATX/mATX/ITX",
            "psu_limit": "ATX 180 mm",
            "gpu_length_limit": "416 mm",
            "gpu_height_limit": "175 mm",
            "cooler_height_limit": "170 mm",
            "slots": "7",
        },
        sources=(
            source(
                "F12",
                "https://www.fractal-design.com/products/cases/pop-series/pop-2-air/pop-2-air-black-solid/",
            ),
        ),
    ),
    Component(
        id="P10",
        category=Category.CASE,
        name="Fractal Meshify C Black Solid FD-CA-MESH-C-BKO",
        attributes={
            "motherboard_formats": "ATX/mATX/ITX",
            "psu_limit": "ATX 175 mm",
            "gpu_length_limit": "315 mm con ventiladores delanteros",
            "gpu_height_limit": None,
            "cooler_height_limit": "170 mm",
            "slots": "7",
        },
        sources=(
            source(
                "F13",
                "https://www.fractal-design.com/products/cases/meshify-series/meshify-c/meshify-c/",
            ),
            source(
                "F13",
                "https://support.fractal-design.com/support/solutions/articles/4000119088-will-my-graphics-card-fit-in-the-meshify-c-or-meshify-c-mini-with-a-radiator-installed-in-the-front-",
            ),
        ),
    ),
    Component(
        id="P15",
        category=Category.GPU,
        name="ASUS PRIME-RTX5070-O12G",
        attributes={
            "length": "304 mm",
            "height": "126 mm",
            "thickness": "50 mm",
            "slots": "2,5",
            "vram": "12 GB",
            "interface": "PCIe 5.0",
            "power_connector": "un 16-pin; incluye adaptador 1→2",
            "recommended_psu": "750 W con salvedad de sistema OC",
        },
        sources=(
            source(
                "F07",
                "https://www.asus.com/us/motherboards-components/graphics-cards/prime/prime-rtx5070-o12g/techspec/",
            ),
        ),
        prices=(
            price(
                "1706232",
                "O01 Enjoy https://enjoycomputer.com.ar/producto/placa-de-video-asus-prime-rtx-5070-oc-12gb/ | Histórico: efectivo/transferencia; «Entrega en el día» observado; condición no explicitada; envío excluido; extras no informados.",
            ),
            price(
                "1894299",
                "O03 INCOT https://incot.com.ar/productos/placa-de-video/placa-de-video-asus-prime-rtx5070-o12g-168990.html | Histórico: nuevo, en stock observado; precio publicado, tarjeta mayor; envío aparte.",
            ),
        ),
    ),
    Component(
        id="P16",
        category=Category.GPU,
        name="ASUS TUF-RTX5070-O12G-GAMING",
        attributes={
            "length": "329 mm",
            "height": "140 mm",
            "thickness": "62,5 mm",
            "slots": "3,125",
            "vram": None,
        },
        sources=(
            source(
                "F08",
                "https://www.asus.com/us/motherboards-components/graphics-cards/tuf-gaming/tuf-rtx5070-o12g-gaming/techspec/",
            ),
        ),
    ),
    Component(
        id="P17",
        category=Category.MOTHERBOARD,
        name="ASRock B550 Pro4",
        attributes={"installed_bios": None},
        sources=(
            source("F21", "https://www.asrock.com/mb/AMD/B550%20Pro4/index.asp"),
            source("F21", "https://download.asrock.com/Manual/B550%20Pro4.pdf"),
        ),
    ),
    Component(
        id="P18",
        category=Category.MOTHERBOARD,
        name="ASRock B550M Steel Legend original",
        attributes={
            "form_factor": "mATX",
            "memory_type": "DDR4",
            "dimm_slots": "4",
            "max_memory": "128 GB",
            "installed_bios": None,
        },
        sources=(
            source(
                "F22",
                "https://www.asrock.com/mb/AMD/B550M%20Steel%20Legend/index.us.asp",
            ),
            source(
                "F22", "https://download.asrock.com/Manual/B550M%20Steel%20Legend.pdf"
            ),
        ),
    ),
)
