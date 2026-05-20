const { expect } = require('chai');

const resolveServiceConfig = require('../../src/completion/resolveServiceConfig');

describe('resolveServiceConfig', () => {
  it('returns a matching config for a known channel and service', async () => {
    const config = await resolveServiceConfig('provider', 'spark');

    expect(config).to.include({ channel: 'provider', service: 'spark', name: '讯飞星火' });
    expect(config.config).to.be.an('object');
  });

  it('returns an empty object for an unknown service', async () => {
    const config = await resolveServiceConfig('provider', 'missing-service');

    expect(config).to.deep.equal({});
  });
});