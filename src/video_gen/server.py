import os
import sys
import uuid
import asyncio
from pathlib import Path

# Required for AMD gfx906 (MI50/Vega 20) ROCm compatibility
os.environ.setdefault("HSA_OVERRIDE_GFX_VERSION", "9.0.6")

import torch
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from contextlib import asynccontextmanager

OUTPUT_DIR = Path(os.environ.get("VIDEO_OUTPUT_DIR", "/tmp/lemon_video_gen/outputs"))
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
DTYPE = torch.float16

_pipelines: dict = {}
_pipeline_lock = asyncio.Lock()


def _load_animatediff():
    from diffusers import AnimateDiffPipeline, MotionAdapter, DDIMScheduler
    from diffusers.utils import export_to_video

    adapter = MotionAdapter.from_pretrained(
        "guoyww/animatediff-motion-adapter-v1-5-3",
        torch_dtype=DTYPE,
    )
    pipe = AnimateDiffPipeline.from_pretrained(
        "runwayml/stable-diffusion-v1-5",
        motion_adapter=adapter,
        torch_dtype=DTYPE,
    )
    pipe.scheduler = DDIMScheduler.from_config(
        pipe.scheduler.config, beta_schedule="linear"
    )
    pipe = pipe.to(DEVICE)
    pipe.enable_attention_slicing()
    return pipe, export_to_video


def _load_wan21():
    from diffusers import WanPipeline

    pipe = WanPipeline.from_pretrained(
        "Wan-AI/Wan2.1-T2V-1.3B",
        torch_dtype=DTYPE,
    )
    pipe = pipe.to(DEVICE)
    pipe.enable_attention_slicing()
    return pipe


def _load_cogvideox():
    from diffusers import CogVideoXPipeline

    pipe = CogVideoXPipeline.from_pretrained(
        "THUDM/CogVideoX-5b",
        torch_dtype=DTYPE,
    )
    pipe = pipe.to(DEVICE)
    pipe.enable_attention_slicing()
    return pipe


async def _get_pipeline(model_id: str):
    async with _pipeline_lock:
        if model_id not in _pipelines:
            loop = asyncio.get_event_loop()
            if model_id == "animatediff-v3":
                _pipelines[model_id] = await loop.run_in_executor(None, _load_animatediff)
            elif model_id == "wan2.1-1.3b":
                _pipelines[model_id] = await loop.run_in_executor(None, _load_wan21)
            elif model_id == "cogvideox-5b":
                _pipelines[model_id] = await loop.run_in_executor(None, _load_cogvideox)
            else:
                raise ValueError(f"Unknown model: {model_id}")
    return _pipelines[model_id]


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    # Unload pipelines on shutdown to free VRAM
    _pipelines.clear()
    if DEVICE == "cuda":
        torch.cuda.empty_cache()


app = FastAPI(title="LemonAI Video Generation Server", lifespan=lifespan)
app.mount("/outputs", StaticFiles(directory=str(OUTPUT_DIR)), name="outputs")


class GenerateRequest(BaseModel):
    prompt: str
    model_id: str = "animatediff-v3"
    num_frames: int = 16
    fps: int = 8
    seed: int = -1
    guidance_scale: float = 7.5
    num_inference_steps: int = 25


class GenerateResponse(BaseModel):
    video_url: str
    filename: str


@app.post("/generate", response_model=GenerateResponse)
async def generate_video(req: GenerateRequest):
    from diffusers.utils import export_to_video

    if req.seed >= 0:
        generator = torch.Generator(device=DEVICE).manual_seed(req.seed)
    else:
        generator = None

    filename = f"{uuid.uuid4()}.mp4"
    output_path = OUTPUT_DIR / filename

    try:
        pipeline_data = await _get_pipeline(req.model_id)

        loop = asyncio.get_event_loop()

        if req.model_id == "animatediff-v3":
            pipe, _etv = pipeline_data

            def run():
                result = pipe(
                    prompt=req.prompt,
                    num_frames=req.num_frames,
                    guidance_scale=req.guidance_scale,
                    num_inference_steps=req.num_inference_steps,
                    generator=generator,
                )
                export_to_video(result.frames[0], str(output_path), fps=req.fps)

            await loop.run_in_executor(None, run)

        elif req.model_id == "wan2.1-1.3b":
            pipe = pipeline_data

            def run():
                result = pipe(
                    prompt=req.prompt,
                    num_frames=req.num_frames,
                    guidance_scale=req.guidance_scale,
                    num_inference_steps=req.num_inference_steps,
                    generator=generator,
                )
                export_to_video(result.frames[0], str(output_path), fps=req.fps)

            await loop.run_in_executor(None, run)

        elif req.model_id == "cogvideox-5b":
            pipe = pipeline_data

            def run():
                result = pipe(
                    prompt=req.prompt,
                    num_videos_per_prompt=1,
                    num_inference_steps=req.num_inference_steps,
                    num_frames=req.num_frames,
                    guidance_scale=req.guidance_scale,
                    generator=generator,
                )
                export_to_video(result.frames[0], str(output_path), fps=req.fps)

            await loop.run_in_executor(None, run)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return GenerateResponse(
        video_url=f"/api/video/output/{filename}",
        filename=filename,
    )


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "device": DEVICE,
        "loaded_models": list(_pipelines.keys()),
        "gfx_override": os.environ.get("HSA_OVERRIDE_GFX_VERSION"),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8081, log_level="info")
