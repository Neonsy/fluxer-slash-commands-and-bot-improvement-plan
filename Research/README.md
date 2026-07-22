# Fluxer Bot Platform Research

This is the public entry point for the background and technical details behind the Fluxer bot platform plan. It does not require dev-chat history or prior knowledge of the Fluxer repository. [Orientation](guide/01-orientation.md) explains Fluxer as it exists today. The [glossary](reference/glossary.md) defines recurring terms and points to their exact contracts.

Fluxer is a chat platform organized into communities with members, channels, roles, and permissions. It already supports developer-owned OAuth applications with bot accounts that can be invited into those communities. Notes about current Fluxer behavior were verified against product repository commit `fd62b46faf3505d738f6d5800e787473b14cacd6` on 2026-07-22.

## Start here

If Fluxer or bot platforms are new to you, begin with [Orientation](guide/01-orientation.md). It defines the starting product, recurring concepts, scope, and rules that the rest of the plan builds on.

Read the [PRD](../PRD.md) for the authoritative product outcomes, complete scope, requirements, success measures, and delivery sequence. The PRD defines its own starting terms and current product gap, so it also works as a direct entry point.

For a complete technical read, continue through the numbered guide in order. Each chapter starts from concepts established earlier and ends with the next chapter. Use the linked reference contracts when you reach a detail that needs an exact state, limit, schema, error, or release scenario. Finish with [Open decisions](guide/11-open-decisions.md) to separate settled design from work that still needs agreement.

Use [Verified current state](reference/current-state.md) whenever you want to distinguish existing Fluxer behavior from planned behavior. Nothing in the plan relies on an undocumented conversation as evidence.

## Find what you need

| If you are reviewing | Start with | Then use |
| --- | --- | --- |
| The product idea and its scope | [Orientation](guide/01-orientation.md) and [First Working Bot](guide/03-first-working-bot.md) | [Community management](guide/07-community-management.md) and [acceptance scenarios](reference/acceptance-scenarios.md) |
| Claims about the existing Fluxer code | [Verified current state](reference/current-state.md) | Follow its pinned links to the exact code, tests, and policy text |
| Application identity, installation, and permissions | [Applications and installations](guide/04-applications-and-installations.md) | [Application and installation contracts](reference/application-and-installation-contracts.md) |
| Commands, discovery, and provider collisions | [Commands and discovery](guide/05-commands-and-discovery.md) | [Command contracts](reference/command-contracts.md) and [acceptance scenarios](reference/acceptance-scenarios.md) |
| Interaction APIs and Discord compatibility | [System model](guide/02-system-model.md) and [Interactions and responses](guide/06-interactions-and-responses.md) | [Compatibility](reference/compatibility.md) and [interaction and message contracts](reference/interaction-and-message-contracts.md) |
| Responsive web and accessibility | [Commands and discovery](guide/05-commands-and-discovery.md) and [Interactions and responses](guide/06-interactions-and-responses.md) | [Administration and authority contracts](reference/administration-and-authority-contracts.md) and [acceptance scenarios](reference/acceptance-scenarios.md) |
| Authorization and security | [Applications and installations](guide/04-applications-and-installations.md) and [Authority, safety, and data](guide/08-authority-safety-and-data.md) | [Administration and authority contracts](reference/administration-and-authority-contracts.md) and [operations and data contracts](reference/operations-and-data-contracts.md) |
| Privacy, failure recovery, and data lifecycle | [Failure, recovery, and operations](guide/09-failure-recovery-and-operations.md) | [Operations and data contracts](reference/operations-and-data-contracts.md) and [acceptance scenarios](reference/acceptance-scenarios.md) |
| Build order, rollout, and release readiness | [Implementation roadmap](guide/10-implementation-roadmap.md) and [Open decisions](guide/11-open-decisions.md) | [Compatibility](reference/compatibility.md) and [acceptance scenarios](reference/acceptance-scenarios.md) |
| An exact term, state, limit, or rule | [Glossary and reference index](reference/glossary.md) | Open the linked contract for the exact requirement and release checks |

## Read the full technical guide

The complete guide uses this front-to-back order because later chapters depend on concepts introduced earlier:

1. [Orientation](guide/01-orientation.md)
2. [System model](guide/02-system-model.md)
3. [First Working Bot](guide/03-first-working-bot.md)
4. [Applications and installations](guide/04-applications-and-installations.md)
5. [Commands and discovery](guide/05-commands-and-discovery.md)
6. [Interactions and responses](guide/06-interactions-and-responses.md)
7. [Community management](guide/07-community-management.md)
8. [Authority, safety, and data](guide/08-authority-safety-and-data.md)
9. [Failure, recovery, and operations](guide/09-failure-recovery-and-operations.md)
10. [Implementation roadmap](guide/10-implementation-roadmap.md)
11. [Open decisions](guide/11-open-decisions.md)

The [glossary and reference index](reference/glossary.md) provides definitions and links to the detailed contracts, limits, states, and acceptance cases.

## When documents disagree

Use the repository [PRD](../PRD.md) for product scope, requirements, acceptance conditions, and implementation order. The guide explains how the parts fit together. The reference files hold the exact technical detail.

If two files disagree, resolve the discrepancy before implementation.

## Raw working output

`Research/raw` contains the unedited working material. It is kept for the repository owner and is not part of the public plan. Outside readers should ignore it.

Therefore, the website does not publish, link to, or search the raw directory.

## Reference material

- [Glossary](reference/glossary.md) defines terms and links to exact rules, limits, states, and release checks.
- [Verified current state](reference/current-state.md) records what exists in the pinned Fluxer repository baseline.
- [Application and installation contracts](reference/application-and-installation-contracts.md) define identity, lifecycle, permissions, suspension, and deletion.
- [Command contracts](reference/command-contracts.md) define registration, publication, discovery, policy, schemas, and typed input.
- [Interaction and message contracts](reference/interaction-and-message-contracts.md) define delivery, responses, components, modals, and ephemeral message data.
- [Administration and authority contracts](reference/administration-and-authority-contracts.md) define settings, native actions, delegated authority, confirmation, and audit.
- [Operations and data contracts](reference/operations-and-data-contracts.md) define persistence, recovery, rollout, privacy, retention, deletion, and observability.
- [Compatibility](reference/compatibility.md) defines the supported Discord baseline, Fluxer additions, deliberate differences, and required conformance evidence.
- [Acceptance scenarios](reference/acceptance-scenarios.md) define the normal, concurrent, failure, recovery, privacy, and rollout behavior required for release.
