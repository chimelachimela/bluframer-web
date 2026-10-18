import { logoOnLight, logoOnDark } from "../images";

// Draws the shareable story card (1080 x 1920), layout B: logo and wall name at the top, link at the bottom.
// The text card keeps its place under the title; the screenshot only uses the room left below it.
const W = 540, H = 960;
const DARK = "#1c283e", LIGHT = "#f7f7f3";

const loadImage = (src, cors) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    if (cors) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

function wrap(ctx, text, maxWidth) {
  const lines = [];
  String(text).split("\n").forEach((para) => {
    let line = "";
    para.split(/\s+/).filter(Boolean).forEach((word) => {
      const test = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(test).width > maxWidth) { lines.push(line); line = word; } else line = test;
    });
    lines.push(line);
  });
  return lines;
}

const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
const hardShadow = (ctx, x, y, w, h, r, dx, dy) => {
  ctx.fillStyle = "rgba(48,48,45,0.25)"; rr(ctx, x + dx, y + dy, w, h, r); ctx.fill();
  ctx.strokeStyle = "rgba(48,48,45,0.14)"; ctx.lineWidth = 1; rr(ctx, x, y, w, h, r); ctx.stroke();
};
const tilt = (ctx, cx, cy, deg, draw) => {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate((deg * Math.PI) / 180); ctx.translate(-cx, -cy); draw(); ctx.restore();
};
const tape = (ctx, cx, y, w, h, deg, color) => {
  ctx.save(); ctx.translate(cx, y + h / 2); ctx.rotate((deg * Math.PI) / 180);
  ctx.fillStyle = color; ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = "rgba(48,48,45,0.18)"; ctx.strokeRect(-w / 2, -h / 2, w, h); ctx.restore();
};

/**
 * @param {{kind: "shame"|"fame", body: string, handle?: string|null, shotTitle?: string, shotUrl?: string|null, extraShots?: number}} s
 * @returns {Promise<{blob: Blob, url: string}>}
 */
