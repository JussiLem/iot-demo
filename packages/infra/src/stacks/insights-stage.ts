import { Stage, StageProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { AnalyticsStack } from "./analytics-stack";
import { DashboardStack } from "./dashboard-stack";

/**
 * Properties for the InsightsStage
 */
export interface InsightsStageProps extends StageProps {
  /**
   * The environment name (e.g., dev, test, prod)
   * @default "dev"
   */
  readonly environmentName?: string;

  /**
   * The name of the Glue database to read data from
   * If not provided, the stage will look up the database name from the DataLakeStack
   */
  readonly databaseName?: string;

  /**
   * Tags to apply to all resources in this stage
   */
  readonly tags?: {
    [key: string]: string;
  };
}

/**
 * A stage that represents the Insights phase of the IoT platform architecture.
 *
 * This stage follows Domain-Driven Design principles by organizing stacks
 * according to their bounded contexts:
 * - AnalyticsStack: Analyzes IoT data to extract insights
 * - DashboardStack: Visualizes IoT data and insights
 *
 * The Insights phase is responsible for:
 * - Analyzing IoT data to extract insights
 * - Visualizing IoT data and insights
 * - Providing business intelligence capabilities
 *
 * Each stack represents a separate domain with clear boundaries and responsibilities.
 * This design enables independent deployment and scaling of each domain.
 */
export class InsightsStage extends Stage {
  /**
   * Reference to the Analytics stack
   */
  public readonly analyticsStack: AnalyticsStack;

  /**
   * Reference to the Dashboard stack
   */
  public readonly dashboardStack: DashboardStack;

  constructor(scope: Construct, id: string, props: InsightsStageProps) {
    super(scope, id, props);

    // Get the environment name from props or default to "dev"
    const envName =
      props.environmentName || (props.tags && props.tags.Environment) || "dev";

    // Get region from props or use the current region
    const region = props.env?.region || process.env.CDK_DEFAULT_REGION;

    // Create a unique prefix for resource names to avoid conflicts in multi-region deployments
    const resourcePrefix = `${envName}-${region}`;

    // Create the Analytics stack
    this.analyticsStack = new AnalyticsStack(this, "AnalyticsStack", {
      ...props,
      stackName: `${resourcePrefix}-analytics-stack`,
      databaseName: props.databaseName,
    });

    // Create the Dashboard stack
    this.dashboardStack = new DashboardStack(this, "DashboardStack", {
      ...props,
      stackName: `${resourcePrefix}-dashboard-stack`,
      // Pass the analytics stack as a dependency to the dashboard stack
      analyticsStack: this.analyticsStack,
    });
  }
}
