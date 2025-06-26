import { Stage, StageProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { DataLakeStack } from "./data-lake-stack";

/**
 * Properties for the StoreStage
 */
export interface StoreStageProps extends StageProps {
  /**
   * The environment name (e.g., dev, test, prod)
   * @default "dev"
   */
  readonly environmentName?: string;

  /**
   * The name of the input Kinesis stream to read data from
   * If not provided, the stage will look up the stream name from the EnrichmentStack
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

  /**
   * Tags to apply to all resources in this stage
   */
  readonly tags?: {
    [key: string]: string;
  };
}

/**
 * A stage that represents the Store phase of the IoT platform architecture.
 *
 * This stage follows Domain-Driven Design principles by organizing stacks
 * according to their bounded contexts:
 * - DataLakeStack: Stores IoT data in a data lake architecture
 *
 * The Store phase is responsible for:
 * - Storing raw and processed IoT data
 * - Organizing data for efficient querying and analysis
 * - Managing data lifecycle and retention
 *
 * Each stack represents a separate domain with clear boundaries and responsibilities.
 * This design enables independent deployment and scaling of each domain.
 */
export class StoreStage extends Stage {
  /**
   * Reference to the Data Lake stack
   */
  public readonly dataLakeStack: DataLakeStack;

  constructor(scope: Construct, id: string, props: StoreStageProps) {
    super(scope, id, props);

    // Get the environment name from props or default to "dev"
    const envName =
      props.environmentName || (props.tags && props.tags.Environment) || "dev";

    // Get region from props or use the current region
    const region = props.env?.region || process.env.CDK_DEFAULT_REGION;

    // Create a unique prefix for resource names to avoid conflicts in multi-region deployments
    const resourcePrefix = `${envName}-${region}`;

    // Create the Data Lake stack
    this.dataLakeStack = new DataLakeStack(this, "DataLakeStack", {
      ...props,
      stackName: `${resourcePrefix}-data-lake-stack`,
      inputStreamName: props.inputStreamName,
      rawDataRetentionDays: props.rawDataRetentionDays || 30,
      processedDataRetentionDays: props.processedDataRetentionDays || 90,
    });
  }
}
