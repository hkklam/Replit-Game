import { Router } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

export type AppSettings = {
  transcriptionProvider: "whisper" | "deepgram" | "assemblyai";
  transcriptionApiKey: string | null;
  translationEnabled: boolean;
  translationApiKey: string | null;
  translationLanguageHint: string | null;
};

const DEFAULTS: AppSettings = {
  transcriptionProvider: "whisper",
  transcriptionApiKey: null,
  translationEnabled: false,
  translationApiKey: null,
  translationLanguageHint: null,
};

export async function loadSettings(): Promise<AppSettings> {
  const rows = await db.select().from(settingsTable);
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    transcriptionProvider:
      (map.get("transcriptionProvider") as AppSettings["transcriptionProvider"]) ??
      DEFAULTS.transcriptionProvider,
    transcriptionApiKey: map.get("transcriptionApiKey") ?? null,
    translationEnabled: map.get("translationEnabled") === "true",
    translationApiKey: map.get("translationApiKey") ?? null,
    translationLanguageHint: map.get("translationLanguageHint") || null,
  };
}

async function persistSettings(settings: Partial<AppSettings>): Promise<void> {
  for (const [key, raw] of Object.entries(settings)) {
    const value = raw === null || raw === undefined ? "" : String(raw);
    if (value === "") {
      await db.delete(settingsTable).where(eq(settingsTable.key, key));
    } else {
      await db
        .insert(settingsTable)
        .values({ key, value })
        .onConflictDoUpdate({ target: settingsTable.key, set: { value } });
    }
  }
}

router.get("/settings", async (req, res) => {
  try {
    const settings = await loadSettings();
    res.json(settings);
  } catch (err) {
    req.log.error({ err }, "Failed to load settings");
    res.status(500).json({ error: "Failed to load settings" });
  }
});

router.put("/settings", async (req, res) => {
  try {
    await persistSettings(req.body as Partial<AppSettings>);
    const updated = await loadSettings();
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to save settings");
    res.status(500).json({ error: "Failed to save settings" });
  }
});

export default router;
