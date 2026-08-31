import z from 'zod';
import type { Subject } from '../types.js';
export type { Subject } from '../types.js';

export const QUESTION_COUNT_BY_GRADE = Object.freeze({1:10,2:10,3:10,4:15,5:15,6:20,7:20,8:20,9:20} as const);
export function allowedSubjects(grade:number): Subject[] { return grade === 1 ? ['SINGLE'] : ['PORTUGUESE','MATHEMATICS']; }
export function questionCountFor(grade:number, subject:Subject): number {
  z.number().int().min(1).max(9).parse(grade);
  if (!allowedSubjects(grade).includes(subject)) throw new Error(grade === 1 ? 'O 1º ano aceita somente Prova Única.' : 'Do 2º ao 9º ano use Português ou Matemática.');
  return QUESTION_COUNT_BY_GRADE[grade as keyof typeof QUESTION_COUNT_BY_GRADE];
}

