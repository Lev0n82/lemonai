const { expect } = require('chai');
const sinon = require('sinon');

const checkLlmApiAvailability = require('../../src/utils/check_llm_api_availability');

describe('checkLlmApiAvailability', () => {
  let clock;
  let originalFetch;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    originalFetch = global.fetch;
  });

  afterEach(() => {
    clock.restore();
    global.fetch = originalFetch;
  });

  it('returns a validation error when baseUrl is missing', async () => {
    const result = await checkLlmApiAvailability('', 'secret', 'glm-5.1:cloud');

    expect(result).to.deep.equal({ status: false, message: 'Base URL is required.' });
  });

  it('returns success when the API responds with choices', async () => {
    global.fetch = sinon.stub().resolves({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'ok' } }] })
    });

    const result = await checkLlmApiAvailability('http://localhost:11434/v1', 'secret', 'glm-5.1:cloud');

    expect(result).to.deep.equal({ status: true, message: 'LLM API call succeeded.' });
    expect(global.fetch.calledOnce).to.equal(true);
    const [url, options] = global.fetch.firstCall.args;
    expect(url).to.equal('http://localhost:11434/v1/chat/completions');
    expect(options.method).to.equal('POST');
    expect(options.headers.Authorization).to.equal('Bearer secret');
    expect(JSON.parse(options.body)).to.deep.include({ model: 'glm-5.1:cloud', max_tokens: 5, enable_thinking: false });
  });

  it('returns an unexpected-data error when the API responds without choices', async () => {
    global.fetch = sinon.stub().resolves({
      ok: true,
      json: async () => ({ result: 'missing choices' })
    });

    const result = await checkLlmApiAvailability('http://localhost:11434/v1', 'secret', 'glm-5.1:cloud');

    expect(result).to.deep.equal({
      status: false,
      message: 'LLM API call succeeded, but response data is not as expected.'
    });
  });

  it('returns the HTTP error text when the API responds with a failure status', async () => {
    global.fetch = sinon.stub().resolves({
      ok: false,
      status: 401,
      text: async () => 'unauthorized'
    });

    const result = await checkLlmApiAvailability('http://localhost:11434/v1', 'secret', 'glm-5.1:cloud');

    expect(result).to.deep.equal({
      status: false,
      message: 'LLM API call failed, HTTP status: 401, error: unauthorized'
    });
  });

  it('returns a timeout message for AbortError failures', async () => {
    const error = new Error('The operation was aborted');
    error.name = 'AbortError';
    global.fetch = sinon.stub().rejects(error);

    const result = await checkLlmApiAvailability('http://localhost:11434/v1', 'secret', 'glm-5.1:cloud');

    expect(result).to.deep.equal({
      status: false,
      message: 'LLM API call timed out: The operation was aborted'
    });
  });

  it('returns a network error message for other fetch failures', async () => {
    global.fetch = sinon.stub().rejects(new Error('connect ECONNREFUSED'));

    const result = await checkLlmApiAvailability('http://localhost:11434/v1', 'secret', 'glm-5.1:cloud');

    expect(result).to.deep.equal({
      status: false,
      message: 'Network or other error occurred during LLM API call: connect ECONNREFUSED'
    });
  });
});