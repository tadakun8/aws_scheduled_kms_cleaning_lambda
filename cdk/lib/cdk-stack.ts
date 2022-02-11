import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as logs from "@aws-cdk/aws-logs";

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
        // if needed, you can change the value
        logRetention: logs.RetentionDays.ONE_MONTH,
      },
    );
  }
}
