# IoT Platform Architecture Diagram

## Context

To better visualize the new IoT platform architecture that aligns with the phases of IoT data processing, we need a diagram that shows the relationships between the different stages and stacks.

## Decision

We have created a diagram that illustrates the new IoT platform architecture, showing the flow of data through the system and the relationships between the different stages and stacks.

```
+------------------+     +------------------+     +------------------+     +------------------+
|   Ingest Stage   |     |  Transform Stage |     |   Store Stage    |     |  Insights Stage  |
|                  |     |                  |     |                  |     |                  |
| +-------------+  |     | +-------------+  |     | +-------------+  |     | +-------------+  |
| | IoTCoreStack | |     | |StreamingStack| |     | |DataLakeStack|  |     | |AnalyticsStack| |
| +-------------+  |     | +-------------+  |     | +-------------+  |     | +-------------+  |
|        |         |     |        |         |     |        |         |     |        |         |
| +-------------+  |     | +--------------+ |     |                  |     | +-------------+  |
| |DeviceRegistry ||     | |EnrichmentStk | |     |                  |     | |DashboardStack| |
| +-------------+  |     | +--------------+ |     |                  |     | +-------------+  |
|                  |     |        |         |     |                  |     |                  |
|                  |     | +--------------+ |     |                  |     |                  |
|                  |     | |AnomalyDetect.| |     |                  |     |                  |
|                  |     | +--------------+ |     |                  |     |                  |
+------------------+     +------------------+     +------------------+     +------------------+
                                                                                    
                                                                                    
                                +------------------+                                 
                                | Cross-Cutting    |                                 
                                |     Stage        |                                 
                                |                  |                                 
                                | +-------------+  |                                 
                                | |CostMonitoring| |                                 
                                | +-------------+  |                                 
                                |        |         |                                 
                                | +--------------+ |                                 
                                | |SecurityStack | |                                 
                                | +--------------+ |                                 
                                |        |         |                                 
                                | +-------------+  |                                 
                                | |LoggingStack |  |                                 
                                | +-------------+  |                                 
                                +------------------+                                 
```

### Data Flow

The diagram illustrates the flow of data through the system:

1. **Ingest Stage**: IoT devices connect to IoT Core, which ingests the data and manages device registries and shadows.

2. **Transform Stage**: The data is streamed through Kinesis, enriched with additional context, and analyzed for anomalies.

3. **Store Stage**: The processed data is stored in a data lake, with appropriate partitioning and cataloging.

4. **Insights Stage**: The stored data is analyzed using Athena and visualized using CloudWatch dashboards.

5. **Cross-Cutting Stage**: Cross-cutting concerns like cost monitoring, security, and logging are managed across all stages.

### Dependencies

The diagram also illustrates the dependencies between the different stages and stacks:

- The Transform Stage depends on the Ingest Stage, as it processes data ingested by IoT Core.
- The Store Stage depends on the Transform Stage, as it stores data processed by the streaming and enrichment stacks.
- The Insights Stage depends on the Store Stage, as it analyzes and visualizes data stored in the data lake.
- The Cross-Cutting Stage has dependencies on all other stages, as it monitors and manages resources across the entire platform.

## Consequences

### Benefits

1. **Visual Clarity**: The diagram provides a clear visual representation of the architecture, making it easier to understand the flow of data through the system.

2. **Dependency Visualization**: The diagram clearly shows the dependencies between the different stages and stacks, helping to identify potential issues.

3. **Communication Tool**: The diagram can be used as a communication tool to explain the architecture to stakeholders and new team members.

### Challenges

1. **Simplification**: The diagram is a simplification of the actual architecture and may not capture all the nuances and details.

2. **Maintenance**: The diagram will need to be updated as the architecture evolves, which requires additional effort.

## Implementation Notes

- The diagram is created using ASCII art for simplicity, but it could be replaced with a more sophisticated diagram using a tool like draw.io or Lucidchart.

- The diagram focuses on the logical organization of the architecture rather than the physical deployment, which may involve multiple AWS accounts and regions.

- The diagram does not show all the resources within each stack, only the high-level components.