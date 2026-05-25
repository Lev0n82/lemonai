<template>
  <div class="qa-workbench">
    <section class="hero-card">
      <div>
        <p class="eyebrow">QA / Test</p>
        <h1>ABT Test Workbench</h1>
        <p class="subtitle">
          Turn English test notes into structured Action-Based Testing cases, then execute them in a real browser through LemonAI when requested.
        </p>
      </div>
      <div class="hero-meta">
        <span>ABT only</span>
        <span>Real browser execution</span>
        <span>Human-in-the-loop bug triage</span>
      </div>
    </section>

    <section class="composer-card">
      <label class="field field-large">
        <span>Freeform QA instruction</span>
        <textarea
          v-model="instructionText"
          placeholder="Lets create an automated test of launching a browser, navigate to https://stage.opensims.tcu.gov.on.ca, select Sign in, allow me to authenticate, then test call pages and all PBI reports including all tabs."
          rows="6"
        />
      </label>

      <div class="field-grid">
        <label class="field">
          <span>Module name</span>
          <input v-model="moduleName" type="text" placeholder="Customer login smoke" />
        </label>

        <label class="field">
          <span>Target URL or environment note</span>
          <input
            v-model="targetUrl"
            list="qa-url-history"
            type="text"
            placeholder="https://app.example.com/login or QA env behind SSO"
            @blur="rememberTargetUrl"
          />
          <datalist id="qa-url-history">
            <option v-for="url in urlHistory" :key="url" :value="url" />
          </datalist>
        </label>
      </div>

      <label class="field field-large">
        <span>English test statements</span>
        <textarea
          v-model="rawStatements"
          placeholder="1. User logs in with valid credentials and should land on the dashboard.&#10;2. User enters an invalid password and should see an error message.&#10;3. User opens profile settings and should see saved account details."
          rows="10"
        />
      </label>

      <div class="action-row">
        <button class="secondary-btn" type="button" @click="generateCases">
          Structure Test Cases
        </button>
        <button class="secondary-btn" type="button" @click="openCredentialModal">
          Credentials & Env
        </button>
        <button class="primary-btn" type="button" :disabled="!testCases.length || isExecuting" @click="executeInBrowser">
          {{ isExecuting ? 'Launching Execution...' : 'Execute in Real Browser' }}
        </button>
      </div>
    </section>

    <section v-if="testCases.length" class="table-card">
      <div class="table-header">
        <div>
          <h2>Requirement-Based Test Conditions</h2>
          <p>Each atomic requirement is mapped to explicit action and assertion steps.</p>
        </div>
        <div class="table-summary">
          <span>{{ uniqueRequirementCount }} atomic requirements</span>
          <span>{{ testCases.length }} mapped steps</span>
          <span>{{ uniqueModuleTypes }}</span>
        </div>
      </div>

      <div v-if="exportArtifact" class="export-card">
        <div>
          <p class="export-title">Downloadable test case file</p>
          <p class="export-copy">{{ exportArtifact.fileName }} saved in {{ exportArtifact.directoryPath }}</p>
          <p class="export-location">Automated test cases location: {{ exportArtifact.automatedTestCaseLocation }}</p>
          <p v-if="exportArtifact.executorRelativePath" class="export-location">Executor update path: {{ exportArtifact.executorRelativePath }}</p>
        </div>
        <a href="#" class="download-link" @click.prevent="downloadExportArtifact">Download file</a>
      </div>

      <p v-if="exportStatus" class="export-status">{{ exportStatus }}</p>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Requirement Source</th>
              <th>Requirement Details</th>
              <th>Test Case Name</th>
              <th>Preconditions</th>
              <th>Test case description</th>
              <th>test step number</th>
              <th>test step description</th>
              <th>test step expected results</th>
              <th>comments</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="testCase in testCases" :key="`${testCase.testCaseName}-${testCase.testStepNumber}-${testCase.requirementDetails}`">
              <td>{{ testCase.requirementSource }}</td>
              <td>{{ testCase.requirementDetails }}</td>
              <td>{{ testCase.testCaseName }}</td>
              <td>{{ testCase.preconditions }}</td>
              <td>{{ testCase.testCaseDescription }}</td>
              <td>{{ testCase.testStepNumber }}</td>
              <td>{{ testCase.testStepDescription }}</td>
              <td>{{ testCase.testStepExpectedResults }}</td>
              <td>{{ testCase.comments }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="showCredentialModal" class="modal-backdrop" @click.self="closeCredentialModal">
      <div class="credential-modal">
        <div class="modal-header">
          <div>
            <p class="eyebrow">Credential Setup</p>
            <h2>Save Authentication Values</h2>
          </div>
          <button class="icon-btn" type="button" @click="closeCredentialModal">×</button>
        </div>

        <p class="modal-copy">
          LemonAI will keep only the environment variable names in the execution prompt. The values you enter here are saved to the workspace `.env` file.
        </p>

        <div class="credential-grid">
          <label class="field">
            <span>Username env key</span>
            <input v-model="credentials.usernameKey" type="text" placeholder="QA_STAGE_USERNAME" />
          </label>
          <label class="field">
            <span>Username</span>
            <input v-model="credentials.usernameValue" type="text" placeholder="tester@example.com" />
          </label>
          <label class="field">
            <span>Password env key</span>
            <input v-model="credentials.passwordKey" type="text" placeholder="QA_STAGE_PASSWORD" />
          </label>
          <label class="field">
            <span>Password</span>
            <input v-model="credentials.passwordValue" type="password" placeholder="Password" />
          </label>
          <label class="field field-full">
            <span>Extra note or MFA variable</span>
            <input v-model="credentials.extraValue" type="text" placeholder="Optional: QA_STAGE_AUTH_NOTE=Ask user to complete MFA in visible browser" />
          </label>
        </div>

        <p v-if="credentialStatus" class="credential-status">{{ credentialStatus }}</p>

        <div class="action-row">
          <button class="secondary-btn" type="button" @click="closeCredentialModal">Cancel</button>
          <button class="primary-btn" type="button" :disabled="isSavingCredentials" @click="saveCredentials">
            {{ isSavingCredentials ? 'Saving...' : 'Save to .env' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useChatStore } from '@/store/modules/chat'
import seeAgent from '@/services/see-agent'
import http from '@/utils/http'
import fileUtils from '@/utils/file'

const router = useRouter()
const chatStore = useChatStore()

const instructionText = ref('')
const moduleName = ref('')
const targetUrl = ref('')
const rawStatements = ref('')
const testCases = ref([])
const requirementItems = ref([])
const isExecuting = ref(false)
const showCredentialModal = ref(false)
const isSavingCredentials = ref(false)
const credentialStatus = ref('')
const credentialAvailability = ref({
  checked: false,
  presentKeys: [],
  missingKeys: [],
})
const exportArtifact = ref(null)
const exportStatus = ref('')
const credentials = ref({
  usernameKey: 'QA_STAGE_USERNAME',
  usernameValue: '',
  passwordKey: 'QA_STAGE_PASSWORD',
  passwordValue: '',
  extraValue: 'QA_STAGE_AUTH_NOTE=Allow user to complete authentication in the visible browser before continuing.',
})
const URL_HISTORY_KEY = 'qaTargetUrlHistory'
const urlHistory = ref(loadUrlHistory())

function loadUrlHistory() {
  try {
    const raw = localStorage.getItem(URL_HISTORY_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string' && item.trim()) : []
  } catch (error) {
    return []
  }
}

function persistUrlHistory(nextUrls) {
  urlHistory.value = nextUrls
  localStorage.setItem(URL_HISTORY_KEY, JSON.stringify(nextUrls))
}

function rememberTargetUrl() {
  const normalized = targetUrl.value.trim()

  if (!normalized) {
    return
  }

  const deduped = [normalized, ...urlHistory.value.filter((item) => item !== normalized)].slice(0, 12)
  persistUrlHistory(deduped)
}

watch(targetUrl, (value) => {
  if (value && urlHistory.value.includes(value.trim())) {
    targetUrl.value = value.trim()
  }
})

function cleanLine(line) {
  return line.replace(/^(\d+[.)-]?\s*|[-*]\s*)/, '').trim()
}

function normalizeSentence(line) {
  return cleanLine(line)
    .replace(/^lets?\s+/i, '')
    .replace(/^create\s+/i, '')
    .replace(/^an automated test of\s+/i, '')
    .trim()
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function classifyModuleType(statement) {
  const text = statement.toLowerCase()

  if (/login|sign in|register|checkout|purchase|payment|submit|onboard/.test(text)) {
    return 'business flow'
  }

  if (/button|modal|dropdown|tooltip|layout|page|screen|menu|dialog/.test(text)) {
    return 'user interface'
  }

  if (/file|upload|download|import|export|csv|pdf|save data/.test(text)) {
    return 'data handling'
  }

  if (/permission|role|auth|unauthorized|security|password|session/.test(text)) {
    return 'security'
  }

  return 'feature'
}

function deriveCaseTitle(statement) {
  const normalized = statement
    .replace(/\bshould\b.*$/i, '')
    .replace(/\bthen\b.*$/i, '')
    .trim()

  return normalized || statement.trim()
}

function deriveAction(statement) {
  const normalized = statement
    .replace(/\bshould\b.*$/i, '')
    .replace(/\bthen\b.*$/i, '')
    .trim()

  const actionSource = normalized || statement
  const slug = slugify(actionSource.split(' ').slice(0, 6).join(' ')) || 'execute_scenario'
  return slug.startsWith('check_') ? `perform_${slug}` : slug
}

function deriveCheck(statement) {
  const shouldMatch = statement.match(/\bshould\b\s+(.+)$/i)
  const expectation = shouldMatch?.[1]?.trim() || statement.trim()
  const slug = slugify(expectation.split(' ').slice(0, 8).join(' ')) || 'expected_result'
  return `check_${slug}`
}

function deriveDataNotes(statement) {
  const quoted = statement.match(/"([^"]+)"|'([^']+)'/g)
  if (quoted?.length) {
    return quoted.join(', ')
  }

  if (/invalid|empty|null|missing|expired|blocked/i.test(statement)) {
    return 'negative path'
  }

  if (/valid|successful|happy path/i.test(statement)) {
    return 'positive path'
  }

  return 'standard variation'
}

function deriveCondition(statement) {
  const text = statement.toLowerCase()

  if (/authenticate|sign in|login/.test(text)) {
    return 'authenticated access is available'
  }

  if (/pbi|power bi|report/.test(text)) {
    return 'report data is available in the target environment'
  }

  if (/tab/.test(text)) {
    return 'target page exposes multiple tabs'
  }

  return 'page is reachable in the requested environment'
}

function derivePrecondition(statement) {
  const text = statement.toLowerCase()

  if (/authenticate|sign in|login/.test(text)) {
    return 'user provides valid stage credentials in the visible browser'
  }

  if (/pbi|power bi|report/.test(text)) {
    return 'user is signed in and report pages are accessible'
  }

  return 'browser session is open and target URL is available'
}

function expandInstructionToStatements(text) {
  const normalized = text
    .replace(/\bthen\b/gi, '\n')
    .replace(/\band\b\s+test/gi, '\ntest')
    .replace(/,\s*/g, '\n')
    .split('\n')
    .map(normalizeSentence)
    .filter(Boolean)

  if (!normalized.length) {
    return []
  }

  const expanded = []

  normalized.forEach((statement) => {
    expanded.push(statement)

    if (/all pbi reports/i.test(statement)) {
      expanded.push('Review each PBI report and confirm the report loads without application errors')
    }

    if (/including all tabs|all tabs/i.test(statement)) {
      expanded.push('Open every tab within each PBI report and confirm each tab renders visible data')
    }
  })

  return [...new Set(expanded)]
}

function deriveExpectation(statement) {
  const shouldMatch = statement.match(/\bshould\b\s+(.+)$/i)
  return shouldMatch?.[1]?.trim() || `The system satisfies the requirement: ${statement.trim()}`
}

function deriveActionStep(statement) {
  const normalized = statement
    .replace(/\bshould\b.*$/i, '')
    .replace(/\bthen\b.*$/i, '')
    .trim()

  return normalized || `Perform the business action needed for: ${statement.trim()}`
}

function buildRequirementItems() {
  const freeformStatements = expandInstructionToStatements(instructionText.value)
    .map((statement) => ({ requirementSource: 'Freeform QA instruction', requirementDetails: statement }))
  const explicitStatements = rawStatements.value
    .split('\n')
    .map(cleanLine)
    .filter(Boolean)
    .map((statement) => ({ requirementSource: 'English test statements', requirementDetails: statement }))

  const uniqueMap = new Map()

  ;[...freeformStatements, ...explicitStatements].forEach((item) => {
    const key = `${item.requirementSource}::${item.requirementDetails}`
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, item)
    }
  })

  return [...uniqueMap.values()]
}

