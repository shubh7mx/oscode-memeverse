import { Client, Databases, ID, Query, Storage } from "node-appwrite";
import { InputFile } from "node-appwrite/file";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const apiKey = process.env.APPWRITE_API_KEY;

if (!endpoint || !projectId || !databaseId || !apiKey) {
  throw new Error("Missing Appwrite server env. Check .env.local");
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);

const databases = new Databases(client);
const storage = new Storage(client);

const ids = {
  databaseId,
  questions: process.env.APPWRITE_QUESTIONS_COLLECTION_ID || "mv_questions",
  participants: process.env.APPWRITE_PARTICIPANTS_COLLECTION_ID || "mv_participants",
  session: process.env.APPWRITE_SESSION_COLLECTION_ID || "mv_session",
  sessionDocId: process.env.APPWRITE_SESSION_DOC_ID || "active_session",
  bucket: process.env.APPWRITE_BUCKET_ID || "",
};

export { ID, InputFile, Query, client, databases, ids, storage };
