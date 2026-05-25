const router = require('koa-router')();
const fs = require('fs');
const path = require('path');
const { getDirpath } = require('@src/utils/electron');

function getEnvFilePath() {
  return path.resolve(process.cwd(), '.env');
}

function getGeneratedTestCaseDir(userId) {
  const workspaceDir = getDirpath(process.env.WORKSPACE_DIR || 'workspace', userId);
  return path.join(workspaceDir, 'abt_generated');
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'qa_test_cases';
}

function escapeCsvValue(value) {
  const normalized = String(value ?? '').replace(/"/g, '""');
  return `"${normalized}"`;
}

function buildCsvContent(rows) {
  const header = [
    'Requirement Source',
    'Requirement Details',
    'Test Case Name',
    'Preconditions',
    'Test case description',
    'test step number',
    'test step description',
    'test step expected results',
    'comments',
  ];

  const csvRows = rows.map((row) => ([
    row.requirementSource,
    row.requirementDetails,
    row.testCaseName,
    row.preconditions,
    row.testCaseDescription,
    row.testStepNumber,
    row.testStepDescription,
    row.testStepExpectedResults,
    row.comments,
  ].map(escapeCsvValue).join(',')));

  return [header.map(escapeCsvValue).join(','), ...csvRows].join('\n');
}

function parseEnv(content) {
  return content.split(/\r?\n/);
}

function parseEnvObject(content) {
  return parseEnv(content).reduce((accumulator, line) => {
    const trimmed = String(line || '').trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      return accumulator;
    }

    const separatorIndex = trimmed.indexOf('=');
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (key) {
      accumulator[key] = value;
    }

    return accumulator;
  }, {});
}

function upsertEnvLines(lines, variables) {
  const nextLines = [...lines];

  Object.entries(variables).forEach(([key, value]) => {
    const lineValue = `${key}=${value}`;
    const existingIndex = nextLines.findIndex((line) => line.startsWith(`${key}=`));

    if (existingIndex >= 0) {
      nextLines[existingIndex] = lineValue;
    } else {
      nextLines.push(lineValue);
    }

    process.env[key] = value;
  });

  return nextLines;
}

router.post('/credentials', async ({ request, response }) => {
  const { variables } = request.body || {};

  if (!variables || typeof variables !== 'object' || Array.isArray(variables)) {
    return response.fail(null, 'variables object is required');
  }

  const sanitizedEntries = Object.entries(variables)
    .filter(([key, value]) => typeof key === 'string' && key.trim() && typeof value === 'string')
    .map(([key, value]) => [key.trim(), value.trim()]);

  if (!sanitizedEntries.length) {
    return response.fail(null, 'at least one credential value is required');
  }

  const envFilePath = getEnvFilePath();
  const existingContent = fs.existsSync(envFilePath)
    ? fs.readFileSync(envFilePath, 'utf8')
    : '';

  const nextLines = upsertEnvLines(parseEnv(existingContent), Object.fromEntries(sanitizedEntries));
  const output = nextLines.filter((line, index, arr) => !(index === arr.length - 1 && line === '')).join('\n');

  fs.writeFileSync(envFilePath, `${output}\n`, 'utf8');

  response.success(
    {
      envFilePath,
      keys: sanitizedEntries.map(([key]) => key),
    },
    'Credentials saved to .env successfully'
  );
});

router.post('/credentials-status', async ({ request, response }) => {
  const { keys = [] } = request.body || {};

  if (!Array.isArray(keys) || !keys.length) {
    return response.fail(null, 'keys array is required');
  }

  const envFilePath = getEnvFilePath();
  const existingContent = fs.existsSync(envFilePath)
    ? fs.readFileSync(envFilePath, 'utf8')
    : '';
  const envValues = parseEnvObject(existingContent);
  const normalizedKeys = keys
    .filter((key) => typeof key === 'string' && key.trim())
    .map((key) => key.trim());

  const presentKeys = normalizedKeys.filter((key) => {
    const fileValue = envValues[key];
    const runtimeValue = process.env[key];
    return Boolean((typeof fileValue === 'string' && fileValue.length) || (typeof runtimeValue === 'string' && runtimeValue.length));
  });
  const missingKeys = normalizedKeys.filter((key) => !presentKeys.includes(key));

  response.success({
    presentKeys,
    missingKeys,
  }, 'Credential key availability checked successfully');
});

router.post('/test-cases', async ({ state, request, response }) => {
  const { rows, moduleName = '', targetUrl = '' } = request.body || {};

  if (!Array.isArray(rows) || !rows.length) {
    return response.fail(null, 'rows array is required');
  }

  const sanitizedRows = rows.map((row) => ({
    requirementSource: String(row.requirementSource || '').trim(),
    requirementDetails: String(row.requirementDetails || '').trim(),
    testCaseName: String(row.testCaseName || '').trim(),
    preconditions: String(row.preconditions || '').trim(),
    testCaseDescription: String(row.testCaseDescription || '').trim(),
    testStepNumber: String(row.testStepNumber || '').trim(),
    testStepDescription: String(row.testStepDescription || '').trim(),
    testStepExpectedResults: String(row.testStepExpectedResults || '').trim(),
    comments: String(row.comments || '').trim(),
  })).filter((row) => row.requirementDetails && row.testCaseName && row.testStepDescription);

  if (!sanitizedRows.length) {
    return response.fail(null, 'at least one valid test case row is required');
  }

  const userId = state?.user?.id;
  const directoryPath = getGeneratedTestCaseDir(userId);
  fs.mkdirSync(directoryPath, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${slugify(moduleName)}_${timestamp}.csv`;
  const filePath = path.join(directoryPath, fileName);
  const executorRelativePath = path.join('abt_generated', fileName);
  const csvContent = buildCsvContent(sanitizedRows);
  fs.writeFileSync(filePath, `${csvContent}\n`, 'utf8');

  response.success(
    {
      fileName,
      filePath,
      directoryPath,
      executorRelativePath,
      targetUrl: String(targetUrl || '').trim(),
      rowCount: sanitizedRows.length,
      automatedTestCaseLocation: filePath,
    },
    'Requirement-based test cases exported successfully'
  );
});

module.exports = router.routes();