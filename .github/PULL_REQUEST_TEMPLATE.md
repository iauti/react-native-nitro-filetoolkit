## Summary

<!-- Explain the user-facing problem and the solution. Keep this to 2–4 bullets. -->

-

## Scope

<!-- Note intentionally excluded work, platform differences, and compatibility impact. -->

## Platform behavior

| Platform | Status | Notes |
| --- | --- | --- |
| iOS | Not tested | |
| Android | Not tested | |

## Test plan

- [ ] `bun run check:ci`
- [ ] iOS native build or Harness tests, or not applicable
- [ ] Android native build or Harness tests, or not applicable
- [ ] Example app workflow tested, or not applicable

<!-- Add exact commands, devices, OS versions, and relevant results below. -->

## Public API and generated code

- [ ] Public API changes use clean, explicit types and are documented.
- [ ] iOS and Android behavior remains equivalent or differences are documented.
- [ ] Nitro specs were regenerated and all `nitrogen/` changes are included.
- [ ] No placeholder APIs or no-op native implementations were added.
- [ ] Not applicable; this change does not affect the public or native API.

## Release impact

<!-- Select one and explain any migration requirement. -->

- [ ] Patch — compatible fix or documentation/tooling change
- [ ] Minor — backward-compatible capability
- [ ] Breaking — incompatible API or behavior change
- [ ] None — repository-only change

## Checklist

- [ ] The change is focused and excludes unrelated formatting or dependency updates.
- [ ] User-facing documentation and `CHANGELOG.md` are updated when needed.
- [ ] I reviewed the final diff for generated files, secrets, and personal paths.
