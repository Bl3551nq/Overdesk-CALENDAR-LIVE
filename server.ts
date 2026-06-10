import express from 'express';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Verify license
  app.post('/api/license/verify', async (req, res) => {
    const { key } = req.body;
    if (!key) {
      return res.status(400).json({ success: false, error: 'License key is required.' });
    }

    const sanitizedKey = key.trim();
    const cleanKey = sanitizedKey.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

    // 32-character test keys (clean alphanumeric)
    const testCleanKey1 = 'TESTOVERDESKACTIVELICENSEKEY32CH'; // TESTOVER-DESKACTI-VELICENS-EKEY32CH
    const testCleanKey2 = 'GUMROADTESTACTIVELICENSE32CH';

    if (cleanKey === testCleanKey1 || cleanKey === testCleanKey2) {
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
