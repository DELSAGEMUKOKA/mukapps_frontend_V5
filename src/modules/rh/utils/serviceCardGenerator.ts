import type { RhEmployee } from '../api/rhApi';
import type { Company } from '@/shared/types';

export interface ServiceCardOptions {
  employee: RhEmployee;
  company: Company | null;
  companyName?: string;
  /** data: URL (already converted from blob before calling this) */
  qrBlobUrl: string;
  /** data: URL or null */
  logoUrl?: string | null;
}

const W = 856;
const H = 540;
const RADIUS = 22;
const HEADER_H = 148;
const FOOTER_H = 18;

const BLUE_DARK  = '#1a56c4';
const BLUE_MID   = '#2b7de9';
const BLUE_LIGHT = '#4a9fe0';
const BLUE_PALE  = '#cde6f7';

// All sources are data: URLs at this point — no crossOrigin needed
function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function diamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, sz: number, col: string) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(cx, cy - sz); ctx.lineTo(cx + sz, cy);
  ctx.lineTo(cx, cy + sz); ctx.lineTo(cx - sz, cy);
  ctx.closePath(); ctx.fill();
}

function sep(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
  ctx.save();
  ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke();
  ctx.restore();
}

function truncate(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1);
  return t + '…';
}

function autoFont(ctx: CanvasRenderingContext2D, text: string, max: number, startPx: number, minPx: number, weight = 'bold'): number {
  let sz = startPx;
  ctx.font = `${weight} ${sz}px system-ui, sans-serif`;
  while (sz > minPx && ctx.measureText(text).width > max) {
    sz -= 1;
    ctx.font = `${weight} ${sz}px system-ui, sans-serif`;
  }
  return sz;
}

