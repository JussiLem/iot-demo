import { Stage, StageProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { DataAnalyticsStack } from "./data-analytics-stack";
import { IdentityStack } from "./identity-stack";

/**
 * Properties for the DataIdentityStage
 */
export interface DataIdentityStageProps extends StageProps {
  /**
   * The environment name (e.g., dev, test, prod)
   * @default "dev"
   */
  readonly environmentName?: string;
  readonly tags: {
    Environment: string;
    Region: string;
  };
}

/**
 * A stage that represents the data analytics and identity management components of the IoT platform
 *
 * This stage follows Domain-Driven Design principles by organizing stacks
 * according to their bounded contexts:
 * - DataAnalyticsStack: Data analysis and insights
 * - IdentityStack: User and device identity management
 *
 * This stage is deployed after the IotPlatformStage with a manual approval step,
 * allowing for more controlled deployment of these components.
 *
 * Each stack represents a separate domain with clear boundaries and responsibilities.
 * This design enables independent deployment and scaling of each domain.
 */
export class DataIdentityStage extends Stage {
  /**
   * Reference to the data analytics stack
   */
  public readonly dataAnalyticsStack: DataAnalyticsStack;

  /**
   * Reference to the identity stack
   */
  public readonly identityStack: IdentityStack;

  constructor(scope: Construct, id: string, props: DataIdentityStageProps) {
    super(scope, id, props);

    // Get the environment name from props or default to "dev"
    const envName =
      props.environmentName || (props.tags && props.tags.Environment) || "dev";

    // Get region from props or use the current region
    const region = props.env?.region || process.env.CDK_DEFAULT_REGION;

    // Create a unique prefix for resource names to avoid conflicts in multi-region deployments
    const resourcePrefix = `${envName}-${region}`;

    this.dataAnalyticsStack = new DataAnalyticsStack(
      this,
      "DataAnalyticsStack",
      {
        ...props,
        stackName: `${resourcePrefix}-data-analytics-stack`,
      },
    );

    this.identityStack = new IdentityStack(this, "SaasIdentityStack", {
      ...props,
      stackName: `${resourcePrefix}-identity-stack`,
    });
  }
}
