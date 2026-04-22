export const config = {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
  questionsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_QUESTIONS_COLLECTION_ID,
  participantsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_PARTICIPANTS_COLLECTION_ID,
  sessionCollectionId: process.env.NEXT_PUBLIC_APPWRITE_SESSION_COLLECTION_ID,
  sessionDocId: process.env.NEXT_PUBLIC_APPWRITE_SESSION_DOC_ID || "active_session",
  bucketId: process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID,
  adminPin: process.env.NEXT_PUBLIC_ADMIN_PIN || "1234",
};

export function assertConfig() {
  const missing = [];
  if (!config.endpoint) missing.push("NEXT_PUBLIC_APPWRITE_ENDPOINT");
  if (!config.projectId) missing.push("NEXT_PUBLIC_APPWRITE_PROJECT_ID");
  if (!config.databaseId) missing.push("NEXT_PUBLIC_APPWRITE_DATABASE_ID");
  if (!config.questionsCollectionId) missing.push("NEXT_PUBLIC_APPWRITE_QUESTIONS_COLLECTION_ID");
  if (!config.participantsCollectionId) missing.push("NEXT_PUBLIC_APPWRITE_PARTICIPANTS_COLLECTION_ID");
  if (!config.sessionCollectionId) missing.push("NEXT_PUBLIC_APPWRITE_SESSION_COLLECTION_ID");
  return missing;
}