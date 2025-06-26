import { Stage, StageProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { CostMonitoringStack } from "./cost-monitoring-stack";
// import { SecurityStack } from "./security-stack";
// import { LoggingStack } from "./logging-stack";

/**
 * Properties for the CrossCuttingStage
 */
export interface CrossCuttingStageProps extends StageProps {
  /**
   * The environment name (e.g., dev, test, prod)
   * @default "dev"
   */
  readonly environmentName?: string;

  /**
   * Tags to apply to all resources in this stage
   */
  readonly tags?: {
    [key: string]: string;
  };
}

/**
 * A stage that represents the cross-cutting concerns of the IoT platform architecture.
 *
 * This stage follows Domain-Driven Design principles by organizing stacks
 * according to their bounded contexts:
 * - CostMonitoringStack: Monitors and optimizes costs
 * - SecurityStack: Manages security and compliance (commented out as a placeholder)
 * - LoggingStack: Manages logging and auditing (commented out as a placeholder)
 *
 * The CrossCutting phase is responsible for:
 * - Monitoring and optimizing costs
 * - Managing security and compliance
 * - Managing logging and auditing
 *
 * Each stack represents a separate domain with clear boundaries and responsibilities.
 * This design enables independent deployment and scaling of each domain.
 */
export class CrossCuttingStage extends Stage {
  /**
   * Reference to the CostMonitoring stack
   */
  public readonly costMonitoringStack: CostMonitoringStack;

  /**
   * Reference to the Security stack (commented out as a placeholder)
   */
  // public readonly securityStack: SecurityStack;

  /**
   * Reference to the Logging stack (commented out as a placeholder)
   */
  // public readonly loggingStack: LoggingStack;

  constructor(scope: Construct, id: string, props: CrossCuttingStageProps) {
    super(scope, id, props);

    // Get the environment name from props or default to "dev"
    const envName =
      props.environmentName || (props.tags && props.tags.Environment) || "dev";

    // Get region from props or use the current region
    const region = props.env?.region || process.env.CDK_DEFAULT_REGION;

    // Create a unique prefix for resource names to avoid conflicts in multi-region deployments
    const resourcePrefix = `${envName}-${region}`;

    // Create the CostMonitoring stack
    this.costMonitoringStack = new CostMonitoringStack(
      this,
      "CostMonitoringStack",
      {
        ...props,
        stackName: `${resourcePrefix}-cost-monitoring-stack`,
      },
    );

    // Create the Security stack (commented out as a placeholder)
    /*
    this.securityStack = new SecurityStack(this, "SecurityStack", {
      ...props,
      stackName: `${resourcePrefix}-security-stack`,
    });
    */

    // Create the Logging stack (commented out as a placeholder)
    /*
    this.loggingStack = new LoggingStack(this, "LoggingStack", {
      ...props,
      stackName: `${resourcePrefix}-logging-stack`,
    });
    */
  }
}
