import { pgTable, text, serial, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  pdfFileName: text("pdf_file_name").notNull(),
  pdfVerdict: text("pdf_verdict").notNull(),
  pdfRiskScore: integer("pdf_risk_score").notNull(),
  imageFileName: text("image_file_name").notNull(),
  imageVerdict: text("image_verdict").notNull(),
  imageRiskScore: integer("image_risk_score").notNull(),
  overallDecision: text("overall_decision").notNull(),
  overallRiskLevel: text("overall_risk_level").notNull(),
  localization: jsonb("localization").$type<{
    hasOutputImage: boolean;
    boundingBoxes?: { x: number; y: number; w: number; h: number; label?: string }[];
  }>(),
});

export const insertSubmissionSchema = createInsertSchema(submissions).omit({ id: true });
export type Submission = typeof submissions.$inferSelect;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