function buildCasesFromRequirements(requirements) {
  return requirements.flatMap((item, index) => {
    const testCaseId = `TC-${String(index + 1).padStart(3, '0')}`
    const requirementDetails = item.requirementDetails
    const moduleType = classifyModuleType(requirementDetails)
    const actionStep = deriveActionStep(requirementDetails)
    const expectedResult = deriveExpectation(requirementDetails)
    const comments = `${moduleType}; ${deriveDataNotes(requirementDetails)}; condition: ${deriveCondition(requirementDetails)}`
    const testCaseName = `${testCaseId} ${deriveCaseTitle(requirementDetails)}`
    const testCaseDescription = `Validate that the atomic requirement is fulfilled through explicit action and assertion steps.`
    const preconditions = derivePrecondition(requirementDetails)

    return [
      {
        requirementSource: item.requirementSource,
        requirementDetails,
        testCaseName,
        preconditions,
        testCaseDescription,
        testStepNumber: 1,
        testStepDescription: actionStep,
        testStepExpectedResults: 'The directed action completes successfully and the workflow reaches the intended state.',
        comments,
        moduleType,
      },
      {
        requirementSource: item.requirementSource,
        requirementDetails,
        testCaseName,
        preconditions,
        testCaseDescription,
        testStepNumber: 2,
        testStepDescription: `Assert ${deriveCheck(requirementDetails)} after performing the directed action.`,
        testStepExpectedResults: expectedResult,
        comments,
        moduleType,
      },
    ]
  })
}

