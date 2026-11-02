// Fixed official references supplied by coordination; never URLs from user/LLM.
export const hardwareGuideSources = Object.freeze({
  device: "https://support.microsoft.com/en-us/windows/experience/find-information-about-your-windows-device",
  systemInformation: "https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/msinfo32",
  specifications: "https://www.microsoft.com/en-us/windows/learning-center/how-to-check-pc-specs",
  cpuZ: "https://www.cpuid.com/softwares/cpu-z.html",
});

export const hardwareTextExample = [
  "Procesador: AMD Ryzen 7 5700X",
  "Memoria: 2x8 GB DDR4",
  "Tarjeta gráfica: GeForce RTX 3060",
  "Placa madre: modelo por confirmar",
  "Almacenamiento: un SSD de 500 GB, modelo por confirmar",
  "Fuente: modelo por confirmar",
  "Gabinete: modelo por confirmar",
  "Refrigeración: por confirmar",
  "Ventiladores: cantidad por confirmar",
].join("\n");
