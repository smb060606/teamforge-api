import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../shared/types';
import { ForbiddenError } from '../shared/errors';

export function authorize(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new ForbiddenError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError(`Role '${req.user.role}' is not authorized for this action`));
    }

    next();
  };
}