async function exportTestCases() {
  if (!testCases.value.length) {
    exportArtifact.value = null
    exportStatus.value = ''
    return
  }

  try {
    const result = await http.post('/api/qa/test-cases', {
      rows: testCases.value,
      moduleName: moduleName.value.trim() || 'qa_test_module',
      targetUrl: targetUrl.value.trim(),
    })

    exportArtifact.value = result?.filePath ? result : result?.data || null
    exportStatus.value = exportArtifact.value?.filePath
      ? `Saved ${exportArtifact.value.rowCount} rows to ${exportArtifact.value.fileName}`
      : 'Test cases were generated, but the export location was not returned.'
  } catch (error) {
    exportArtifact.value = null
    exportStatus.value = error?.response?.data?.msg || error?.message || 'Failed to export test cases.'
  }
}

async function generateCases() {
  const requirements = buildRequirementItems()
  const uniqueStatements = requirements.map((item) => item.requirementDetails)

  rawStatements.value = uniqueStatements.join('\n')
  requirementItems.value = requirements
  testCases.value = buildCasesFromRequirements(requirements)
  rememberTargetUrl()
  await exportTestCases()
}

const uniqueModuleTypes = computed(() => {
  const values = [...new Set(testCases.value.map((item) => item.moduleType).filter(Boolean))]
  return values.join(' / ')
})

