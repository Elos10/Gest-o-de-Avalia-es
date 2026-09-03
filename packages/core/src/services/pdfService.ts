import fs from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { SheetData, Subject } from '../types.js';
import { A4_LANDSCAPE_2UP_HORIZONTAL_V1 as T, mmToPt } from '../template/a4Landscape2upV1.js';
import { createQrPayload, qrDataUrl } from './qrCodeService.js';

const subjectLabels: Record<Subject, string> = {
  PORTUGUESE: 'Língua Portuguesa', MATHEMATICS: 'Matemática', SINGLE: 'Prova Única',
};
const timeLabels: Record<SheetData['timeMode'], string> = {
  PARTIAL: 'Parcial', FULL: 'Integral', ALL: 'Parcial e Integral',
};

export const formatSheetSubject = (subject: Subject) => subjectLabels[subject];
export const formatSheetTime = (timeMode: SheetData['timeMode']) => timeLabels[timeMode];
const y = (mm: number) => mmToPt(T.page.height - mm);

function text(page: PDFPage, font: PDFFont, value: string, x: number, top: number, size = 8) {
  page.drawText(value, { x: mmToPt(x), y: y(top) - size, size, font, color: rgb(0, 0, 0) });
}
function centeredText(page: PDFPage, font: PDFFont, value: string, centerX: number, top: number, size = 8) {
  const widthMm = font.widthOfTextAtSize(value, size) * 25.4 / 72;
  text(page, font, value, centerX - widthMm / 2, top, size);
}

async function drawHalf(doc: PDFDocument, page: PDFPage, font: PDFFont, data: SheetData, offset: number, secret: string) {
  const h = T.half;
  for (const marker of h.markers) page.drawRectangle({ x: mmToPt(offset + marker.x - h.markerSize / 2), y: y(marker.y + h.markerSize / 2), width: mmToPt(h.markerSize), height: mmToPt(h.markerSize), color: rgb(0, 0, 0) });
  const qr = await qrDataUrl(createQrPayload(data.sheetId, secret));
  const image = await doc.embedPng(qr);
  page.drawImage(image, { x: mmToPt(offset + h.qr.x), y: y(h.qr.y + h.qr.size), width: mmToPt(h.qr.size), height: mmToPt(h.qr.size) });

  text(page, font, 'GABARITO DE AVALIAÇÃO', offset + 49, 20, 10);
  text(page, font, `Nº ${data.assessmentNumber}  •  ${data.assessmentYear}`, offset + 49, 27);
  text(page, font, `Disciplina: ${formatSheetSubject(data.subject)}`, offset + 49, 33);
  text(page, font, `Unidade: ${data.unitName}`, offset + 49, 39);
  text(page, font, `Aluno: ${data.studentName ?? '____________________________________'}`, offset + 18, 50);
  text(page, font, `Série: ${data.grade}º   Turma: ${data.className ?? 'Toda a rede'}   Tempo: ${formatSheetTime(data.timeMode)}`, offset + 18, 57);
  page.drawLine({ start: { x: mmToPt(offset + 18), y: y(66) }, end: { x: mmToPt(offset + 130), y: y(66) }, thickness: 0.7 });

  const tableLeft = offset + 18;
  const tableRight = offset + 97;
  page.drawRectangle({ x: mmToPt(tableLeft), y: y(75.2), width: mmToPt(tableRight - tableLeft), height: mmToPt(7.2), color: rgb(0.94, 0.95, 0.95), borderColor: rgb(0.35, 0.35, 0.35), borderWidth: 0.45 });
  page.drawLine({ start: { x: mmToPt(offset + 31), y: y(68) }, end: { x: mmToPt(offset + 31), y: y(75.2) }, thickness: 0.45, color: rgb(0.35, 0.35, 0.35) });
  centeredText(page, font, 'QUESTÃO', offset + 24.5, 69.2, 5.7);
  centeredText(page, font, 'RESPOSTAS', offset + 62, 68.4, 5.5);
  for (const bubble of h.questions[0].bubbles) centeredText(page, font, bubble.choice, offset + bubble.x, 72.2, 6.2);

  for (const row of h.questions.slice(0, data.questionCount)) {
    centeredText(page, font, String(row.question).padStart(2, '0'), offset + 24.5, row.y - 0.1, 7);
    for (const bubble of row.bubbles) page.drawCircle({ x: mmToPt(offset + bubble.x), y: y(bubble.y), size: mmToPt(bubble.r), borderWidth: 0.7, borderColor: rgb(0, 0, 0) });
  }
  text(page, font, 'Assinatura do aluno: ______________________________________', offset + 18, 178);
  text(page, font, `${T.id} • ${data.sheetId.slice(0, 8)}`, offset + 18, 195, 5.5);
}

export async function generateAnswerSheetPdf(data: SheetData, secret: string, fontPath?: string) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([mmToPt(297), mmToPt(210)]);
  let font: PDFFont;
  if (fontPath) {
    try { doc.registerFontkit(fontkit); font = await doc.embedFont(await fs.readFile(fontPath), { subset: true }); }
    catch { font = await doc.embedFont(StandardFonts.Helvetica); }
  } else font = await doc.embedFont(StandardFonts.Helvetica);
  await drawHalf(doc, page, font, data, 0, secret);
  await drawHalf(doc, page, font, data, 148.5, secret);
  page.drawLine({ start: { x: mmToPt(148.5), y: mmToPt(5) }, end: { x: mmToPt(148.5), y: mmToPt(205) }, thickness: 0.6, dashArray: [4, 3], color: rgb(0.4, 0.4, 0.4) });
  return Buffer.from(await doc.save());
}
