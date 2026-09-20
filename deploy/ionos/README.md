# IONOS deployment files

This directory contains the executable, provider-portable Docker Compose deployment for separate
preview and production environments. The maintained German documentation lives under
[`docs/replacement-app/deployment`](../../docs/replacement-app/deployment/README.md):

- [`installation.md`](../../docs/replacement-app/deployment/installation.md) — first installation;
- [`konfiguration.md`](../../docs/replacement-app/deployment/konfiguration.md) — decisions and runtime settings;
- [`betrieb.md`](../../docs/replacement-app/deployment/betrieb.md) — operation and recovery;
- [`handbuch.docx`](../../docs/replacement-app/deployment/handbuch.docx) — editable operator handbook.

Issue #105 covers the deployable template. Issue #117 covers IONOS account/contract choices,
German site confirmation, server provisioning, DNS/TLS, live checks, and Render retirement.
Do not put secrets or real customer account details in this directory's tracked files.
