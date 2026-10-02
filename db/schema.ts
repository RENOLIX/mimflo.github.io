// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const profiles = sqliteTable('profiles', {userId:text('user_id').primaryKey(), firstName:text('first_name').notNull(), lastName:text('last_name').notNull(), level:text('level').notNull(), exam:text('exam').notNull(), source:text('source').notNull(), createdAt:integer('created_at').notNull(), trialAt:integer('trial_at'), selectedPlan:text('selected_plan')});
export const notes = sqliteTable('notes',{id:text('id').primaryKey(),userId:text('user_id').notNull(),word:text('word').notNull(),definition:text('definition').notNull(),createdAt:integer('created_at').notNull()});
export const sessions = sqliteTable('sessions',{id:text('id').primaryKey(),userId:text('user_id').notNull(),articleId:text('article_id').notNull(),seconds:integer('seconds').notNull(),transcript:text('transcript').notNull(),coverage:integer('coverage'),createdAt:integer('created_at').notNull()});
