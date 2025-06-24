# Device Tagger Construct

This directory contains reusable CDK constructs that follow clean architecture principles.

## DeviceTaggerConstruct

The `DeviceTaggerConstruct` is a reusable CDK construct that implements device tagging functionality for IoT devices. It follows clean architecture principles by encapsulating all the device tagging functionality in a single construct, allowing the IoT Stack to remain focused on core IoT functionality without needing to know the implementation details of device tagging.

### Features

- A Lambda function that tags IoT devices with cost allocation tags
- An EventBridge rule that listens for IoT registry events
- CloudWatch dashboard and metrics for device activity

### Usage

```typescript
import { DeviceTaggerConstruct } from "../constructs";

// Create the device tagger construct
const deviceTagger = new DeviceTaggerConstruct(this, "DeviceTagger", {
  accountId: this.account,
  region: this.region,
});
```

### Clean Architecture Principles

The `DeviceTaggerConstruct` follows these clean architecture principles:

1. **Separation of Concerns**: Device tagging is now a separate concern from the IoT Stack.
2. **Dependency Inversion**: The IoT Stack depends on the `DeviceTaggerConstruct` interface, not its implementation details.
3. **Single Responsibility**: The `DeviceTaggerConstruct` has a single responsibility of handling device tagging.
4. **Encapsulation**: All the device tagging functionality is encapsulated within the construct.
5. **Reusability**: The construct can be reused in other stacks or projects.

### Benefits

By following clean architecture principles, we gain several benefits:

1. **Maintainability**: Changes to the device tagging functionality can be made without affecting the IoT Stack.
2. **Testability**: The construct can be tested independently of the IoT Stack.
3. **Flexibility**: The construct can be extended or replaced without affecting the IoT Stack.
4. **Readability**: The IoT Stack code is more focused and easier to understand.
5. **Scalability**: New features can be added to the device tagging functionality without altering the IoT Stack.