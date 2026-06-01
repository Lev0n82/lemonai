<template>
  <div class="media-studio">
    <!-- Header -->
    <div class="studio-header">
      <h2 class="studio-title">🎬 Multimedia Studio</h2>
      <p class="studio-subtitle">Generate images and videos using local AI models</p>
    </div>

    <!-- Type Filter Tabs -->
    <div class="type-filter">
      <button
        v-for="tab in typeTabs"
        :key="tab.value"
        :class="['tab-btn', { active: activeType === tab.value }]"
        @click="activeType = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Generation Form -->
    <div class="generation-card">
      <!-- Model Selector -->
      <div class="form-row">
        <label class="form-label">Model</label>
        <a-select
          v-model:value="selectedModel"
          style="width: 100%"
          placeholder="Choose a model..."
          :options="modelOptions"
        />
      </div>

      <!-- Prompt -->
      <div class="form-row">
        <label class="form-label">Prompt</label>
        <a-textarea
          v-model:value="prompt"
          placeholder="Describe what you want to generate..."
          :rows="4"
          :maxlength="500"
          show-count
        />
      </div>

      <!-- Params -->
      <div class="form-row params-row">
        <div class="param-item">
          <label class="form-label">Steps</label>
          <a-input-number v-model:value="params.steps" :min="1" :max="100" style="width: 100%" />
        </div>
        <div class="param-item" v-if="isVideoType">
          <label class="form-label">FPS</label>
          <a-input-number v-model:value="params.fps" :min="4" :max="30" style="width: 100%" />
        </div>
        <div class="param-item" v-if="isVideoType">
          <label class="form-label">Frames</label>
          <a-input-number v-model:value="params.num_frames" :min="8" :max="64" style="width: 100%" />
        </div>
      </div>

      <a-button
        type="primary"
        size="large"
        class="generate-btn"
        @click="generate"
        :loading="generating"
        :disabled="!selectedModel || !prompt.trim()"
      >
        {{ generating ? 'Generating...' : `Generate ${isVideoType ? 'Video' : 'Image'}` }}
      </a-button>

      <a-alert
        v-if="errorMsg"
        type="error"
        :message="errorMsg"
        closable
        @close="errorMsg = ''"
        style="margin-top: 12px"
      />

      <a-alert
        v-if="statusMsg"
        type="info"
        :message="statusMsg"
        style="margin-top: 12px"
      />
    </div>

    <!-- No models message -->
    <div v-if="filteredModels.length === 0" class="no-models">
      <p>No {{ activeType === 'all' ? 'multimedia' : activeType }} models configured.</p>
      <p>Add video or image models in <a href="/setting/model-service">Settings → Model Service</a>.</p>
    </div>

    <!-- Output Gallery -->
    <div class="gallery" v-if="outputs.length > 0">
      <div class="gallery-header">
        <h3>Gallery ({{ outputs.length }})</h3>
        <a-button size="small" danger @click="clearGallery">Clear All</a-button>
      </div>
      <div class="gallery-grid">
        <div v-for="output in outputs" :key="output.id" class="gallery-item">
          <div class="media-wrapper">
            <video
              v-if="output.type === 'video'"
              :src="output.url"
              controls
              class="media-output"
            />
            <img v-else :src="output.url" class="media-output" :alt="output.prompt" />
          </div>
          <div class="item-info">
            <div class="item-prompt" :title="output.prompt">{{ output.prompt }}</div>
            <div class="item-meta">
              <span class="item-model">{{ output.modelName }}</span>
              <a :href="output.url" :download="output.filename" class="download-btn">↓ Download</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'

const typeTabs = [
  { label: 'All Media', value: 'all' },
  { label: '🎥 Video', value: 'video' },
  { label: '🖼️ Image', value: 'image' },
]

const activeType = ref('all')
const selectedModel = ref(null)
const prompt = ref('')
const generating = ref(false)
const errorMsg = ref('')
const statusMsg = ref('')
const outputs = ref([])

const params = ref({
  steps: 20,
  fps: 8,
  num_frames: 16,
})

const allModels = ref([])

const baseURL = import.meta.env.VITE_SERVICE_URL || 'http://localhost:3000'

onMounted(() => {
  loadModels()
  loadGallery()
})

