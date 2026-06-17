import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const getLicenseFilePath = () => {
    return path.join(os.homedir(), '.overdesk_license.json');
  };

  const saveLicenseLocally = (licenseKey: string) => {
    try {
      const filePath = getLicenseFilePath();
      fs.writeFileSync(filePath, JSON.stringify({
        license_key: licenseKey,
        verified_at: new Date().toISOString()
      }, null, 2), 'utf8');
    } catch (writeErr) {
      console.error('Failed to save license locally:', writeErr);
    }
  };

  // API Route: Get local license verification status at startup
  app.get('/api/license/status', (req, res) => {
    try {
      const filePath = getLicenseFilePath();
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(fileContent);
        if (parsed && parsed.license_key) {
          return res.json({
            success: true,
            key: parsed.license_key
          });
        }
      }
      return res.json({ success: false });
    } catch (err) {
      console.error('Error reading persistent license configuration:', err);
      return res.json({ success: false });
    }
  });

  // API Route: Deactivate license (deletes file backup)
  app.post('/api/license/deactivate', (req, res) => {
    try {
      const filePath = getLicenseFilePath();
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.json({ success: true, message: 'License deactivated locally.' });
    } catch (err) {
      console.error('Error removing persistent license file:', err);
      return res.status(500).json({ success: false, error: 'Failed to deactivate license on disk.' });
    }
  });

  // API Route: Verify license
  app.post('/api/license/verify', async (req, res) => {
    const { key } = req.body;
    if (!key) {
      return res.status(400).json({ success: false, error: 'License key is required.' });
    }

    const sanitizedKey = key.trim();
    const cleanKey = sanitizedKey.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

    // Unique 32-character test key (clean alphanumeric)
    const uniqueTestKey = 'OVERDESKFXCALENG26KPOWER77777777'; // OVERDESK-FXCALENG-26KPOWER-77777777

    if (cleanKey === uniqueTestKey) {
      saveLicenseLocally(sanitizedKey);
      return res.json({
        success: true,
        message: 'License key validated successfully!',
        licenseType: 'Testing License'
      });
    }

    try {
      // Real Gumroad API call
      const response = await fetch('https://api.gumroad.com/v2/licenses/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_permalink: 'ILe-vFDDL-fYyDeKroOQXw==',
          license_key: sanitizedKey,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.purchase && (data.purchase.refunded || data.purchase.chargebacked)) {
          return res.status(400).json({
            success: false,
            error: 'This license has been refunded or chargebacked and is no longer active.'
          });
        }

        saveLicenseLocally(sanitizedKey);
        return res.json({
          success: true,
          message: 'License key validated successfully!',
          licenseType: 'Gumroad Premium License'
        });
      } else {
        return res.status(400).json({
          success: false,
          error: data.message || 'Invalid Gumroad license key. Please check your purchase receipt.'
        });
      }
    } catch (err) {
      console.error('Gumroad verification server error:', err);
      return res.status(500).json({
        success: false,
        error: 'Unable to connect to Gumroad license verification server. Please try again.'
      });
    }
  });

  // Serve static dist in production, use Vite middleware in dev
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const rootPath = process.env.ELECTRON_APP_PATH || process.cwd();
    const distPath = path.join(rootPath, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
