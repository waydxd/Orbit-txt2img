require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;
const FAL_API_URL = 'https://fal.run/fal-ai/flux-kontext-lora/text-to-image';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL;

async function verifyToken(authHeader) {
  if (!authHeader) {
    throw new Error('Missing authorization header');
  }
  if (!AUTH_SERVICE_URL) {
    throw new Error('Auth service URL not configured');
  }

  // Call the auth service verify endpoint and forward the Authorization header
  const verifyUrl = AUTH_SERVICE_URL.replace(/\/$/, '');

  try {
    const response = await axios.post(verifyUrl, null, {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    return response.status === 200 && response.data && response.data.valid === true;
  } catch (error) {
    // If the auth service returns 401, treat token as invalid
    if (error.response && error.response.status === 401) {
      return false;
    }
    throw new Error(`Auth service error: ${error.message}`);
  }
}

async function callFalApi(payload) {
  // Prefer Docker secret file if present, fall back to env var
  const secretPath = process.env.FAL_KEY_FILE || '/run/secrets/fal_key';
  let falKey = process.env.FAL_KEY || null;
  try {
    if (fs.existsSync(secretPath)) {
      falKey = fs.readFileSync(secretPath, 'utf8').trim();
    }
  } catch (err) {
    // ignore and fall back to env
  }

  if (!falKey) {
    throw new Error('FAL_KEY not configured');
  }

  const response = await axios.post(FAL_API_URL, payload, {
    headers: {
      'Authorization': `Key ${falKey}`,
      'Content-Type': 'application/json'
    },
    timeout: 120000
  });

  return response.data;
}

app.post('/v1/text-to-image', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    const isValid = await verifyToken(authHeader);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const allowedFields = [
      'prompt', 'image_size', 'num_inference_steps', 'seed',
      'guidance_scale', 'sync_mode', 'num_images', 'enable_safety_checker',
      'output_format', 'loras', 'acceleration'
    ];

    const payload = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        payload[field] = req.body[field];
      }
    }

    if (!payload.prompt) {
      return res.status(400).json({ error: 'Missing required field: prompt' });
    }

    const result = await callFalApi(payload);
    
    res.json(result);
  } catch (error) {
    console.error('Error:', error.message);
    
    if (error.message.includes('FAL_KEY')) {
      return res.status(503).json({ error: 'Service not configured' });
    }
    if (error.message.includes('Auth')) {
      return res.status(401).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Flux Kontext Lora API running on port ${PORT}`);
});