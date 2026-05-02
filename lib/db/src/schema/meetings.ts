import { pgTable, text, serial, real, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const meetingsTable = pgTable("meetings", {
  id: serial("id").primaryKey(),
  meetingName: text("meeting_name").notNull(),
  fileId: text("file_id").notNull().unique(),
  transcript: text("transcript").notNull().default(""),
  segments: jsonb("segments").notNull().default([]),
  durationSec: real("duration_sec").notNull().default(0),
  costUsd: real("cost_usd").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  summary: text("summary"),
  actionItems: jsonb("action_items"),
  decisions: jsonb("decisions"),
  openQuestions: jsonb("open_questions"),
  analysisCostUsd: real("analysis_cost_usd"),
  speakerSegments: jsonb("speaker_segments"),
});

export const insertMeetingSchema = createInsertSchema(meetingsTable).omit({ id: true, createdAt: true });
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type Meeting = typeof meetingsTable.$inferSelect;