export async function renderStoryCard(s) {
  await Promise.all([
    document.fonts.load('800 38px "Indie Flower"'),
    document.fonts.load('800 26px "Instrument Sans"'),
    document.fonts.load('700 25px "Instrument Sans"'),
  ]).catch(() => {});
  const [logo, shot] = await Promise.all([loadImage(logoOnLight, true).catch(() => null), s.shotUrl ? loadImage(s.shotUrl, true).catch(() => null) : null]);

  const canvas = document.createElement("canvas");
  canvas.width = W * 2; canvas.height = H * 2;
  const ctx = canvas.getContext("2d");
  ctx.scale(2, 2);
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = LIGHT; ctx.fillRect(0, 0, W, H);

  // logo and wall name, top
  const lh = 56;
  if (logo) { const lw = (logo.naturalWidth / logo.naturalHeight) * lh || lh * 3; ctx.drawImage(logo, (W - lw) / 2, 34, lw, lh); }
  ctx.fillStyle = DARK; ctx.textAlign = "center";
  ctx.font = '800 38px "Indie Flower", cursive';
  ctx.fillText(s.kind === "fame" ? "Wall of Fame" : "Wall of Shame", W / 2, 128);

  // text card: always first under the title
  const hasShot = !!shot;
  const noText = !String(s.body ?? "").trim(); // a screenshot-only story: the words are optional
  const question = s.kind === "fame" ? "how has Asha helped you?" : "what has a client done to you?";
  const cardW = 432, cardX = (W - cardW) / 2, inner = cardW - 64;
  ctx.font = '800 26px "Instrument Sans", sans-serif';
  const qLines = wrap(ctx, question, inner);
  const bodyFont = hasShot ? '700 25px "Instrument Sans", sans-serif' : '700 38px "Indie Flower", cursive';
  const bodyLH = hasShot ? 33.75 : 46;
  ctx.font = bodyFont;
  const bLines = noText ? [] : wrap(ctx, s.body, inner);
  const headH = 30 + qLines.length * 30 + 24;
  const bodyH = 28 + bLines.length * bodyLH + 16 + 18 + 30;
  const cardH = headH + bodyH;
  const cardY = hasShot ? 176 : Math.max(176, (176 + 880 - cardH) / 2);

  tilt(ctx, W / 2, cardY + cardH / 2, -1, () => {
    hardShadow(ctx, cardX, cardY, cardW, cardH, 28, 6, 8);
    const g = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + headH);
    g.addColorStop(0, DARK); g.addColorStop(1, "#2d3f63");
    ctx.fillStyle = g; rr(ctx, cardX, cardY, cardW, headH, [28, 28, 0, 0]); ctx.fill();
    ctx.fillStyle = "#fff"; rr(ctx, cardX, cardY + headH, cardW, bodyH, [0, 0, 28, 28]); ctx.fill();
    ctx.textAlign = "center";
    ctx.fillStyle = LIGHT; ctx.font = '800 26px "Instrument Sans", sans-serif';
    qLines.forEach((l, i) => ctx.fillText(l, W / 2, cardY + 30 + 22 + i * 30));
    ctx.fillStyle = DARK; ctx.font = bodyFont;
    bLines.forEach((l, i) => ctx.fillText(l, W / 2, cardY + headH + 28 + bodyLH * 0.78 + i * bodyLH));
    const whoY = cardY + headH + 28 + bLines.length * bodyLH + 16 + 14;
    ctx.font = '700 15px "Instrument Sans", sans-serif';
    ctx.fillStyle = "rgba(28,40,62,0.75)";
    const who = s.handle ? `@${s.handle}` : "Anonymous creative";
    ctx.fillText(who, W / 2, whoY);
    if (s.handle) { const w = ctx.measureText(who).width; ctx.fillStyle = DARK; ctx.fillRect(W / 2 - w / 2, whoY + 3, w, 1.5); }
    tape(ctx, W / 2, cardY - 14, cardW * 0.34, 26, -3, "#949aa2");
  });

  // screenshot print: only the room that's left under the text card
  if (shot) {
    const more = s.extraShots || 0;
    const printW = 340, printX = (W - printW) / 2, printY = cardY + cardH + 44;
    const titleH = s.shotTitle ? 44 : 0;
    const chrome = 14 + titleH;
    const room = 880 - printY - (more ? 78 : 0);
    const imgW = printW - 14;
    // with words the picture is a small taped print; on its own it gets the room, sized to its shape so it isn't cropped
    const fitH = noText ? imgW * (shot.naturalHeight / shot.naturalWidth) : Infinity;
    const imgH = Math.max(120, Math.min(noText ? 460 : 261, room - chrome, fitH));
    const printH = chrome + imgH;
    tilt(ctx, W / 2, printY + printH / 2, -2, () => {
      ctx.fillStyle = LIGHT; hardShadow(ctx, printX, printY, printW, printH, 12, 5, 7);
      ctx.fillStyle = LIGHT; rr(ctx, printX, printY, printW, printH, 12); ctx.fill();
      if (s.shotTitle) {
        ctx.fillStyle = DARK; ctx.textAlign = "left"; ctx.font = '800 22px "Indie Flower", cursive';
        ctx.fillText(s.shotTitle, printX + 13, printY + 7 + 12 + 19, imgW - 12);
      }
      const ix = printX + 7, iy = printY + 7 + titleH;
      ctx.save(); rr(ctx, ix, iy, imgW, imgH, 7); ctx.clip();
      const scale = Math.max(imgW / shot.naturalWidth, imgH / shot.naturalHeight);
      const sw = imgW / scale, sh = imgH / scale;
      ctx.drawImage(shot, (shot.naturalWidth - sw) * 0.5, (shot.naturalHeight - sh) * 0.3, sw, sh, ix, iy, imgW, imgH);
      ctx.restore();
      tape(ctx, W / 2, printY - 11, printW * 0.36, 20, -4, DARK);
    });
    if (more) {
      const label = `+${more} more on the wall`;
      ctx.font = '700 15px "Instrument Sans", sans-serif';
      const pw = ctx.measureText(label).width + 36, py = printY + printH + 44;
      ctx.strokeStyle = DARK; ctx.lineWidth = 1.5; rr(ctx, (W - pw) / 2, py, pw, 34, 17); ctx.stroke();
      ctx.fillStyle = DARK; ctx.textAlign = "center"; ctx.fillText(label, W / 2, py + 22);
    }
  }

  // link, bottom
  ctx.fillStyle = DARK; ctx.textAlign = "center"; ctx.font = '800 22px "Indie Flower", cursive';
  ctx.fillText("asha.com.ng/wall", W / 2, H - 38);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  return { blob, url: URL.createObjectURL(blob) };
}


const PROMPT = {
  shame: { question: "what has a client done to you?", head: "Tell it how it happened.", hint: "Type it or add screenshots. Send it anonymous, or put your @handle on it. Leave out names and numbers." },
  fame: { question: "how has Asha helped you?", head: "Tell us how it went.", hint: "Type it or add a screenshot. Send it anonymous, or put your @handle on it so people can find your work." },
};

