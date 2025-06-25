# Frugal Disaster Recovery Strategy for IoT Platform

## Context

The IoT platform previously used an active-active disaster recovery (DR) strategy where identical stacks were deployed in both the primary and DR regions. While this approach provided high availability and minimal recovery time, it incurred significant costs by maintaining duplicate infrastructure in multiple regions.

Our Recovery Point Objective (RPO) and Recovery Time Objective (RTO) requirements are between an hour to tens of minutes, which is closer to a Backup & Restore model. There's no need for real-time data replication between regions.

## Decision

We have implemented a frugal disaster recovery strategy where resources are only deployed to the DR region when needed, rather than maintaining an active-active deployment. This approach significantly reduces costs during normal operation while still providing the ability to quickly deploy resources in a disaster scenario.

### Architecture Changes

1. **Primary Region Pipeline**: The main CI/CD pipeline in the primary region only deploys resources to the primary region, not to DR regions.

2. **DR Region Pipelines**: DR pipelines are deployed to each DR region using the same pipeline stack as the primary region. These pipelines include all the necessary configuration to deploy the IoT platform but don't actually deploy any resources until manually triggered.

3. **Consolidated Pipeline Logic**: Both primary and DR pipelines use the same CICDPipelineStack implementation, with a flag to indicate whether it's a DR pipeline. This ensures that pipeline logic stays in one place and prevents accidental drift between pipelines.

4. **Manual Approval**: Each DR pipeline includes a manual approval step that must be triggered to deploy resources to the DR region. This allows for cost savings during normal operation while still providing the ability to quickly deploy resources in a disaster scenario.

5. **No Data Replication**: This approach doesn't include data replication between regions, which is acceptable given our RPO/RTO requirements.

### Implementation Details

The implementation follows these principles:

1. **Cost Efficiency**: Resources are only deployed to the DR region when needed, significantly reducing costs during normal operation.

2. **Rapid Recovery**: The DR pipelines are pre-configured and ready to deploy, allowing for rapid recovery in a disaster scenario.

3. **Simplified Management**: The DR pipelines are deployed and managed just like the main pipeline, simplifying operations and maintenance.

4. **Consistent Configuration**: The DR pipelines use the same configuration as the main pipeline, ensuring consistency between regions.

5. **Single Source of Truth**: By using a single pipeline stack implementation for both primary and DR pipelines, we maintain a single source of truth for pipeline logic, reducing the risk of drift and making maintenance easier.

## Consequences

### Benefits

1. **Cost Savings**: Significant cost savings by not maintaining duplicate infrastructure in DR regions during normal operation.

2. **Simplified Operations**: No need to manage data replication or synchronization between regions.

3. **Flexible Recovery**: The ability to choose which environments and stacks to recover first, based on business priorities.

4. **Evolving Approach**: Can start with a manual playbook approach and later evolve to an automated runbook if needed.

### Challenges

1. **Longer Recovery Time**: Recovery time is longer compared to an active-active approach, as resources need to be deployed when a disaster occurs.

2. **Manual Intervention**: Requires manual intervention to trigger the DR pipeline, which could be a challenge if key personnel are unavailable.

3. **Potential Data Loss**: Without data replication, there's potential for data loss between the last backup and the disaster event.

## Playbook for DR Activation

### Prerequisites

1. Access to the AWS Management Console for the DR region
2. Permissions to approve pipeline deployments
3. Knowledge of which environments need to be recovered first

### Steps to Activate DR

1. **Assess the Situation**:
   - Confirm that the primary region is experiencing an outage
   - Determine which environments need to be recovered first (e.g., prod before dev)

2. **Access the DR Pipeline**:
   - Log in to the AWS Management Console for the DR region
   - Navigate to AWS CodePipeline
   - Find the DR pipeline for the affected environment (e.g., `iot-platform-dr-eu-central-1`)

3. **Trigger the Pipeline**:
   - Start the pipeline execution
   - When prompted, approve the deployment to the DR region
   - Monitor the pipeline execution to ensure successful deployment

4. **Verify Deployment**:
   - Once the pipeline completes, verify that the IoT platform is operational in the DR region
   - Test key functionality to ensure the system is working as expected

5. **Update DNS (if needed)**:
   - If custom domain names are used, update DNS records to point to the DR region
   - Note: If Route53 failover routing is used, this may happen automatically

6. **Notify Stakeholders**:
   - Inform stakeholders that the system is now operating from the DR region
   - Provide any necessary instructions for accessing the system

### Recovery to Primary Region

Once the primary region is operational again:

1. Ensure the primary region pipeline is operational
2. Run the primary region pipeline to deploy the latest configuration
3. Verify that the system is operational in the primary region
4. Update DNS records to point back to the primary region (if needed)
5. Notify stakeholders that the system is back to normal operation
6. Consider shutting down resources in the DR region to avoid unnecessary costs

## Implementation Notes

- The DR pipelines are deployed to each DR region specified in the `drRegions` array in `main.ts`
- Both primary and DR pipelines use the same `CICDPipelineStack` implementation, with the `isDrPipeline` flag set to `true` for DR pipelines
- Each DR pipeline includes a manual approval step that must be triggered to deploy resources
- The DR pipelines use the same configuration as the main pipeline, ensuring consistency between regions
- By using a single pipeline stack implementation, we avoid code duplication and prevent accidental drift between pipelines
- This approach can be extended to include automated triggering based on CloudWatch alarms or other events
