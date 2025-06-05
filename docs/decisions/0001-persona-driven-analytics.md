---
status: "proposed"
date: 2025-06-04
decision-makers: Jussi
consulted: {list everyone whose opinions are sought (typically subject-matter experts); and with whom there is a two-way communication}
informed: {list everyone who is kept up-to-date on progress; and with whom there is a one-way communication}
---

# Persona-Driven Analytics

## Context and Problem Statement

We have four key users for a smart building platform, each with their distinct data needs and usage pattern:

1. Building Owners
   - High KPIs (energy usage, occupancy trends) across their property portfolio on a weekly/monthly basis
2. Facility Managers
   - Operational dashboards and real-time alerts for building systems to find any faulty assets for daily usage
3. Commissioning Engineers
   - Focusing on new system deployments and calibrations. Needing sensor data visibility during onboarding and testing phases.
4. Maintenance Engineers
    - Requires prompt notification of anomalies or predictive maintenance insights to schedule repairs

According to AWS Well-Architected guidelines, we start by "focusing on data consumers" (our personas)
and enable each with a purpose-built analytics solution [amazon.com](https://docs.aws.amazon.com/wellarchitected/latest/analytics-lens/characteristics.html#:~:text=In%20this%20step%2C%20you%20focus,built%20analytics%20and%20machine%20learning).

Analytics lens also prompts to consider multi-tenancy early (multiple building owners/tenants) and the real-time requirements for each case [amazon.com](https://docs.aws.amazon.com/wellarchitected/latest/analytics-lens/characteristics.html#:~:text=,tenant%20data%20model).

## Decision

* Design the architecture "working backwards" from persona needs
* Provide role-specific data access;
  * Build Owners get aggregated historical insights via Data lake and dashboards
  * Facility Managers get real-time streaming analytics
  * Commissioning Engineers get tools/APIs to monitor new device setup
* Data will be organized and tagged by tenant (customer) to enforce that each user sees their own buildings' data

Approach should be aligned with the AWS Analytics Lens recommendation to identify user personas and tailor analytics for their needs.

## Decision Outcome

Keeping focus on personas, using AWS Data Analytics Lens emphasizes defining business value and user outcomes first.
MVP will initially deliver customized analytics for each persona, improving user adoption.
Planning and implementing separate data consumption paths (batch vs. real-time)
for different needs follows best practices of enabling purpose-built analytics for each persona.
May need to implement multiple data access patterns (APIs, dashboards, SQL queries) which adds some complexity.
Assume that all personas can be served from a shared platform with proper isolation.

### Consequences

* Good, because the MVP will initially deliver customized analytics views for each persona, improving user adoption and engagement. 
* Good, because we're designing the solution to explicitly address the needs of our four key user types from the beginning. 
* Good, because a shared platform with proper isolation can serve all personas while maintaining data segregation by tenant. 
* Neutral, because we'll need to implement multiple data access patterns (APIs, dashboards, SQL queries) which adds some complexity, but this is justified by the user value delivered. 
* Bad, because maintaining different analytics interfaces for distinct personas requires more development and operational effort. 
* Bad, because we may need to revisit this approach if new personas emerge with significantly different requirements than our initial four user types. 
* Neutral, because this approach allows us to iterate on analytics delivery in the future (e.g., add machine learning for predictive insights or more self-service BI tools) as requirements evolve.

### Confirmation

{Describe how the implementation of/compliance with the ADR can/will be confirmed. Are the design that was decided for and its implementation in line with the decision made? E.g., a design/code review or a test with a library such as ArchUnit can help validate this. Not that although we classify this element as optional, it is included in many ADRs.}

<!-- This is an optional element. Feel free to remove. -->
## Pros and Cons of the Options
