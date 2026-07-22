# Fluxer bot platform plan

Fluxer is a chat platform organized into communities with members, channels, roles, and permissions. It already lets developers create OAuth applications. Each application has a bot account that can be invited into communities. Fluxer does not yet provide a system for applications to publish commands or for Fluxer to install, deliver, manage, and operate them safely.

This plan covers that entire path. Developers can bring compatible community bots to Fluxer largely through configuration, publish slash commands, choose real-time Gateway delivery or signed outgoing HTTP requests, return public or ephemeral messages, and optionally use richer message controls, Fluxer-hosted community settings, and narrowly approved administrative actions. Members can discover commands, distinguish applications that use the same command name, provide typed input, and see which application responded. Community managers can review and control each application's installation, commands, permissions, settings, health, and removal.

Behind those experiences, the plan also defines stable application and command identities, managed roles, explicit user and bot authority, accessible and safe behavior across clients, audit, abuse protection, privacy and deletion, cleanup and repair, failure recovery, compatibility testing, staged rollout, rollback, and disaster recovery. These are part of the product because Fluxer, rather than each application, must enforce them.

## Read the plan online

**[Open the web version](https://neonsy.github.io/fluxer-slash-commands-and-bot-improvement-plan/)**

The website provides a tidier reading experience with navigation and search. It is not required. About 95% of what it displays comes directly from the PRD and public research Markdown files.

## Read the source

**[Open the research guide and review paths](Research/README.md)**

The research guide is the main entry point for the Markdown source. It requires no dev-chat history or prior knowledge of the Fluxer repository. It introduces the product, defines the recurring terms, gives a complete front-to-back reading order, and directs product, API, accessibility, security, privacy, recovery, and release reviewers to the files they need.

Open [`PRD.md`](PRD.md) directly when you want the complete product scope, requirements, success measures, and implementation order in one document.

## Source structure

- [`PRD.md`](PRD.md) is authoritative for product scope, requirements, acceptance conditions, and implementation order.
- [`Research/README.md`](Research/README.md) provides the reading order and topic-specific review paths.
- [`Research/guide/`](Research/guide/) explains how the product and technical design fit together.
- [`Research/reference/`](Research/reference/) contains the exact contracts, limits, current-state evidence, compatibility rules, and release scenarios.
- [`web/`](web/) builds the optional static review site from the PRD and public research files.

Ignore `Research/raw/`. It contains the unedited working material and is kept only for the repository owner. It is not part of the plan, and the website does not publish or search it.
