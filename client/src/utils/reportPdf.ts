import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const A4_W = 794;

async function captureCard(el: HTMLElement): Promise<HTMLCanvasElement> {
  const prevWidth = el.style.width;
  el.style.width = `${A4_W}px`;
  el.classList.add('pdf-capture');
  try {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    return await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
  } finally {
    el.classList.remove('pdf-capture');
    el.style.width = prevWidth;
  }
}

function fitPage(canvas: HTMLCanvasElement) {
  const iw = canvas.width / 2;
  const ih = canvas.height / 2;
  const ratio = Math.min(210 / iw, 297 / ih);
  const w = iw * ratio;
  const h = ih * ratio;
  return { w, h, x: (210 - w) / 2, y: (297 - h) / 2 };
}

export async function downloadSingleReportPdf(el: HTMLElement, filename: string) {
  const canvas = await captureCard(el);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { w, h, x, y } = fitPage(canvas);
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', x, y, w, h);
  pdf.save(filename);
}

export async function downloadBulkReportPdf(els: HTMLElement[], filename: string) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  for (let i = 0; i < els.length; i++) {
    if (i > 0) pdf.addPage();
    const canvas = await captureCard(els[i]);
    const { w, h, x, y } = fitPage(canvas);
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', x, y, w, h);
  }
  pdf.save(filename);
}
