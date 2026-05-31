import { sanitizeHtml } from '@/shared/helpers/securityHelper';

/** Renders an HTML string to a multi-page A4 PDF and triggers download. */
export async function exportHtmlToPdf(html: string, filename: string): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: html2canvas } = await import('html2canvas');

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:absolute;top:-9999px;left:-9999px;z-index:-9999;width:794px;overflow:visible;background:#fff;';
  const container = document.createElement('div');
  container.style.cssText = 'width:794px;background:#fff;';
  container.innerHTML = sanitizeHtml(html);
  wrapper.appendChild(container);
  document.body.appendChild(wrapper);

  // Wait for images and fonts to settle
  await new Promise(r => setTimeout(r, 500));

  const contentH = container.scrollHeight;
  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    width: 794,
    height: contentH,
    windowWidth: 794,
    scrollX: 0,
    scrollY: 0,
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
