# Security

## Supported Versions

This project is early-stage. Security fixes are handled on the latest main branch unless maintainers publish a different support policy.

## Reporting a Vulnerability

Please report security issues privately through GitHub Security Advisories if available. If private advisories are not enabled, open a minimal issue that describes the affected area without publishing exploit details.

## Secrets

Do not commit real API keys, tokens, certificates, signing keys, or local `.env` files.

MoChord may use a DeepSeek API key in the desktop app. Keep that key local to your machine and rotate it immediately if it is accidentally published.
