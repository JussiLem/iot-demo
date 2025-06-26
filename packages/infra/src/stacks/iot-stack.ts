import {
  Stack,
  StackProps,
  aws_iot as iot,
  aws_iam as iam,
  aws_ssm as ssm,
  aws_route53 as route53,
  CfnOutput,
  Duration,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { DeviceTaggerConstruct } from "../constructs";

/**
 * Represents an IoTStack that sets up AWS IoT resources, including policies and rules,
 * to enable IoT device data integration with other AWS services like Kinesis Data Streams.
 *
 * This stack configures the following:
 * - An IoT Policy to allow devices to publish/subscribe to topics within their tenant-specific namespace.
 * - An IoT Rule to forward device data from MQTT topics to a specified Kinesis Data Stream for processing.
 * - Cost tracking for IoT devices with multi-tenant support.
 * - IoT Core custom domain configuration with Route53 failover routing for disaster recovery.
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
export interface IoTStackProps extends StackProps {
  /**
   * The domain name for the IoT Core custom endpoint
   * @default "iot-{envName}.example.com"
   */
  readonly domainName?: string;

  /**
   * Whether this stack is deployed in the primary region
   * @default false
   */
  readonly isPrimaryRegion?: boolean;
}

export class IoTStack extends Stack {
  /**
   * The custom IoT Core endpoint domain name
   */
  public readonly iotCustomEndpointDomainName: string;

  constructor(scope: Construct, id: string, props?: IoTStackProps) {
    super(scope, id, props);

    // Extract the environment name and region from the stack name
    const getStackInfo = (stackName: string) => {
      const parts = stackName.split("-");
      return {
        envName: parts.length > 0 ? parts[0] : "dev",
        region: this.region,
      } as const;
    };

    const { envName, region } = getStackInfo(this.stackName);

    // Determine if this is the primary region (for failover configuration)
    const isPrimaryRegion =
      props?.isPrimaryRegion ??
      region === (process.env.PRIMARY_REGION || "eu-west-1");

    // IoT Policy allowing devices to publish/subscribe to their own topics
    const devicePolicyDocument = {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: ["iot:Publish", "iot:Subscribe", "iot:Connect"] as const,
          Resource: [
            `arn:aws:iot:${region}:${this.account}:topic/tenant/\${iot:ClientId}/*`,
          ] as const,
        },
      ] as const,
    } as const;

    // IoT Policy allowing devices to publish/subscribe to their own topics
    new iot.CfnPolicy(this, "DevicePolicy", {
      policyName: "IoTDevicePolicy",
      policyDocument: devicePolicyDocument,
    });

    // Create the device tagger construct
    new DeviceTaggerConstruct(this, "DeviceTagger", {
      accountId: this.account,
      region: this.region,
    });

    // Create IAM role for IoT to write to Kinesis
    const iotToKinesisRole = new iam.Role(this, "IoTToKinesisRole", {
      assumedBy: new iam.ServicePrincipal("iot.amazonaws.com"),
      description: "Role for IoT rules to write to Kinesis Data Stream",
    });

    // Get the Kinesis stream name from SSM Parameter Store or use a default value
    // This allows for cross-stack references in a multi-region deployment
    const streamNameParam = new ssm.StringParameter(
      this,
      "IoTDataStreamNameParam",
      {
        parameterName: `/iot-platform/${this.stackName}/kinesis-stream-name`,
        description: "Name of the Kinesis Data Stream for IoT data",
        stringValue: "IoTDeviceDataStream", // Default value, will be overridden if parameter exists
      },
    );

    // IoT Rule to forward device data from MQTT to Kinesis Data Stream
    new iot.CfnTopicRule(this, "IoTToKinesisRule", {
      ruleName: `IoTDataToKinesis-${this.region}`, // Make rule name unique per region
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
              roleArn: iotToKinesisRole.roleArn, // Use the role created above
              streamName: streamNameParam.stringValue, // Use the stream name from parameter store
            },
          },
        ],
      },
    });

    // The device tagger construct handles all the permissions and event rules

    // (Optional) IoT provisioning resources (certificates, thing types, etc.) could be defined here or handled out-of-band.

    // Get domain name from props or use default
    const domainName = props?.domainName || `iot-${envName}.example.com`;

    // Look up the hosted zone by domain name
    // This works consistently across all regions without needing to know if we're in the primary or secondary region
    const hostedZone = route53.HostedZone.fromLookup(this, "IoTHostedZone", {
      domainName: domainName,
    });

    // Create a custom domain configuration for IoT Core
    const customDomainConfig = new iot.CfnDomainConfiguration(
      this,
      "IoTCustomDomain",
      {
        domainName: domainName,
        domainConfigurationName: `${envName}-${region}-config`,
        serverCertificateArns: [
          // You would need to create or import a certificate for the domain
          // For simplicity, we're using a placeholder ARN
          `arn:aws:acm:${region}:${this.account}:certificate/example-certificate`,
        ],
        serviceType: "DATA",
      },
    );

    // Store the IoT Core endpoint in a variable for reference
    this.iotCustomEndpointDomainName = customDomainConfig.domainName!;

    // Store the custom endpoint domain name in SSM Parameter Store for cross-stack reference
    new ssm.StringParameter(this, "IoTCustomEndpointParam", {
      parameterName: `/iot-platform/${envName}/${region}/iot-custom-endpoint`,
      description: "Custom domain name for the IoT Core endpoint",
      stringValue: this.iotCustomEndpointDomainName,
    });

    // Create a health check for the IoT Core endpoint
    const healthCheck = new route53.HealthCheck(
      this,
      "IoTEndpointHealthCheck",
      {
        type: route53.HealthCheckType.HTTPS,
        fqdn: this.iotCustomEndpointDomainName,
        port: 443,
        resourcePath: "/",
        requestInterval: Duration.seconds(30),
        failureThreshold: 3,
      },
    );

    // Create a Route53 record with failover routing policy
    new route53.CfnRecordSet(this, "IoTEndpointRecord", {
      name: domainName,
      type: "A",
      aliasTarget: {
        dnsName: this.iotCustomEndpointDomainName,
        hostedZoneId: hostedZone.hostedZoneId,
        evaluateTargetHealth: true,
      },
      failover: isPrimaryRegion ? "PRIMARY" : "SECONDARY",
      healthCheckId: healthCheck.healthCheckId,
      hostedZoneId: hostedZone.hostedZoneId,
      setIdentifier: `${envName}-${region}-endpoint`,
    });

    // Output the custom endpoint domain name for reference
    new CfnOutput(this, "IoTCustomEndpointDomainName", {
      value: this.iotCustomEndpointDomainName,
      description: "The custom domain name for the IoT Core endpoint",
      exportName: `${envName}-${region}-iot-endpoint`,
    });
  }
}