export async function generateServiceCard(opts: ServiceCardOptions): Promise<string> {
  const { employee, company, qrBlobUrl, logoUrl } = opts;

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Load images in parallel (all data: URLs — safe for canvas)
  const [qrImg, logoImg, photoImg] = await Promise.all([
    qrBlobUrl ? loadImg(qrBlobUrl) : Promise.resolve(null),
    logoUrl   ? loadImg(logoUrl)   : Promise.resolve(null),
    employee.photo ? loadImg(employee.photo) : Promise.resolve(null),
  ]);

  // ── White card ─────────────────────────────────────────────────────────────
  ctx.fillStyle = '#ffffff';
  rr(ctx, 0, 0, W, H, RADIUS);
  ctx.fill();

  // ── Header band (clipped to top-rounded rect) ──────────────────────────────
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(RADIUS, 0); ctx.lineTo(W - RADIUS, 0);
  ctx.quadraticCurveTo(W, 0, W, RADIUS);
  ctx.lineTo(W, HEADER_H); ctx.lineTo(0, HEADER_H); ctx.lineTo(0, RADIUS);
  ctx.quadraticCurveTo(0, 0, RADIUS, 0);
  ctx.closePath(); ctx.clip();

  const hg = ctx.createLinearGradient(0, 0, W, 0);
  hg.addColorStop(0, BLUE_DARK); hg.addColorStop(0.5, BLUE_MID); hg.addColorStop(1, BLUE_LIGHT);
  ctx.fillStyle = hg; ctx.fillRect(0, 0, W, HEADER_H);

  ctx.globalAlpha = 0.28;
  diamond(ctx, -15, 30, 58, BLUE_LIGHT);  diamond(ctx, 38, 98, 42, '#5bb5f0');
  diamond(ctx, 85, 18, 36, '#3a90d8');    diamond(ctx, 120, 74, 28, '#6ac0f5');
  diamond(ctx, W + 12, 22, 62, '#3a90d8'); diamond(ctx, W - 48, 92, 44, BLUE_LIGHT);
  diamond(ctx, W - 98, 16, 33, '#6ac0f5'); diamond(ctx, W - 128, 68, 25, '#5bb5f0');
  ctx.globalAlpha = 1;
  ctx.restore();

  // ── Logo ───────────────────────────────────────────────────────────────────
  const LOGO_SZ = 80;
  const LOGO_X  = 36;
  const LOGO_Y  = (HEADER_H - LOGO_SZ) / 2;

  if (logoImg) {
    ctx.save();
    rr(ctx, LOGO_X, LOGO_Y, LOGO_SZ, LOGO_SZ, 10); ctx.clip();
    ctx.drawImage(logoImg, LOGO_X, LOGO_Y, LOGO_SZ, LOGO_SZ);
    ctx.restore();
  } else {
    // Hexagon placeholder
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.strokeStyle = 'rgba(255,255,255,0.80)'; ctx.lineWidth = 2;
    const cx = LOGO_X + LOGO_SZ / 2, cy = LOGO_Y + LOGO_SZ / 2, hr = LOGO_SZ / 2 - 5;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      if (i === 0) ctx.moveTo(cx + hr * Math.cos(a), cy + hr * Math.sin(a));
      else         ctx.lineTo(cx + hr * Math.cos(a), cy + hr * Math.sin(a));
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.floor(LOGO_SZ * 0.28)}px system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('', cx, cy);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  // ── Company name ───────────────────────────────────────────────────────────
  const TEXT_CX = LOGO_X + LOGO_SZ + (W - LOGO_X - LOGO_SZ) / 2;
  const MAX_NAME_W = W - LOGO_X - LOGO_SZ - 20;
  const companyName = (opts.companyName ?? company?.name ?? 'NOM ENTREPRISE').toUpperCase();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  autoFont(ctx, companyName, MAX_NAME_W, 38, 16);
  ctx.fillText(companyName, TEXT_CX, 58);

  // "CARTE DE SERVICE" badge
  const BW = 262, BH = 30, BX = TEXT_CX - BW / 2, BY = 70;
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
  rr(ctx, BX, BY, BW, BH, 4); ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(BX - 48, BY + BH / 2); ctx.lineTo(BX - 8, BY + BH / 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(BX + BW + 8, BY + BH / 2); ctx.lineTo(BX + BW + 48, BY + BH / 2); ctx.stroke();

  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText('CARTE DE SERVICE', TEXT_CX, BY + 20);
  ctx.textAlign = 'left';

  // ── Footer strip ───────────────────────────────────────────────────────────
  ctx.fillStyle = BLUE_DARK;
  ctx.fillRect(0, H - FOOTER_H, W, FOOTER_H);

  // ── Employee photo ─────────────────────────────────────────────────────────
  const PH_X = 34, PH_Y = HEADER_H + 16;
  const PH_W = 188, PH_H = H - HEADER_H - FOOTER_H - 30, PH_R = 12;

  ctx.fillStyle = BLUE_PALE;
  rr(ctx, PH_X, PH_Y, PH_W, PH_H, PH_R); ctx.fill();

  if (photoImg) {
    ctx.save();
    rr(ctx, PH_X, PH_Y, PH_W, PH_H, PH_R); ctx.clip();
    const ar = photoImg.width / photoImg.height, tAr = PH_W / PH_H;
    let sx = 0, sy = 0, sw = photoImg.width, sh = photoImg.height;
    if (ar > tAr) { sw = photoImg.height * tAr; sx = (photoImg.width - sw) / 2; }
    else          { sh = photoImg.width / tAr;  sy = (photoImg.height - sh) / 2; }
    ctx.drawImage(photoImg, sx, sy, sw, sh, PH_X, PH_Y, PH_W, PH_H);
    ctx.restore();
  } else {
    ctx.save();
    rr(ctx, PH_X, PH_Y, PH_W, PH_H, PH_R); ctx.clip();
    ctx.fillStyle = BLUE_PALE; ctx.fillRect(PH_X, PH_Y, PH_W, PH_H);
    ctx.fillStyle = BLUE_MID;
    ctx.font = `bold ${Math.floor(PH_W * 0.35)}px system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`${employee.firstName[0] ?? ''}${employee.lastName[0] ?? ''}`.toUpperCase(), PH_X + PH_W / 2, PH_Y + PH_H / 2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  // ── QR Code ────────────────────────────────────────────────────────────────
  const QR_SZ = 192, QR_X = W - QR_SZ - 26, QR_Y = HEADER_H + 16;

  if (qrImg) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.10)'; ctx.shadowBlur = 6;
    ctx.fillStyle = '#ffffff';
    rr(ctx, QR_X - 6, QR_Y - 6, QR_SZ + 12, QR_SZ + 12, 6); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.drawImage(qrImg, QR_X, QR_Y, QR_SZ, QR_SZ);
    ctx.restore();
  } else {
    ctx.fillStyle = '#f3f4f6';
    rr(ctx, QR_X, QR_Y, QR_SZ, QR_SZ, 8); ctx.fill();
    ctx.fillStyle = '#9ca3af'; ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('QR Code indisponible', QR_X + QR_SZ / 2, QR_Y + QR_SZ / 2);
    ctx.textAlign = 'left';
  }

  // ── Info section ───────────────────────────────────────────────────────────
  const INFO_X = PH_X + PH_W + 26;
  const INFO_Y = HEADER_H + 22;
  const INFO_W = QR_X - INFO_X - 18;   // dynamic: fills gap between photo and QR

  // Full name — auto-size
  const fullName = `${employee.firstName} ${employee.lastName}`;
  const nameSz = autoFont(ctx, fullName, INFO_W, 32, 16);
  ctx.fillStyle = '#111827';
  ctx.fillText(fullName, INFO_X, INFO_Y + nameSz);

  // Position
  ctx.fillStyle = BLUE_MID; ctx.font = '500 19px system-ui, sans-serif';
  ctx.fillText(truncate(ctx, employee.position, INFO_W), INFO_X, INFO_Y + nameSz + 28);

  // Matricule
  const R1 = INFO_Y + nameSz + 66;
  drawIcon(ctx, INFO_X, R1 - 15, BLUE_MID);
  ctx.fillStyle = BLUE_MID; ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText('Matricule', INFO_X + 24, R1 - 1);
  ctx.fillStyle = '#374151'; ctx.font = '500 17px system-ui, sans-serif';
  ctx.fillText(employee.employeeNumber, INFO_X + 24, R1 + 20);
  sep(ctx, INFO_X, R1 + 30, INFO_W);

  // Département
  const R2 = R1 + 54;
  ctx.fillStyle = BLUE_MID; ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('DÉPARTEMENT', INFO_X, R2 - 1);
  ctx.fillStyle = '#111827'; ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText(truncate(ctx, employee.department?.name ?? '—', INFO_W), INFO_X, R2 + 20);
  sep(ctx, INFO_X, R2 + 32, INFO_W);

  // Adresse
  const R3 = R2 + 54;
  const addrParts = [company?.address, company?.city, company?.country].filter(Boolean);
  if (addrParts.length > 0) {
    drawIcon(ctx, INFO_X, R3 - 15, BLUE_MID);
    ctx.fillStyle = BLUE_MID; ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('ADRESSE', INFO_X + 24, R3 - 1);
    ctx.fillStyle = '#374151'; ctx.font = '500 13px system-ui, sans-serif';
    ctx.fillText(truncate(ctx, addrParts.join(', '), INFO_W - 24), INFO_X + 24, R3 + 18);
  }

  return canvas.toDataURL('image/png');
}

function drawIcon(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  const s = 16;
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = 1.5;
  rr(ctx, x, y, s, s, 3); ctx.stroke();
  ctx.fillStyle = color; ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('≡', x + s / 2, y + s / 2 + 1);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.restore();
}