async function loadModels() {
  try {
    const res = await fetch(`${baseURL}/api/model/enabled`)
    const data = await res.json()
    const list = Array.isArray(data) ? data : (data.data || data.list || data.models || [])
    allModels.value = list.filter(m => {
      const types = Array.isArray(m.model_types)
        ? m.model_types
        : (() => { try { return JSON.parse(m.model_types || '[]') } catch { return [] } })()
      return types.includes('video') || types.includes('image')
    })
  } catch {
    // fallback to localStorage cache
    try {
      const raw = localStorage.getItem('modelList')
      if (raw) {
        const list = JSON.parse(raw)
        allModels.value = list.filter(m => {
          const types = Array.isArray(m.model_types)
            ? m.model_types
            : (() => { try { return JSON.parse(m.model_types || '[]') } catch { return [] } })()
          return types.includes('video') || types.includes('image')
        })
      }
    } catch { allModels.value = [] }
  }
}

const filteredModels = computed(() => {
  if (activeType.value === 'all') return allModels.value
  return allModels.value.filter(m => {
    const types = m.model_types || []
    return types.includes(activeType.value)
  })
})

const modelOptions = computed(() =>
  filteredModels.value.map(m => ({
    value: m.id,
    label: m.model_name || m.name,
  }))
)

const selectedModelObj = computed(() =>
  allModels.value.find(m => m.id === selectedModel.value)
)

const isVideoType = computed(() => {
  if (!selectedModelObj.value) return activeType.value !== 'image'
  return (selectedModelObj.value.model_types || []).includes('video')
})

async function generate() {
  if (!selectedModel.value || !prompt.value.trim()) return
  generating.value = true
  errorMsg.value = ''
  statusMsg.value = 'Submitting generation request... (this may take several minutes)'
  try {
    const res = await fetch(`${baseURL}/api/video/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model_id: selectedModelObj.value?.model_id || selectedModel.value,
        prompt: prompt.value.trim(),
        steps: params.value.steps,
        fps: params.value.fps,
        num_frames: params.value.num_frames,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `HTTP ${res.status}`)
    }

    const data = await res.json()
    statusMsg.value = ''

    if (data.output_file) {
      const fileUrl = `${baseURL}/api/video/output/${data.output_file}`
      const newOutput = {
        id: Date.now(),
        type: 'video',
        url: fileUrl,
        filename: data.output_file,
        prompt: prompt.value.trim(),
        modelName: selectedModelObj.value?.model_name || selectedModel.value,
        createdAt: new Date().toISOString(),
      }
      outputs.value.unshift(newOutput)
      saveGallery()
      message.success('Generation complete!')
    }
  } catch (e) {
    statusMsg.value = ''
    errorMsg.value = e.message || 'Generation failed'
  } finally {
    generating.value = false
  }
}

function saveGallery() {
  try {
    localStorage.setItem('mediaGallery', JSON.stringify(outputs.value.slice(0, 50)))
  } catch {}
}

function loadGallery() {
  try {
    const saved = localStorage.getItem('mediaGallery')
    if (saved) outputs.value = JSON.parse(saved)
  } catch {}
}

function clearGallery() {
  outputs.value = []
  localStorage.removeItem('mediaGallery')
}
</script>

<style scoped>
.media-studio {
  padding: 24px;
  max-width: 900px;
  margin: 0 auto;
  overflow-y: auto;
}

.studio-header {
  margin-bottom: 20px;
}

.studio-title {
  font-size: 22px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 6px;
}

.studio-subtitle {
  color: #666;
  margin: 0;
  font-size: 14px;
}

.type-filter {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 6px 18px;
  border: 1.5px solid #d9d9d9;
  border-radius: 20px;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
  color: #555;
  transition: all 0.2s;
}

.tab-btn:hover {
  border-color: #4096ff;
  color: #4096ff;
}

.tab-btn.active {
  border-color: #4096ff;
  background: #e8f4ff;
  color: #4096ff;
  font-weight: 600;
}

.generation-card {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.form-row {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 6px;
}

.params-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.param-item {
  flex: 1;
  min-width: 100px;
}

.generate-btn {
  width: 100%;
  height: 44px;
  font-size: 15px;
  border-radius: 8px;
}

.no-models {
  text-align: center;
  padding: 40px;
  color: #888;
  background: #fafafa;
  border-radius: 12px;
  border: 1px dashed #d9d9d9;
}

.no-models a {
  color: #4096ff;
}

.gallery {
  margin-top: 8px;
}

.gallery-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.gallery-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.gallery-item {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.media-wrapper {
  background: #000;
  aspect-ratio: 16/9;
  display: flex;
  align-items: center;
  justify-content: center;
}

.media-output {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.item-info {
  padding: 10px 12px;
}

.item-prompt {
  font-size: 12px;
  color: #555;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 6px;
}

.item-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-model {
  font-size: 11px;
  color: #999;
  background: #f5f5f5;
  padding: 2px 8px;
  border-radius: 10px;
}

.download-btn {
  font-size: 12px;
  color: #4096ff;
  text-decoration: none;
}

.download-btn:hover {
  text-decoration: underline;
}
</style>
