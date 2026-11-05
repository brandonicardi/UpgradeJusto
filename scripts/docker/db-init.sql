-- Scripts de docker-entrypoint-initdb.d corren como superusuario solo con el
-- volumen pgdata vacío (primer arranque). Todo está protegido con IF NOT EXISTS
-- o guardas equivalentes para no romper un rerun manual.

\set ON_ERROR_STOP on

-- Extensión pgvector: la requieren las tablas del asistente/RAG futuro.
CREATE EXTENSION IF NOT EXISTS vector;

-- Usuario de la aplicación: lee usuario, clave y base del entorno del contenedor
-- (definidos en docker-compose.yml); nunca hay credenciales en este archivo.
\getenv uj_app_user UJ_DB_APP_USER
\getenv uj_app_password UJ_DB_APP_PASSWORD
\getenv uj_db_name POSTGRES_DB

SELECT count(*) AS role_exists
  FROM pg_catalog.pg_roles
 WHERE rolname = :'uj_app_user' \gset

\if :role_exists
\echo 'El usuario de la app ya existe; no se modifica'
\else
CREATE ROLE :"uj_app_user" LOGIN PASSWORD :'uj_app_password';
\endif

-- Alta de tablas: las migraciones Alembic corren como este usuario desde el backend.
GRANT ALL PRIVILEGES ON DATABASE :"uj_db_name" TO :"uj_app_user";
GRANT ALL ON SCHEMA public TO :"uj_app_user";
