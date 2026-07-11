# Container and reverse-proxy foundations

`api.Dockerfile` and `web.Dockerfile` run as non-root users and include health checks. The web
image uses an unprivileged Nginx runtime, serves the PWA shell, and proxies `/api` and `/health`
to the API so production browser requests remain same-origin.

For a single Linux host with public DNS:

1. Copy `production.env.example` to a secret file outside the repository and replace all
   example values. Use a long URL-safe database password.
2. Point the configured domain's A/AAAA records at the host and allow inbound TCP 80/443 and
   UDP 443.
3. Start the stack from the repository root:

   ```bash
   docker compose --env-file /secure/skryfwys.env -f infrastructure/compose.production.yml up -d --build
   ```

4. Wait for `docker compose ... ps` to show healthy API/web services, then open the HTTPS URL.

Caddy obtains and renews public certificates. It forwards only to the web container; Nginx
routes API paths over the private Compose network. PostgreSQL is not published to the host.
The API and web containers are read-only, have all Linux capabilities dropped, and use tmpfs
for runtime files.

Back up PostgreSQL with `scripts/backup.ps1` (or `pg_dump -Fc`) and test restores regularly.
Container volumes are not backups. For a managed platform, deploy the same two Dockerfiles,
use managed PostgreSQL, terminate HTTPS at the platform load balancer, and retain the
same-origin `/api` route.

Limitations that require deployment-owner action:

- Compose cannot configure DNS, firewall policy, off-host backups, monitoring, or secret
  rotation.
- Required GitHub checks and image-registry policies must be enabled in repository/hosting
  settings.
- The root build context should contain a `.dockerignore`; otherwise local dependency and
  secret files can be sent to the Docker daemon.
