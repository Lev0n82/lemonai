require('module-alias/register');

const { expect } = require('chai');
const request = require('supertest');
const sinon = require('sinon');
const Module = require('module');
const Router = require('koa-router');

function loadModuleWithMocks(moduleRelativePath, stubs) {
  const modulePath = require.resolve(moduleRelativePath);
  const originalLoad = Module._load;

  delete require.cache[modulePath];
  Module._load = function mockLoad(requestPath, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(stubs, requestPath)) {
      return stubs[requestPath];
    }
    return originalLoad.call(this, requestPath, parent, isMain);
  };

  try {
    return require(modulePath);
  } finally {
    Module._load = originalLoad;
  }
}

function buildTestRouter(dependencies) {
  const router = new Router();
  router.get('/', async ({ response }) => {
    response.body = 'Hello, World !';
    response.status = 200;
  });

  const platformRoutes = loadModuleWithMocks('../../src/routers/platform/platform', {
    '@src/models/Platform': dependencies.Platform,
    '@src/models/Model': dependencies.Model,
    '@src/utils/check_llm_api_availability': dependencies.checkLlmApiAvailability,
  });
  const defaultModelSettingRoutes = loadModuleWithMocks('../../src/routers/default_model_setting/default_model_setting', {
    '@src/models/DefaultModelSetting': dependencies.DefaultModelSetting,
    '@src/models/Model': dependencies.Model,
    '@src/utils/default_model': { updateDefaultModel: dependencies.updateDefaultModel },
    '@src/models/Platform': dependencies.Platform,
    '@src/models/UserSearchSetting': dependencies.UserSearchSetting,
  });

  router.use('/api/platform', platformRoutes);
  router.use('/api/default_model_setting', defaultModelSettingRoutes);
  return router;
}

function loadTestApp(dependencies) {
  const router = buildTestRouter(dependencies);
  const app = loadModuleWithMocks('../../src/app', {
    '@src/logger/index': { logging: {} },
    '@src/swagger/swagger': {
      routes: () => async (_ctx, next) => { await next(); },
      allowedMethods: () => async (_ctx, next) => { await next(); },
    },
    'koa2-swagger-ui': {
      koaSwagger: () => async (_ctx, next) => { await next(); },
    },
    '@src/routers/index': router,
  });

  return app;
}

describe('Koa app router surface', () => {
  afterEach(() => {
    delete require.cache[require.resolve('../../src/app')];
    delete require.cache[require.resolve('../../src/routers/platform/platform')];
    delete require.cache[require.resolve('../../src/routers/default_model_setting/default_model_setting')];
  });

  it('serves the root health route', async () => {
    const app = loadTestApp({
      Platform: { findOne: sinon.stub(), findAll: sinon.stub(), create: sinon.stub() },
      Model: { findOne: sinon.stub(), destroy: sinon.stub() },
      checkLlmApiAvailability: sinon.stub(),
      DefaultModelSetting: { findOne: sinon.stub(), findAll: sinon.stub(), create: sinon.stub(), update: sinon.stub() },
      updateDefaultModel: sinon.stub(),
      UserSearchSetting: { findOne: sinon.stub() },
    });

    const response = await request(app.callback()).get('/');

    expect(response.status).to.equal(200);
    expect(response.text).to.equal('Hello, World !');
  });

  it('returns wrapped success data for platform API availability checks', async () => {
    const checkLlmApiAvailability = sinon.stub().resolves({ status: true, message: 'ok' });
    const app = loadTestApp({
      Platform: { findOne: sinon.stub(), findAll: sinon.stub(), create: sinon.stub() },
      Model: { findOne: sinon.stub(), destroy: sinon.stub() },
      checkLlmApiAvailability,
      DefaultModelSetting: { findOne: sinon.stub(), findAll: sinon.stub(), create: sinon.stub(), update: sinon.stub() },
      updateDefaultModel: sinon.stub(),
      UserSearchSetting: { findOne: sinon.stub() },
    });

    const response = await request(app.callback())
      .post('/api/platform/check_api_availability')
      .send({ base_url: 'http://localhost:11434/v1', api_key: 'secret', model: 'glm-5.1:cloud' });

    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal({
      code: 0,
      msg: '成功',
      data: { status: true, message: 'ok' },
    });
    expect(checkLlmApiAvailability.calledOnceWithExactly('http://localhost:11434/v1', 'secret', 'glm-5.1:cloud')).to.equal(true);
  });

  it('returns wrapped default-model setup checks through the app surface', async () => {
    const platformFindOne = sinon.stub();
    platformFindOne.onFirstCall().resolves({ id: 1, is_enabled: true });
    platformFindOne.onSecondCall().resolves({ id: 2, is_enabled: false });

    const app = loadTestApp({
      Platform: { findOne: platformFindOne, findAll: sinon.stub(), create: sinon.stub() },
      Model: { findOne: sinon.stub().resolves({ platform_id: 2 }), destroy: sinon.stub() },
      checkLlmApiAvailability: sinon.stub(),
      DefaultModelSetting: {
        findOne: sinon.stub().resolves({ model_id: 8 }),
        findAll: sinon.stub(),
        create: sinon.stub(),
        update: sinon.stub(),
      },
      updateDefaultModel: sinon.stub(),
      UserSearchSetting: { findOne: sinon.stub().resolves({ id: 3 }) },
    });

    const response = await request(app.callback()).get('/api/default_model_setting/check');

    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal({
      code: 0,
      msg: '成功',
      data: {
        has_enabled_platform: true,
        has_default_platform: false,
        has_search_setting: true,
      },
    });
  });

  it('updates default model settings through the app surface', async () => {
    const DefaultModelSetting = {
      findOne: sinon.stub().resolves(null),
      findAll: sinon.stub(),
      create: sinon.stub().resolves(),
      update: sinon.stub().resolves(),
    };
    const updateDefaultModel = sinon.stub().resolves();
    const app = loadTestApp({
      Platform: { findOne: sinon.stub(), findAll: sinon.stub(), create: sinon.stub() },
      Model: { findOne: sinon.stub(), destroy: sinon.stub() },
      checkLlmApiAvailability: sinon.stub(),
      DefaultModelSetting,
      updateDefaultModel,
      UserSearchSetting: { findOne: sinon.stub() },
    });

    const response = await request(app.callback())
      .put('/api/default_model_setting')
      .send({ setting_type: 'assistant', model_id: 5, config: { temperature: 0.4 } });

    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal({ code: 0, msg: '成功' });
    expect(DefaultModelSetting.create.calledOnceWithExactly({
      setting_type: 'assistant',
      model_id: 5,
      config: { temperature: 0.4 },
      user_id: 1,
    })).to.equal(true);
    expect(updateDefaultModel.calledOnceWithExactly('assistant')).to.equal(true);
  });
});