/**
 * The prompt card (1080 x 1920) people post to their story so friends send theirs. Layout B: logo and wall name at
 * the top. The link is printed on it as words; the real, tappable link goes in the caption when it is shared.
 * @param {"shame"|"fame"} kind
 */
export async function renderPromptCard(kind) {
  const p = PROMPT[kind] || PROMPT.shame;
  await Promise.all([
    document.fonts.load('800 38px "Indie Flower"'),
    document.fonts.load('700 30px "Indie Flower"'),
    document.fonts.load('800 36px "Instrument Sans"'),
  ]).catch(() => {});
  const logo = await loadImage(logoOnLight, true).catch(() => null);

  const canvas = document.createElement("canvas");
  canvas.width = W * 2; canvas.height = H * 2;
  const ctx = canvas.getContext("2d");
  ctx.scale(2, 2);
  ctx.fillStyle = LIGHT; ctx.fillRect(0, 0, W, H);

  const lh = 60;
  if (logo) { const lw = (logo.naturalWidth / logo.naturalHeight) * lh || lh * 3; ctx.drawImage(logo, (W - lw) / 2, 40, lw, lh); }
  ctx.fillStyle = DARK; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.font = '800 38px "Indie Flower", cursive';
  ctx.fillText(kind === "fame" ? "Wall of Fame" : "Wall of Shame", W / 2, 142);

  const cardW = 432, cardX = (W - cardW) / 2, cardY = 200, inner = cardW - 72;
  ctx.font = '800 36px "Instrument Sans", sans-serif';
  const qLines = wrap(ctx, p.question, inner);
  ctx.font = '700 30px "Indie Flower", cursive';
  const hLines = wrap(ctx, p.head, inner);
  ctx.font = '400 18px "Instrument Sans", sans-serif';
  const tLines = wrap(ctx, p.hint, inner);
  const headH = 44 + qLines.length * 40 + 40;
  const bodyH = 40 + hLines.length * 38 + 14 + tLines.length * 26 + 44;
  const cardH = headH + bodyH;

  tilt(ctx, W / 2, cardY + cardH / 2, -1.5, () => {
    hardShadow(ctx, cardX, cardY, cardW, cardH, 28, 6, 8);
    const g = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + headH);
    g.addColorStop(0, DARK); g.addColorStop(1, "#2d3f63");
    ctx.fillStyle = g; rr(ctx, cardX, cardY, cardW, headH, [28, 28, 0, 0]); ctx.fill();
    ctx.fillStyle = "#fff"; rr(ctx, cardX, cardY + headH, cardW, bodyH, [0, 0, 28, 28]); ctx.fill();
    ctx.textAlign = "center";
    ctx.fillStyle = LIGHT; ctx.font = '800 36px "Instrument Sans", sans-serif';
    qLines.forEach((l, i) => ctx.fillText(l, W / 2, cardY + 44 + 30 + i * 40));
    ctx.fillStyle = DARK; ctx.font = '700 30px "Indie Flower", cursive';
    hLines.forEach((l, i) => ctx.fillText(l, W / 2, cardY + headH + 40 + 26 + i * 38));
    ctx.fillStyle = "rgba(28,40,62,0.7)"; ctx.font = '400 18px "Instrument Sans", sans-serif';
    tLines.forEach((l, i) => ctx.fillText(l, W / 2, cardY + headH + 40 + hLines.length * 38 + 14 + 18 + i * 26));
    tape(ctx, W / 2, cardY - 14, cardW * 0.34, 26, -3, "#949aa2");
  });

  const label = "asha.com.ng/wall";
  ctx.font = '800 26px "Indie Flower", cursive';
  const pw = ctx.measureText(label).width + 56, ph = 56, px = (W - pw) / 2, py = cardY + cardH + 46;
  tilt(ctx, W / 2, py + ph / 2, 2, () => {
    ctx.fillStyle = "rgba(48,48,45,0.25)"; rr(ctx, px + 4, py + 6, pw, ph, 28); ctx.fill();
    ctx.fillStyle = DARK; rr(ctx, px, py, pw, ph, 28); ctx.fill();
    ctx.fillStyle = LIGHT; ctx.textAlign = "center"; ctx.fillText(label, W / 2, py + 37);
  });

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  return { blob, url: URL.createObjectURL(blob) };
}


/**
 * The live-stats card (1080 x 1920) people post to their story. Same look as the story card: logo at the top,
 * taped number cards, a navy banner with the link. The link is printed as words; the real one goes in the caption.
 * @param {{tiles: [string, string][], asOf?: string}} s  tiles are [label, number as text]
 */
