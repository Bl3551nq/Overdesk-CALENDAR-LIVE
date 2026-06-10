import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'assets', 'icon.png');
if (fs.existsSync(filePath)) {
  const content = fs.readFileSync(filePath);
  console.log('File size:', content.length, 'bytes');
  console.log('First 100 bytes as text:', content.slice(0, 100).toString('utf8'));
  console.log('First 8 bytes (hex):', content.slice(0, 8).toString('hex'));
} else {
  console.log('File does not exist');
}
