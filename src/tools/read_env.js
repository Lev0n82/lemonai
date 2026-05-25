/** @type {import('types/Tool').Tool} */
const ReadEnvTool = {
  name: 'read_env',
  description: 'Read specific environment variable values by key. Use this when the task explicitly references named environment variables such as credentials or URLs that should be loaded from the current runtime environment.',
  params: {
    type: 'object',
    properties: {
      keys: {
        type: 'array',
        description: 'List of environment variable names to read from the current runtime environment.',
        items: {
          type: 'string',
          description: 'Environment variable name',
        },
      },
    },
    required: ['keys'],
  },
  memorized: true,
  getActionDescription: async ({ keys = [] }) => `Read environment variables: ${Array.isArray(keys) ? keys.join(', ') : ''}`,
  execute: async ({ keys = [] }) => {
    if (!Array.isArray(keys) || !keys.length) {
      throw new Error('read_env requires a non-empty keys array.');
    }

    const normalizedKeys = keys
      .filter((key) => typeof key === 'string' && key.trim())
      .map((key) => key.trim());

    if (!normalizedKeys.length) {
      throw new Error('read_env requires at least one valid environment variable name.');
    }

    const found = {};
    const missing = [];

    normalizedKeys.forEach((key) => {
      if (typeof process.env[key] === 'string' && process.env[key].length) {
        found[key] = process.env[key];
      } else {
        missing.push(key);
      }
    });

    const contentLines = [
      ...Object.entries(found).map(([key, value]) => `${key}=${value}`),
      missing.length ? `Missing keys: ${missing.join(', ')}` : 'All requested keys were found.',
    ];

    return {
      content: contentLines.join('\n'),
      meta: {
        json: {
          found,
          missing,
        },
      },
    };
  },
};

module.exports = ReadEnvTool;