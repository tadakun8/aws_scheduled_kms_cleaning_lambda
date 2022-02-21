import * as cdk from "@aws-cdk/core";
import * as iam from "@aws-cdk/aws-iam";
import * as lambdaNodejs from "@aws-cdk/aws-lambda-nodejs";
import * as logs from "@aws-cdk/aws-logs";
import * as events from "@aws-cdk/aws-events";
import * as eventsTarget from "@aws-cdk/aws-events-targets";
import * as sns from "@aws-cdk/aws-sns";
import * as snsSubscriptions from "@aws-cdk/aws-sns-subscriptions";
import * as ssm from "@aws-cdk/aws-ssm";

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

    /**
     * Define SNS topic to notify developer of the cleaned-up key
     */
    const topic = new sns.Topic(this, "scheduledKmsCleaningaTopic", {
      displayName: "scheduled-kms-cleaning-topic",
      topicName: "scheduled-kms-cleaning-topic",
    });
    topic.grantPublish(scheduleLambdaFunction);

    /**
     * Process for adding subscription
     */
    // Get the email address string for notification from the SSM parameter store
    const emailAddressesString = ssm.StringParameter.valueFromLookup(
      this,
      CONSTANTS.parameterNameOfNotification,
    );
    console.log(emailAddressesString);
    // When multiple email addresses are registered in the parameter store, they are separated by commas.
    // e.g) emailAddressString = "xxx@gmail.com,yyy@gmail.com"
    // So, fix it to an array
    const emailAddressList = emailAddressesString.split(",");
    // Add one email address at a time as a subscription.
    emailAddressList.forEach((emailAddress) => {
      topic.addSubscription(
        new snsSubscriptions.EmailSubscription(emailAddress),
      );
    });
    scheduleLambdaFunction.addEnvironment("TOPIC_ARN", topic.topicArn);
  }
}
