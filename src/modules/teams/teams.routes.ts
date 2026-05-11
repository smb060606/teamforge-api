import { Router } from 'express';
import * as teamsController from './teams.controller';
import { authenticate } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validateRequest';
import { createTeamSchema, updateTeamSchema, addMemberSchema } from './teams.schema';

const router = Router();

router.get('/', authenticate, teamsController.listTeams);
router.get('/:id', authenticate, teamsController.getTeam);
router.post('/', authenticate, validateRequest(createTeamSchema), teamsController.createTeam);
router.put('/:id', authenticate, validateRequest(updateTeamSchema), teamsController.updateTeam);
router.delete('/:id', authenticate, teamsController.deleteTeam);

// Members
router.post('/:id/members', authenticate, validateRequest(addMemberSchema), teamsController.addMember);
router.delete('/:id/members/:memberId', authenticate, teamsController.removeMember);

export default router;
