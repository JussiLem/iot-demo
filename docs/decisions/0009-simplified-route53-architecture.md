# Simplified Route53 Architecture

## Context

The IoT platform previously used a NetworkStack to manage Route53 resources, specifically the hosted zone for IoT Core endpoints. This stack was responsible for looking up the hosted zone by domain name and storing the hosted zone ID in SSM Parameter Store for cross-stack reference. The IoTStack then imported the hosted zone ID from SSM Parameter Store to create a reference to the hosted zone.

## Decision

We have simplified the architecture by removing the NetworkStack and having IoTStack directly use `HostedZone.fromLookup` to reference the hosted zone. This reduces the number of stacks and simplifies the architecture without compromising the disaster recovery (DR) capabilities.

### Architecture Changes

1. **Removed NetworkStack**: The NetworkStack has been removed from the architecture. It was previously responsible for looking up the hosted zone by domain name and storing the hosted zone ID in SSM Parameter Store.

2. **Direct Lookup in IoTStack**: The IoTStack now directly uses `HostedZone.fromLookup` to reference the hosted zone by domain name. This works consistently across all regions without needing to know if we're in the primary or secondary region.

3. **Simplified Cross-Stack References**: By removing the intermediate NetworkStack, we've simplified the cross-stack references. The IoTStack now directly depends on the hosted zone, rather than going through SSM Parameter Store.

### Implementation Details

The implementation follows these principles:

1. **Region Independence**: Each region's IoTStack works independently, looking up the hosted zone by domain name without needing to know if it's in the primary or secondary region.

2. **Consistent Deployment**: The hosted zones are created by the HostedZoneStack, which is deployed before the IotPlatformStage, ensuring that they exist before the IoTStack is deployed in any region.

3. **Simplified Architecture**: By removing the NetworkStack, we've simplified the architecture and reduced the number of stacks that need to be deployed and maintained.

## Consequences

### Benefits

1. **Simplified Architecture**: The architecture is now simpler and more maintainable, with fewer stacks and cross-stack references.

2. **Reduced Deployment Complexity**: With fewer stacks, the deployment process is simpler and less error-prone.

3. **Direct Dependency Management**: The IoTStack now directly depends on the hosted zone, making the dependencies more explicit and easier to understand.

### Challenges

1. **Deployment Order**: The HostedZoneStack must still be deployed before the IotPlatformStage to ensure that the hosted zones exist before the IoTStack is deployed.

2. **Lookup Dependency**: The IoTStack now depends on the hosted zone existing, which could cause issues if the hosted zone is deleted or not created properly.

## Implementation Notes

- The primary region is still defined in main.ts as "eu-west-1", but this is now only relevant for the HostedZoneStack deployment.
- The domain name for IoT Core custom endpoints follows the pattern `iot-{environment}.example.com`, which is consistent with the previous implementation.
- The HostedZoneStack is deployed for each environment (dev, prod) in the primary region only.
- The IoTStack uses HostedZone.fromLookup to reference the hosted zone by domain name, which requires the CDK environment to be specified.