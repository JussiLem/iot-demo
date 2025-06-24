import {
  Stack,
  StackProps,
  aws_route53 as route53,
  aws_ssm as ssm,
} from "aws-cdk-lib";
import { Construct } from "constructs";

/**
 * Properties for the NetworkStack
 */
export interface NetworkStackProps extends StackProps {
  /**
   * The domain name for the IoT Core custom endpoint
   * @default "iot.example.com"
   */
  readonly domainName?: string;

  /**
   * Whether this stack is deployed in the primary region
   * @default true
   */
  readonly isPrimaryRegion?: boolean;
}

/**
 * A stack that sets up networking resources for the IoT platform, including
 * Route53 hosted zones and failover routing for IoT Core endpoints.
 *
 * This stack implements disaster recovery (DR) capabilities by configuring:
 * - A Route53 hosted zone for the IoT platform
 * - Custom IoT Core endpoints in primary and DR regions
 * - Health checks for the endpoints
 * - Failover routing policy records pointing to these endpoints
 *
 * This allows devices to connect to a single domain name that will automatically
 * route to the available IoT Core endpoint if one region becomes unavailable.
 */
export class NetworkStack extends Stack {
  /**
   * The Route53 hosted zone for IoT Core endpoints
   */
  public readonly iotHostedZone: route53.IHostedZone;

  // The NetworkStack no longer creates or manages IoT Core endpoints

  constructor(scope: Construct, id: string, props: NetworkStackProps = {}) {
    super(scope, id, props);

    // Extract environment name and region from stack name for resource naming
    const stackNameParts = this.stackName.split("-");
    const envName = stackNameParts.length > 0 ? stackNameParts[0] : "dev";
    const region = this.region;

    // Get domain name from props or use default
    const domainName = props.domainName || `iot-${envName}.example.com`;

    // Determine if this is the primary region (for failover configuration)
    const isPrimaryRegion =
      props.isPrimaryRegion !== undefined
        ? props.isPrimaryRegion
        : region === (process.env.PRIMARY_REGION || "eu-west-1");

    // Create or import a Route53 hosted zone
    // In a real-world scenario, you might want to import an existing hosted zone
    // rather than creating a new one in each region
    if (isPrimaryRegion) {
      // Only create the hosted zone in the primary region
      this.iotHostedZone = new route53.PublicHostedZone(this, "IoTHostedZone", {
        zoneName: domainName,
        comment: `Hosted zone for IoT Core endpoints in ${envName} environment`,
      });

      // Store the hosted zone ID in SSM Parameter Store for cross-region reference
      new ssm.StringParameter(this, "IoTHostedZoneIdParam", {
        parameterName: `/iot-platform/${envName}/route53-hosted-zone-id`,
        description: "ID of the Route53 hosted zone for IoT Core endpoints",
        stringValue: this.iotHostedZone.hostedZoneId,
      });
    } else {
      // In secondary regions, import the hosted zone from SSM Parameter Store
      const hostedZoneIdParam =
        ssm.StringParameter.fromStringParameterAttributes(
          this,
          "ImportedHostedZoneIdParam",
          {
            parameterName: `/iot-platform/${envName}/route53-hosted-zone-id`,
          },
        );

      this.iotHostedZone = route53.HostedZone.fromHostedZoneAttributes(
        this,
        "ImportedHostedZone",
        {
          zoneName: domainName,
          hostedZoneId: hostedZoneIdParam.stringValue,
        },
      );
    }

    // The NetworkStack is now only responsible for the Route53 hosted zone
    // The IoTStack is responsible for creating IoT Core custom endpoints, health checks, and Route53 records
  }
}
