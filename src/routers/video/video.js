const router = require("koa-router")();
const path = require("path");
const fs = require("fs");

const VIDEO_GEN_URL = process.env.LOCAL_VIDEO_GEN_URL || "http://127.0.0.1:8081";
const OUTPUT_DIR = process.env.VIDEO_OUTPUT_DIR || "/tmp/lemon_video_gen/outputs";

/**
 * POST /api/video/generate
 * Proxies request to the Python FastAPI video generation server.
 */
router.post("/generate", async (ctx) => {
  const body = ctx.request.body;

  let response;
  try {
    response = await fetch(`${VIDEO_GEN_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    ctx.status = 503;
    ctx.body = { error: "Video generation service unavailable. Please run src/video_gen/install.sh to set it up." };
    return;
  }

  const data = await response.json();
  ctx.status = response.status;
  ctx.body = data;
});

/**
 * GET /api/video/output/:filename
 * Serves generated video files from the output directory.
 */
router.get("/output/:filename", async (ctx) => {
  const { filename } = ctx.params;
  // Prevent path traversal
  if (filename.includes("..") || filename.includes("/")) {
    ctx.status = 400;
    ctx.body = { error: "Invalid filename" };
    return;
  }

  const filePath = path.join(OUTPUT_DIR, filename);
  if (!fs.existsSync(filePath)) {
    ctx.status = 404;
    ctx.body = { error: "Video not found" };
    return;
  }

  ctx.type = "video/mp4";
  ctx.body = fs.createReadStream(filePath);
});

/**
 * GET /api/video/health
 * Proxies health check to the Python server.
 */
router.get("/health", async (ctx) => {
  try {
    const response = await fetch(`${VIDEO_GEN_URL}/health`);
    const data = await response.json();
    ctx.status = response.status;
    ctx.body = data;
  } catch (err) {
    ctx.status = 503;
    ctx.body = { error: "Video generation service unavailable", details: err.message };
  }
});

module.exports = router.routes();
