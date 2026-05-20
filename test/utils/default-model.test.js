const { expect } = require('chai');
const Module = require('module');

function loadDefaultModelModule(stubs) {
  const modulePath = require.resolve('../../src/utils/default_model');
  const originalLoad = Module._load;

  delete require.cache[modulePath];
  Module._load = function mockLoad(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(stubs, request)) {
      return stubs[request];
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return require(modulePath);
  } finally {
    Module._load = originalLoad;
  }
}

describe('default model resolution', () => {
  it('updateDefaultModel resolves assistant models with chat completions URL', async () => {
    const defaultModel = loadDefaultModelModule({
      dotenv: { config: () => ({}) },
      'module-alias/register': {},
      '@src/models/DefaultModelSetting': {
        findOne: async () => ({ dataValues: { model_id: 11 } })
      },
      '@src/models/Model': {
        findOne: async () => ({ dataValues: { id: 11, model_id: 'glm-5.1:cloud', platform_id: 7 } })
      },
      '@src/models/Platform': {
        findOne: async () => ({ dataValues: { id: 7, name: 'Ollama', api_key: 'secret', api_url: 'http://localhost:11434/v1' } })
      },
      '@src/models/Conversation': {}
    });

    const result = await defaultModel.updateDefaultModel('assistant');

    expect(result).to.deep.equal({
      model_name: 'glm-5.1:cloud',
      platform_name: 'Ollama',
      api_key: 'secret',
      api_url: 'http://localhost:11434/v1/chat/completions',
      base_url: 'http://localhost:11434/v1',
      is_subscribe: false,
    });
  });

  it('updateDefaultModel keeps the base URL for non-assistant settings', async () => {
    const defaultModel = loadDefaultModelModule({
      dotenv: { config: () => ({}) },
      'module-alias/register': {},
      '@src/models/DefaultModelSetting': {
        findOne: async () => ({ dataValues: { model_id: 22 } })
      },
      '@src/models/Model': {
        findOne: async () => ({ dataValues: { id: 22, model_id: 'topic-model', platform_id: 8 } })
      },
      '@src/models/Platform': {
        findOne: async () => ({ dataValues: { id: 8, name: 'Ollama', api_key: 'secret', api_url: 'http://localhost:11434/v1' } })
      },
      '@src/models/Conversation': {}
    });

    const result = await defaultModel.updateDefaultModel('topic_naming');

    expect(result.api_url).to.equal('http://localhost:11434/v1');
    expect(result.base_url).to.equal('http://localhost:11434/v1');
  });

  it('getDefaultModel resolves conversation model and preserves platform subscription flag', async () => {
    const defaultModel = loadDefaultModelModule({
      dotenv: { config: () => ({}) },
      'module-alias/register': {},
      '@src/models/DefaultModelSetting': {},
      '@src/models/Model': {
        findOne: async ({ where }) => {
          expect(where).to.deep.equal({ id: 33 });
          return { dataValues: { model_id: 'glm-5.1:cloud', platform_id: 9 } };
        }
      },
      '@src/models/Platform': {
        findOne: async ({ where }) => {
          expect(where).to.deep.equal({ id: 9 });
          return {
            is_subscribe: true,
            dataValues: { id: 9, name: 'Ollama', api_key: 'secret', api_url: 'http://localhost:11434/v1' }
          };
        }
      },
      '@src/models/Conversation': {
        findOne: async ({ where }) => {
          expect(where).to.deep.equal({ conversation_id: 'conv-1' });
          return { dataValues: { model_id: 33 } };
        }
      }
    });

    const result = await defaultModel.getDefaultModel('conv-1');

    expect(result).to.deep.equal({
      model_name: 'glm-5.1:cloud',
      platform_name: 'Ollama',
      api_key: 'secret',
      api_url: 'http://localhost:11434/v1/chat/completions',
      base_url: 'http://localhost:11434/v1',
      is_subscribe: true,
    });
  });

  it('getCustomModel resolves a model by external model_id', async () => {
    const defaultModel = loadDefaultModelModule({
      dotenv: { config: () => ({}) },
      'module-alias/register': {},
      '@src/models/DefaultModelSetting': {},
      '@src/models/Model': {
        findOne: async ({ where }) => {
          expect(where).to.deep.equal({ model_id: 'glm-5.1:cloud' });
          return { dataValues: { model_id: 'glm-5.1:cloud', platform_id: 12 } };
        }
      },
      '@src/models/Platform': {
        findOne: async () => ({
          dataValues: { id: 12, name: 'Ollama', api_key: 'secret', api_url: 'http://localhost:11434/v1' }
        })
      },
      '@src/models/Conversation': {}
    });

    const result = await defaultModel.getCustomModel('glm-5.1:cloud');

    expect(result).to.deep.equal({
      model_name: 'glm-5.1:cloud',
      platform_name: 'Ollama',
      api_key: 'secret',
      api_url: 'http://localhost:11434/v1/chat/completions',
      base_url: 'http://localhost:11434/v1',
      is_subscribe: false,
    });
  });
});