import { Stack, StackProps, aws_iot as iot } from "aws-cdk-lib";
import { Construct } from "constructs";

/**
 * Represents an IoTStack that sets up AWS IoT resources, including policies and rules,
 * to enable IoT device data integration with other AWS services like Kinesis Data Streams.
 *
 * This stack configures the following:
 * - An IoT Policy to allow devices to publish/subscribe to topics within their tenant-specific namespace.
 * - An IoT Rule to forward device data from MQTT topics to a specified Kinesis Data Stream for processing.
 *
 * The stack enables scalable IoT data management by integrating with AWS IoT Core and provides
 * a foundation for robust IoT solutions and data analysis pipelines.
 *
 * @class
 * @extends {Stack}
 *
 * @param {Construct} scope - The scope in which this stack is defined.
 * @param {string} id - The logical ID of the stack.
 * @param {StackProps} [props] - Configuration and properties for the stack.
 */
export class IoTStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    // IoT Policy allowing devices to publish/subscribe to their own topics
    new iot.CfnPolicy(this, "DevicePolicy", {
      policyName: "IoTDevicePolicy",
      policyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: ["iot:Publish", "iot:Subscribe", "iot:Connect"],
            Resource: [
              // Allow pub/sub to topics under the device's own namespace
              // ${iot:Connection.Thing.ThingName} is a policy variable for the Thing name
              `arn:aws:iot:${this.region}:${this.account}:topic/tenant/\${iot:ClientId}/*`,
            ],
          },
        ],
      },
    });

    // IoT Rule to forward device data from MQTT to Kinesis Data Stream
    new iot.CfnTopicRule(this, "IoTToKinesisRule", {
      ruleName: "IoTDataToKinesis",
      topicRulePayload: {
        description:
          "Forward IoT messages to Kinesis Data Stream for processing",
        sql: "SELECT * FROM 'tenant/+/device/+/data'", // match any tenant/device data topic
        awsIotSqlVersion: "2016-03-23",
        ruleDisabled: false,
        actions: [
          {
            // Kinesis action: put record into stream
            kinesis: {
              roleArn: "<IoTRoleForKinesisARN>", // IAM role that IoT will assume to write to Kinesis
              streamName: "<IoTDataStreamName>", // Name of the Kinesis Data Stream (from StreamingStack)
            },
          },
        ],
      },
    });

    // (Optional) IoT provisioning resources (certificates, thing types, etc.) could be defined here or handled out-of-band.
  }
}
