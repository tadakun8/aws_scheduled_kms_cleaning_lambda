import { Context, ScheduledEvent, ScheduledHandler } from "aws-lambda";

export const handler: ScheduledHandler = async (
  event: ScheduledEvent,
  context: Context,
) => {
  console.log("hello world");
};
