import type { Express, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from './openapi.js';

const OPENAPI_FILENAME = 'mimir-openapi.json';

const sendOpenApiJson = (req: Request, res: Response, asDownload: boolean): void => {
    if (asDownload || req.query.download === '1' || req.query.download === 'true') {
        res.setHeader('Content-Disposition', `attachment; filename="${OPENAPI_FILENAME}"`);
    }
    res.type('application/json').send(JSON.stringify(openApiSpec, null, 2));
};

const redocHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <title>Mimir API — ReDoc</title>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background: #0b0d10;
      color: #e8eaed;
    }
  </style>
</head>
<body>
  <div id="redoc-container"></div>
  <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
  <script>
    Redoc.init(
      '/api/docs.json',
      {
        expandResponses: '200,201',
        pathInMiddlePanel: true,
        hideDownloadButton: false,
        theme: {
          colors: {
            primary: { main: '#6ea8fe' },
            success: { main: '#3dd68c' },
            warning: { main: '#ffc107' },
            error: { main: '#ff6b6b' },
            text: {
              primary: '#e8eaed',
              secondary: '#9aa0a6',
            },
            http: {
              get: '#61affe',
              post: '#49cc90',
              put: '#fca130',
              patch: '#50e3c2',
              delete: '#f93e3e',
            },
            border: {
              dark: '#2a2f3a',
              light: '#1e222a',
            },
          },
          sidebar: {
            backgroundColor: '#11141a',
            textColor: '#e8eaed',
            activeTextColor: '#6ea8fe',
            groupItems: {
              activeBackgroundColor: '#1a1f29',
              activeTextColor: '#6ea8fe',
              textTransform: 'none',
            },
            level1Items: {
              activeBackgroundColor: '#1a1f29',
              activeTextColor: '#ffffff',
              textTransform: 'none',
            },
          },
          rightPanel: {
            backgroundColor: '#0f1218',
            textColor: '#e8eaed',
          },
          typography: {
            fontSize: '14px',
            fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
            headings: {
              fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
              fontWeight: '600',
            },
            code: {
              fontSize: '13px',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              backgroundColor: '#1a1f29',
              color: '#e8eaed',
            },
            links: {
              color: '#6ea8fe',
              visited: '#6ea8fe',
              hover: '#9ec1ff',
            },
          },
          schema: {
            nestedBackground: '#151922',
            typeNameColor: '#9aa0a6',
            typeTitleColor: '#e8eaed',
          },
        },
      },
      document.getElementById('redoc-container'),
    );
  </script>
</body>
</html>`;

export const setupSwagger = (app: Express): void => {
    app.get('/api/docs.json', (req: Request, res: Response) => {
        sendOpenApiJson(req, res, false);
    });

    app.get('/api/docs/export', (_req: Request, res: Response) => {
        sendOpenApiJson(_req, res, true);
    });

    app.get('/api/redoc', (_req: Request, res: Response) => {
        res.type('html').send(redocHtml);
    });

    app.use(
        '/api/docs',
        swaggerUi.serve,
        swaggerUi.setup(openApiSpec, {
            customSiteTitle: 'Mimir API — Swagger',
            customCss: `
              .swagger-ui .topbar { display: none }
              .swagger-ui .info .title small { display: none }
              .swagger-ui .info { margin: 24px 0 12px; }
              .swagger-ui .info .description p {
                font-size: 14px;
                line-height: 1.5;
                margin: 0 0 8px;
              }
            `,
            swaggerOptions: {
                persistAuthorization: true,
                displayRequestDuration: true,
                filter: true,
                tryItOutEnabled: true,
                docExpansion: 'list',
                tagsSorter: 'alpha',
                operationsSorter: 'method',
            },
        }),
    );
};
