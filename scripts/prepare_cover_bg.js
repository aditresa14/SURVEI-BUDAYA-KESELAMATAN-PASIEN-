const sharp = require('sharp');
const path = require('path');

async function cleanPerfect() {
  const inputPath = path.join(__dirname, '..', 'public', 'cover_report_template.jpg');
  const outputPath = path.join(__dirname, '..', 'public', 'cover_report_bg.jpg');

  const { data, info } = await sharp(inputPath).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const buf = Buffer.from(data);

  function getPixel(x, y) {
    const idx = (y * width + x) * channels;
    return [buf[idx], buf[idx+1], buf[idx+2]];
  }

  function setPixel(x, y, r, g, b) {
    const idx = (y * width + x) * channels;
    buf[idx] = r;
    buf[idx+1] = g;
    buf[idx+2] = b;
  }

  // 1. Clear top year '2026' to pure white
  for (let y = 60; y <= 150; y++) {
    for (let x = 40; x <= 300; x++) {
      setPixel(x, y, 255, 255, 255);
    }
  }

  // 2. Clear bottom text vertically with smooth interpolation and horizontal feathering
  const yTop = 758;
  const yBot = 855;
  const xLeft = 215;
  const xRight = 685;
  const feather = 10;

  for (let x = xLeft; x <= xRight; x++) {
    let weight = 1;
    if (x < xLeft + feather) {
      weight = (x - xLeft) / feather;
    } else if (x > xRight - feather) {
      weight = (xRight - x) / feather;
    }

    const pTop = getPixel(x, yTop);
    const pBot = getPixel(x, yBot);

    for (let y = yTop + 1; y < yBot; y++) {
      const t = (y - yTop) / (yBot - yTop);
      const orig = getPixel(x, y);

      const interpR = pTop[0] * (1 - t) + pBot[0] * t;
      const interpG = pTop[1] * (1 - t) + pBot[1] * t;
      const interpB = pTop[2] * (1 - t) + pBot[2] * t;

      const finalR = Math.round(orig[0] * (1 - weight) + interpR * weight);
      const finalG = Math.round(orig[1] * (1 - weight) + interpG * weight);
      const finalB = Math.round(orig[2] * (1 - weight) + interpB * weight);

      setPixel(x, y, finalR, finalG, finalB);
    }
  }

  await sharp(buf, { raw: { width, height, channels } })
    .jpeg({ quality: 98 })
    .toFile(outputPath);

  console.log('Saved perfect background to', outputPath);
}

cleanPerfect().catch(console.error);
