# IoT Platform Architecture Phases

## Context

The IoT platform architecture needs to be reviewed and reorganized to better align with the phases of IoT data processing:

1. **Ingest**: IoT Core, device registries, device shadows
2. **Transform**: Stream enrichment and anomaly detection
3. **Store**: Data lake architecture
4. **Insights**: Analytics and visualization

The current architecture is organized around technical components rather than these logical phases, which makes it harder to understand the flow of data through the system and to maintain clear boundaries between different concerns.

## Decision

We have reorganized the IoT platform architecture to align with the phases of IoT data processing. The new architecture is organized into stages, each representing a phase of the IoT data processing pipeline, with stacks within each stage representing specific capabilities within that phase.

### Architecture Changes

1. **Ingest Stage**: Responsible for ingesting data from IoT devices
   - IoTCoreStack: Manages IoT Core configuration, policies, and rules
   - DeviceRegistryStack: Manages device registries and shadows

2. **Transform Stage**: Responsible for processing and enriching IoT data
   - StreamingStack: Manages Kinesis streams and delivery to S3
   - EnrichmentStack: Enriches IoT data with additional context
   - AnomalyDetectionStack: Detects anomalies in IoT data

3. **Store Stage**: Responsible for storing IoT data in a data lake
   - DataLakeStack: Manages the data lake architecture, including S3 buckets, Glue databases, and tables

4. **Insights Stage**: Responsible for analyzing and visualizing IoT data
   - AnalyticsStack: Provides analytics capabilities using Athena
   - DashboardStack: Provides visualization capabilities using CloudWatch dashboards

5. **Cross-Cutting Stage**: Responsible for cross-cutting concerns
   - CostMonitoringStack: Monitors and optimizes costs
   - SecurityStack: Manages security and compliance (placeholder)
   - LoggingStack: Manages logging and auditing (placeholder)

### Implementation Details

The implementation follows these principles:

1. **Domain-Driven Design**: Each stage and stack represents a bounded context with clear responsibilities and interfaces.

2. **Clean Architecture**: The architecture is organized around business capabilities rather than technical components, with dependencies flowing inward.

3. **Separation of Concerns**: Each stack has a single responsibility and is focused on a specific domain.

4. **AWS Well-Architected Framework**: The architecture follows AWS best practices for security, reliability, performance efficiency, cost optimization, and operational excellence.

5. **SaaS Lens**: The architecture supports multi-tenancy and isolation between tenants.

6. **IoT Lens**: The architecture is optimized for IoT workloads, with appropriate handling of device data and telemetry.

7. **Analytics Lens**: The architecture supports analytics workloads, with appropriate data storage and processing capabilities.

## Consequences

### Benefits

1. **Improved Clarity**: The architecture is now organized around logical phases, making it easier to understand the flow of data through the system.

2. **Better Maintainability**: Each stage and stack has clear boundaries and responsibilities, making it easier to maintain and extend.

3. **Enhanced Scalability**: Each phase can be scaled independently based on its specific requirements.

4. **Simplified Deployment**: The deployment pipeline can be organized around these phases, allowing for more controlled and targeted deployments.

5. **Clearer Documentation**: The architecture is now easier to document and explain to new team members.

### Challenges

1. **Increased Complexity**: The architecture now has more stacks and stages, which increases the overall complexity.

2. **Cross-Stack Dependencies**: There are dependencies between stacks in different stages, which need to be carefully managed.

3. **Deployment Order**: The deployment order needs to be carefully managed to ensure that dependencies are satisfied.

## Implementation Notes

- The IoTToKinesisRule, which is currently in the IoTStack, should be moved to the StreamingStack since it's part of the Transform phase. This ensures that the Streaming stack exists before the IoT stack needs to reference it.

- The DeviceTaggerConstruct, which is currently in the IoTStack, should be moved to the DeviceRegistryStack since it's part of the Ingest phase and specifically deals with device registration.

- The DataAnalyticsStack and IdentityStack, which are currently in the DataIdentityStage, should be moved to the Store and Cross-Cutting stages respectively.

- The CostMonitoringStack, which is currently in the IotPlatformStage, should be moved to the Cross-Cutting stage.

- The deployment pipeline should be updated to deploy the stages in the correct order: Ingest -> Transform -> Store -> Insights -> Cross-Cutting.

- Each stage should have a manual approval step in the pipeline to allow for controlled deployment.