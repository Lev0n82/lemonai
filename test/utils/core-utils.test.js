require('module-alias/register');

const { expect } = require('chai');

const parseJSON = require('../../src/utils/json');
const { extractTemplateVariables, resolveTemplate } = require('../../src/utils/template');
const { resolveMarkdown } = require('../../src/utils/markdown');
const { validateOptions } = require('../../src/utils/validate');
const { encodeToken, decodeToken } = require('../../src/utils/jwt');
const { PauseRequiredError, isPauseRequiredError } = require('../../src/utils/errors');

describe('core utility modules', () => {
  describe('parseJSON', () => {
    it('parses plain JSON content', () => {
      const result = parseJSON('{"name":"lemon","count":2}');

      expect(result).to.deep.equal({ name: 'lemon', count: 2 });
    });

    it('parses JSON wrapped in markdown fences and think tags', () => {
      const result = parseJSON('<think>internal</think>```json\n{"enabled":true}\n```');

      expect(result).to.deep.equal({ enabled: true });
    });

    it('maps ERR_BAD_REQUEST to a stable error message', () => {
      expect(() => parseJSON('ERR_BAD_REQUEST')).to.throw('Large model call failed');
    });

    it('surfaces parse failures with module context', () => {
      expect(() => parseJSON('not-json')).to.throw('parseJSON failed:');
    });
  });

  describe('template helpers', () => {
    it('extracts unique template variables and ignores escaped placeholders', () => {
      const variables = extractTemplateVariables('Hello {name}, role { role }, escaped \\{skip}, again {name}');

      expect(variables).to.deep.equal(['name', 'role']);
    });

    it('resolves templates by stringifying objects and filling missing variables with empty strings', async () => {
      const result = await resolveTemplate('User {name} meta {meta} missing {missing}', {
        name: 'levon',
        meta: { enabled: true }
      });

      expect(result).to.equal('User levon meta {"enabled":true} missing ');
    });
  });

  describe('resolveMarkdown', () => {
    it('splits markdown into titled sections with descriptions', async () => {
      const result = await resolveMarkdown('# Intro\nFirst paragraph\n## Details\nSecond paragraph\n');

      expect(result).to.have.length(2);
      expect(result[0]).to.include({ title: 'Intro' });
      expect(result[0].content).to.equal('First paragraph\n');
      expect(result[0].description).to.equal('Intro\nFirst paragraph\n');
      expect(result[1]).to.include({ title: 'Details' });
      expect(result[1].content).to.equal('Second paragraph\n');
    });

    it('returns an empty list when markdown has no headings', async () => {
      const result = await resolveMarkdown('Just body text without any heading');

      expect(result).to.deep.equal([]);
    });
  });

  describe('validateOptions', () => {
    it('returns the custom validator message before required checks', () => {
      const message = validateOptions(
        { model: 'bad' },
        {
          model: {
            required: true,
            message: (options) => options.model === 'bad' ? 'unsupported model' : ''
          }
        }
      );

      expect(message).to.equal('unsupported model');
    });

    it('treats falsy required values as missing with current semantics', () => {
      const message = validateOptions(
        { retries: 0 },
        {
          retries: {
            required: true,
            message: 'retries is required'
          }
        }
      );

      expect(message).to.equal('retries is required');
    });
  });

  describe('jwt helpers', () => {
    it('encodes and decodes token payloads', () => {
      const token = encodeToken({ user_id: 1, role: 'assistant' });
      const decoded = decodeToken(token);

      expect(decoded).to.include({ user_id: 1, role: 'assistant' });
    });

    it('returns null for invalid tokens', () => {
      expect(decodeToken('invalid.token.value')).to.equal(null);
    });
  });

  describe('pause-required error detection', () => {
    it('identifies explicit PauseRequiredError instances', () => {
      expect(isPauseRequiredError(new PauseRequiredError('pause'))).to.equal(true);
    });

    it('identifies known pause-required message patterns', () => {
      expect(isPauseRequiredError(new Error('Insufficient credits balance'))).to.equal(true);
      expect(isPauseRequiredError(new Error('ERR_BAD_REQUEST: invalid input'))).to.equal(true);
    });

    it('returns false for generic errors', () => {
      expect(isPauseRequiredError(new Error('network timeout'))).to.equal(false);
    });
  });
});