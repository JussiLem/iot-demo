import {
  Stack,
  StackProps,
  aws_cognito as cognito,
  aws_iam as iam,
} from "aws-cdk-lib";
import { Construct } from "constructs";

export class IdentityStack extends Stack {
  public readonly userPool: cognito.UserPool;
  public readonly identityPool: cognito.CfnIdentityPool;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Cognito User Pool for platform users (owners, managers, engineers)
    this.userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: "BuildingIoTUserPool",
      selfSignUpEnabled: false, // likely invite-only to start
      signInAliases: { username: true, email: true },
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
        requireLowercase: true,
      },
      // Define a custom attribute for tenant Id
      customAttributes: {
        tenantId: new cognito.StringAttribute({ mutable: false }),
      },
    });

    // Create a user pool domain (if we allow Cognito hosted UI for login)
    this.userPool.addDomain("CognitoDomain", {
      cognitoDomain: { domainPrefix: "smart-building-iot" },
    });

    // App client for the user pool (for front-end to use)
    const userPoolClient = new cognito.UserPoolClient(this, "UserPoolClient", {
      userPool: this.userPool,
      generateSecret: false,
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
      ], // can add Facebook/Google/etc
      oAuth: {
        flows: { authorizationCodeGrant: true },
        callbackUrls: ["https://myapp.example.com/callback"],
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
        ],
      },
    });

    // Federated Identity Pool to allow issuing AWS credentials (for IoT and S3 access maybe)
    this.identityPool = new cognito.CfnIdentityPool(this, "IdentityPool", {
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        {
          clientId: userPoolClient.userPoolClientId,
          providerName: this.userPool.userPoolProviderName,
        },
      ],
    });
    // Roles for Identity Pool
    const authRole = new iam.Role(this, "CognitoAuthRole", {
      assumedBy: new iam.FederatedPrincipal(
        "cognito-identity.amazonaws.com",
        {
          StringEquals: {
            "cognito-identity.amazonaws.com:aud": this.identityPool.ref,
          },
          "ForAnyValue:StringLike": {
            "cognito-identity.amazonaws.com:amr": "authenticated",
          },
        },
        "sts:AssumeRoleWithWebIdentity",
      ),
    });
    // Example inline policy: restrict S3 access to tenant-specific prefix
    authRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject"],
        resources: [
          `arn:aws:s3:::iot-raw-data-bucket/tenant/\${cognito-identity.amazonaws.com:sub}/*`,
        ],
      }),
    );
    // Attach roles to identity pool
    new cognito.CfnIdentityPoolRoleAttachment(this, "IdentityPoolRoles", {
      identityPoolId: this.identityPool.ref,
      roles: { authenticated: authRole.roleArn },
    });
  }
}
