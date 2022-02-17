import * as AWS from "aws-sdk";
import { Context, ScheduledEvent, ScheduledHandler } from "aws-lambda";

/**
 * Define kms client
 */
const kmsClient: AWS.KMS = new AWS.KMS({
  region: "ap-northeast-1",
});

/**
 *　Function to determine if the key should be change status to "PendingDeletion".
 *
 * @param keyMetadata key meta data
 * @param attachedAliaskeyIdList List of key id for keys with alias
 * @returns true if the key is not pending deletion and does not have an alias
 */
const shouldChangeStatusToPendingDelete = (
  keyMetadata: AWS.KMS.KeyMetadata,
  attachedAliasIdkeyList: (string | undefined)[] | undefined,
) => {
  const keyState = keyMetadata.KeyState;
  const keyId = keyMetadata.KeyId;
  return (
    keyState !== "PendingDeletion" && !attachedAliasIdkeyList?.includes(keyId)
  );
};

/**
 * Change the status of a key to "PendingDeletion".
 * @param keyId key id
 */
const changeStatusToPendingDeletion = async (keyId: string) => {
  console.log("Execute: Change Status to Panding Delete: " + keyId);
  await kmsClient.scheduleKeyDeletion({
    KeyId: keyId,
    PendingWindowInDays: 7,
  });
  console.log("Complete: Change Status to Panding Delete");
};

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

      shouldChangeStatusToPendingDelete(
        describeKeyResponse.KeyMetadata!,
        attachedAliaskeyList,
      ) && (await changeStatusToPendingDeletion(key.KeyId!));
    }
  } catch (err) {
    // For debug
    console.log(err);
  }
};
