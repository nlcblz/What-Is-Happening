const healthRouter = require('./health');
const trendsRouter = require('./trends');
const summarizeRouter = require('./summarize');
const sourcesRouter = require('./sources');
const postsRouter = require('./posts');
const authRouter = require('./auth');

// 将所有路由挂载到应用
function mountRoutes(app) {
  app.use('/health', healthRouter);
  app.use('/api/trends', trendsRouter);
  app.use('/api/summarize', summarizeRouter);
  app.use('/api/sources', sourcesRouter);
  app.use('/api/posts', postsRouter);
  app.use('/api/auth', authRouter);
}

module.exports = mountRoutes;
