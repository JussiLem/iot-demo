import { Stage, StageProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { CostMonitoringStack } from "./cost-monitoring-stack";
import { DataAnalyticsStack } from "./data-analytics-stack";
import { IdentityStack } from "./identity-stack";
import { IoTStack } from "./iot-stack";
import { StreamingStack } from "./streaming-stack";

export class IotPlatformStage extends Stage {
  constructor(scope: Construct, id: string, props: StageProps) {
    super(scope, id, props);
    new IoTStack(this, "IotStack", props);
    new DataAnalyticsStack(this, "DataAnalyticsStack", props);
    new StreamingStack(this, "StreamingStack", props);
    new IdentityStack(this, "SaasIdentityStack", props);
    new CostMonitoringStack(this, "CostMonitoringStack", props);
  }
}
