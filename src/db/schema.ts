import { pgTable, text, integer, timestamp, jsonb, uuid } from 'drizzle-orm/pg-core';
import type { ScoreMap, Workspace } from '@/lib/data';

export const settings = pgTable('teacher_settings', {
  id: text('id').primaryKey(),
  teacherName: text('teacher_name').notNull(),
  school: text('school').notNull(),
  campus: text('campus').notNull(),
  academicYear: text('academic_year').notNull(),
  rightLogo: text('right_logo'),
  leftLogo: text('left_logo'),
  updatedAt: timestamp('updated_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
});

export const classrooms = pgTable('classrooms', {
  id: text('id').primaryKey(),
  grade: text('grade').notNull(),
  section: text('section').notNull().default(''),
  subject: text('subject').notNull(),
  term: text('term').notNull(),
  weeks: jsonb('weeks').$type<number[]>().notNull().default([8, 9, 10, 11]),
  updatedAt: timestamp('updated_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
});

export const students = pgTable('students', {
  id: text('id').primaryKey(),
  classroomId: text('classroom_id').notNull().references(() => classrooms.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  position: integer('position').notNull(),
  scores: jsonb('scores').$type<ScoreMap>().notNull().default({}),
});

export const savedReports = pgTable('saved_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  teacherName: text('teacher_name').notNull(),
  pages: integer('pages').notNull(),
  payload: jsonb('payload').$type<Workspace>().notNull(),
  createdAt: timestamp('created_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
});
