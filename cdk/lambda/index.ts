import * as AWS from "aws-sdk";
import { Context, ScheduledEvent, ScheduledHandler } from "aws-lambda";

/**
 * Define kms client
 */
const kmsClient: AWS.KMS = new AWS.KMS({
  region: "ap-northeast-1",
});

/**
 * Get a list of keys with aliases.
 * @param kmsClient kms client
 * @returns　List of keys with alias.
 */
const getAttachedAliasKeyIdList = async (kmsClient: AWS.KMS) => {
  console.log("Execute: getAttachedAliasKeyIdList");
  const listAliasesResponse = await kmsClient.listAliases().promise();

  // If the alias is not tied to a specific key, the targetKeyId will be undefined.
  // Therefore, only keys with aliases are included in the list.
  const attachedAliasKeyIDList = listAliasesResponse
    .Aliases!.map((aliasInfo) => aliasInfo.TargetKeyId)
    .filter(
      (item): item is Exclude<typeof item, undefined> => item !== undefined,
    );

  console.log("Complete: getAttachedAliasKeyIdList");
  return attachedAliasKeyIDList;
};

/**
 *　Determine if the key should be change status to "PendingDeletion".
 *
 * @param keyMetadata key meta data
 * @param attachedAliaskeyIdList List of key id for keys with alias
 * @returns true if the key is not pending deletion and does not have an alias
 */
const shouldChangeStatusToPendingDelete = (
  keyMetadata: AWS.KMS.KeyMetadata,
  attachedAliasIdkeyList: string[],
) => {
  const keyState = keyMetadata.KeyState;
  const keyId = keyMetadata.KeyId;
  return (
    keyState !== "PendingDeletion" && !attachedAliasIdkeyList.includes(keyId)
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

/**
 * Lambda main process
 */
const mainProcess = async () => {
  try {
    // Get a list of keys with alias.
    const attachedAliaskeyList = await getAttachedAliasKeyIdList(kmsClient);

    // Get a list of keys that exist in the account
    const listKeyResponse = await kmsClient.listKeys().promise();

    for (const key of listKeyResponse.Keys!) {
      const describeKeyResponse = await kmsClient
        .describeKey({
          KeyId: key.KeyId!,
        })
        .promise();

      //　Change the status of a key that is not "PendingDeletion" and does not have an alias to "PendingDeletion"
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

export const handler: ScheduledHandler = async (
  event: ScheduledEvent,
  context: Context,
) => {
  await mainProcess();
};

// mainProcess();