const uniqueRequirementCount = computed(() => requirementItems.value.length)

function configuredCredentialKeys() {
  return [credentials.value.usernameKey, credentials.value.passwordKey].filter(Boolean)
}

function hasVerifiedRuntimeCredentials() {
  const requiredKeys = configuredCredentialKeys()
  if (!requiredKeys.length) {
    return false
  }

  return requiredKeys.every((key) => credentialAvailability.value.presentKeys.includes(key))
}

async function refreshCredentialAvailability() {
  const keys = configuredCredentialKeys()

  if (!keys.length) {
    credentialAvailability.value = {
      checked: true,
      presentKeys: [],
      missingKeys: [],
    }
    return
  }

  try {
    const result = await http.post('/api/qa/credentials-status', { keys })
    const payload = result?.presentKeys ? result : result?.data || {}
    credentialAvailability.value = {
      checked: true,
      presentKeys: payload.presentKeys || [],
      missingKeys: payload.missingKeys || [],
    }
  } catch (error) {
    credentialAvailability.value = {
      checked: true,
      presentKeys: [],
      missingKeys: keys,
    }
  }
}

function downloadExportArtifact() {
  if (!exportArtifact.value?.filePath) {
    return
  }

  fileUtils.handleFileDownload({ filepath: exportArtifact.value.filePath })
}

