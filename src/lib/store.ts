import { get, set, del, keys } from "idb-keyval";
import type { Project, Flow } from "./types";

const KEY = (id: string) => `project:${id}`;
const ACTIVE = "active-project";

export function newId(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyFlow(name = "New Flow"): Flow {
  return {
    id: newId("flow"),
    name,
    enabled: true,
    nodes: [],
    edges: [],
  };
}

export function createEmptyProject(name = "My Discord Bot"): Project {
  return {
    id: newId("proj"),
    name,
    config: JSON.stringify(
      { bot: { token: "" }, api: { key: "" } },
      null,
      2,
    ),
    tokenPath: "config.bot.token",
    flows: [createEmptyFlow("Main Flow")],
    variables: [],
    updatedAt: Date.now(),
  };
}

export async function saveProject(p: Project) {
  p.updatedAt = Date.now();
  await set(KEY(p.id), p);
  await set(ACTIVE, p.id);
}

export async function loadActiveProject(): Promise<Project | null> {
  const id = await get<string>(ACTIVE);
  if (!id) return null;
  return (await get<Project>(KEY(id))) ?? null;
}

export async function listProjects(): Promise<Project[]> {
  const all = await keys();
  const out: Project[] = [];
  for (const k of all) {
    if (typeof k === "string" && k.startsWith("project:")) {
      const p = await get<Project>(k);
      if (p) out.push(p);
    }
  }
  return out;
}

export async function deleteProject(id: string) {
  await del(KEY(id));
}

export async function setActive(id: string) {
  await set(ACTIVE, id);
}