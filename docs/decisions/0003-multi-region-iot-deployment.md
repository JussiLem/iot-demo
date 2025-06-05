---
status: "proposed"
date: 2025-06-04
decision-makers: Jussi
consulted: {list everyone whose opinions are sought (typically subject-matter experts); and with whom there is a two-way communication}
informed: {list everyone who is kept up-to-date on progress; and with whom there is a one-way communication}
---

# Multi-region IoT Deployment

## Context and Problem Statement

The platform should be resilient and potentially serve buildings across multiple regions/countries. Outages in a single
AWS region should not take down the entire service. Latency should be concern if devices and users are globally
distributed—IoT devices should connect to a nearest or lowest latency region for the best performance. AWS IoT recommends
designing multi-region deployments to improve availability and latency for IoT workloads.

Best practices include the ability to fall over device communication to a secondary region if the primary fails. Implementing
a multi-region IoT is not trivial: IoT Core operates per region without cross-region replication of device state), so
device certificates, policies and data pipelines need to be duplicated or synced across regions.

For an MVP, there's also a time constraint —- a full active-active multi-region architecture might slow down initial delivery.

## Decision

- Start with a single-region deployment (e.g., all IoT devices connect to AWS IoT Core in eu-west-1) to keep the MVP simple and fast to launch.
- Make architectural decisions to ease future multi-region expansion.
- Use an IoT custom domain (e.g., iot.example.com) with AWS IoT Core's configurable endpoints feature and Route 53, so that devices connect via a stable hostname.
- In the future, that DNS can route to multiple regional IoT endpoints (latency-based routing) without device changes.
- Structure IoT resources (Thing registry, certificates, policies) with automation in mind for future replication to a second region.
- Create device certificates such that they can be registered in multiple regions (or plan a mechanism to copy certificate registrations to a DR region).
- Expect to add cross-region data replication (for example, replicating critical data from the primary S3 data lake to a backup in another region).
- Use infrastructure-as-code (CDK) in a way that deploying the whole stack to another region is straightforward.
- Accept a trade-off: a single region is a short-term decision for speed, with the explicit plan to evolve to a multi-region when needed.
- Document this approach so that the team is aware of the technical debt (region risk) and can prioritize a multi-region in the future.


## Rationale

- A single-region deployment is much simpler (no data replication, no global DNS complexity, no syncing IoT registries in two places) – ideal for an MVP aiming to be live quickly.
- Preserve a path to improve reliability later by using a custom IoT endpoint and aligning with IoT Lens best practices for multi-region.
-  AWS IoT Lens guidance states that if one region's IoT endpoint is down, devices should be able to connect to another - our custom DNS and plan for multi-region certs address this concept (in the future).
- multi-region might be necessary for compliance or data sovereignty (e.g., EU vs US data storage) for building data.
- Lakehouse approach can be extended to a multi-region by possibly keeping regional S3 buckets and using AWS Lake Formation's cross-account/region sharing if needed.
- Aligns with the Well-Architected Framework principle of evolution – we start simple and later evolve the architecture as requirements demand.
- Implementing multi-region straight away would slow MVP development significantly.

## Decision Outcome

Chosen option: "{title of option 1}", because {justification. e.g., only option, which meets k.o. criterion decision driver | which resolves force {force} | … | comes out best (see below)}.

<!-- This is an optional element. Feel free to remove. -->
### Consequences

* Neutral, because in the MVP phase, the system will not be highly available if the chosen AWS region has an outage – this is a known and accepted risk. 
* Good, because stakeholders have been informed of this risk and have deemed it acceptable for an initial launch (especially for a limited trial or pilot stage). 
* Good, because we will partially mitigate the risk by using AWS regional services with strong SLAs. 
* Good, because we will implement frequent backups (e.g., backing up IoT Thing metadata and any state) to enable recovery if needed. 
* Good, because our design keeps the door open for multi-region expansion with minimal refactoring – by abstracting the device endpoint and not using any region-specific hacks. 
* Neutral, because when moving to multi-region, we will likely need to introduce new components: e.g., device registrations across regions, secondary Kinesis streams in another region, etc. 
* Bad, because may need to address complex data consistency issues across regions (choosing between active-active vs active-passive failover) in the future. 
* Neutral, because the details of multi-region implementation will be handled in a future ADR. 
* Neutral, because this decision will be revisited post-MVP when we plan for a production-grade SLA.