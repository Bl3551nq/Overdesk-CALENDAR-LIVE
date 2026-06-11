import fs from 'fs';
import path from 'path';
import { Jimp } from 'jimp';
import pngToIco from 'png-to-ico';

function isValidPng(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const stats = fs.statSync(filePath);
  if (stats.size < 1000) return false; // Git LFS pointers are usually < 500 bytes

  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(8);
    fs.readSync(fd, buffer, 0, 8, 0);
    fs.closeSync(fd);
    return buffer.toString('hex') === '89504e470d0a1a0a';
  } catch (err) {
    return false;
  }
}

async function downloadOriginalPng(dest) {
  const url = "https://raw.githubusercontent.com/Bl3551nq/Overdesk-Logos/main/OVERDESK-fx%20calendar.png";
  console.log(`Downloading original PNG from ${url}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buffer);
  console.log(`Downloaded original PNG successfully! Size: ${buffer.length} bytes`);
}

async function main() {
  try {
    const inputPath = path.join(process.cwd(), 'assets', 'icon.png');
    const squarePngPath = path.join(process.cwd(), 'assets', 'icon-square.png');
    const finalPngPath = path.join(process.cwd(), 'assets', 'icon.png');
    const finalIcoPath = path.join(process.cwd(), 'assets', 'icon.ico');

    if (!isValidPng(inputPath)) {
      console.log('Source assets/icon.png is missing or is not a valid PNG (likely a Git LFS pointer).');
      await downloadOriginalPng(inputPath);
    }

    console.log('Loading source PNG with Jimp...');
    let image = await Jimp.read(inputPath);
    console.log('Original dimensions:', image.width, 'x', image.height);

    // Autocrop transparent borders to maximize logo visibility on taskbar
    console.log('Autocropping transparent borders...');
    image = image.autocrop();
    console.log('Autocropped dimensions:', image.width, 'x', image.height);

    // Centering and resizing to a 256x256 canvas with optimal safety padding
    console.log('Centering and scaling up to 256x256 square with appropriate padding...');
    const resized = image.contain({ w: 232, h: 232 }).contain({ w: 256, h: 256 });

    // Save as temporary square PNG
    await resized.write(squarePngPath);
    console.log('Saved square PNG to assets/icon-square.png');

    // Replace the original icon.png with our clean, standardized 256x256 square icon.png
    fs.copyFileSync(squarePngPath, finalPngPath);
    fs.unlinkSync(squarePngPath);
    console.log('Overwrote assets/icon.png with the 256x256 standardized square PNG');

    // Generate the .ico file
    console.log('Converting standard square PNG to Windows ICO format...');
    const icoBuffer = await pngToIco(finalPngPath);
    fs.writeFileSync(finalIcoPath, icoBuffer);
    console.log('Successfully written assets/icon.ico! Size:', icoBuffer.length, 'bytes');

    console.log('Icon generation completed perfectly!');
  } catch (err) {
    console.error('Failed to generate icons:', err);
    process.exit(1);
  }
}

main();
