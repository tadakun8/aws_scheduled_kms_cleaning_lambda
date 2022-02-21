#!/bin/bash

export AWS_PROFILE=XXXXXXX
export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity | jq -r .Account)
export CDK_DEFAULT_REGION=$(aws configure get region)

npm run cdk deploy