export async function renderStatsCard({ tiles, asOf }) {
  await Promise.all([
    document.fonts.load('800 38px "Indie Flower"'),
    document.fonts.load('700 15px "Instrument Sans"'),
  ]).catch(() => {});
  const [logo, logoDark] = await Promise.all([loadImage(logoOnLight, true).catch(() => null), loadImage(logoOnDark, true).catch(() => null)]);

  const canvas = document.createElement("canvas");
  canvas.width = W * 2; canvas.height = H * 2;
  const ctx = canvas.getContext("2d");
  ctx.scale(2, 2);
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = LIGHT; ctx.fillRect(0, 0, W, H);

  const lh = 56;
  if (logo) { const lw = (logo.naturalWidth / logo.naturalHeight) * lh || lh * 3; ctx.drawImage(logo, (W - lw) / 2, 34, lw, lh); }

  // LIVE pill
  ctx.font = '800 14px "Instrument Sans", sans-serif';
  const pillW = ctx.measureText("LIVE").width + 18 + 36, pillX = (W - pillW) / 2, pillY = 112;
  ctx.fillStyle = DARK; rr(ctx, pillX, pillY, pillW, 30, 15); ctx.fill();
  ctx.fillStyle = LIGHT; ctx.beginPath(); ctx.arc(pillX + 18, pillY + 15, 4, 0, Math.PI * 2); ctx.fill();
  ctx.textAlign = "left"; ctx.fillText("LIVE", pillX + 30, pillY + 20);

  // title
  ctx.fillStyle = DARK; ctx.textAlign = "center"; ctx.font = '800 40px "Indie Flower", cursive';
  wrap(ctx, "How creatives are protected, live.", 440).forEach((l, i) => ctx.fillText(l, W / 2, 196 + i * 46));

  // number cards, two by two
  const cw = 224, ch = 168, gap = 24, x0 = (W - (cw * 2 + gap)) / 2, y0 = 330;
  tiles.slice(0, 4).forEach(([label, value], i) => {
    const x = x0 + (i % 2) * (cw + gap), y = y0 + Math.floor(i / 2) * (ch + 34);
    tilt(ctx, x + cw / 2, y + ch / 2, i % 2 ? 1.2 : -1.2, () => {
      hardShadow(ctx, x, y, cw, ch, 22, 5, 7);
      ctx.fillStyle = "#fff"; rr(ctx, x, y, cw, ch, 22); ctx.fill();
      ctx.fillStyle = "rgba(28,40,62,0.75)"; ctx.textAlign = "left"; ctx.font = '700 15px "Instrument Sans", sans-serif';
      wrap(ctx, label, cw - 36).slice(0, 2).forEach((l, k) => ctx.fillText(l, x + 18, y + 32 + k * 19));
      ctx.fillStyle = DARK; ctx.font = '800 62px "Indie Flower", cursive';
      ctx.fillText(value, x + 18, y + ch - 28, cw - 36);
      tape(ctx, x + cw / 2, y - 10, cw * 0.3, 20, i % 2 ? 3 : -3, "#949aa2");
    });
  });

  // banner
  const bx = 34, bw = W - 68, by = 770, bh = 112;
  ctx.fillStyle = "rgba(48,48,45,0.25)"; rr(ctx, bx + 5, by + 7, bw, bh, 26); ctx.fill();
  ctx.fillStyle = DARK; rr(ctx, bx, by, bw, bh, 26); ctx.fill();
  if (logoDark) { const bl = 40, bwid = (logoDark.naturalWidth / logoDark.naturalHeight) * bl || bl * 3; ctx.drawImage(logoDark, bx + 24, by + (bh - bl) / 2, bwid, bl); }
  ctx.fillStyle = "rgba(247,247,243,0.75)"; ctx.textAlign = "right"; ctx.font = '700 12px "Instrument Sans", sans-serif';
  ctx.fillText("LOCKED BY", bx + bw - 24, by + 44);
  ctx.fillStyle = LIGHT; ctx.font = '800 30px "Indie Flower", cursive';
  ctx.fillText("asha.com.ng/stats", bx + bw - 24, by + 82);

  if (asOf) {
    ctx.fillStyle = "rgba(28,40,62,0.7)"; ctx.textAlign = "center"; ctx.font = '700 15px "Instrument Sans", sans-serif';
    ctx.fillText(`Live numbers, ${asOf}`, W / 2, H - 38);
  }

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  return { blob, url: URL.createObjectURL(blob) };
}
