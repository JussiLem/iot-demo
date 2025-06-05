# IoT demo platform

This repository demonstrates one option to create multi-region iot platform architecture.
It approaches the topic by "Working Backwards" starting from the customer,
ending to the multi-region deployments using different Architecture Decision Records (found under `docs/decisions/`).
The purpose is to map risks, trade-offs and find few alternatives.
The goal is to have an MVP, something that starts bringing value immediately
and has a roadmap of enhancements to evolve the architecture in terms of scalability, feature, and robustness.

# Architecture Decision Records (ADRs)

1. [persona-driven analytics](docs/decisions/0001-persona-driven-analytics.md)
2. [stream lakehouse analytics pipeline](docs/decisions/0002-stream-lakehouse-analytics-pipeline.md)
3. [multi-region-iot-deployment](docs/decisions/0003-multi-region-iot-deployment.md)

# Architecture

Architecture's end goal is to avoid introducing unnecessary complexity 
but still be able to create a multi-region architecture supporting as many geolocations as needed.

Set up multiple regional IoT Core endpoints using Route53's latency-based routing with health checks.
Use AWS Global Accelerator to handle traffic distribution and automatic failover.
For device registry data use cross-region replication with DynamoDB global tables
(or EventBridge rules to keep everything in sync).

This approach gives both low latency for global devices and resilience.
The main trade-off is higher costs and additional operational complexity in managing multiple region deployments.
Still, it's more maintainable than building a custom caching layer.
AWS has a decent reference architecture for this in their IoT Lens of the Well-Architected Framework

The data architecture follows Data Analytics Lens design principals.
Insights follow the SaaS Lens of the Well-Architected Framework
to make sure we are isolating tenants and their resources.

Serverless Application Lens gets applied to the whole architecture.
By choosing serverless components, we aim to automatically handle scalability,
reliability, and security best practices out-of-the-box, so the team can focus on business logic.
Additionally, use CI/CD and Infrastructure-as-Code (AWS CDK) to continuously deploy changes,
supporting the rapid iteration needed for MVP.

![architecture](data-architecutre.svg "Proposed Architecture")

# CDK Stacks

Example CDK stacks found under `packages/src/stacks/`

## IoT Stack - Device Connectivity & Ingestion (AWS IoT Core & MQTT)

### Purpose
Handles device onboarding and data ingestion from building IoT sensors and devices via MQTT.
Avoids any on-premise or edge software.
Devices communicate directly to the cloud.
Tenant isolation and granularity start here: Enforce the devices to publish on MQTT topics scoped by tenant and device.

## Streaming Stack - Real-Time Data Processing

Builds the real-time data pipeline that processes incoming IoT device streams.

## Data Analytics Stack – Lakehouse & Batch Analytics

Sets up the data lake and analytics layer. All IoT data, metadata (and in the future perhaps additional business data).

## SaaS Identity Stack – Federated Identity & Tenant Isolation

Handles identity, authentication, and multi-tenancy aspects.
Enforce that users only see their own data.
Federated identity to integrate external IdPs.

# Monorepo setup with @aws/pdk and Projen (Project structure)

```/.projenrc.ts        # Projen project definition
/package.json, tsconfig.json, etc (managed by Projen)
/packages/infra/src/
   main.ts            # CDK App that imports and initializes above stacks
/packages/infra/src/stacks/
   iot-stack.ts
   streaming-stack.ts
   analytics-stack.ts
   identity-stack.ts
   iot-platform-stage.ts # CDK pipeline "main" stage
```