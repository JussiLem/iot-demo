import { Stack, StackProps, aws_route53 as route53 } from "aws-cdk-lib";
import { Construct } from "constructs";

/**
 * Properties for the HostedZoneStack
 */
export interface HostedZoneStackProps extends StackProps {
  /**
   * The domain name for the IoT Core custom endpoint
   * @default "iot.example.com"
   */
  readonly domainName?: string;
}

/**
 * A stack that creates a Route53 hosted zone for the IoT platform.
 *
 * This stack is deployed once to create the hosted zone, which is then
 * referenced by the NetworkStack in all regions using HostedZone.fromLookup.
 *
 * This approach ensures that the hosted zone exists before the NetworkStack
 * is deployed, while still eliminating region-specific conditions.
 */
export class HostedZoneStack extends Stack {
  /**
   * The Route53 hosted zone for IoT Core endpoints
   */
  public readonly iotHostedZone: route53.IHostedZone;

  constructor(scope: Construct, id: string, props: HostedZoneStackProps = {}) {
    super(scope, id, props);

    // Extract environment name from stack name for resource naming
    const stackNameParts = this.stackName.split("-");
    const envName = stackNameParts.length > 0 ? stackNameParts[0] : "dev";

    // Get domain name from props or use default
    const domainName = props.domainName || `iot-${envName}.example.com`;

    // Create the Route53 hosted zone
    this.iotHostedZone = new route53.PublicHostedZone(this, "IoTHostedZone", {
      zoneName: domainName,
      comment: `Hosted zone for IoT Core endpoints in ${envName} environment`,
    });
  }
}
