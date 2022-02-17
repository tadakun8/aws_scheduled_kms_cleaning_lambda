import * as AWS from "aws-sdk";
import { Context, ScheduledEvent, ScheduledHandler } from "aws-lambda";

/**
 * Define kms client
 */
const kmsClient: AWS.KMS = new AWS.KMS({
  region: "ap-northeast-1",
});

export const handler: ScheduledHandler = async (
  event: ScheduledEvent,
  context: Context,
) => {
  handlerMethod();
};

const handlerMethod = async () => {
  try {
    const listAliasesResponse = await kmsClient.listAliases().promise();
    const attachedAliaskeyList = listAliasesResponse.Aliases?.map(
      (aliasInfo) => aliasInfo.TargetKeyId,
    ).filter((value) => value !== undefined);

    // keyの一覧を取得
    const listKeyResponse = await kmsClient.listKeys().promise();

    // 削除保留中になっていないものかつエイリアスがついていないものを判別
    for (const key of listKeyResponse.Keys!) {
      const describeKeyResponse = await kmsClient
        .describeKey({
          KeyId: key.KeyId!,
        })
        .promise();
      if (
        describeKeyResponse.KeyMetadata?.KeyState !== "PendingDeletion" &&
        !attachedAliaskeyList?.includes(key.KeyId)
      ) {
        console.log("this is: " + key.KeyId);
        await kmsClient.scheduleKeyDeletion({
          KeyId: key.KeyId!,
          PendingWindowInDays: 7,
        });
        console.log("Delete !");
      }
    }
  } catch (err) {
    // For debug
    console.log(err);
  }
};