function buildExecutionPrompt() {
  const name = moduleName.value.trim() || 'QA Test Module'
  const target = targetUrl.value.trim() || 'Ask the user for the target environment if needed before execution.'
  const credentialKeys = [credentials.value.usernameKey, credentials.value.passwordKey]
    .filter(Boolean)
    .join(', ')
  const verifiedCredentialKeys = credentialAvailability.value.presentKeys.join(', ')
  const executorArtifactPath = exportArtifact.value?.executorRelativePath || ''
  const table = testCases.value
    .map((item) => `| ${item.requirementSource} | ${item.requirementDetails} | ${item.testCaseName} | ${item.preconditions} | ${item.testCaseDescription} | ${item.testStepNumber} | ${item.testStepDescription} | ${item.testStepExpectedResults} | ${item.comments} |`)
    .join('\n')

  return [
    `Execute the following QA/Test work in LemonAI using Action-Based Testing only.`,
    '',
    `Module name: ${name}`,
    `Target URL or environment note: ${target}`,
    exportArtifact.value?.automatedTestCaseLocation ? `Exported test case file: ${exportArtifact.value.automatedTestCaseLocation}` : 'Exported test case file: generate and save the requirement table before execution when available.',
    executorArtifactPath ? `Executor-writable test case path: ${executorArtifactPath}` : 'Executor-writable test case path: create and maintain a writable ABT artifact for execution updates.',
    '',
    'Requirements:',
    '- Convert the English statements into ABT artifacts before execution.',
    '- The requirement-to-test-condition table below is the authoritative source of the atomic test statements. Do not ask the user to restate or re-supply those test case statements.',
    '- Keep high-level actions business-facing and checks explicit.',
    '- Launch a visible browser and use the real browser as the execution layer.',
    targetUrl.value.trim() ? '- The target URL/environment note above is already provided. Do not ask for it again unless navigation proves it invalid or unreachable.' : '- Ask for the target URL only if it is genuinely missing.',
    '- Never use web search to discover local environment URLs, internal routes, credentials, API keys, or other secrets. Use the provided target URL, inspect the live application, read designated environment variables, or ask the human when required data is missing.',
    '- At every test step, inspect the current page and enumerate the visible links, tabs, buttons, menus, report objects, filters, and other actionable UI objects that are available before choosing the next action.',
    '- Treat this live object review as continuous, not one-time: review links and objects again after every interaction or state change.',
    '- Use the discovered live UI structure to refine the ABT action sequence whenever labels, menus, pages, report names, tabs, or object groupings differ from the original English request.',
    '- Continuously restructure the mid-level and low-level steps during execution so they match the actual UI revealed at each step, while preserving the original high-level business objective and explicit checks.',
    '- The exported test case file must not remain a predicted script. After every executed step, update the writable test case artifact so it reflects the actual observed step sequence, newly discovered required actions, and refined expected results.',
    '- When one observed UI step changes the understanding of later work, propagate that update across every affected test case in the artifact so all test cases remain synchronized with the live application.',
    '- Keep all steps for all test cases in the maintained artifact, including inserted navigation, prerequisite, and assertion steps discovered during execution.',
    '- Do not change the business objective, coverage intent, or explicit checks without human confirmation.',
    '- If the live UI differs from the original request, restate the refined next action before continuing execution.',
    '- Keep Playwright or browser mechanics in the low layer only.',
    '- Report pass/fail per case with objective evidence.',
    '- Pause at the sign-in step and allow the human to authenticate before continuing.',
    hasVerifiedRuntimeCredentials()
      ? `- The required credential environment variables have already been verified present in the workspace environment: ${verifiedCredentialKeys}. Use the environment-variable retrieval tool to load their values before asking the user. Do not ask the user to provide them again unless a direct runtime lookup fails.`
      : credentialKeys
        ? `- Read credentials from these environment variables if needed: ${credentialKeys}. Use the environment-variable retrieval tool first. If a direct runtime lookup shows they are missing, ask the human instead of performing web search.`
        : '- If credentials are needed and env vars are missing, ask the human to provide them before continuing. Do not perform web search for credentials.',
    '- If a failure looks like a bug, ask the human reviewer whether to report it as a bug, test issue, or investigation item.',
    '',
    '| Requirement Source | Requirement Details | Test Case Name | Preconditions | Test case description | test step number | test step description | test step expected results | comments |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    table,
    '',
    'Return:',
    '1. The final requirement-to-test-condition table.',
    '2. A step-by-step inventory of links and actionable page objects captured throughout execution.',
    exportArtifact.value?.automatedTestCaseLocation ? `3. Confirm the exported automated test case file location: ${exportArtifact.value.automatedTestCaseLocation}.` : '3. Confirm the exported automated test case file location when available.',
    executorArtifactPath ? `4. Confirm that the maintained execution artifact was updated at: ${executorArtifactPath}.` : '4. Confirm the maintained execution artifact path when available.',
    '5. Execution results for each case.',
    '6. Defect evidence for failures.',
    '7. A human-in-the-loop bug filing question for each failed check.',
  ].join('\n')
}

