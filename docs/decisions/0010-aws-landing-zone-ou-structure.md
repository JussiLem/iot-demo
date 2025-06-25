# AWS Landing Zone OU Structure for IoT Platform

## Context

The IoT platform was previously deployed with the CI/CD pipeline and workload stacks in the same AWS account. This approach doesn't align with the AWS Landing Zone Accelerator's organizational unit (OU) structure, which recommends separating CI/CD tooling from workloads for improved security and governance.

According to AWS Landing Zone Accelerator best practices:
- **Deployments OU**: Hosts resources for building, validating, and promoting releases to your environments. Includes continuous integration and continuous delivery (CI/CD) tooling.
- **Workloads OU**: Hosts business workloads for both production and non-production environments.

## Decision

We have implemented a new architecture that separates the CI/CD pipeline from the workload stacks, following the AWS Landing Zone Accelerator OU structure:

1. **Pipeline in Deployments OU**: The CICDPipelineStack is deployed to a dedicated pipeline account in the Deployments OU.
2. **Workloads in Workloads OU**: The IotPlatformStage and its stacks (IoTStack, DataAnalyticsStack, etc.) are deployed to workload accounts in the Workloads OU.

### Architecture Changes

1. **Account Separation**: We've introduced separate account IDs for the pipeline account and workload accounts, with workload accounts differentiated by environment (dev, test, prod).
2. **Cross-Account Deployment**: The CICDPipelineStack now deploys the IotPlatformStage to the appropriate workload account based on the environment.
3. **Environment-Specific Accounts**: Each environment (dev, test, prod) can have its own dedicated account in the Workloads OU.

### Implementation Details

The implementation follows these principles:

1. **Separation of Concerns**: The pipeline is responsible for deployment, while the workloads are responsible for business functionality.
2. **Least Privilege**: The pipeline has only the permissions it needs to deploy to the workload accounts.
3. **Environment Isolation**: Each environment is isolated in its own account, preventing cross-environment impact.

## Consequences

### Benefits

1. **Improved Security**: Separating CI/CD tooling from workloads reduces the attack surface and limits the impact of security breaches.
2. **Better Governance**: Each account can have its own governance policies appropriate for its purpose.
3. **Clearer Cost Attribution**: Costs are more clearly attributed to either deployment infrastructure or workloads.
4. **Simplified Compliance**: Compliance requirements can be applied more specifically to each account type.

### Challenges

1. **Increased Complexity**: Managing multiple accounts adds complexity to the deployment process.
2. **Cross-Account Permissions**: Proper IAM roles and permissions must be set up for cross-account deployment.
3. **Resource Sharing**: Resources that need to be shared across accounts (like Route53 hosted zones) require additional configuration.

## Implementation Notes

- The account IDs are configured through environment variables:
  - `CDK_PIPELINE_ACCOUNT`: The account ID for the pipeline (Deployments OU)
  - `CDK_DEV_ACCOUNT`, `CDK_TEST_ACCOUNT`, `CDK_PROD_ACCOUNT`: The account IDs for workloads (Workloads OU)
- If these environment variables are not set, the system falls back to `CDK_DEFAULT_ACCOUNT` for all accounts.
- The CICDPipelineStack has `crossAccountKeys: true` set to enable cross-account deployment.
- The HostedZoneStack is deployed to the workload accounts, not the pipeline account, as it's part of the workload infrastructure.