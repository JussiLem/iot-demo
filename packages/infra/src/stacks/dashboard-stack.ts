import {
  Stack,
  StackProps,
  aws_cloudwatch as cloudwatch,
  aws_iam as iam,
  aws_ssm as ssm,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { AnalyticsStack } from "./analytics-stack";

/**
 * Properties for the DashboardStack
 */
export interface DashboardStackProps extends StackProps {
  /**
   * Reference to the AnalyticsStack
   * This is used to get the Athena workgroup and other analytics resources
   */
  readonly analyticsStack?: AnalyticsStack;
}

/**
 * A stack that provides visualization capabilities for IoT data.
 *
 * This stack is part of the Insights phase of the IoT platform architecture.
 * It is responsible for visualizing IoT data and insights.
 *
 * The stack includes:
 * - CloudWatch dashboards for IoT data visualization
 * - IAM roles and policies for accessing the analytics resources
 * - SSM parameters for cross-stack references
 *
 * This stack follows Domain-Driven Design principles by focusing on the visualization domain
 * and providing clear interfaces for other domains to interact with it.
 */
export class DashboardStack extends Stack {
  /**
   * The CloudWatch dashboard for IoT data visualization
   */
  public readonly iotDashboard: cloudwatch.Dashboard;

  /**
   * The IAM role for accessing the analytics resources
   */
  public readonly analyticsAccessRole: iam.Role;

  constructor(scope: Construct, id: string, props?: DashboardStackProps) {
    super(scope, id, props);

    // Extract environment name and region from stack name
    const stackNameParts = this.stackName.split("-");
    const envName = stackNameParts.length > 0 ? stackNameParts[0] : "dev";
    const region = this.region;

    // Create a unique prefix for resource names to avoid conflicts in multi-region deployments
    const resourcePrefix = `${envName}-${region}`;

    // Create an IAM role for accessing the analytics resources
    this.analyticsAccessRole = new iam.Role(this, "AnalyticsAccessRole", {
      assumedBy: new iam.ServicePrincipal("cloudwatch.amazonaws.com"),
      description: "Role for CloudWatch to access the IoT analytics resources",
    });

    // Grant permissions to the role
    this.analyticsAccessRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "athena:GetQueryExecution",
          "athena:GetQueryResults",
          "athena:StartQueryExecution",
        ],
        resources: ["*"],
      }),
    );

    this.analyticsAccessRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject", "s3:ListBucket"],
        resources: ["arn:aws:s3:::*"],
      }),
    );

    // Create a CloudWatch dashboard for IoT data visualization
    this.iotDashboard = new cloudwatch.Dashboard(this, "IoTDashboard", {
      dashboardName: `${resourcePrefix}-iot-dashboard`,
    });

    // Add a text widget with a title
    this.iotDashboard.addWidgets(
      new cloudwatch.TextWidget({
        markdown:
          "# IoT Platform Dashboard\nVisualization of IoT device data and insights",
        width: 24,
        height: 2,
      }),
    );

    // Add a widget for device message count
    this.iotDashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: "Device Message Count",
        left: [
          new cloudwatch.Metric({
            namespace: "IoT/DeviceActivity",
            metricName: "MessageCount",
            statistic: "Sum",
            dimensionsMap: {
              DeviceId: "All",
            },
          }),
        ],
        width: 12,
        height: 6,
      }),
    );

    // Add a widget for device errors
    this.iotDashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: "Device Errors",
        left: [
          new cloudwatch.Metric({
            namespace: "IoT/DeviceActivity",
            metricName: "ErrorCount",
            statistic: "Sum",
            dimensionsMap: {
              DeviceId: "All",
            },
          }),
        ],
        width: 12,
        height: 6,
      }),
    );

    // Add a widget for device battery level
    this.iotDashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: "Device Battery Level",
        left: [
          new cloudwatch.Metric({
            namespace: "IoT/DeviceStatus",
            metricName: "BatteryLevel",
            statistic: "Average",
            dimensionsMap: {
              DeviceId: "All",
            },
          }),
        ],
        width: 12,
        height: 6,
      }),
    );

    // Add a widget for device temperature
    this.iotDashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: "Device Temperature",
        left: [
          new cloudwatch.Metric({
            namespace: "IoT/DeviceStatus",
            metricName: "Temperature",
            statistic: "Average",
            dimensionsMap: {
              DeviceId: "All",
            },
          }),
        ],
        width: 12,
        height: 6,
      }),
    );

    // Store the dashboard name in SSM Parameter Store for cross-stack reference
    new ssm.StringParameter(this, "DashboardNameParam", {
      parameterName: `/iot-platform/${envName}/${region}/dashboard/dashboard-name`,
      description:
        "Name of the CloudWatch dashboard for IoT data visualization",
      stringValue: this.iotDashboard.dashboardName,
    });
  }
}
