# Architecture Decision Record: Event-Driven Device Tagging

## 1. Key Decisions for Event-Driven Device Tagging

### ADR-001: Event-Driven Approach for Device Tagging
- **Decision**: Implement an event-driven solution using EventBridge to trigger the deviceTaggerFunction
- **Context**: The previous implementation was invoking the deviceTaggerFunction too often, even when no device was created
- **Rationale**: An event-driven approach ensures the function is only triggered when there are actual changes to the device registry
- **Consequences**: Reduced function invocations, lower costs, and improved efficiency

### ADR-002: EventBridge Rule for IoT Registry Events
- **Decision**: Use EventBridge rule listening to CreateThing and UpdateThing events to trigger the deviceTaggerFunction
- **Context**: Need to capture device registry changes to apply cost allocation tags
- **Rationale**: EventBridge provides a reliable way to capture and respond to IoT registry events
- **Consequences**: More precise triggering of the function, reduced costs, and improved scalability

### ADR-003: CloudTrail Integration for Event Capture
- **Decision**: Use CloudTrail events as the source for EventBridge rules
- **Context**: Need to capture API calls to the IoT registry
- **Rationale**: CloudTrail provides a comprehensive record of API calls, including IoT registry operations
- **Consequences**: Reliable event capture with detailed information about the API calls

## 2. Implementation Details

### Event-Driven Architecture
The event-driven architecture for device tagging consists of the following components:
1. **CloudTrail**: Captures API calls to the IoT registry
2. **EventBridge**: Listens for CreateThing and UpdateThing events from CloudTrail
3. **Lambda Function**: Processes the events and applies cost allocation tags to the devices

### EventBridge Rule Configuration
The EventBridge rule is configured to capture the following events:
- Source: aws.iot
- Detail Type: AWS API Call via CloudTrail
- Detail:
  - Event Source: iot.amazonaws.com
  - Event Name: CreateThing, UpdateThing

### Lambda Function Modifications
The deviceTaggerFunction has been modified to:
1. Extract thing name and tenant ID from the EventBridge event
2. Apply cost allocation tags to the device
3. Record metrics for device activity

## 3. Alternative Approaches Considered

### Option 1: EventBridge Rule -> Lambda (Implemented)
- **Pros**: Simple, direct, and efficient
- **Cons**: Limited to a single region

### Option 2: EventBridge Rule → EventBridge Pipes → Global DynamoDB Table → DynamoDB Streams → Lambda
- **Pros**: Multi-region support, improved scalability
- **Cons**: More complex, higher latency, additional costs
- **Decision**: Option 1 was chosen for its simplicity and efficiency, with the understanding that Option 2 could be implemented in the future if multi-region requirements become more important

## 4. Cost Considerations

The event-driven approach significantly reduces costs by:
1. **Reduced Lambda Invocations**: The function is only triggered when there are actual changes to the device registry
2. **Efficient Resource Utilization**: Resources are only used when needed
3. **Improved Scalability**: The solution scales based on the number of device registry changes, not the number of MQTT messages

## 5. Next Steps

1. **Monitor Function Invocations**: Track the number of function invocations to verify cost reduction
2. **Consider Multi-Region Implementation**: Evaluate the need for Option 2 based on multi-region requirements
3. **Optimize Event Pattern**: Refine the EventBridge rule pattern to capture only the necessary events
4. **Enhance Error Handling**: Improve error handling and retry logic in the Lambda function