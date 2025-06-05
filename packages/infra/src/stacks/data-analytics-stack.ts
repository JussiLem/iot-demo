import {
  Stack,
  StackProps,
  aws_glue as glue,
  aws_lakeformation as lf,
  aws_iam as iam,
} from "aws-cdk-lib";
import { Construct } from "constructs";

export class DataAnalyticsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Glue Data Catalog Database for IoT data
    const analyticsDB = new glue.CfnDatabase(this, "IoTAnalyticsDatabase", {
      catalogId: this.account,
      databaseInput: { name: "iot_analytics_db" },
    });

    // Glue Table (Iceberg) for raw data on S3 (assuming data in s3://iot-raw-data-bucket/raw/)
    new glue.CfnTable(this, "RawDataTable", {
      catalogId: this.account,
      databaseName: analyticsDB.ref,
      tableInput: {
        name: "device_raw_data",
        tableType: "EXTERNAL_TABLE",
        parameters: {
          // Use Iceberg table format parameters
          table_type: "ICEBERG",
          format: "iceberg", // custom parameter to indicate Iceberg
          classification: "parquet",
        },
        storageDescriptor: {
          columns: [
            { name: "tenant_id", type: "string" },
            { name: "device_id", type: "string" },
            { name: "timestamp", type: "timestamp" },
            { name: "reading_value", type: "double" }, // example sensor reading
          ],
          location: "s3://iot-raw-data-bucket/raw/", // location of data
          inputFormat:
            "org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat",
          outputFormat:
            "org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat",
          serdeInfo: {
            serializationLibrary:
              "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe",
          },
        },
      },
    });

    // Lake Formation: register the S3 location and set up permissions (pseudocode)
    new lf.CfnDataLakeSettings(this, "LakeAdmin", {
      admins: [
        {
          dataLakePrincipalIdentifier:
            new iam.AccountRootPrincipal().toString(),
        },
      ],
    });
    new lf.CfnResource(this, "LakeLocation", {
      resourceArn: "arn:aws:s3:::iot-raw-data-bucket",
      useServiceLinkedRole: true,
    });
    // Could then use LakeFormation CfnPermissions to grant access to Glue tables for specific roles or groups.
  }
}