function requiresCredentialPrompt() {
  return testCases.value.some((item) => /auth|sign in|login/i.test(item.statement))
}

function openCredentialModal() {
  credentialStatus.value = ''
  showCredentialModal.value = true
}

function closeCredentialModal() {
  showCredentialModal.value = false
}

async function saveCredentials() {
  const variables = {}

  if (credentials.value.usernameKey && credentials.value.usernameValue) {
    variables[credentials.value.usernameKey.trim()] = credentials.value.usernameValue.trim()
  }

  if (credentials.value.passwordKey && credentials.value.passwordValue) {
    variables[credentials.value.passwordKey.trim()] = credentials.value.passwordValue.trim()
  }

  if (credentials.value.extraValue.includes('=')) {
    const [extraKey, ...extraRest] = credentials.value.extraValue.split('=')
    if (extraKey.trim() && extraRest.length) {
      variables[extraKey.trim()] = extraRest.join('=').trim()
    }
  }

  if (!Object.keys(variables).length) {
    credentialStatus.value = 'Add at least one credential value before saving.'
    return
  }

  isSavingCredentials.value = true

  try {
    const result = await http.post('/api/qa/credentials', { variables })

    if (result?.keys?.length) {
      credentialStatus.value = `Saved: ${result.keys.join(', ')}`
      return
    }

    if (result?.data?.code === 1) {
      credentialStatus.value = result.data.msg || 'Failed to save credentials.'
      return
    }

    credentialStatus.value = 'Credentials save request completed, but no saved keys were returned.'
  } catch (error) {
    const backendMessage = error?.response?.data?.msg || error?.response?.data?.message
    const notLoadedHint = error?.response?.status === 404 ? ' Credentials API not found. Restart LemonAI to load the new QA route.' : ''
    credentialStatus.value = `${backendMessage || 'Failed to save credentials.'}${notLoadedHint}`
  } finally {
    isSavingCredentials.value = false
  }
}

