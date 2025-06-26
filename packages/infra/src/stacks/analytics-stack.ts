import {
  Stack,
  StackProps,
  aws_athena as athena,
  aws_iam as iam,
  aws_ssm as ssm,
} from "aws-cdk-lib";
import { Construct } from "constructs";

/**
 * Properties for the AnalyticsStack
 */
export interface AnalyticsStackProps extends StackProps {
  /**
   * The name of the Glue database to read data from
   * If not provided, the stack will look up the database name from the DataLakeStack
   */
  readonly databaseName?: string;
}

/**
 * A stack that provides analytics capabilities for IoT data.
 *
 * This stack is part of the Insights phase of the IoT platform architecture.
 * It is responsible for analyzing IoT data to extract insights.
 *
 * The stack includes:
 * - Athena workgroups and named queries for IoT data analysis
 * - IAM roles and policies for accessing the data lake
 * - SSM parameters for cross-stack references
 *
 * This stack follows Domain-Driven Design principles by focusing on the analytics domain
 * and providing clear interfaces for other domains to interact with it.
 */
export class AnalyticsStack extends Stack {
  /**
   * The Athena workgroup for IoT data analysis
   */
  public readonly iotWorkgroup: athena.CfnWorkGroup;

  /**
   * The IAM role for accessing the data lake
   */
  public readonly dataLakeAccessRole: iam.Role;

  constructor(scope: Construct, id: string, props?: AnalyticsStackProps) {
    super(scope, id, props);

    // Extract environment name and region from stack name
    const stackNameParts = this.stackName.split("-");
    const envName = stackNameParts.length > 0 ? stackNameParts[0] : "dev";
    const region = this.region;

    // Create a unique prefix for resource names to avoid conflicts in multi-region deployments
    const resourcePrefix = `${envName}-${region}`;

    // Get the database name from props or look it up from the DataLakeStack
    let databaseName = props?.databaseName;
    if (!databaseName) {
      // Look up the database name from SSM Parameter Store
      const databaseNameParam =
        ssm.StringParameter.fromStringParameterAttributes(
          this,
          "DatabaseNameParam",
          {
            parameterName: `/iot-platform/${envName}/${region}/data-lake/database-name`,
          },
        );
      databaseName = databaseNameParam.stringValue;
    }

    // Create an IAM role for accessing the data lake
    this.dataLakeAccessRole = new iam.Role(this, "DataLakeAccessRole", {
      assumedBy: new iam.ServicePrincipal("athena.amazonaws.com"),
      description: "Role for Athena to access the IoT data lake",
    });

    // Grant permissions to the role
    this.dataLakeAccessRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "glue:GetTable",
          "glue:GetPartition",
          "glue:GetPartitions",
          "glue:GetDatabase",
          "glue:GetDatabases",
        ],
        resources: ["*"],
      }),
    );

    this.dataLakeAccessRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject", "s3:ListBucket"],
        resources: ["arn:aws:s3:::*"],
      }),
    );

    // Create an Athena workgroup for IoT data analysis
    this.iotWorkgroup = new athena.CfnWorkGroup(this, "IoTWorkgroup", {
      name: `${resourcePrefix}-iot-workgroup`,
      description: "Workgroup for IoT data analysis",
      state: "ENABLED",
      workGroupConfiguration: {
        enforceWorkGroupConfiguration: true,
        publishCloudWatchMetricsEnabled: true,
        resultConfiguration: {
          outputLocation: `s3://${resourcePrefix}-athena-results/`,
        },
      },
    });

    // Create some example named queries
    // These are just placeholders and would be replaced with actual queries in a real implementation
    new athena.CfnNamedQuery(this, "DeviceActivityQuery", {
      database: databaseName,
      description: "Query to analyze device activity over time",
      name: "DeviceActivityOverTime",
      queryString: `
        SELECT
          device_id,
          date_trunc('hour', timestamp) as hour,
          count(*) as message_count
        FROM
          ${databaseName}.device_raw_data
        WHERE
          timestamp >= current_date - interval '7' day
        GROUP BY
          device_id, date_trunc('hour', timestamp)
        ORDER BY
          device_id, hour
      `,
      workGroup: this.iotWorkgroup.name,
    });

    new athena.CfnNamedQuery(this, "AnomalyDetectionQuery", {
      database: databaseName,
      description: "Query to detect anomalies in device readings",
      name: "AnomalyDetection",
      queryString: `
        WITH device_stats AS (
          SELECT
            device_id,
            avg(reading_value) as avg_reading,
            stddev(reading_value) as stddev_reading
          FROM
            ${databaseName}.device_raw_data
          WHERE
            timestamp >= current_date - interval '30' day
          GROUP BY
            device_id
        )
        SELECT
          d.device_id,
          d.timestamp,
          d.reading_value,
          s.avg_reading,
          s.stddev_reading,
          (d.reading_value - s.avg_reading) / s.stddev_reading as z_score
        FROM
          ${databaseName}.device_raw_data d
          JOIN device_stats s ON d.device_id = s.device_id
        WHERE
          timestamp >= current_date - interval '1' day
          AND abs((d.reading_value - s.avg_reading) / s.stddev_reading) > 3
        ORDER BY
          abs((d.reading_value - s.avg_reading) / s.stddev_reading) DESC
      `,
      workGroup: this.iotWorkgroup.name,
    });

    // Store the workgroup name in SSM Parameter Store for cross-stack reference
    new ssm.StringParameter(this, "WorkgroupNameParam", {
      parameterName: `/iot-platform/${envName}/${region}/analytics/workgroup-name`,
      description: "Name of the Athena workgroup for IoT data analysis",
      stringValue: this.iotWorkgroup.name,
    });
  }
}
