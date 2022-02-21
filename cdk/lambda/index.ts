import * as AWS from "aws-sdk";
import { Context, ScheduledEvent, ScheduledHandler } from "aws-lambda";

// Get the ARN of the topic to be notified from the environment variable
const topicArn = process.env.TOPIC_ARN;

/**
 * Define kms client
 */
const kmsClient: AWS.KMS = new AWS.KMS({
  region: "ap-northeast-1",
});

/**
 * Define kms client
 */
const snsClient: AWS.SNS = new AWS.SNS({
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
  const scheduleKeyDeletionResponse = await kmsClient
    .scheduleKeyDeletion({
      KeyId: keyId,
      PendingWindowInDays: 7,
    })
    .promise();
  console.log(scheduleKeyDeletionResponse);
  console.log("Complete: Change Status to Panding Delete");
};

/**
 * Notify of List of keys that have been changed to "Pending Deletion"
 * @param cleanupKeyIdList List of keys that have been changed to "Pending Deletion
 */
const notifyCleanupKeyId = async (cleanupKeyIdList: string[]) => {
  console.log("Execute: Notify cleanup key id");
  const publishResponse = await snsClient
    .publish({
      TopicArn: topicArn,
      Subject: "Check the key to be deleted.",
      Message: JSON.stringify(cleanupKeyIdList, undefined, 2),
    })
    .promise();
  console.log(publishResponse);
  console.log("Complete: Notify cleanup key id");
};

/**
 * Lambda main process
 */
const mainProcess = async () => {
  try {
    // List of cleaned-up key IDs
    let cleandupKeyIdList: string[] = [];

    // Get a list of keys with alias.
    const attachedAliaskeyList = await getAttachedAliasKeyIdList(kmsClient);

    // Get a list of keys that exist in the account
    const listKeyResponse = await kmsClient.listKeys().promise();

    for await (const key of listKeyResponse.Keys!) {
      const describeKeyResponse = await kmsClient
        .describeKey({
          KeyId: key.KeyId!,
        })
        .promise();

      //　Change the status of a key that is not "PendingDeletion" and does not have an alias to "PendingDeletion"
      if (
        shouldChangeStatusToPendingDelete(
          describeKeyResponse.KeyMetadata!,
          attachedAliaskeyList,
        )
      ) {
        await changeStatusToPendingDeletion(key.KeyId!);
        cleandupKeyIdList.push(key.KeyId!);
      }
    }

    // Notify developer of cleaned keys
    cleandupKeyIdList.length && (await notifyCleanupKeyId(cleandupKeyIdList));
  } catch (err) {
    // For debug
    console.error(err);
  }
};

export const handler: ScheduledHandler = async (
  event: ScheduledEvent,
  context: Context,
) => {
  await mainProcess();
};

// mainProcess();
