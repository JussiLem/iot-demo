import {
  aws_lambda as lambda,
  aws_lambda_nodejs as lambda_nodejs,
  aws_iam as iam,
  aws_cloudwatch as cloudwatch,
  aws_events as events,
  aws_events_targets as targets,
  Duration,
} from "aws-cdk-lib";
import { Construct } from "constructs";

/**
 * Properties for the DeviceTaggerConstruct
 */
export interface DeviceTaggerConstructProps {
  /**
   * The AWS account ID
   */
  readonly accountId: string;

  /**
   * The AWS region
   */
  readonly region: string;
}

/**
 * A construct that implements device tagging functionality for IoT devices.
 *
 * This construct provides:
 * 1. A Lambda function that tags IoT devices with cost allocation tags
 * 2. An EventBridge rule that listens for IoT registry events
 * 3. CloudWatch dashboard and metrics for device activity
 *
 * Following clean architecture principles, this construct encapsulates all the
 * device tagging functionality, allowing the IoT Stack to remain focused on
 * core IoT functionality without needing to know the implementation details
 * of device tagging.
 */
export class DeviceTaggerConstruct extends Construct {
  /**
   * The Lambda function that tags IoT devices
   */
  public readonly deviceTaggerFunction: lambda_nodejs.NodejsFunction;

  /**
   * The EventBridge rule that listens for IoT registry events
   */
  public readonly iotRegistryEventsRule: events.Rule;

  /**
   * The CloudWatch dashboard for IoT device metrics
   */
  public readonly deviceMetricsDashboard: cloudwatch.Dashboard;

  constructor(scope: Construct, id: string, props: DeviceTaggerConstructProps) {
    super(scope, id);

    // Create a Lambda function to tag IoT devices with cost allocation tags
    this.deviceTaggerFunction = new lambda_nodejs.NodejsFunction(
      this,
      "DeviceTaggerFunction",
      {
        runtime: lambda.Runtime.NODEJS_22_X,
        handler: "handler",
        timeout: Duration.seconds(30),
        memorySize: 256,
        environment: {
          AWS_ACCOUNT_ID: props.accountId,
          POWERTOOLS_SERVICE_NAME: "device-tagger",
          POWERTOOLS_LOGGER_LOG_LEVEL: "INFO",
        },
        bundling: {
          minify: true,
          sourceMap: true,
          externalModules: [
            "aws-sdk", // Mark as external to use AWS SDK v3
          ],
        },
      },
    );

    // Grant permissions to the Lambda function
    this.deviceTaggerFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["iot:CreateThing", "iot:DescribeThing", "iot:TagResource"],
        resources: [`arn:aws:iot:${props.region}:${props.accountId}:thing/*`],
      }),
    );

    this.deviceTaggerFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["cloudwatch:PutMetricData"],
        resources: ["*"],
      }),
    );

    // Create a CloudWatch dashboard for IoT device metrics
    this.deviceMetricsDashboard = new cloudwatch.Dashboard(
      this,
      "IoTDeviceMetricsDashboard",
      {
        dashboardName: "IoT-Device-Metrics-Dashboard",
      },
    );

    // Add a widget for device message count
    const messageCountWidget = new cloudwatch.GraphWidget({
      title: "IoT Device Message Count",
      left: [
        new cloudwatch.Metric({
          namespace: "IoT/DeviceActivity",
          metricName: "MessageCount",
          statistic: "Sum",
          period: Duration.minutes(5),
        }),
      ],
      width: 12,
    });

    this.deviceMetricsDashboard.addWidgets(messageCountWidget);

    // Create an EventBridge rule to listen for IoT CreateThing and UpdateThing events
    this.iotRegistryEventsRule = new events.Rule(
      this,
      "IoTRegistryEventsRule",
      {
        ruleName: "IoTDeviceRegistryEvents",
        description:
          "Rule to capture IoT device registry events (CreateThing, UpdateThing)",
        eventPattern: {
          source: ["aws.iot"],
          detailType: ["AWS API Call via CloudTrail"],
          detail: {
            eventSource: ["iot.amazonaws.com"],
            eventName: ["CreateThing", "UpdateThing"],
          },
        },
      },
    );

    // Add the deviceTaggerFunction as a target for the EventBridge rule
    this.iotRegistryEventsRule.addTarget(
      new targets.LambdaFunction(this.deviceTaggerFunction),
    );

    // Grant permission for EventBridge to invoke the Lambda function
    this.deviceTaggerFunction.addPermission("AllowEventBridgeInvocation", {
      principal: new iam.ServicePrincipal("events.amazonaws.com"),
      action: "lambda:InvokeFunction",
      sourceArn: this.iotRegistryEventsRule.ruleArn,
    });

    // Add additional permissions for the Lambda function to access CloudTrail events
    this.deviceTaggerFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["cloudtrail:LookupEvents"],
        resources: ["*"],
      }),
    );
  }
}
