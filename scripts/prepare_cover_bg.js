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

  // 1. Clear top year '2026' to pure white (y: 65..170, x: 40..310)
  for (let y = 65; y <= 170; y++) {
    for (let x = 40; x <= 310; x++) {
      setPixel(x, y, 255, 255, 255);
    }
  }

  // Helper to interpolate a vertical zone with horizontal feathering
  function clearZone(yTop, yBot, xLeft, xRight, feather) {
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
  }

  // 2. Clear MEDISTRA HOSPITAL: y = 745..796, x: 190..695
  clearZone(745, 796, 190, 695, 10);

  // 3. Clear PERIODE TAHUN 2026: y = 798..838, x: 190..695
  clearZone(798, 838, 190, 695, 10);

  await sharp(buf, { raw: { width, height, channels } })
    .jpeg({ quality: 98 })
    .toFile(outputPath);

  console.log('Saved perfect background to', outputPath);
}

cleanPerfect().catch(console.error);
