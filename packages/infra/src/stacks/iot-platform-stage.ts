import { Stage, StageProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { CostMonitoringStack } from "./cost-monitoring-stack";
import { DataAnalyticsStack } from "./data-analytics-stack";
import { IdentityStack } from "./identity-stack";
import { IoTStack } from "./iot-stack";
import { StreamingStack } from "./streaming-stack";

/**
 * Properties for the IotPlatformStage
 */
export interface IotPlatformStageProps extends StageProps {
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
 * A stage that represents the complete IoT platform
 *
 * This stage follows Domain-Driven Design principles by organizing stacks
 * according to their bounded contexts:
 * - IoTStack: Core IoT device management and messaging
 * - StreamingStack: Real-time data streaming and processing
 * - DataAnalyticsStack: Data analysis and insights
 * - IdentityStack: User and device identity management
 * - CostMonitoringStack: Cost tracking and optimization
 *
 * Each stack represents a separate domain with clear boundaries and responsibilities.
 * This design enables independent deployment and scaling of each domain.
 */
export class IotPlatformStage extends Stage {
  /**
   * Reference to the IoT stack
   */
  public readonly iotStack: IoTStack;

  /**
   * Reference to the streaming stack
   */
  public readonly streamingStack: StreamingStack;

  /**
   * Reference to the data analytics stack
   */
  public readonly dataAnalyticsStack: DataAnalyticsStack;

  /**
   * Reference to the identity stack
   */
  public readonly identityStack: IdentityStack;

  /**
   * Reference to the cost monitoring stack
   */
  public readonly costMonitoringStack: CostMonitoringStack;

  constructor(scope: Construct, id: string, props: IotPlatformStageProps) {
    super(scope, id, props);

    // Get the environment name from props or default to "dev"
    const envName =
      props.environmentName || (props.tags && props.tags.Environment) || "dev";

    // Get region from props or use the current region
    const region = props.env?.region || process.env.CDK_DEFAULT_REGION;

    // Create a unique prefix for resource names to avoid conflicts in multi-region deployments
    const resourcePrefix = `${envName}-${region}`;

    // Create stacks with proper dependencies and cross-references
    this.iotStack = new IoTStack(this, "IotStack", {
      ...props,
      stackName: `${resourcePrefix}-iot-stack`,
    });

    this.dataAnalyticsStack = new DataAnalyticsStack(
      this,
      "DataAnalyticsStack",
      {
        ...props,
        stackName: `${resourcePrefix}-data-analytics-stack`,
      },
    );

    this.streamingStack = new StreamingStack(this, "StreamingStack", {
      ...props,
      stackName: `${resourcePrefix}-streaming-stack`,
    });

    this.identityStack = new IdentityStack(this, "SaasIdentityStack", {
      ...props,
      stackName: `${resourcePrefix}-identity-stack`,
    });

    this.costMonitoringStack = new CostMonitoringStack(
      this,
      "CostMonitoringStack",
      {
        ...props,
        stackName: `${resourcePrefix}-cost-monitoring-stack`,
      },
    );
  }
}
