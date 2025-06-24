import { Logger } from "@aws-lambda-powertools/logger";
import {
  CloudWatchClient,
  PutMetricDataCommand,
} from "@aws-sdk/client-cloudwatch";
import {
  CostExplorerClient,
  GetCostAndUsageCommand,
  GetCostAndUsageCommandInput,
} from "@aws-sdk/client-cost-explorer";

// Initialize clients
const costExplorerClient = new CostExplorerClient({});
const cloudWatchClient = new CloudWatchClient({});
const logger = new Logger({ serviceName: "cost-explorer" });

export const handler = async (event: any): Promise<any> => {
  logger.info("Processing cost data", { event });

  // Get the current date and first day of month
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const today = now.toISOString().split("T")[0];
  const startDate = firstDayOfMonth.toISOString().split("T")[0];

  try {
    // Get cost and usage data grouped by tag:TenantId and tag:DeviceId
    const params: GetCostAndUsageCommandInput = {
      TimePeriod: {
        Start: startDate,
        End: today,
      },
      Granularity: "DAILY",
      Metrics: ["UnblendedCost"],
      GroupBy: [
        {
          Type: "TAG",
          Key: "TenantId",
        },
        {
          Type: "TAG",
          Key: "DeviceId",
        },
      ],
    };

    logger.debug("Cost Explorer params", { params });
    const command = new GetCostAndUsageCommand(params);
    const costData = await costExplorerClient.send(command);
    logger.debug("Cost data received", { costData });

    // Process the data and put metrics to CloudWatch
    if (costData.ResultsByTime) {
      for (const result of costData.ResultsByTime) {
        if (result.Groups) {
          for (const group of result.Groups) {
            const [tenantTag, deviceTag] = group.Keys || [];
            const tenantId = tenantTag?.split("$")[1];
            const deviceId = deviceTag?.split("$")[1];

            if (!tenantId || !deviceId) {
              logger.warn("Missing tag values", { tenantTag, deviceTag });
              continue;
            }

            const cost = parseFloat(
              group.Metrics?.UnblendedCost?.Amount || "0",
            );

            logger.info("Processing cost for device", {
              tenantId,
              deviceId,
              cost,
              date: result.TimePeriod?.Start,
            });

            // Put metric data to CloudWatch
            const metricCommand = new PutMetricDataCommand({
              Namespace: "IoT/DeviceCosts",
              MetricData: [
                {
                  MetricName: "CostPerDevice",
                  Dimensions: [
                    {
                      Name: "TenantId",
                      Value: tenantId,
                    },
                    {
                      Name: "DeviceId",
                      Value: deviceId,
                    },
                  ],
                  Value: cost,
                  Unit: "None",
                  Timestamp: result.TimePeriod?.Start
                    ? new Date(result.TimePeriod.Start)
                    : undefined,
                },
              ],
            });

            await cloudWatchClient.send(metricCommand);
            logger.debug("Metric data sent to CloudWatch", {
              tenantId,
              deviceId,
              cost,
            });
          }
        }
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify("Cost data processed successfully"),
    };
  } catch (error) {
    logger.error("Error processing cost data", { error });
    return {
      statusCode: 500,
      body: JSON.stringify("Error processing cost data"),
    };
  }
};
