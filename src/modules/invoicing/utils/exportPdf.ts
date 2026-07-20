import { sanitizeHtml } from '@/shared/helpers/securityHelper';
import { toCanvas } from 'html-to-image';
import { jsPDF } from 'jspdf';

/** Renders an HTML string to a multi-page A4 PDF and triggers download. */
export async function exportHtmlToPdf(html: string, filename: string): Promise<void> {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:fixed;top:0;left:0;z-index:-9999;width:794px;overflow:visible;background:#fff;opacity:0;pointer-events:none;';
  const container = document.createElement('div');
  container.style.cssText = 'width:794px;background:#fff;overflow:visible;';
  container.innerHTML = sanitizeHtml(html);
  wrapper.appendChild(container);
  document.body.appendChild(wrapper);

  // Allow layout and images to fully render
  await new Promise(r => setTimeout(r, 700));

  const contentH = Math.max(
    container.scrollHeight,
    container.offsetHeight,
    container.getBoundingClientRect().height,
  );

  const canvas = await toCanvas(container, {
    cacheBust: true,
    backgroundColor: '#ffffff',
    pixelRatio: 2,
    width: 794,
    height: contentH,
    style: { overflow: 'visible' },
  });

  document.body.removeChild(wrapper);

  const A4_W_MM = 210;
  const A4_H_MM = 297;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const imgData = canvas.toDataURL('image/jpeg', 0.92);
  const pxPerMm = canvas.width / A4_W_MM;
  const totalHeightMm = canvas.height / pxPerMm;

  let renderedMm = 0;
  let pageIndex = 0;
  while (renderedMm < totalHeightMm) {
    if (pageIndex > 0) pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, -renderedMm, A4_W_MM, totalHeightMm);
    renderedMm += A4_H_MM;
    pageIndex++;
  }

  pdf.save(filename);
}
