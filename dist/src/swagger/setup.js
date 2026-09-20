import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from './openapi.js';
const redocHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Mimir API — ReDoc</title>
  <style>
    body { margin: 0; padding: 0; font-family: system-ui, sans-serif; }
    .docs-bar {
      display: flex;
      gap: 1rem;
      align-items: center;
      padding: 0.65rem 1.25rem;
      border-bottom: 1px solid #e5e7eb;
      background: #fafafa;
      font-size: 0.875rem;
    }
    .docs-bar a { color: #0b6bcb; text-decoration: none; }
    .docs-bar a:hover { text-decoration: underline; }
    .docs-bar span { color: #6b7280; }
  </style>
</head>
<body>
  <nav class="docs-bar">
    <strong>Mimir API</strong>
    <a href="/api/docs">Swagger UI</a>
    <a href="/api/redoc">ReDoc</a>
    <a href="/api/docs.json">OpenAPI JSON</a>
    <span>Demo: demo@mimir.local / demo1234</span>
  </nav>
  <redoc
    spec-url="/api/docs.json"
    expand-responses="200,201"
    path-in-middle-panel="true"
    hide-hostname="true"
  ></redoc>
  <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
</body>
</html>`;
/** Stable Swagger chrome — avoid relying on flaky info markdown rendering. */
const swaggerCustomCss = `
  .swagger-ui .topbar { display: none !important; }

  /* Compact, stable info header */
  .swagger-ui .information-container.wrapper {
    margin: 0;
    padding: 0;
  }
  .swagger-ui .info {
    margin: 1rem 0 0.5rem;
  }
  .swagger-ui .info .title {
    font-size: 1.5rem;
    font-family: system-ui, sans-serif;
  }
  .swagger-ui .info .title small {
    display: none !important;
  }
  .swagger-ui .info .description,
  .swagger-ui .info .description p,
  .swagger-ui .info .description * {
    font-family: system-ui, sans-serif !important;
    font-size: 0.9rem !important;
    line-height: 1.45 !important;
  }
  .swagger-ui .info .description pre,
  .swagger-ui .info .description code,
  .swagger-ui .info .description table {
    display: none !important;
  }
  .swagger-ui .scheme-container {
    box-shadow: none;
    background: transparent;
    padding: 0.5rem 0 1rem;
    margin: 0;
  }
  .swagger-ui .scheme-container .schemes {
    align-items: center;
  }

  /* Docs nav injected below */
  .mimir-docs-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem 1.25rem;
    align-items: center;
    padding: 0.75rem 1.25rem;
    margin: 0;
    border-bottom: 1px solid #e5e7eb;
    background: #fafafa;
    font-family: system-ui, sans-serif;
    font-size: 0.875rem;
  }
  .mimir-docs-bar a {
    color: #0b6bcb;
    text-decoration: none;
  }
  .mimir-docs-bar a:hover { text-decoration: underline; }
  .mimir-docs-bar .muted { color: #6b7280; }
`;
const swaggerCustomJs = `
(function () {
  function injectBar() {
    if (document.querySelector('.mimir-docs-bar')) return;
    var host = document.querySelector('.swagger-ui');
    if (!host || !host.parentNode) return;
    var bar = document.createElement('nav');
    bar.className = 'mimir-docs-bar';
    bar.innerHTML =
      '<strong>Mimir API</strong>' +
      '<a href="/api/docs">Swagger UI</a>' +
      '<a href="/api/redoc">ReDoc</a>' +
      '<a href="/api/docs.json">OpenAPI JSON</a>' +
      '<span class="muted">Demo: demo@mimir.local / demo1234</span>';
    host.parentNode.insertBefore(bar, host);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectBar);
  } else {
    injectBar();
  }
  setTimeout(injectBar, 300);
  setTimeout(injectBar, 1000);
})();
`;
export const setupSwagger = (app) => {
    app.get('/api/docs.json', (_req, res) => {
        res.json(openApiSpec);
    });
    app.get('/api/redoc', (_req, res) => {
        res.type('html').send(redocHtml);
    });
    // Serve a tiny JS file for the stable header bar (swagger-ui-express customJs expects a URL).
    app.get('/api/docs-assets/header.js', (_req, res) => {
        res.type('application/javascript').send(swaggerCustomJs);
    });
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
        customSiteTitle: 'Mimir API — Swagger',
        customCss: swaggerCustomCss,
        customJs: '/api/docs-assets/header.js',
        swaggerOptions: {
            persistAuthorization: true,
            displayRequestDuration: true,
            filter: true,
            tryItOutEnabled: true,
            docExpansion: 'list',
            defaultModelsExpandDepth: -1,
            defaultModelExpandDepth: 1,
            tagsSorter: 'alpha',
            operationsSorter: 'method',
        },
    }));
};
