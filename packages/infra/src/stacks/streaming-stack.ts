// import path from "node:path";
// import * as flink from "@aws-cdk/aws-kinesisanalytics-flink-alpha";
import {
  Stack,
  StackProps,
  aws_kinesis as kinesis,
  aws_kinesisfirehose as firehose,
  aws_s3 as s3,
  aws_iam as iam,
  aws_ssm as ssm,
  RemovalPolicy,
  CfnOutput,
} from "aws-cdk-lib";
import { Construct } from "constructs";

export class StreamingStack extends Stack {
  /**
   * The Kinesis data stream for IoT device data
   */
  public readonly iotDataStream: kinesis.Stream;

  /**
   * The S3 bucket for raw data storage
   */
  public readonly rawDataBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Get environment name and region from stack name or use defaults
    const stackNameParts = this.stackName.split("-");
    const envName = stackNameParts.length > 0 ? stackNameParts[0] : "dev";
    const region = this.region;

    // Create unique resource names with environment and region to avoid conflicts
    const resourcePrefix = `${envName}-${region}`;

    // S3 bucket for raw data (data lake storage, with Firehose writing into it)
    this.rawDataBucket = new s3.Bucket(this, "RawDataBucket", {
      bucketName: `${resourcePrefix}-iot-raw-data-bucket`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy:
        envName === "prod" ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // Kinesis Data Stream for ingesting IoT messages
    this.iotDataStream = new kinesis.Stream(this, "IoTDataStream", {
      streamName: `${resourcePrefix}-iot-device-data-stream`,
      shardCount: envName === "prod" ? 2 : 1, // More shards for production
    });

    // Store the stream name in SSM Parameter Store for cross-stack reference
    new ssm.StringParameter(this, "IoTDataStreamNameParam", {
      parameterName: `/iot-platform/${this.stackName}/kinesis-stream-name`,
      description: "Name of the Kinesis Data Stream for IoT data",
      stringValue: this.iotDataStream.streamName,
    });

    // Output the stream name for reference
    new CfnOutput(this, "IoTDataStreamName", {
      value: this.iotDataStream.streamName,
      description: "Name of the Kinesis Data Stream for IoT data",
      exportName: `${resourcePrefix}-iot-data-stream-name`,
    });

    // IAM role that Firehose will assume to write to S3 (and optionally read from Kinesis)
    const firehoseRole = new iam.Role(this, "FirehoseRole", {
      assumedBy: new iam.ServicePrincipal("firehose.amazonaws.com"),
      roleName: `${resourcePrefix}-firehose-delivery-role`,
    });

    // Grant necessary permissions to the role
    this.rawDataBucket.grantWrite(firehoseRole); // allow Firehose to put objects in the bucket
    this.iotDataStream.grantRead(firehoseRole); // if Firehose pulls from Kinesis, allow it to read

    // Kinesis Data Firehose to deliver stream data to S3
    new firehose.CfnDeliveryStream(this, "KinesisToS3", {
      deliveryStreamName: `${resourcePrefix}-iot-data-to-s3`,
      deliveryStreamType: "KinesisStreamAsSource",
      kinesisStreamSourceConfiguration: {
        kinesisStreamArn: this.iotDataStream.streamArn,
        roleArn: firehoseRole.roleArn,
      },
      extendedS3DestinationConfiguration: {
        bucketArn: this.rawDataBucket.bucketArn,
        prefix: "raw/{timestamp}/", // organize data by date/hour prefix
        errorOutputPrefix: "errors/",
        bufferingHints: { intervalInSeconds: 60, sizeInMBs: 5 }, // buffer data before write
        compressionFormat: "GZIP",
        roleArn: firehoseRole.roleArn,
      },
    });

    // (Optional) Apache Flink application for real-time analytics
    // Using CfnApplication (Kinesis Data Analytics v2 for Flink)
    // Assume application code is packaged and uploaded to S3 (e.g., as JAR or via Glue Studio)
    /* new flink.Application(this, "FlinkApp", {
      runtime: flink.Runtime.FLINK_1_20,
      applicationName: "RealTimeAnalyticsApp",
      role: new iam.Role(this, "KDAExecutionRole", {
        assumedBy: new iam.ServicePrincipal("kinesisanalytics.amazonaws.com"),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "AmazonKinesisFullAccess",
          ) /!* etc. *!/,
        ],
      }),
      code: flink.ApplicationCode.fromAsset(path.join(__dirname, "code-asset")),
    });*/
  }
}
