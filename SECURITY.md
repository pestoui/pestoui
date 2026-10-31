# Security policy

## Supported versions

Pesto UI has not made a release yet. Until it does, fixes land on `main`. After
the first release, only the latest release of `@pestoui/core` receives fixes.

## Reporting a vulnerability

**Please do not open a public issue for a security problem.**

Report it privately by email to fahim.anando@gmail.com. Once this repository is
public, GitHub's
[private vulnerability reporting](https://github.com/pestoui/pestoui/security/advisories/new)
works too; until then that link leads nowhere.

Include what you can: the affected version or commit, a description, and the
smallest reproduction you have.

## What happens next

- **Within 7 days:** an acknowledgement and a first assessment.
- **Within 90 days:** a fix or a mitigation, or an explanation of why there is
  none. Please keep the details private until then, or until the fix is
  released, whichever comes first. If the issue is being exploited, say so, and
  the timeline gets shorter.
- **Credit:** the advisory and the release notes name you, if you want them
  to. There is no bounty.

## Scope

This policy covers the npm package built from this repository, `@pestoui/core`.

In scope:

- **The component library:** XSS through a component that renders
  caller-supplied content without escaping; injection through the chart styles
  or the theme engine (`lib/theme/`), both of which write CSS custom
  properties; prototype pollution.
- **The supply chain:** a malicious or compromised dependency that reaches a
  consumer's install through this package.

The website, [pestoui.com](https://pestoui.com), and the services that come
with PRO are maintained separately, outside this repository, and this policy
does not cover them. Report a problem with either privately to the same
address.

Out of scope:

- volumetric denial of service, and load testing against any deployment
- social engineering of the maintainer or of users
- the security of third-party platforms (GitHub, npm), which run their own
  programmes
- a consuming application's own configuration
- `npm audit` advisories with no reachable path through this package — but say
  so anyway, and they will be looked at

## Safe harbour

Research done in good faith under this policy is welcome, and no legal action
will be pursued or supported against you for it, as long as you:

- test only against your own installs or a local copy, never other people's data
- stop, and report, as soon as you reach data that is not yours
- avoid degrading the service for anyone else
- give the time above before disclosing
