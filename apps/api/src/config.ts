import dotenv from 'dotenv';import path from 'node:path';import {fileURLToPath} from 'node:url';import z from 'zod';
dotenv.config({path:path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../.env')});
export const config=z.object({NODE_ENV:z.enum(['development','test','production']).default('development'),PORT:z.coerce.number().default(3001),WEB_ORIGIN:z.string().default('http://localhost:5173'),SUPABASE_URL:z.string().url(),SUPABASE_PUBLISHABLE_KEY:z.string().min(1),SUPABASE_SECRET_KEY:z.string().min(1),QR_HMAC_SECRET:z.string().min(32),CALIBRI_FONT_PATH:z.string().optional(),OMR_PYTHON_PATH:z.string().default('python'),MAX_UPLOAD_BYTES:z.coerce.number().default(15728640)}).parse(process.env);

