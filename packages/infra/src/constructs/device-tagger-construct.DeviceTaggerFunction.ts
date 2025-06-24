import { Logger } from "@aws-lambda-powertools/logger";
import {
  CloudWatchClient,
  PutMetricDataCommand,
} from "@aws-sdk/client-cloudwatch";
import {
  IoTClient,
  DescribeThingCommand,
  TagResourceCommand,
} from "@aws-sdk/client-iot";
import { EventBridgeEvent } from "aws-lambda";

// Initialize clients
const iotClient = new IoTClient({});
const cloudWatchClient = new CloudWatchClient({});
const logger = new Logger({ serviceName: "device-tagger" });

// Define the CloudTrail event detail structure for IoT operations
interface IoTCloudTrailEventDetail {
  eventName: string;
  eventSource: string;
  awsRegion: string;
  requestParameters: {
    thingName?: string;
    attributePayload?: {
      attributes?: {
        tenantId?: string;
        [key: string]: string | undefined;
      };
    };
  };
  responseElements?: {
    thingName?: string;
    thingArn?: string;
    thingId?: string;
  };
}

export const handler = async (
  event: EventBridgeEvent<
    "AWS API Call via CloudTrail",
    IoTCloudTrailEventDetail
  >,
): Promise<any> => {
  logger.info("Processing IoT registry event", { event });

  // Extract information from the EventBridge event
  // For CloudTrail events, the structure is different from MQTT messages
  if (!event.detail || !event.detail.eventName) {
    logger.error("Invalid event format", { event });
    return { statusCode: 400, body: "Invalid event format" };
  }

  const eventName = event.detail.eventName;
  logger.info("Processing event", { eventName });

  // Extract thing name and attributes from the event
  let thingName: string;
  let tenantId: string;

  if (eventName === "CreateThing" || eventName === "UpdateThing") {
    // Extract thing name from the request parameters
    if (
      !event.detail.requestParameters ||
      !event.detail.requestParameters.thingName
    ) {
      logger.error("Missing thing name in event", { event });
      return { statusCode: 400, body: "Missing thing name in event" };
    }

    thingName = event.detail.requestParameters.thingName;

    // Try to extract tenantId from attributes if available
    if (
      event.detail.requestParameters.attributePayload &&
      event.detail.requestParameters.attributePayload.attributes &&
      event.detail.requestParameters.attributePayload.attributes.tenantId
    ) {
      tenantId =
        event.detail.requestParameters.attributePayload.attributes.tenantId;
    } else {
      // If tenantId is not in the event, try to get it from the thing's attributes
      try {
        const describeCommand = new DescribeThingCommand({ thingName });
        const thingDescription = await iotClient.send(describeCommand);

        if (
          thingDescription.attributes &&
          thingDescription.attributes.tenantId
        ) {
          tenantId = thingDescription.attributes.tenantId;
        } else {
          // If we can't determine the tenantId, use a default or extract from thing name
          // This is a fallback and might need to be adjusted based on your naming convention
          const thingNameParts = thingName.split("-");
          if (thingNameParts.length > 1) {
            tenantId = thingNameParts[0]; // Assuming format: tenantId-deviceId
          } else {
            tenantId = "unknown"; // Default value if we can't determine tenantId
            logger.warn("Could not determine tenantId, using default", {
              thingName,
            });
          }
        }
      } catch (error: any) {
        logger.error("Error describing thing", { error, thingName });
        return { statusCode: 500, body: "Error describing thing" };
      }
    }
  } else {
    logger.error("Unsupported event type", { eventName });
    return { statusCode: 400, body: "Unsupported event type" };
  }

  // Device ID is the same as thing name for simplicity
  const deviceId = thingName;

  try {
    // Tag the thing with cost allocation tags
    const tagCommand = new TagResourceCommand({
      resourceArn: `arn:aws:iot:${process.env.AWS_REGION}:${process.env.AWS_ACCOUNT_ID}:thing/${thingName}`,
      tags: [
        {
          Key: "TenantId",
          Value: tenantId,
        },
        {
          Key: "DeviceId",
          Value: deviceId,
        },
        {
          Key: "Service",
          Value: "IoT",
        },
        {
          Key: "CostAllocation",
          Value: "true",
        },
      ],
    });
    await iotClient.send(tagCommand);
    logger.info("Tagged thing", { thingName });

    // Put metric data for device activity
    const metricCommand = new PutMetricDataCommand({
      Namespace: "IoT/DeviceActivity",
      MetricData: [
        {
          MetricName: "MessageCount",
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
          Value: 1,
          Unit: "Count",
        },
      ],
    });
    await cloudWatchClient.send(metricCommand);
    logger.info("Put metric data", { tenantId, deviceId });

    return {
      statusCode: 200,
      body: "Device tagged successfully",
    };
  } catch (error) {
    logger.error("Error processing device data", { error });
    return {
      statusCode: 500,
      body: "Error processing device data",
    };
  }
};
