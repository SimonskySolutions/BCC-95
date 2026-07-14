# BCC 95 ERP — Server deployment requirements

Hand this to whoever provisions the server. Numbers are based on the actual stack
in this repository.

## What the system is made of

| Component | Image / runtime | Role |
|---|---|---|
| Web (frontend) | static build (React/Vite) served by nginx | the UI — tiny, static files |
| API | Node.js 20 (Express, `server/index.js`) | REST API + DB access |
| Database | PostgreSQL 18 | all data (working state in jsonb + relational master data, files/photos) |
| Adminer | `adminer:4` | DB admin UI — **optional, disable in production** |
| Local AI (optional) | Ollama + `qwen2.5:14b` | inquiry extraction, data-aware assistant, translation |

The app itself is light. The **only heavy component is the local AI model** — its
requirement dominates everything. So size the server by whether the AI runs on it.

---

## The deciding question: where does the AI model run?

`qwen2.5:14b` is a 14-billion-parameter model: **~9 GB on disk**, and it needs
**~11–13 GB of RAM (or GPU VRAM) to run**. Pick a profile:

### Profile A — No local AI (cheapest)
Run without AI features, or point them at a hosted LLM API later. AI buttons
(inquiry extraction, the right-side assistant, translate) are simply unavailable.

- **CPU:** 2 vCPU
- **RAM:** 4 GB
- **Storage:** 40 GB SSD
- **GPU:** none

### Profile B — Local AI on CPU (no GPU)
Works, but AI responses are **slow** (roughly 5–30 s each) and use a lot of RAM.

- **CPU:** 8+ cores
- **RAM:** **32 GB** recommended (16 GB absolute minimum: ~12 GB for the model + the rest for OS/DB/API)
- **Storage:** 100 GB SSD
- **GPU:** none

### Profile C — Local AI on GPU (fast)
Best AI experience (sub-second to a few seconds).

- **CPU:** 4 vCPU
- **RAM:** 16 GB
- **GPU:** **12 GB+ VRAM** (e.g. NVIDIA RTX 3060 12 GB / 4070 / A2000) + NVIDIA drivers + CUDA
- **Storage:** 100 GB SSD

> Recommendation: **Profile C** if AI matters and a GPU is available; otherwise
> **Profile A** and add a GPU box (or a hosted model) later. Profile B only if you
> accept slow AI.

---

## Storage breakdown

| Item | Size |
|---|---|
| OS + Docker engine | ~10 GB |
| App images + node_modules (web, api, postgres, nginx) | ~2–3 GB |
| Ollama model `qwen2.5:14b` (Profiles B/C) | ~9 GB |
| Database (today) | ~10 MB — it starts tiny |
| Database growth | **plan 20–50 GB** |

The database grows mainly because **photos, attachments and generated offer PDFs
are stored inside Postgres** (images as data URLs, ~100–300 KB each after
downscaling). 50 GB of headroom covers a lot of offers; monitor and grow as needed.

---

## Prerequisites (software)

The repo ships a `docker-compose.yml`, so the simplest path is Docker:

- **Linux host** — Ubuntu 22.04 / 24.04 LTS recommended (any Docker-capable OS works)
- **Docker Engine** + **Docker Compose v2**
- For local AI: **Ollama** installed on the host, then `ollama pull qwen2.5:14b`
  (for Profile C, the NVIDIA Container Toolkit so containers can use the GPU)
- **Reverse proxy for HTTPS** — nginx / Caddy / Traefik — plus a **domain** and a
  **TLS certificate** (Let's Encrypt is fine)
- **Outbound HTTPS internet access from the API** to:
  - `ec.europa.eu` — VIES (ЕИК/VAT auto-fill)
  - `portal.registryagency.bg` — Търговски регистър (company-name search)
  - `nominatim.openstreetmap.org` — address geocoding for the map pin
- **Outbound HTTPS from users' browsers** to `tile.openstreetmap.org` (map tiles)
- The **customer-facing pages must be publicly reachable** — the offer acceptance
  links (`/offer-accept/...`) and the upload portal (`/upload/...`)

Native (without Docker) is also possible: Node.js 20 LTS + PostgreSQL 18 + Ollama.

## Ports

| Port | Service | Exposure |
|---|---|---|
| 80 / 443 | reverse proxy → web | **public** |
| 3001 | API | internal only (behind the proxy) |
| 5432 | PostgreSQL | internal only — never public |
| 11434 | Ollama | internal only |
| 8081 | Adminer | **disable in production** |

## Physical (on-prem) server notes

The system runs on a machine on your premises, so also plan:

- **Hardware:** any recent desktop/server-class machine covers the no-AI profile
  (4+ cores / 8–16 GB RAM / 250 GB SSD is comfortable headroom). For fast local AI,
  add a discrete NVIDIA GPU with **12 GB+ VRAM** (RTX 3060 12 GB is the budget pick).
- **Disks:** SSD required (Postgres on HDD is painful). Ideally **two disks in
  RAID 1** (mirror), or at minimum a second disk/NAS as the backup target.
- **Power:** a small **UPS** so the database isn't killed by outages; enable
  auto-power-on after power loss in BIOS.
- **Public reachability** (needed for offer-acceptance links and the customer
  upload portal): a **static public IP from the ISP** (or dynamic DNS), and
  **port forwarding of 80/443** on the router/firewall to the server. If the
  company policy forbids inbound exposure, those links won't work from outside —
  everything else runs fine LAN-only.
- **Remote administration:** SSH from the LAN or via VPN/WireGuard for the
  sysadmin; do not expose SSH directly to the internet.
- **Backups must leave the machine** — NAS, another PC, or an external disk that
  is rotated; a backup on the same server does not count.

## Backups

- Nightly **`pg_dump`** of the PostgreSQL database (it holds everything: working
  state, master data, files/photos) with off-server retention.
- Snapshot the Ollama model directory is not needed — it can be re-pulled.

---

## ⚠️ Before exposing to the internet (production hardening)

This is currently a working prototype. **Do not put it on the public internet
as-is.** A sysadmin/developer should first add:

1. **Real authentication.** Today access is role-based "acting-as" with **no
   passwords**. Add real login + sessions before exposing.
2. **HTTPS/TLS everywhere** (via the reverse proxy).
3. **Encryption at rest** for sensitive fields — the customer "external access"
   credentials are stored in plaintext today.
4. **Backups + monitoring** (disk, RAM, Postgres).
5. Consider moving **photos/attachments to object storage** (S3/MinIO) so the
   database stays lean.

---

### TL;DR for the sysadmin
- **No local AI:** 2 vCPU / 4 GB RAM / 40 GB SSD.
- **Local AI, CPU only:** 8 cores / 32 GB RAM / 100 GB SSD (AI will be slow).
- **Local AI, GPU:** 4 vCPU / 16 GB RAM / 12 GB+ VRAM GPU / 100 GB SSD (fast).
- Linux + Docker + (Ollama for AI) + a reverse proxy with TLS + nightly pg_dump.
- It's a prototype: add real auth, TLS and encryption before going public.
