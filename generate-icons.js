import fs from 'fs';
import path from 'path';
import { Jimp } from 'jimp';
import pngToIco from 'png-to-ico';

async function main() {
  try {
    const inputPath = path.join(process.cwd(), 'assets', 'icon.png');
    const squarePngPath = path.join(process.cwd(), 'assets', 'icon-square.png');
    const finalPngPath = path.join(process.cwd(), 'assets', 'icon.png');
    const finalIcoPath = path.join(process.cwd(), 'assets', 'icon.ico');

    if (!fs.existsSync(inputPath)) {
      console.error('Error: Source assets/icon.png not found!');
      process.exit(1);
    }

    console.log('Loading source PNG with Jimp...');
    const image = await Jimp.read(inputPath);
    console.log('Original dimensions:', image.width, 'x', image.height);

    // Resize the image so it fits neatly inside a transparent 256x256 square
    console.log('Centering and resizing to a 256x256 square canvas...');
    const resized = image.contain({ w: 256, h: 256 });

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
