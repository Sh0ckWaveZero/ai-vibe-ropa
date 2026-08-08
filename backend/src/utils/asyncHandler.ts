import type { NextFunction, Request, Response } from 'express';

// Express 5 represents wildcard route parameters as string arrays. This app
// only uses named parameters, so its async handlers can use the flat shape.
type FlatRouteParams = Record<string, string>;
type Handler = (req: Request<FlatRouteParams>, res: Response, next: NextFunction) => Promise<unknown>;

export function asyncHandler(fn: Handler) {
  return (req: Request<FlatRouteParams>, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
