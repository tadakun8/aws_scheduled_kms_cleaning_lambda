import * as cdk from "@aws-cdk/core";
import * as iam from "@aws-cdk/aws-iam";
import * as lambdaNodejs from "@aws-cdk/aws-lambda-nodejs";
import * as logs from "@aws-cdk/aws-logs";
import * as events from "@aws-cdk/aws-events";
import * as eventsTarget from "@aws-cdk/aws-events-targets";

import { CONSTANTS } from "./constants";

export class ScheduledKmsCleaningLambdaStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /**
     * Define KMS policy for scheduled lambda
     */
    const cleanupKmsLambdaPolicy = new iam.ManagedPolicy(
      this,
      "cleanupKmsLambdaPolicy",
      {
        managedPolicyName: "kms-cleanup-lambda-policy",
        description: "Allow lambda kms clean-up action",
        statements: [
          new iam.PolicyStatement({
            actions: [
              "kms:ListAliases",
              "kms:ScheduleKeyDeletion",
              "kms:ListKeys",
              "kms:DescribeKey",
            ],
            resources: ["*"],
          }),
        ],
      },
    );
    /**
     * Define Lambda role
     */
    const executionLambdaRole = new iam.Role(this, "secureLambdaRole", {
      roleName: "cleanup-kms-lambda-role",
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole",
        ),
        cleanupKmsLambdaPolicy,
      ],
    });

    /**
     * Define scheduled lambda
     */
    const scheduleLambdaFunction = new lambdaNodejs.NodejsFunction(
      this,
      CONSTANTS.lambdaName,
      {
        functionName: CONSTANTS.lambdaName,
        // Code loaded from the "lambda/index.ts" file
        // Load the "handler" function by default.
        entry: "lambda/index.ts",
        // By default, lambda logs are permanently stored in cloudwatch logs, so specify the retention period.
        logRetention: logs.RetentionDays.ONE_MONTH,
        role: executionLambdaRole,
      },
    );

    /**
     * Define rules for periodic execution of lambda
     */
    new events.Rule(this, CONSTANTS.ruleName, {
      ruleName: CONSTANTS.ruleName,
      // WARNING: Cron expressions need to be specified in GMT
      // Specify execution at 4 AM every Monday in JST
      schedule: events.Schedule.cron({
        minute: "0",
        hour: "19",
        weekDay: "SUN",
        month: "*",
        year: "*",
      }),
      targets: [new eventsTarget.LambdaFunction(scheduleLambdaFunction)],
    });
  }
}
