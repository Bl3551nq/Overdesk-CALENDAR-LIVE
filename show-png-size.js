import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'assets', 'icon.png');
if (fs.existsSync(filePath)) {
  const buf = fs.readFileSync(filePath);
  // PNG IHDR chunk starts at byte 12.
  // Width is 4 bytes at offset 16, Height is 4 bytes at offset 20.
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  console.log('PNG Details:');
  console.log('Width:', width);
  console.log('Height:', height);
  console.log('Is Square:', width === height);
} else {
  console.log('File does not exist');
}
