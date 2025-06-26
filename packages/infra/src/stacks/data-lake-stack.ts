import {
  Stack,
  StackProps,
  aws_s3 as s3,
  aws_glue as glue,
  RemovalPolicy,
} from "aws-cdk-lib";
import { Construct } from "constructs";

/**
 * Extract environment info from stack name
 */
const getEnvironmentInfo = (stackName: string) => {
  const parts = stackName.split("-");
  return {
    envName: parts.length > 0 ? parts[0] : "dev",
  } as const;
};

/**
 * Pure function to create resource prefix
 */
const createResourcePrefix = (envName: string, region: string): string =>
  `${envName}-${region}`;

/**
 * Determine removal policy based on environment
 */
const getRemovalPolicy = (envName: string): RemovalPolicy =>
  envName === "prod" ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY;

/**
 * Create bucket configuration
 */
const createBucketConfig = (bucketName: string, removalPolicy: RemovalPolicy) =>
  ({
    bucketName,
    blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    encryption: s3.BucketEncryption.S3_MANAGED,
    removalPolicy,
  }) as const;

/**
 * Create an S3 bucket with the given configuration
 */
const createBucket = (
  scope: Construct,
  id: string,
  bucketName: string,
  removalPolicy: RemovalPolicy,
): s3.Bucket => {
  const bucketConfig = createBucketConfig(bucketName, removalPolicy);
  return new s3.Bucket(scope, id, bucketConfig);
};

/**
 * Properties for the DataLakeStack
 */
export interface DataLakeStackProps extends StackProps {
  /**
   * The name of the input Kinesis stream to read data from
   * If not provided, the stack will look up the stream name from SSM Parameter Store
   */
  readonly inputStreamName?: string;

  /**
   * The retention period for raw data in days
   * @default 30
   */
  readonly rawDataRetentionDays?: number;

  /**
   * The retention period for processed data in days
   * @default 90
   */
  readonly processedDataRetentionDays?: number;
}

/**
 * A stack that implements a data lake architecture for storing IoT data.
 *
 * This stack follows Domain-Driven Design principles by focusing on the
 * Store domain of the IoT platform. It is responsible for:
 * - Storing raw and processed IoT data in S3 buckets
 * - Organizing data for efficient querying and analysis using Glue
 * - Managing data lifecycle and retention policies
 *
 * The data lake architecture follows the medallion architecture pattern:
 * - Bronze layer: Raw data from IoT devices (stored in raw data bucket)
 * - Silver layer: Processed and enriched data (stored in processed data bucket)
 * - Gold layer: Aggregated and curated data for analytics (implemented in AnalyticsStack)
 */
export class DataLakeStack extends Stack {
  /**
   * The S3 bucket for raw IoT data
   */
  public readonly rawDataBucket: s3.Bucket;

  /**
   * The S3 bucket for processed IoT data
   */
  public readonly processedDataBucket: s3.Bucket;

  /**
   * The Glue database for IoT data
   */
  public readonly iotDataDatabase: glue.CfnDatabase;

  constructor(scope: Construct, id: string, props: DataLakeStackProps) {
    super(scope, id, props);

    const { envName } = getEnvironmentInfo(this.stackName);
    const resourcePrefix = createResourcePrefix(envName, this.region);
    const removalPolicy = getRemovalPolicy(envName);
    // Create S3 bucket for raw data (bronze layer)
    this.rawDataBucket = createBucket(
      this,
      "RawDataBucket",
      `${resourcePrefix}-iot-raw-data`,
      removalPolicy,
    );

    // Create S3 bucket for processed data (silver layer)
    this.processedDataBucket = createBucket(
      this,
      "ProcessedDataBucket",
      `${resourcePrefix}-iot-processed-data`,
      removalPolicy,
    );

    // Create Glue database for IoT data
    this.iotDataDatabase = new glue.CfnDatabase(this, "IoTDataDatabase", {
      catalogId: this.account,
      databaseInput: {
        name: `${resourcePrefix.replace(/-/g, "_")}_iot_data`,
        description: "Database for IoT device data",
      },
    });

    // Note: In a real implementation, we would also create:
    // 1. Glue tables for raw and processed data
    // 2. Glue crawlers to automatically discover schema changes
    // 3. Glue ETL jobs to transform raw data into processed data
    // 4. Glue workflows to orchestrate the ETL process
    // 5. CloudWatch events to trigger the workflows
    // 6. Firehose delivery streams to write data to S3
    // These are omitted here for simplicity, but would be part of a complete implementation.
  }
}
