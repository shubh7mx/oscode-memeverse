"use client";

import { Client, Databases, ID, Query, Storage } from "appwrite";
import { config } from "./config";

const endpoint = config.endpoint || "https://example.com/v1";
const project = config.projectId || "demo-project";

const client = new Client().setEndpoint(endpoint).setProject(project);

export const databases = new Databases(client);
export const storage = new Storage(client);
export { client, ID, Query };