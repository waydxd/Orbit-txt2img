# Flux Kontext Lora API Adaptor

Middleware API adaptor for the FLUX.1 Kontext [dev] model with LoRA support.

## Overview

This service acts as a secure API middleware that:
- Authenticates incoming requests via a remote auth service
- Forwards validated requests to the fal.ai flux-kontext-lora endpoint
- Returns generated images to clients

## Endpoint

- **API Endpoint**: `POST /v1/text-to-image`
- **Health Check**: `GET /health`
- **Default Port**: `8080`

## Authentication

All requests must include an `Authorization` header with a Bearer token:

```bash
curl -X POST http://localhost:8080/v1/text-to-image \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Your prompt here"}'
```

The middleware verifies the token with the remote auth service before processing requests.

## Request Schema

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `prompt` | string | Yes | - | The prompt to generate the image with |
| `image_size` | string | No | `landscape_4_3` | Image size (e.g., `landscape_4_3`, `portrait_16_9`) |
| `num_inference_steps` | integer | No | `30` | Inference steps (10-50) |
| `seed` | integer | No | random | Seed for reproducible results |
| `guidance_scale` | float | No | `2.5` | CFG scale (0-20) |
| `sync_mode` | boolean | No | `false` | Return image as data URI |
| `num_images` | integer | No | `1` | Number of images (1-4) |
| `enable_safety_checker` | boolean | No | `true` | Enable safety checker |
| `output_format` | string | No | `png` | Output format (`png` or `jpeg`) |
| `loras` | array | No | `[]` | LoRA weights array |
| `acceleration` | string | No | `none` | Speed (`none`, `regular`, `high`) |

### Example Request

```json
{
  "prompt": "Mount Fuji with cherry blossoms, clear sky, peaceful spring day",
  "image_size": "landscape_4_3",
  "num_inference_steps": 30,
  "guidance_scale": 2.5,
  "num_images": 1,
  "output_format": "png"
}
```

### Example Response

```json
{
  "images": [
    {
      "height": 768,
      "url": "https://storage.googleapis.com/...",
      "content_type": "image/png",
      "width": 1024
    }
  ],
  "prompt": "Mount Fuji with cherry blossoms...",
  "seed": 12345,
  "has_nsfw_concepts": [false]
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FAL_KEY` | Yes | API key from fal.ai |
| `AUTH_SERVICE_URL` | Yes | Remote auth service URL for token verification |
| `PORT` | No | Server port (default: 8080) |

## Docker

### Build

```bash
docker build -t flux-kontext-lora-api .
```

### Run

```bash
docker run -d \
  -p 8080:8080 \
  -e FAL_KEY=your_fal_key \
  -e AUTH_SERVICE_URL=https://auth.example.com/verify \
  --name flux-api flux-kontext-lora-api
```

### Pull from GHCR

```bash
docker pull ghcr.io/${{ github.repository }}/latest
```

## GitHub Actions

The workflow builds and pushes the Docker image to GHCR on:
- Push to `main` branch
- New version tags (`v*`)

**Supported architectures**: x86-64 (amd64), ARM64 (arm64)

## Development

```bash
npm install
npm run dev
```

## Quick test

Use this simple `curl` to quickly verify the service is running and responding:

```bash
curl -X POST http://localhost:8080/v1/text-to-image \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Test prompt","num_images":1}'
```

The endpoint will return a JSON response with image metadata or an error.

## License

AGPL-3.0
