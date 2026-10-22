# Tutorial: UI Coach en Render + PostgreSQL en Neon

Guía paso a paso para desplegar el **frontend React (Coach)** en [Render](https://render.com) y la base **PostgreSQL** en [Neon](https://neon.tech), con la **API FastAPI** en Render apuntando a Neon.

Enfocado en el **Coach MVP** (`requirements-coach-mvp.txt`, sin Ollama ni Streamlit). Para el stack completo con LLM local, ver [`deployment/render_deployment_guide.md`](../../../deployment/render_deployment_guide.md).

**Actualizado:** 2026-10-22

---

## Arquitectura objetivo

```text
Usuario → Static Site (Render)  Vite/React  src/frontend
              │  HTTPS  VITE_API_URL
              ▼
         Web Service (Render)  FastAPI  src/api/main.py
              │  CHESS_TRAINER_DB_URL (SSL)
              ▼
         Neon PostgreSQL  (proyecto + branch)
```

| Componente | Dónde | Plan típico (referencia) |
|------------|--------|-------------------------|
| PostgreSQL | Neon | Free / Launch (uso dev-staging) |
| API FastAPI | Render Web Service | Starter |
| UI React | Render Static Site | Free |

---

## Parte 1 — PostgreSQL en Neon

### 1.1 Crear proyecto

1. Entrá a [console.neon.tech](https://console.neon.tech) y creá un proyecto (ej. `chessinsight-coach`).
2. Elegí región cercana a tu Web Service de Render (ej. `us-east-1` si la API está en Ohio/Virginia).
3. Anotá el **connection string** que ofrece Neon (Dashboard → **Connect**).

### 1.2 URL para SQLAlchemy / Alembic

La app usa la variable **`CHESS_TRAINER_DB_URL`** (no `DATABASE_URL`).

- Si Neon entrega `postgres://…`, convertí el esquema a **`postgresql://…`** (SQLAlchemy lo espera así).
- Incluí SSL, por ejemplo:  
  `postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require`
- Para **migraciones Alembic** desde tu PC, podés usar el endpoint **direct** de Neon; para la API en producción suele ir bien el pooler (**`-pooler`** en el host) con `sslmode=require`.

### 1.3 Migraciones (primera vez)

Desde la **raíz del repo**, con la misma URL que usará la API:

```powershell
# .env en la raíz del repo
CHESS_TRAINER_DB_URL=postgresql://...@...neon.tech/neondb?sslmode=require

pip install -r requirements-coach-mvp.txt
alembic upgrade head
```

Comprobación rápida: la API local con esa URL debe responder en `/health` y Coach → Partidas no debe pedir migraciones faltantes.

**Rollback / backup:** antes de `upgrade head` en producción, snapshot o branch en Neon (Dashboard → **Branches**).

---

## Parte 2 — API FastAPI en Render

### 2.1 Crear Web Service

1. [dashboard.render.com](https://dashboard.render.com) → **New +** → **Web Service**.
2. Conectá el repo `chessinsightai` (rama `main` o la de release).
3. Configuración sugerida:

| Campo | Valor |
|--------|--------|
| **Name** | `chessinsight-api` (o el que prefieras) |
| **Region** | Misma región que Neon si podés |
| **Root Directory** | *(vacío = raíz del repo)* |
| **Runtime** | Python 3 |
| **Build Command** | `pip install -r requirements-coach-mvp.txt` |
| **Start Command** | `cd src/api && uvicorn main:app --host 0.0.0.0 --port $PORT` |

### 2.2 Variables de entorno (API)

| Variable | Obligatoria | Ejemplo / notas |
|----------|-------------|-----------------|
| `CHESS_TRAINER_DB_URL` | Sí | Connection string Neon (`postgresql://…?sslmode=require`) |
| `PYTHONPATH` | Sí | `src:src/api` (Linux en Render; separador `:`) |
| `CORS_ALLOW_ORIGINS` | Sí (prod) | `https://tu-ui.onrender.com` (sin barra final; varias URLs separadas por coma) |
| `JWT_SECRET` / auth | Según auth | Las mismas que uses en local si activás login |
| `STOCKFISH_PATH` | Opcional | Análisis **servidor** Module 07; el análisis liviano WASM en el navegador no lo requiere |
| `PORT` | Auto | Render la inyecta; no hace falta definirla |

### 2.3 Migraciones en Render

Opción A — **Release Command** (recomendado):

```bash
alembic upgrade head
```

(Configuralo en el Web Service → **Settings** → **Release Command**, con `PYTHONPATH=src:src/api` ya definido.)

Opción B — Correr `alembic upgrade head` desde tu máquina contra la URL de Neon (Parte 1.3) antes del primer deploy.

### 2.4 Health check

- **Health Check Path:** `/health`
- URL pública: `https://chessinsight-api.onrender.com/health` → JSON OK.

Guardá la URL base de la API (sin `/health`) para el frontend.

---

## Parte 3 — UI (Vite/React) en Render

### 3.1 Crear Static Site

1. **New +** → **Static Site** → mismo repo.
2. Configuración:

| Campo | Valor |
|--------|--------|
| **Root Directory** | `src/frontend` |
| **Build Command** | `npm ci && npm run build` |
| **Publish Directory** | `dist` |

### 3.2 Variable de build (API)

En **Environment** del Static Site (build-time):

| Variable | Valor |
|----------|--------|
| `VITE_API_URL` | `https://chessinsight-api.onrender.com` (tu API Render, **sin** barra final) |

Volvé a desplegar si cambiás la URL de la API (Vite embebe `VITE_*` en el build).

### 3.3 Rutas del SPA (React Router)

El repo incluye `src/frontend/public/_redirects` para que Render sirva `index.html` en rutas como `/coach/partidas`:

```text
/*    /index.html   200
```

### 3.4 CORS

Después del primer deploy de la UI, copiá la URL del Static Site (ej. `https://chessinsight-ui.onrender.com`) y actualizá en el **Web Service de la API**:

```env
CORS_ALLOW_ORIGINS=https://chessinsight-ui.onrender.com
```

Redeploy de la API. Sin esto, el navegador bloqueará las llamadas a `/api/…`.

---

## Parte 4 — Verificación end-to-end

1. Abrí la URL del Static Site → login (si aplica) → **Coach** → **Importar** / **Partidas**.
2. DevTools → **Network**: las peticiones deben ir a `VITE_API_URL`, no a `localhost`.
3. Si ves errores de migración en la UI, repetí `alembic upgrade head` contra Neon y reiniciá el Web Service.
4. Plan free de Render: el servicio puede **dormir**; el primer request puede tardar ~30–60 s.

---

## Parte 5 — Desarrollo local alineado con prod

| Entorno | Frontend | API | DB |
|---------|----------|-----|-----|
| Local | `npm run dev` (5173) | `uvicorn` puerto 8000 | Docker 5434 o Neon |
| Prod | Render Static | Render Web | Neon |

`.env` raíz: `CHESS_TRAINER_DB_URL`  
`src/frontend/.env.development`: `VITE_API_URL=http://localhost:8000`

---

## Troubleshooting

| Síntoma | Causa probable | Acción |
|---------|----------------|--------|
| CORS error en browser | Origen UI no listado | `CORS_ALLOW_ORIGINS` en API |
| `relation … does not exist` | Migraciones pendientes | `alembic upgrade head` |
| UI llama a localhost | Build sin `VITE_API_URL` | Rebuild Static Site con env correcta |
| SSL / connection refused a DB | URL sin SSL o host incorrecto | `?sslmode=require`, revisar host Neon |
| 502 en API al despertar | Cold start Render free | Esperar o plan paid |

---

## Referencias en el repo

- Coach local: [README.md](../../../README.md) — sección *Coach MVP*
- Migraciones Coach / catálogo: [pr_158_riesgos.md](../pr_158_riesgos.md)
- Reglas de entrega: [01-delivery-rules.md](./01-delivery-rules.md)
- Deploy legacy (Ollama + Postgres en Render): [deployment/render_deployment_guide.md](../../../deployment/render_deployment_guide.md)