async function executeInBrowser() {
  if (!testCases.value.length) {
    await generateCases()
  }

  await refreshCredentialAvailability()

  if (!testCases.value.length || isExecuting.value) {
    return
  }

  if (requiresCredentialPrompt() && !hasVerifiedRuntimeCredentials() && !credentials.value.usernameValue && !credentials.value.passwordValue) {
    openCredentialModal()
    return
  }

  isExecuting.value = true

  try {
    rememberTargetUrl()
    const prompt = buildExecutionPrompt()
    const result = await chatStore.createConversation(moduleName.value.trim() || 'QA/Test Execution', 'task')

    await router.push({
      name: 'lemon',
      params: {
        agentId: chatStore.agent?.id,
        id: result.conversation_id,
      },
    })

    await seeAgent.sendMessage(prompt, result.conversation_id, [], [], 'task')
  } finally {
    isExecuting.value = false
  }
}

onMounted(() => {
  refreshCredentialAvailability()
})
</script>

<style scoped lang="scss">
.qa-workbench {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 32px 28px 40px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.hero-card,
.composer-card,
.table-card {
  background:
    radial-gradient(circle at top right, rgba(219, 234, 254, 0.85), transparent 32%),
    linear-gradient(180deg, #ffffff 0%, #f5f7fb 100%);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 24px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.hero-card {
  padding: 28px;
  display: flex;
  justify-content: space-between;
  gap: 24px;
}

.eyebrow {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #2563eb;
}

h1,
h2 {
  margin: 0;
  color: #0f172a;
}

.subtitle,
.table-header p {
  margin: 10px 0 0;
  color: #475569;
  line-height: 1.6;
}

.hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-content: flex-start;
}

.hero-meta span,
.table-summary span {
  background: rgba(15, 23, 42, 0.06);
  color: #0f172a;
  border-radius: 999px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
}

.export-card {
  margin: 18px 0;
  padding: 16px 18px;
  border-radius: 18px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  background: rgba(37, 99, 235, 0.07);
  border: 1px solid rgba(37, 99, 235, 0.14);
}

.export-title,
.export-copy,
.export-location,
.export-status {
  margin: 0;
}

.export-title {
  font-size: 13px;
  font-weight: 700;
  color: #1d4ed8;
}

.export-copy,
.export-location,
.export-status {
  margin-top: 4px;
  color: #334155;
  line-height: 1.5;
}

.download-link {
  color: #1d4ed8;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
}

.download-link:hover {
  text-decoration: underline;
}

.composer-card,
.table-card {
  padding: 24px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #0f172a;
  font-weight: 600;
}

.field span {
  font-size: 14px;
}

.field-large {
  margin-top: 18px;
}

.field-full {
  grid-column: 1 / -1;
}

input,
textarea {
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.45);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.92);
  padding: 14px 16px;
  font: inherit;
  color: #0f172a;
  box-sizing: border-box;
}

textarea {
  resize: vertical;
  min-height: 220px;
  line-height: 1.55;
}

input:focus,
textarea:focus {
  outline: 2px solid rgba(37, 99, 235, 0.18);
  border-color: #2563eb;
}

.action-row {
  margin-top: 18px;
  display: flex;
  gap: 12px;
}

.primary-btn,
.secondary-btn {
  border: 0;
  border-radius: 14px;
  padding: 13px 18px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.primary-btn {
  background: linear-gradient(135deg, #0f172a 0%, #2563eb 100%);
  color: #fff;
}

.secondary-btn {
  background: rgba(37, 99, 235, 0.1);
  color: #1d4ed8;
}

.primary-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1200;
}

.credential-modal {
  width: min(720px, 100%);
  background: #fff;
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.22);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.modal-copy,
.credential-status {
  color: #475569;
  line-height: 1.6;
}

.credential-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin: 18px 0;
}

.icon-btn {
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.06);
  color: #0f172a;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 18px;
  margin-bottom: 18px;
}

.table-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 940px;
}

th,
td {
  text-align: left;
  vertical-align: top;
  padding: 14px 12px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  color: #0f172a;
}

th {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #475569;
}

td {
  font-size: 14px;
  line-height: 1.5;
}

@media (max-width: 900px) {
  .qa-workbench {
    padding: 20px 16px 28px;
  }

  .hero-card,
  .table-header,
  .action-row {
    flex-direction: column;
  }

  .field-grid {
    grid-template-columns: 1fr;
  }

  .credential-grid {
    grid-template-columns: 1fr;
  }
}
</style>