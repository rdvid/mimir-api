declare module 'morgan' {
    import type { RequestHandler } from 'express';

    type Format = 'combined' | 'common' | 'dev' | 'short' | 'tiny' | string;

    const morgan: (format: Format) => RequestHandler;

    export default morgan;
}
