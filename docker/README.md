# Local Vaultwarden

From this folder, run:

    docker compose up -d

Open https://localhost:8443.

Account and vault data remain in ../vw-data. Keep that folder when restarting or updating containers.
The explicit Compose project name preserves the existing Caddy certificate volumes.

The backups folder contains the original pre-HTTPS configuration for reference; its paths are relative to the original project root.
