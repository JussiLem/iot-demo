// import path from "node:path";
// import * as flink from "@aws-cdk/aws-kinesisanalytics-flink-alpha";
import {
  Stack,
  StackProps,
  aws_kinesis as kinesis,
  aws_kinesisfirehose as firehose,
  aws_s3 as s3,
  aws_iam as iam,
  RemovalPolicy,
} from "aws-cdk-lib";
import { Construct } from "constructs";

export class StreamingStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // S3 bucket for raw data (data lake storage, with Firehose writing into it)
    const rawDataBucket = new s3.Bucket(this, "RawDataBucket", {
      bucketName: "iot-raw-data-bucket", // Name as needed
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy:
        RemovalPolicy.DESTROY /* cdk.RemovalPolicy.DESTROY in dev, RETAIN in prod */,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // Kinesis Data Stream for ingesting IoT messages
    const dataStream = new kinesis.Stream(this, "IoTDataStream", {
      streamName: "IoTDeviceDataStream",
      shardCount: 1,
    });

    // IAM role that Firehose will assume to write to S3 (and optionally read from Kinesis)
    const firehoseRole = new iam.Role(this, "FirehoseRole", {
      assumedBy: new iam.ServicePrincipal("firehose.amazonaws.com"),
    });
    // Grant necessary permissions to the role
    rawDataBucket.grantWrite(firehoseRole); // allow Firehose to put objects in the bucket
    dataStream.grantRead(firehoseRole); // if Firehose pulls from Kinesis, allow it to read

    // Kinesis Data Firehose to deliver stream data to S3
    new firehose.CfnDeliveryStream(this, "KinesisToS3", {
      deliveryStreamName: "IoTDataToS3",
      deliveryStreamType: "KinesisStreamAsSource",
      kinesisStreamSourceConfiguration: {
        kinesisStreamArn: dataStream.streamArn,
        roleArn: firehoseRole.roleArn,
      },
      extendedS3DestinationConfiguration: {
        bucketArn: rawDataBucket.bucketArn,
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
