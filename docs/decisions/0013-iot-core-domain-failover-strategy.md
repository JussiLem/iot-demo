# IoT Core Domain Failover Strategy

## Context

The IoT platform uses Route53 failover routing policy to automatically route traffic to a secondary region if the primary region becomes unavailable. However, the previous implementation had a limitation: the failover didn't work until the pipeline was run to deploy resources to the DR region. This meant that if the primary region went down before the DR region was deployed, there was no failover capability.

Our disaster recovery strategy is frugal, where resources are only deployed to the DR region when needed, rather than maintaining an active-active deployment. This approach significantly reduces costs during normal operation but introduced a gap in the failover capability.

## Decision

We have implemented a new approach where IoT Core custom domains are deployed to all regions (primary and DR) from the beginning, without requiring the full IoT platform to be deployed to the DR region. This ensures that Route53 health checks and failover routing work at the DNS level without requiring manual approval to deploy resources to the DR region.

### Architecture Changes

1. **Separate IoT Core Domain Stack**: We created a new stack called `IoTCoreDomainStack` that is responsible for:
   - Creating an IoT Core custom domain configuration
   - Creating a health check for the IoT Core endpoint
   - Creating a Route53 record with failover routing policy

2. **Immediate Deployment to All Regions**: The `IoTCoreDomainStack` is deployed to all regions (primary and DR) without manual approval, ensuring that IoT Core custom domains exist in all regions from the beginning.

3. **Removed IoT Core Domain from IoTStack**: We removed the IoT Core custom domain part from the `IoTStack` to avoid conflicts with the new `IoTCoreDomainStack`.

4. **Cross-Stack References**: The `IoTStack` can reference the IoT Core custom endpoint from SSM Parameter Store if needed.

### Implementation Details

The implementation follows these principles:

1. **Separation of Concerns**: The `IoTCoreDomainStack` is responsible only for the IoT Core custom domain and Route53 failover routing, while the `IoTStack` is responsible for the rest of the IoT platform.

2. **Region Independence**: Each region's `IoTCoreDomainStack` works independently, looking up the hosted zone by domain name without needing to know if it's in the primary or secondary region.

3. **Immediate Availability**: The IoT Core custom domains are available in all regions from the beginning, ensuring that failover works immediately without requiring manual approval.

4. **Cost Efficiency**: Only the minimal resources needed for failover are deployed to the DR region, keeping costs low during normal operation.

## Consequences

### Benefits

1. **Improved Resilience**: The IoT platform can continue operating even if the primary region goes down before the DR region is deployed.

2. **Cost Savings**: We still maintain the cost benefits of the frugal DR strategy, as only the minimal resources needed for failover are deployed to the DR region.

3. **Simplified Operations**: No need to manually deploy resources to the DR region before a disaster occurs.

4. **Transparent Failover**: Devices connect to a single domain name and are automatically routed to the available endpoint.

### Challenges

1. **Deployment Complexity**: The deployment process is slightly more complex, as we need to deploy the `IoTCoreDomainStack` to all regions.

2. **Certificate Management**: Custom domain configurations require SSL certificates, which need to be managed across regions.

## Implementation Notes

- The `IoTCoreDomainStack` is deployed to each region (primary and DR) for each environment (dev, prod).
- The `IoTCoreDomainStack` uses the same domain name as the IoT Core custom endpoint in the `IoTStack`.
- The `IoTCoreDomainStack` creates a Route53 record with failover routing policy, with the primary region set to PRIMARY and DR regions set to SECONDARY.
- The `IoTStack` can reference the IoT Core custom endpoint from SSM Parameter Store if needed.
- This approach ensures that Route53 health checks and failover routing work at the DNS level without requiring the full IoT platform to be deployed to the DR region.

## Failover Mechanism

The Route53 failover routing policy works as follows:

1. **Health Checks**: Each IoT Core endpoint (in both primary and DR regions) has an associated health check that monitors its availability.

2. **Record Sets**: For each environment (dev, prod), there are multiple record sets with the same name (e.g., `iot-dev.example.com`):
   - One PRIMARY record set pointing to the IoT Core endpoint in the primary region
   - One or more SECONDARY record sets pointing to IoT Core endpoints in DR regions

3. **Normal Operation**: When all endpoints are healthy, Route53 routes traffic to the PRIMARY record set (primary region).

4. **Failover Process**: When the primary resource record set is unhealthy (i.e., the health check for the primary region's IoT Core endpoint fails), Route53 automatically routes traffic to a healthy SECONDARY record set (DR region).

5. **Multiple DR Regions**: If there are multiple DR regions with SECONDARY record sets, Route53 will choose one of the healthy SECONDARY record sets based on routing policy configuration.

6. **Recovery**: When the primary region becomes healthy again, Route53 automatically routes traffic back to the PRIMARY record set.

This failover mechanism ensures that IoT devices can continue to connect to the IoT platform even if the primary region becomes unavailable, without requiring any changes to the device configuration or manual intervention.
