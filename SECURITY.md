# Security Policy

## Supported versions

Security fixes are provided for the latest published minor version. Before the
first stable release, upgrade to the newest `0.x` release to receive fixes.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use GitHub's private
[security advisory form](https://github.com/iauti/react-native-nitro-filetoolkit/security/advisories/new)
and include:

- affected package and version;
- affected platform and OS version;
- a minimal reproduction or proof of concept;
- expected and observed impact;
- any known mitigation.

IAUTI Labs will acknowledge the report through the advisory, investigate it,
and coordinate disclosure after a fix is available. Please avoid accessing
data that is not yours or disrupting third-party services while testing.

## Filesystem threat model

Managed paths reject traversal segments and platform separators. External
locations must be absolute `file://` URIs. Whole-file text reads require an
explicit byte bound. Applications should still treat paths and files received
from other apps as untrusted, choose collision policies deliberately, and avoid
clearing managed roots without an explicit user action.
