const { expect } = require('chai');
const sinon = require('sinon');
const Module = require('module');

function loadCalcTokenModule(stubs) {
  const modulePath = require.resolve('../../src/completion/calc.token');
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

describe('calcToken', () => {
  it('uses the provided model encoder and returns token count', () => {
    const encode = sinon.stub().returns([11, 22, 33]);
    const free = sinon.stub();
    const encodingForModel = sinon.stub().returns({ encode, free });
    const calcToken = loadCalcTokenModule({
      '@dqbd/tiktoken': {
        get_encoding: sinon.stub(),
        encoding_for_model: encodingForModel,
      }
    });

    const result = calcToken('hello world', 'gpt-4');

    expect(result).to.equal(3);
    expect(encodingForModel.calledOnceWithExactly('gpt-4')).to.equal(true);
    expect(encode.calledOnceWithExactly('hello world')).to.equal(true);
    expect(free.calledOnce).to.equal(true);
  });

  it('defaults to gpt-3.5-turbo when no model is provided', () => {
    const encode = sinon.stub().returns([1]);
    const free = sinon.stub();
    const encodingForModel = sinon.stub().returns({ encode, free });
    const calcToken = loadCalcTokenModule({
      '@dqbd/tiktoken': {
        get_encoding: sinon.stub(),
        encoding_for_model: encodingForModel,
      }
    });

    const result = calcToken('hello');

    expect(result).to.equal(1);
    expect(encodingForModel.calledOnceWithExactly('gpt-3.5-turbo')).to.equal(true);
    expect(free.calledOnce).to.equal(true);
  });
});