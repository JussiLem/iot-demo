import * as path from "path";
import {
  Stack,
  StackProps,
  aws_cloudwatch as cloudwatch,
  aws_cloudwatch_actions as cloudwatch_actions,
  aws_sns as sns,
  aws_iam as iam,
  aws_budgets as budgets,
  aws_lambda as lambda,
  aws_lambda_nodejs as lambda_nodejs,
  aws_events as events,
  aws_events_targets as targets,
  Duration,
  CfnOutput,
} from "aws-cdk-lib";
import { Construct } from "constructs";

/**
 * CostMonitoringStack implements cost tracking and monitoring for IoT devices.
 *
 * This stack provides:
 * 1. Device-level cost tracking using AWS IoT Core metrics and CloudWatch
 * 2. Multi-tenant cost allocation using resource tagging
 * 3. Cost dashboards for visualization and monitoring
 * 4. Budget alerts for cost control
 * 5. Scheduled cost analysis using AWS Cost Explorer
 */
export class CostMonitoringStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // SNS Topic for cost alerts
    const costAlertTopic = new sns.Topic(this, "CostAlertTopic", {
      displayName: "IoT Cost Alerts",
    });

    // Create a dashboard for IoT costs
    const dashboard = new cloudwatch.Dashboard(this, "IoTCostDashboard", {
      dashboardName: "IoT-Cost-Per-Device-Dashboard",
    });

    // Create a widget for overall IoT costs
    const overallCostWidget = new cloudwatch.TextWidget({
      markdown:
        "# IoT Platform Cost Monitoring\nTrack and analyze costs per device and tenant",
      width: 24,
      height: 2,
    });

    // Add the widget to the dashboard
    dashboard.addWidgets(overallCostWidget);

    // Create a Lambda function to process cost data from Cost Explorer using NodejsFunction
    const costExplorerFunction = new lambda_nodejs.NodejsFunction(
      this,
      "CostExplorerFunction",
      {
        runtime: lambda.Runtime.NODEJS_22_X,
        entry: path.join(__dirname, "../lambda/cost-explorer/index.ts"),
        handler: "handler",
        timeout: Duration.minutes(5),
        memorySize: 256,
        environment: {
          COST_DASHBOARD_NAME: dashboard.dashboardName,
          POWERTOOLS_SERVICE_NAME: "cost-explorer",
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

    // Grant permissions to the Lambda function to access Cost Explorer and CloudWatch
    costExplorerFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ce:GetCostAndUsage", "ce:GetTags"],
        resources: ["*"],
      }),
    );

    costExplorerFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "cloudwatch:PutMetricData",
          "cloudwatch:GetDashboard",
          "cloudwatch:PutDashboard",
        ],
        resources: ["*"],
      }),
    );

    // Schedule the Lambda function to run daily
    const rule = new events.Rule(this, "DailyCostProcessingRule", {
      schedule: events.Schedule.cron({ minute: "0", hour: "1" }), // Run at 1:00 AM UTC
    });
    rule.addTarget(new targets.LambdaFunction(costExplorerFunction));

    // Create a budget for IoT costs
    new budgets.CfnBudget(this, "IoTBudget", {
      budget: {
        budgetName: "IoT-Platform-Monthly-Budget",
        budgetType: "COST",
        timeUnit: "MONTHLY",
        budgetLimit: {
          amount: 100, // Set an appropriate budget limit
          unit: "USD",
        },
        costFilters: {
          TagKeyValue: ["user:Service$IoT"], // Filter by the Service tag
        },
      },
      notificationsWithSubscribers: [
        {
          notification: {
            comparisonOperator: "GREATER_THAN",
            notificationType: "ACTUAL",
            threshold: 80, // Notify at 80% of budget
            thresholdType: "PERCENTAGE",
          },
          subscribers: [
            {
              subscriptionType: "SNS",
              address: costAlertTopic.topicArn,
            },
          ],
        },
        {
          notification: {
            comparisonOperator: "GREATER_THAN",
            notificationType: "FORECASTED",
            threshold: 100, // Notify when forecasted to exceed budget
            thresholdType: "PERCENTAGE",
          },
          subscribers: [
            {
              subscriptionType: "SNS",
              address: costAlertTopic.topicArn,
            },
          ],
        },
      ],
    });

    // Create CloudWatch alarms for high cost per device
    const highCostAlarm = new cloudwatch.Alarm(this, "HighCostPerDeviceAlarm", {
      metric: new cloudwatch.Metric({
        namespace: "IoT/DeviceCosts",
        metricName: "CostPerDevice",
        statistic: "Maximum",
        period: Duration.days(1),
      }),
      evaluationPeriods: 1,
      threshold: 5, // Set an appropriate threshold in USD
      alarmDescription:
        "Alarm when the cost for a single device exceeds the threshold",
      actionsEnabled: true,
    });

    // Add SNS action to the alarm
    highCostAlarm.addAlarmAction(
      new cloudwatch_actions.SnsAction(costAlertTopic),
    );

    // Output the dashboard URL
    new CfnOutput(this, "DashboardURL", {
      value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${dashboard.dashboardName}`,
      description: "URL for the IoT Cost Dashboard",
    });

    // Output the SNS topic ARN for subscribing to cost alerts
    new CfnOutput(this, "CostAlertTopicARN", {
      value: costAlertTopic.topicArn,
      description: "ARN of the SNS topic for cost alerts",
    });
  }
}
