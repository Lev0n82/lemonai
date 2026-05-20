require('module-alias/register');

const { expect } = require('chai');
const { Readable } = require('node:stream');

const { getContentTypeByFileName } = require('../../src/utils/file_type_response');
const wrapContext = require('../../src/middlewares/wrap.context');

describe('file response helpers', () => {
  describe('getContentTypeByFileName', () => {
    it('returns image content types for known image extensions', () => {
      expect(getContentTypeByFileName('photo.png')).to.equal('image/png');
      expect(getContentTypeByFileName('photo.jpeg')).to.equal('image/jpeg');
      expect(getContentTypeByFileName('vector.svg')).to.equal('image/svg+xml');
    });

    it('returns office content types for known office extensions', () => {
      expect(getContentTypeByFileName('report.pdf')).to.equal('application/pdf');
      expect(getContentTypeByFileName('sheet.xlsx')).to.equal('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(getContentTypeByFileName('doc.docx')).to.equal('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });

    it('falls back to csv content type for unknown extensions', () => {
      expect(getContentTypeByFileName('archive.bin')).to.equal('text/csv; charset=utf-8');
      expect(getContentTypeByFileName('package.json')).to.equal('text/csv; charset=utf-8');
    });
  });

  describe('wrap.context response.file', () => {
    it('adds success, fail, and file helpers onto the response object', async () => {
      const headers = {};
      const ctx = {
        response: {
          set(key, value) {
            headers[key] = value;
          }
        }
      };

      await wrapContext(ctx, async () => {});

      expect(ctx.response.success).to.be.a('function');
      expect(ctx.response.fail).to.be.a('function');
      expect(ctx.response.file).to.be.a('function');
    });

    it('sets download headers and body when sending a file response', async () => {
      const headers = {};
      const stream = Readable.from(['hello']);
      const ctx = {
        response: {
          set(key, value) {
            headers[key] = value;
          }
        }
      };

      await wrapContext(ctx, async () => {});
      ctx.response.file('diagram.svg', stream);

      expect(headers['Content-Type']).to.equal('image/svg+xml');
      expect(headers['Content-Disposition']).to.equal('attachment; filename=diagram.svg');
      expect(ctx.response.body).to.equal(stream);
    });
  });
});