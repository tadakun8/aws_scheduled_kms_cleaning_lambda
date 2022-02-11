import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as logs from "@aws-cdk/aws-logs";
import * as events from "@aws-cdk/aws-events";
import * as eventsTarget from "@aws-cdk/aws-events-targets";

import { CONSTANTS } from "./constants";

export class ScheduledKmsCleaningLambdaStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create schedule lambda function
    const scheduleLambdaFunction = new lambda.Function(
      this,
      CONSTANTS.lambdaName,
      {
        functionName: CONSTANTS.lambdaName,
        runtime: lambda.Runtime.NODEJS_14_X,
        // code loaded from the "lambda" directory,
        code: lambda.Code.fromAsset("lambda"),
        // hander loaded from "handler" method of index.ts
        handler: "index.handler",
        // By default, lambda logs are permanently stored in cloudwatch logs, so specify the retention period.
        logRetention: logs.RetentionDays.ONE_MONTH,
      },
    );

    // Define rules for periodic execution of lambda
    new events.Rule(this, CONSTANTS.ruleName, {
      ruleName: CONSTANTS.ruleName,
      // WARNING: Cron expressions need to be specified in GMT
      // Specify execution at 4 AM every Monday in JST
      schedule: events.Schedule.cron({
        minute: "0",
        hour: "7",
        day: "*",
        month: "SUN",
        year: "*",
      }),
      targets: [new eventsTarget.LambdaFunction(scheduleLambdaFunction)],
    });
  }
}
