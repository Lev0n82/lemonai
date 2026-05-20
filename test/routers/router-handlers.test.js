const { expect } = require('chai');
const sinon = require('sinon');
const Module = require('module');

function createRouterMock() {
  const routes = [];
  const router = {
    get(path, handler) {
      routes.push({ method: 'get', path, handler });
      return this;
    },
    post(path, handler) {
      routes.push({ method: 'post', path, handler });
      return this;
    },
    put(path, handler) {
      routes.push({ method: 'put', path, handler });
      return this;
    },
    delete(path, handler) {
      routes.push({ method: 'delete', path, handler });
      return this;
    },
    use() {
      return this;
    },
    prefix() {
      return this;
    },
    routes() {
      return { __routes: routes };
    }
  };

  return { router, routes };
}

function loadModuleWithMocks(moduleRelativePath, stubs) {
  const modulePath = require.resolve(moduleRelativePath);
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

function findRoute(routeTable, method, path) {
  const match = routeTable.__routes.find((route) => route.method === method && route.path === path);
  expect(match, `missing ${method.toUpperCase()} ${path} route`).to.not.equal(undefined);
  return match.handler;
}

describe('router handlers', () => {
  describe('platform router', () => {
    it('fails deletion when the platform does not exist', async () => {
      const routerMock = createRouterMock();
      const response = { fail: sinon.stub() };
      const Platform = { findOne: sinon.stub().resolves(null) };
      const Model = { destroy: sinon.stub() };

      const routeTable = loadModuleWithMocks('../../src/routers/platform/platform', {
        'koa-router': () => routerMock.router,
        '@src/models/Platform': Platform,
        '@src/models/Model': Model,
        '@src/utils/check_llm_api_availability': sinon.stub(),
      });

      const handler = findRoute(routeTable, 'delete', '/:platform_id');
      await handler({ params: { platform_id: 1 }, response });

      expect(response.fail.calledOnceWithExactly({}, 'Platform does not exist')).to.equal(true);
      expect(Model.destroy.called).to.equal(false);
    });

    it('blocks deletion of system platforms', async () => {
      const routerMock = createRouterMock();
      const response = { fail: sinon.stub() };
      const platform = { source_type: 'system', destroy: sinon.stub() };
      const Platform = { findOne: sinon.stub().resolves(platform) };

      const routeTable = loadModuleWithMocks('../../src/routers/platform/platform', {
        'koa-router': () => routerMock.router,
        '@src/models/Platform': Platform,
        '@src/models/Model': { destroy: sinon.stub() },
        '@src/utils/check_llm_api_availability': sinon.stub(),
      });

      const handler = findRoute(routeTable, 'delete', '/:platform_id');
      await handler({ params: { platform_id: 2 }, response });

      expect(response.fail.calledOnceWithExactly({}, 'system platform cannot be deleted')).to.equal(true);
      expect(platform.destroy.called).to.equal(false);
    });

    it('deletes user platforms and their models', async () => {
      const routerMock = createRouterMock();
      const response = { success: sinon.stub() };
      const platform = { source_type: 'user', destroy: sinon.stub().resolves() };
      const Platform = { findOne: sinon.stub().resolves(platform) };
      const Model = { destroy: sinon.stub().resolves() };

      const routeTable = loadModuleWithMocks('../../src/routers/platform/platform', {
        'koa-router': () => routerMock.router,
        '@src/models/Platform': Platform,
        '@src/models/Model': Model,
        '@src/utils/check_llm_api_availability': sinon.stub(),
      });

      const handler = findRoute(routeTable, 'delete', '/:platform_id');
      await handler({ params: { platform_id: 3 }, response });

      expect(platform.destroy.calledOnce).to.equal(true);
      expect(Model.destroy.calledOnceWithExactly({ where: { platform_id: 3 } })).to.equal(true);
      expect(response.success.calledOnce).to.equal(true);
    });

    it('proxies API availability checks through the helper', async () => {
      const routerMock = createRouterMock();
      const response = { success: sinon.stub() };
      const checkAvailability = sinon.stub().resolves({ status: true, message: 'ok' });

      const routeTable = loadModuleWithMocks('../../src/routers/platform/platform', {
        'koa-router': () => routerMock.router,
        '@src/models/Platform': { create: sinon.stub(), findAll: sinon.stub(), findOne: sinon.stub() },
        '@src/models/Model': { destroy: sinon.stub() },
        '@src/utils/check_llm_api_availability': checkAvailability,
      });

      const handler = findRoute(routeTable, 'post', '/check_api_availability');
      await handler({
        request: { body: { base_url: 'http://localhost:11434/v1', api_key: 'secret', model: 'glm-5.1:cloud' } },
        response,
      });

      expect(checkAvailability.calledOnceWithExactly('http://localhost:11434/v1', 'secret', 'glm-5.1:cloud')).to.equal(true);
      expect(response.success.calledOnceWithExactly({ status: true, message: 'ok' })).to.equal(true);
    });
  });

  describe('default model setting router', () => {
    it('creates a new default model setting and refreshes cache when none exists', async () => {
      const routerMock = createRouterMock();
      const response = { success: sinon.stub() };
      const DefaultModelSetting = {
        findOne: sinon.stub().resolves(null),
        create: sinon.stub().resolves(),
        update: sinon.stub().resolves(),
      };
      const updateDefaultModel = sinon.stub().resolves();

      const routeTable = loadModuleWithMocks('../../src/routers/default_model_setting/default_model_setting', {
        'koa-router': () => routerMock.router,
        '@src/models/DefaultModelSetting': DefaultModelSetting,
        '@src/models/Model': { findOne: sinon.stub() },
        '@src/utils/default_model': { updateDefaultModel },
        '@src/models/Platform': { findOne: sinon.stub() },
        '@src/models/UserSearchSetting': { findOne: sinon.stub() },
      });

      const handler = findRoute(routeTable, 'put', '/');
      await handler({
        state: { user: { id: 9 } },
        request: { body: { setting_type: 'assistant', model_id: 5, config: { temperature: 0.3 } } },
        response,
      });

      expect(DefaultModelSetting.create.calledOnceWithExactly({
        setting_type: 'assistant',
        model_id: 5,
        config: { temperature: 0.3 },
        user_id: 9,
      })).to.equal(true);
      expect(DefaultModelSetting.update.called).to.equal(false);
      expect(updateDefaultModel.calledOnceWithExactly('assistant')).to.equal(true);
      expect(response.success.calledOnce).to.equal(true);
    });

    it('updates an existing default model setting and refreshes cache', async () => {
      const routerMock = createRouterMock();
      const response = { success: sinon.stub() };
      const DefaultModelSetting = {
        findOne: sinon.stub().resolves({ id: 1 }),
        create: sinon.stub().resolves(),
        update: sinon.stub().resolves(),
      };
      const updateDefaultModel = sinon.stub().resolves();

      const routeTable = loadModuleWithMocks('../../src/routers/default_model_setting/default_model_setting', {
        'koa-router': () => routerMock.router,
        '@src/models/DefaultModelSetting': DefaultModelSetting,
        '@src/models/Model': { findOne: sinon.stub() },
        '@src/utils/default_model': { updateDefaultModel },
        '@src/models/Platform': { findOne: sinon.stub() },
        '@src/models/UserSearchSetting': { findOne: sinon.stub() },
      });

      const handler = findRoute(routeTable, 'put', '/');
      await handler({
        state: { user: { id: 4 } },
        request: { body: { setting_type: 'translation', model_id: 7, config: { top_p: 0.9 } } },
        response,
      });

      expect(DefaultModelSetting.update.calledOnceWithExactly(
        { model_id: 7, config: { top_p: 0.9 } },
        { where: { setting_type: 'translation', user_id: 4 } }
      )).to.equal(true);
      expect(DefaultModelSetting.create.called).to.equal(false);
      expect(updateDefaultModel.calledOnceWithExactly('translation')).to.equal(true);
      expect(response.success.calledOnce).to.equal(true);
    });

    it('reports missing setup when no enabled platform, default model, or search setting exist', async () => {
      const routerMock = createRouterMock();
      const response = { success: sinon.stub() };

      const routeTable = loadModuleWithMocks('../../src/routers/default_model_setting/default_model_setting', {
        'koa-router': () => routerMock.router,
        '@src/models/DefaultModelSetting': { findOne: sinon.stub().resolves(null) },
        '@src/models/Model': { findOne: sinon.stub() },
        '@src/utils/default_model': { updateDefaultModel: sinon.stub() },
        '@src/models/Platform': { findOne: sinon.stub().resolves(null) },
        '@src/models/UserSearchSetting': { findOne: sinon.stub().resolves(null) },
      });

      const handler = findRoute(routeTable, 'get', '/check');
      await handler({ response });

      expect(response.success.calledOnceWithExactly({
        has_enabled_platform: false,
        has_default_platform: false,
        has_search_setting: false,
      })).to.equal(true);
    });

    it('reports disabled default platform when the chosen assistant model points to a disabled platform', async () => {
      const routerMock = createRouterMock();
      const response = { success: sinon.stub() };
      const platformFindOne = sinon.stub();
      platformFindOne.onFirstCall().resolves({ id: 1, is_enabled: true });
      platformFindOne.onSecondCall().resolves({ id: 2, is_enabled: false });

      const routeTable = loadModuleWithMocks('../../src/routers/default_model_setting/default_model_setting', {
        'koa-router': () => routerMock.router,
        '@src/models/DefaultModelSetting': { findOne: sinon.stub().resolves({ model_id: 12 }) },
        '@src/models/Model': { findOne: sinon.stub().resolves({ platform_id: 2 }) },
        '@src/utils/default_model': { updateDefaultModel: sinon.stub() },
        '@src/models/Platform': { findOne: platformFindOne },
        '@src/models/UserSearchSetting': { findOne: sinon.stub().resolves({ id: 5 }) },
      });

      const handler = findRoute(routeTable, 'get', '/check');
      await handler({ response });

      expect(response.success.calledOnceWithExactly({
        has_enabled_platform: true,
        has_default_platform: false,
        has_search_setting: true,
      })).to.equal(true);
    });
  });
});