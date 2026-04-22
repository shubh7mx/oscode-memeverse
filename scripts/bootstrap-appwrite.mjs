import { Client, Databases } from "node-appwrite";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const project = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const key = process.env.APPWRITE_API_KEY;

const questions = process.env.APPWRITE_QUESTIONS_COLLECTION_ID || "mv_questions";
const participants = process.env.APPWRITE_PARTICIPANTS_COLLECTION_ID || "mv_participants";
const session = process.env.APPWRITE_SESSION_COLLECTION_ID || "mv_session";
const sessionDocId = process.env.APPWRITE_SESSION_DOC_ID || "active_session";

if (!endpoint || !project || !databaseId || !key) throw new Error("Missing env for bootstrap");

const client = new Client().setEndpoint(endpoint).setProject(project).setKey(key);
const db = new Databases(client);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function ensureCollection(collectionId, name) {
  try {
    await db.getCollection(databaseId, collectionId);
    console.log(`Collection exists: ${collectionId}`);
  } catch {
    await db.createCollection(databaseId, collectionId, name, [], false, true);
    console.log(`Created collection: ${collectionId}`);
  }
}

async function tryCall(label, fn) {
  try {
    await fn();
    console.log(`ok: ${label}`);
  } catch (e) {
    const msg = e?.message || "";
    if (msg.includes("already exists") || e?.code === 409) {
      console.log(`skip: ${label}`);
      return;
    }
    throw e;
  }
}

async function retryIndex(label, fn, tries = 8) {
  for (let i = 1; i <= tries; i++) {
    try {
      await tryCall(label, fn);
      return;
    } catch (e) {
      const msg = e?.message || "";
      if (!msg.includes("not yet available") || i === tries) throw e;
      console.log(`wait: ${label} (attempt ${i})`);
      await wait(1500);
    }
  }
}

async function main() {
  await ensureCollection(questions, "MemeVerse Questions");
  await ensureCollection(participants, "MemeVerse Participants");
  await ensureCollection(session, "MemeVerse Session");

  await tryCall("questions.question", () => db.createStringAttribute(databaseId, questions, "question", 500, true));
  await tryCall("questions.imageUrl", () => db.createStringAttribute(databaseId, questions, "imageUrl", 1000, false));
  await tryCall("questions.optionA", () => db.createStringAttribute(databaseId, questions, "optionA", 200, true));
  await tryCall("questions.optionB", () => db.createStringAttribute(databaseId, questions, "optionB", 200, true));
  await tryCall("questions.optionC", () => db.createStringAttribute(databaseId, questions, "optionC", 200, true));
  await tryCall("questions.optionD", () => db.createStringAttribute(databaseId, questions, "optionD", 200, true));
  await tryCall("questions.correctOption", () => db.createIntegerAttribute(databaseId, questions, "correctOption", true, 0, 3));
  await tryCall("questions.timeLimit", () => db.createIntegerAttribute(databaseId, questions, "timeLimit", true, 5, 120));
  await tryCall("questions.order", () => db.createIntegerAttribute(databaseId, questions, "order", true));
  await retryIndex("questions.order.index", () => db.createIndex(databaseId, questions, "order_idx", "key", ["order"], ["ASC"]));

  await tryCall("participants.name", () => db.createStringAttribute(databaseId, participants, "name", 50, true));
  await tryCall("participants.score", () => db.createIntegerAttribute(databaseId, participants, "score", true));
  await tryCall("participants.joinedAt", () => db.createDatetimeAttribute(databaseId, participants, "joinedAt", true));
  await tryCall("participants.lastAnsweredIndex", () => db.createIntegerAttribute(databaseId, participants, "lastAnsweredIndex", true));
  await tryCall("participants.finished", () => db.createBooleanAttribute(databaseId, participants, "finished", true));
  await tryCall("participants.token", () => db.createStringAttribute(databaseId, participants, "token", 80, true));
  await retryIndex("participants.score.index", () => db.createIndex(databaseId, participants, "score_idx", "key", ["score"], ["DESC"]));
  await retryIndex("participants.name.index", () => db.createIndex(databaseId, participants, "name_idx", "key", ["name"], ["ASC"]));

  await tryCall("session.status", () => db.createStringAttribute(databaseId, session, "status", 20, true));
  await tryCall("session.currentQuestionIndex", () => db.createIntegerAttribute(databaseId, session, "currentQuestionIndex", true));
  await tryCall("session.questionStartedAt", () => db.createDatetimeAttribute(databaseId, session, "questionStartedAt", false));
  await tryCall("session.questionEndsAt", () => db.createDatetimeAttribute(databaseId, session, "questionEndsAt", false));

  try {
    await db.getDocument(databaseId, session, sessionDocId);
    console.log("Session doc exists");
  } catch {
    await db.createDocument(databaseId, session, sessionDocId, {
      status: "waiting",
      currentQuestionIndex: 0,
    });
    console.log("Session doc created");
  }

  console.log("Bootstrap done");
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
