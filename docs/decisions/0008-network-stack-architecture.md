# Network Stack Architecture

## Context

The NetworkStack was previously designed with region-specific conditionals (isPrimaryRegion) to handle the creation and management of Route53 hosted zones for the IoT platform. This approach added complexity and made it harder to maintain and extend the codebase.

## Decision

We have redesigned the NetworkStack to eliminate region-specific conditionals while still supporting the Primary and DR scenario with hosted zones. The new architecture uses a region-agnostic approach that works consistently across all regions.

### Architecture Changes

1. **Separate Hosted Zone Creation**: We created a new `HostedZoneStack` that is responsible for creating the Route53 hosted zone. This stack is deployed once in the primary region for each environment before the CICDPipelineStack.

2. **Region-Agnostic Lookup**: The NetworkStack now uses `HostedZone.fromLookup` to reference the hosted zone by domain name, which works consistently across all regions without needing to know if we're in the primary or secondary region.

3. **Removed isPrimaryRegion Conditionals**: We removed the isPrimaryRegion property and all related conditional logic from the NetworkStack, simplifying the code and making it more maintainable.

4. **Cross-Stack References**: The NetworkStack still stores the hosted zone ID in SSM Parameter Store for cross-stack reference, allowing other stacks (like IoTStack) to reference the hosted zone without needing to know if they're in the primary or secondary region.

### Implementation Details

The implementation follows these principles:

1. **Separation of Concerns**: The HostedZoneStack is responsible for creating the hosted zone, while the NetworkStack is responsible for referencing it and making it available to other stacks.

2. **Region Independence**: Each region's NetworkStack works independently, looking up the hosted zone by domain name without needing to know if it's in the primary or secondary region.

3. **Consistent Deployment**: The hosted zones are created before the CICDPipelineStack is deployed, ensuring that they exist before the NetworkStack is deployed in any region.

## Consequences

### Benefits

1. **Simplified Architecture**: The NetworkStack is now simpler and more maintainable, with no region-specific conditionals.

2. **Easier to Extend**: Adding new regions or environments is easier, as there's no need to update region-specific logic.

3. **Consistent Behavior**: The NetworkStack behaves consistently across all regions, reducing the risk of region-specific issues.

4. **Better Separation of Concerns**: The HostedZoneStack is responsible for creating the hosted zone, while the NetworkStack is responsible for referencing it, following the single responsibility principle.

### Challenges

1. **Deployment Order**: The HostedZoneStack must be deployed before the CICDPipelineStack to ensure that the hosted zones exist before the NetworkStack is deployed.

2. **Lookup Dependency**: The NetworkStack now depends on the hosted zone existing, which could cause issues if the hosted zone is deleted or not created properly.

## Implementation Notes

- The primary region is still defined in main.ts as "eu-west-1", but this is now only relevant for the HostedZoneStack deployment, not for the NetworkStack.
- The domain name for IoT Core custom endpoints follows the pattern `iot-{environment}.example.com`, which is consistent with the previous implementation.
- The HostedZoneStack is deployed for each environment (dev, prod) in the primary region only.
- The NetworkStack uses HostedZone.fromLookup to reference the hosted zone by domain name, which requires the CDK environment to be specified.