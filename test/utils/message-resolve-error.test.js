const { expect } = require('chai');
const sinon = require('sinon');
const Module = require('module');

const { resolveXML, resolveActions } = require('../../src/utils/resolve');
const handleError = require('../../src/completion/handle.error');

function loadMessageModule() {
  const modulePath = require.resolve('../../src/utils/message');
  const originalLoad = Module._load;

  delete require.cache[modulePath];
  Module._load = function mockLoad(request, parent, isMain) {
    if (request === '@src/models/Message') {
      return {};
    }
    if (request === '@src/models/Conversation') {
      return {};
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return require(modulePath);
  } finally {
    Module._load = originalLoad;
  }
}

describe('message formatting, XML parsing, and error handling', () => {
  describe('Message.format', () => {
    it('builds a message payload with timestamp and nested meta fields', () => {
      const Message = loadMessageModule();
      const before = Date.now();

      const result = Message.format({
        status: 'running',
        content: 'Processing',
        task_id: 'task-1',
        action_type: 'terminal',
        filepath: '/tmp/file.js',
        url: 'https://example.com',
        json: [{ id: 1 }],
        comments: 'note',
        memorized: true,
        uuid: 'msg-1',
        role: 'assistant',
        meta_content: 'internal',
        pid: 'pid-123',
        type: 'progress',
        is_active: false,
      });

      expect(result).to.include({
        role: 'assistant',
        uuid: 'msg-1',
        status: 'running',
        content: 'Processing',
        comments: 'note',
        memorized: true,
        type: 'progress',
      });
      expect(result.timestamp).to.be.at.least(before);
      expect(result.meta).to.deep.equal({
        pid: 'pid-123',
        task_id: 'task-1',
        action_type: 'terminal',
        filepath: '/tmp/file.js',
        url: 'https://example.com',
        json: [{ id: 1 }],
        content: 'internal',
        is_active: false,
      });
    });

    it('uses documented defaults when optional fields are omitted', () => {
      const Message = loadMessageModule();

      const result = Message.format({ status: 'success' });

      expect(result.role).to.equal('assistant');
      expect(result.content).to.equal('');
      expect(result.meta).to.deep.equal({
        pid: '',
        task_id: '',
        action_type: '',
        filepath: '',
        url: '',
        json: [],
        content: '',
        is_active: true,
      });
    });
  });

  describe('resolveXML', () => {
    it('strips CDATA from write_code content', () => {
      const result = resolveXML('<write_code><content><![CDATA[const x = 1;]]></content></write_code>');

      expect(result).to.deep.equal({
        write_code: {
          content: 'const x = 1;'
        }
      });
    });

    it('parses revise_plan tasks JSON arrays from CDATA', () => {
      const result = resolveXML('<revise_plan><tasks><![CDATA[[{"title":"Add tests"}]]]></tasks></revise_plan>');

      expect(result).to.deep.equal({
        revise_plan: {
          tasks: [{ title: 'Add tests' }]
        }
      });
    });

    it('returns parse_error payload when revise_plan tasks JSON is invalid', () => {
      const result = resolveXML('<revise_plan><tasks><![CDATA[[{"title":}]]]></tasks></revise_plan>');

      expect(result.parse_error.message).to.include('JSON 解析失败');
      expect(result.parse_error.content).to.equal('[{"title":}]');
    });

    it('throws on non-string input', () => {
      expect(() => resolveXML(null)).to.throw('XML内容必须是非空字符串');
    });
  });

  describe('resolveActions', () => {
    it('maps parsed XML nodes into action objects', () => {
      const actions = resolveActions('<root><step><name>build</name></step></root>');

      expect(actions).to.deep.equal([
        {
          type: 'root',
          params: {
            step: {
              name: 'build'
            }
          }
        }
      ]);
    });

    it('returns an empty list when XML cannot be resolved', () => {
      const actions = resolveActions(null);

      expect(actions).to.deep.equal([]);
    });
  });

  describe('handleError', () => {
    let clock;

    beforeEach(() => {
      clock = sinon.useFakeTimers();
    });

    afterEach(() => {
      clock.restore();
    });

    it('streams the error message character by character', async () => {
      const chunks = [];
      const pending = handleError(new Error('boom'), (ch) => chunks.push(ch));

      await clock.runAllAsync();
      const result = await pending;

      expect(result).to.equal('boom');
      expect(chunks.join('')).to.equal('boom');
    });

    it('prefers status-based friendly messages when the response has a status', async () => {
      const chunks = [];
      const error = new Error('ignored');
      error.response = { status: 503 };

      const pending = handleError(error, (ch) => chunks.push(ch));

      await clock.runAllAsync();
      const result = await pending;

      expect(result).to.equal('Sorry, the current request interface 503 is abnormal, please check the service deployment');
      expect(chunks.join('')).to.equal(result);
    });

    it('returns null for non-error values', async () => {
      const result = await handleError('not-an-error', () => {});

      expect(result).to.equal(null);
    });
  });
});