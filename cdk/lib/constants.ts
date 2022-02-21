export const CONSTANTS = {
  /**
   * Name of the lambda to clean kms
   */
  lambdaName: "schedule-kms-cleaning-lambda",
  /**
   * Name of schedule rule
   */
  ruleName: "execute-kms-cleaning-lambda",
  /**
   * Parameter name of the SSM in which the email addresses to be notified is stored.
   */
  parameterNameOfNotification: "scheduled_lambda_notification_mail_address",
};
