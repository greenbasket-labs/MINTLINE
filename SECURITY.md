# Security Policy

MINTLINE is an execution-control research prototype. Its safety model is intentionally conservative.

## Current safety boundary

The repository is designed with execution disabled by default:
- paper/simulation behavior is preferred
- live transaction submission is not enabled by default
- explicit configuration is required before any future live-execution path

Do not assume the prototype is safe for real funds.

## Reporting vulnerabilities

For sensitive security issues, contact the maintainer privately through the GitHub profile rather than publishing exploit details in a public issue.

Useful reports include:
1. affected component
2. reproduction steps
3. expected vs actual behavior
4. potential impact
5. relevant commit/version

Never include private keys, seed phrases, credentials, or other secrets.

## Responsible use

MINTLINE has not been presented as audited trading infrastructure. Treat all execution-related code as research software until independently reviewed and verified.
