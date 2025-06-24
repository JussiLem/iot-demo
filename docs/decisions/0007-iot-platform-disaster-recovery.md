# IoT Platform Disaster Recovery Strategy

## Context

The IoT platform needs to be resilient to regional outages to ensure continuous operation of IoT devices and data processing. A disaster recovery (DR) strategy is required to enable automatic failover between AWS regions in case of a regional outage.

## Decision

We have implemented a multi-region disaster recovery strategy for the IoT platform using Route53 failover routing policy to automatically route IoT device traffic to a healthy IoT Core endpoint in an available region.

### Architecture

The DR architecture consists of the following components:

1. **Route53 Hosted Zone**: A public hosted zone for the IoT platform domain (e.g., `iot-dev.example.com`).

2. **IoT Core Custom Endpoints**: Custom domain configurations for IoT Core in each region (primary and DR regions).

3. **Health Checks**: Route53 health checks to monitor the availability of IoT Core endpoints in each region.

4. **Failover Routing Policy**: Route53 records with failover routing policy that automatically route traffic to the secondary region if the primary region becomes unavailable.

### Implementation Details

The implementation follows these principles:

1. **Region Independence**: Each region has its own IoT Core endpoint and resources, allowing independent operation.

2. **Automatic Failover**: Route53 automatically routes traffic to the secondary region if the primary region fails health checks.

3. **Single Entry Point**: Devices connect to a single domain name that resolves to the appropriate IoT Core endpoint based on availability.

4. **Cross-Region Resource Sharing**: The Route53 hosted zone is created in the primary region and directly referenced in secondary regions using `HostedZone.fromLookup`.

### Code Structure

The DR capabilities are implemented in the following components:

1. **HostedZoneStack**: A stack that creates the Route53 hosted zone for IoT Core endpoints. This stack is deployed once in the primary region for each environment.

2. **IoTStack**: Directly uses `HostedZone.fromLookup` to reference the hosted zone and creates IoT Core custom endpoints, health checks, and Route53 records with failover routing policy.

3. **IotPlatformStage**: Manages the deployment of IoTStack and other stacks in each region.

4. **CICDPipelineStack**: Already configured for multi-region deployment using waves, ensuring coordinated deployment across regions.

## Consequences

### Benefits

1. **Improved Resilience**: The IoT platform can continue operating even if an entire AWS region becomes unavailable.

2. **Transparent Failover**: Devices connect to a single domain name and are automatically routed to an available endpoint.

3. **Reduced Recovery Time**: Automatic failover minimizes the time to recover from a regional outage.

4. **Simplified Device Configuration**: Devices only need to be configured with a single endpoint domain name.

### Challenges

1. **Certificate Management**: Custom domain configurations require SSL certificates, which need to be managed across regions.

2. **Cross-Region Data Consistency**: While the network layer provides failover capabilities, application-level data consistency across regions needs additional consideration.

3. **Testing Complexity**: Testing DR scenarios requires simulating regional outages, which can be complex.

## Implementation Notes

- The primary region is determined by the `PRIMARY_REGION` environment variable or defaults to `eu-west-1`.
- The domain name for IoT Core custom endpoints follows the pattern `iot-{environment}.example.com`.
- Health checks are configured to check HTTPS connectivity to the IoT Core endpoints.
- The Route53 hosted zone is created only in the primary region by the HostedZoneStack and directly referenced in all regions using `HostedZone.fromLookup`.
