# Architecture Decision Record: IoT Platform 2.0 Ingestion Layer Design
## 1. Key Decisions for IoT Ingestion Layer with DR Capabilities

### ADR-001: Event-Driven Ingestion Pattern
- **Decision**: Implement IoT Core Rule → Kinesis Stream → Lambda → DynamoDB pattern
- **Context**: Processing 100MB/day/site requires a scalable, resilient ingestion pipeline
- **Rationale**: Serverless event-driven architecture provides automatic scaling with minimal operational overhead while preserving message ordering
- **Consequences**: Better resilience to traffic spikes, simplified operations, consumption-based pricing ### ADR-002: Multi-Region Data Replication Strategy
- **Decision**: Implement cross-region replication for device registry and telemetry data
- **Context**: DR capabilities require data availability across multiple regions
- **Rationale**: Ensures business continuity with minimal RPO/RTO for critical IoT data
- **Consequences**: Additional replication costs balanced against improved resilience ### ADR-003: Timestream for Time Series Analytics
- **Decision**: Use IoT Rules to forward telemetry to Amazon Timestream
- **Context**: IoT data requires time-series analytics capabilities
- **Rationale**: Purpose-built time-series database provides optimized query performance and storage tiering
- **Consequences**: Faster analytics performance, cost-effective storage for historical data ### ADR-004: CQRS Pattern for Data Access
  **Decision**: Implement Command Query Responsibility Segregation
- **Context**: Different access patterns for writing and reading IoT data
- **Rationale**: Optimizes both write and read paths for different usage patterns
- **Consequences**: Enhanced scalability with separate paths for ingestion vs. analytics

## 2. CAF & Agile Delivery Alignment The design follows the AWS CAF phases:
- **Envision Phase**: Prioritizing serverless for rapid development and lower operational overhead
  **Align Phase**: Using CDK Pipelines with monorepo for IaC and EaC
- **Launch Phase**: Implementing core IoT flows using AWS IoT Core, DynamoDB, Lambda, Timestream
- **Scale Phase**: Enabling active-active and DR capabilities through cross-region replication

## 3. Key Trade-offs
1. **Simplicity vs. Sophistication**: Starting with IoT Rules to Timestream instead of AWS IoT SiteWise—SiteWise may be revisited at scale for more sophisticated asset modeling
2. **Cost vs. Resilience**: Multi-region replication introduces additional costs—Balanced against business value of disaster recovery capabilities
3. **Performance vs. Development Speed**: Embracing serverless to speed up development - Accepting potential cold-start latencies for non-critical operations
4. **Build vs. Buy**: Leveraging AWS managed services (IoT Core, Kinesis, Lambda, DynamoDB, Timestream) - Focusing internal development on domain-specific business logic [1]
5.
## 4. Frugal Architecture & Domain-Driven Design Principles
The ingestion layer design follows these principles:
1. **Frugal Architecture**:
- Build only what you need, avoiding over-engineering
- Leverage serverless to pay only for actual usage (100MB/day/site)
- Implement monitoring to identify optimization opportunities
- Use Timestream's storage tiers to optimize cost for hot vs cold IoT data 2.

**Domain-Driven Design**:
- Align with Smart Lighting domain model (Sites → Buildings → Rooms → Assets)
- Use bounded contexts to separate ingestion concerns from analytics - Apply clean architecture principles with clear separation of interfaces and business rules
- Model domain events (Faults, UsageReports, EnergySpikes) explicitly

## 5. Next Steps for AWS Engagement
1. **Architecture Review**: Schedule AWS Solution Architecture review of the proposed design
2. **Well-Architected Assessment**: Conduct IoT, Analytics, SaaS and Serverless lens review
3. **CAF Workshop**: Engage AWS Professional Services for CAF-aligned delivery planning
4. **PoC Development**: Start with small-scale proof of concept for the ingestion pipeline
5. **CDK Implementation**: Develop infrastructure as code using AWS CDK with TypeScript [2]