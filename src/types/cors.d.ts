declare module 'cors' {
    import type { Request, RequestHandler } from 'express';

    type StaticOrigin = boolean | string | RegExp | Array<boolean | string | RegExp>;

    interface CorsOptions {
        origin?:
            | StaticOrigin
            | ((
                  origin: string | undefined,
                  callback: (err: Error | null, allow?: StaticOrigin) => void,
              ) => void);
        methods?: string | string[];
        allowedHeaders?: string | string[];
        exposedHeaders?: string | string[];
        credentials?: boolean;
        maxAge?: number;
        preflightContinue?: boolean;
        optionsSuccessStatus?: number;
    }

    type CorsOptionsDelegate = (
        req: Request,
        callback: (err: Error | null, options?: CorsOptions) => void,
    ) => void;

    const cors: (options?: CorsOptions | CorsOptionsDelegate) => RequestHandler;

    export default cors;
}
