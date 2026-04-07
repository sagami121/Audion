const canvas = document.getElementById('colorCanvas') as HTMLCanvasElement | null;
const ctx = canvas ? canvas.getContext('2d', { willReadFrequently: true }) : null;

export interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * 
 * @param {HTMLImageElement} img 
 * @returns {Promise<RGB | null>}
 */
export async function getDominantColor(img: HTMLImageElement): Promise<RGB | null> {
  if (!canvas || !ctx || !img || !img.complete || img.naturalWidth === 0) return null;

  try {
    canvas.width = 64;
    canvas.height = 64;

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    let r = 0, g = 0, b = 0;
    let count = 0;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue;

      const pr = data[i];
      const pg = data[i + 1];
      const pb = data[i + 2];

      if ((pr < 10 && pg < 10 && pb < 10) || (pr > 245 && pg > 245 && pb > 245)) {
        continue;
      }

      r += pr;
      g += pg;
      b += pb;
      count++;
    }

    if (count === 0) return null;

    r = Math.floor(r / count);
    g = Math.floor(g / count);
    b = Math.floor(b / count);

    return boostSaturation(r, g, b);
  } catch (e) {
    console.error("Color extraction failed:", e);
    return null;
  }
}

function boostSaturation(r: number, g: number, b: number): RGB {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  s = Math.min(1, s * 1.5);
  l = Math.max(0.3, Math.min(0.7, l));

  let finalR, finalG, finalB;
  if (s === 0) {
    finalR = finalG = finalB = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    finalR = hue2rgb(p, q, h + 1 / 3);
    finalG = hue2rgb(p, q, h);
    finalB = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(finalR * 255),
    g: Math.round(finalG * 255),
    b: Math.round(finalB * 255)
  };
}

export function lightenColor(c: RGB, factor = 1.3): RGB {
  return {
    r: Math.min(255, Math.floor(c.r * factor)),
    g: Math.min(255, Math.floor(c.g * factor)),
    b: Math.min(255, Math.floor(c.b * factor))
  };
}
