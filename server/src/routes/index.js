const healthRouter = require('./health');
const trendsRouter = require('./trends');
const summarizeRouter = require('./summarize');

// 将所有路由挂载到应用
function mountRoutes(app) {
  app.use('/health', healthRouter);
  app.use('/api/trends', trendsRouter);
  app.use('/api/summarize', summarizeRouter);
}

module.exports = mountRoutes;
