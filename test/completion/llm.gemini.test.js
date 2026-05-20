const { expect } = require('chai');
const sinon = require('sinon');
const { EventEmitter } = require('node:events');

const axios = require('axios');
const fs = require('node:fs');
const net = require('node:net');

const MODULE_PATH = '../../src/completion/llm.gemini';

function loadGeminiModule() {
  delete require.cache[require.resolve(MODULE_PATH)];
  return require(MODULE_PATH);
}

function clearProxyEnv() {
  delete process.env.HTTP_PROXY;
  delete process.env.HTTPS_PROXY;
  delete process.env.PROXY_HOST;
  delete process.env.PROXY_PORT;
  delete process.env.PROXY_PROT;
  delete process.env.PROXY_PROTOCOL;
}

describe('GeminiLLM proxy initialization', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    clearProxyEnv();
  });

  afterEach(() => {
    sandbox.restore();
    clearProxyEnv();
    delete require.cache[require.resolve(MODULE_PATH)];
  });

  it('does not initialize axios during module import', () => {
    process.env.PROXY_HOST = '127.0.0.1';
    const createSpy = sandbox.spy(axios, 'create');

    loadGeminiModule();

    expect(createSpy.called).to.equal(false);
  });

  it('uses a direct axios instance when no proxy env is configured', async () => {
    const requestStub = sandbox.stub().resolves({ status: 200 });
    const createStub = sandbox.stub(axios, 'create').returns({ request: requestStub });
    const GeminiLLM = loadGeminiModule();

    const llm = new GeminiLLM(() => {}, 'gemini-1.5-flash', { config: { API_KEY: 'test-key' } });
    const response = await llm.request([{ role: 'user', parts: [{ text: 'hello' }] }]);

    expect(response.status).to.equal(200);
    expect(createStub.calledOnceWithExactly()).to.equal(true);
    expect(requestStub.calledOnce).to.equal(true);
  });

  it('falls back to a direct axios instance when configured proxy is unreachable', async () => {
    process.env.PROXY_HOST = '127.0.0.1';
    process.env.PROXY_PORT = '7890';

    const fakeSocket = new EventEmitter();
    fakeSocket.end = sandbox.stub();
    fakeSocket.destroy = sandbox.stub();
    fakeSocket.setTimeout = sandbox.stub();

    sandbox.stub(fs, 'accessSync').throws(new Error('not in docker'));
    sandbox.stub(net, 'createConnection').callsFake(() => {
      process.nextTick(() => fakeSocket.emit('error', new Error('connect failed')));
      return fakeSocket;
    });

    const requestStub = sandbox.stub().resolves({ status: 200 });
    const createStub = sandbox.stub(axios, 'create').returns({ request: requestStub });
    const GeminiLLM = loadGeminiModule();

    const llm = new GeminiLLM(() => {}, 'gemini-1.5-flash', { config: { API_KEY: 'test-key' } });
    const response = await llm.request([{ role: 'user', parts: [{ text: 'hello' }] }]);

    expect(response.status).to.equal(200);
    expect(createStub.calledOnceWithExactly()).to.equal(true);
    expect(requestStub.calledOnce).to.equal(true);
    expect(fakeSocket.destroy.called).to.equal(true);
  });
});