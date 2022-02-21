#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import { ScheduledKmsCleaningLambdaStack } from "../lib/cdk-stack";

const app = new cdk.App();
new ScheduledKmsCleaningLambdaStack(app, "ScheduledKmsCleaningLambdaStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
