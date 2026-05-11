import { Router } from 'express';
import * as usersController from './users.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';
import { validateRequest } from '../../middleware/validateRequest';
import { updateUserSchema } from './users.schema';

const router = Router();

router.get('/', authenticate, usersController.listUsers);
router.get('/:id', authenticate, usersController.getUser);
router.put('/:id', authenticate, validateRequest(updateUserSchema), usersController.updateUser);
router.delete('/:id', authenticate, authorize('ADMIN'), usersController.deleteUser);

export default router;
