#!/usr/bin/env bash
# LemonAI Video Generation Setup Script
# Installs dependencies and configures systemd service for the Python video gen server.
# Tested on AMD Radeon Pro VII / MI50 (gfx906) with ROCm 6.x.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_NAME="lemonai-videogen"
OUTPUT_DIR="${VIDEO_OUTPUT_DIR:-/tmp/lemon_video_gen/outputs}"

echo "=== LemonAI Video Generation Setup ==="
echo "Script directory: ${SCRIPT_DIR}"
echo "Video output dir: ${OUTPUT_DIR}"

# ── 1. Create output directory ───────────────────────────────────────────────
mkdir -p "${OUTPUT_DIR}"
echo "✔ Output directory created: ${OUTPUT_DIR}"

# ── 2. Install PyTorch with ROCm support ─────────────────────────────────────
echo ""
echo "Installing PyTorch with ROCm 6.2 support (required for gfx906 / AMD MI50)..."
pip install --upgrade pip
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/rocm6.2

# ── 3. Install Python dependencies ───────────────────────────────────────────
echo ""
echo "Installing Python dependencies from requirements.txt..."
pip install -r "${SCRIPT_DIR}/requirements.txt"

# ── 4. Verify GPU is visible ─────────────────────────────────────────────────
echo ""
echo "Checking GPU availability..."
HSA_OVERRIDE_GFX_VERSION=9.0.6 python3 -c "
import torch
print(f'PyTorch version: {torch.__version__}')
print(f'CUDA/ROCm available: {torch.cuda.is_available()}')
if torch.cuda.is_available():
    print(f'GPU: {torch.cuda.get_device_name(0)}')
    print(f'VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB')
else:
    print('WARNING: No GPU detected. Video generation will use CPU (very slow).')
"

# ── 5. Create systemd service (optional, skip if not running as root) ─────────
if command -v systemctl &>/dev/null && [ "$(id -u)" -eq 0 ]; then
    PYTHON_BIN="$(which python3)"
    USER_NAME="${SUDO_USER:-$(logname 2>/dev/null || echo root)}"

    cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<EOF
[Unit]
Description=LemonAI Video Generation Server
After=network.target

[Service]
Type=simple
User=${USER_NAME}
WorkingDirectory=${SCRIPT_DIR}
Environment="HSA_OVERRIDE_GFX_VERSION=9.0.6"
Environment="VIDEO_OUTPUT_DIR=${OUTPUT_DIR}"
ExecStart=${PYTHON_BIN} ${SCRIPT_DIR}/server.py
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable "${SERVICE_NAME}"
    echo "✔ systemd service '${SERVICE_NAME}' installed and enabled."
    echo "  Start with: systemctl start ${SERVICE_NAME}"
    echo "  Logs:       journalctl -u ${SERVICE_NAME} -f"
else
    echo ""
    echo "Skipping systemd setup (not running as root or systemctl not available)."
    echo ""
    echo "To start the server manually, run:"
    echo "  HSA_OVERRIDE_GFX_VERSION=9.0.6 VIDEO_OUTPUT_DIR=${OUTPUT_DIR} python3 ${SCRIPT_DIR}/server.py"
    echo ""
    echo "To run as a background service without systemd:"
    cat > "${SCRIPT_DIR}/start.sh" <<'STARTEOF'
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export HSA_OVERRIDE_GFX_VERSION=9.0.6
export VIDEO_OUTPUT_DIR="${VIDEO_OUTPUT_DIR:-/tmp/lemon_video_gen/outputs}"
mkdir -p "${VIDEO_OUTPUT_DIR}"
nohup python3 "${SCRIPT_DIR}/server.py" > "${SCRIPT_DIR}/server.log" 2>&1 &
echo "Video generation server started (PID $!). Log: ${SCRIPT_DIR}/server.log"
STARTEOF
    chmod +x "${SCRIPT_DIR}/start.sh"
    echo "  ${SCRIPT_DIR}/start.sh"
fi

echo ""
echo "=== Setup complete ==="
echo "Models will be downloaded automatically from HuggingFace on first use:"
echo "  - animatediff-v3  (~8 GB VRAM)  — runwayml/stable-diffusion-v1-5 + guoyww/animatediff-motion-adapter-v1-5-3"
echo "  - wan2.1-1.3b     (~12 GB VRAM) — Wan-AI/Wan2.1-T2V-1.3B"
echo "  - cogvideox-5b    (~24 GB VRAM) — THUDM/CogVideoX-5b"
