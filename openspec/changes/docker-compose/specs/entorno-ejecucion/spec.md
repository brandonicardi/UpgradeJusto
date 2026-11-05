# Spec Delta

## Purpose

Definir cómo se levanta UpgradeJusto completo en una máquina nueva con un solo comando,
con datos de demostración reales y sin secretos versionados.

## ADDED Requirements

### Requirement: Arranque con un comando
El sistema SHALL levantar base de datos, backend y frontend con `docker compose up --build`
a partir de un clon limpio y un `.env` copiado de `.env.example`.

#### Scenario: Clon limpio
- **WHEN** una persona clona el repo, copia `.env.example` a `.env` y ejecuta `docker compose up --build`
- **THEN** la web responde en `http://localhost:3000` y `GET /health` del backend responde `ok`

#### Scenario: Orden de arranque
- **WHEN** la base todavía no acepta conexiones
- **THEN** el backend espera su healthcheck y el frontend espera el healthcheck del backend

### Requirement: Datos de demostración idempotentes
El sistema SHALL aplicar migraciones y cargar el catálogo de demostración al arrancar,
sin duplicar datos en arranques posteriores.

#### Scenario: Primer arranque
- **WHEN** el volumen de la base está vacío
- **THEN** se aplican las migraciones y el catálogo queda publicado con los productos de `data/catalogo/lotes/`

#### Scenario: Reinicio
- **WHEN** se ejecuta `docker compose restart backend`
- **THEN** la cantidad de productos publicados no cambia

### Requirement: Secretos fuera del repositorio
El sistema SHALL leer credenciales solo desde `.env` o generarlas en tiempo de ejecución;
ningún archivo versionado SHALL contener una clave real.

#### Scenario: Secreto del proxy interno
- **WHEN** no existe un secreto de proxy en el volumen compartido
- **THEN** el backend genera uno aleatorio de 64 caracteres y el frontend lo lee del mismo volumen

#### Scenario: Sin clave de Groq
- **WHEN** `GROQ_API_KEY` está vacía
- **THEN** la app arranca igual y el chat informa que el asistente no está disponible

### Requirement: Proxy interno solo por loopback
El sistema SHALL mantener la regla de que el backend solo acepta pedidos firmados desde
loopback, también dentro de Docker.

#### Scenario: Backend no expuesto
- **WHEN** se inspeccionan los puertos publicados por compose
- **THEN** solo se publica el `3000`; el `8000` del backend no es accesible desde el host
