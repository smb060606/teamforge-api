import { prisma } from '../../config/database';
import { NotFoundError, ConflictError, ForbiddenError } from '../../shared/errors';
import { PaginationParams } from '../../shared/types';
import { getPrismaSkipTake, buildPaginatedResponse } from '../../shared/pagination';
import { slugify } from '../../shared/utils';
import { CreateTeamInput, UpdateTeamInput, AddMemberInput } from './teams.schema';

export async function listTeams(params: PaginationParams) {
  const [teams, total] = await Promise.all([
    prisma.team.findMany({
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { members: true, projects: true } },
      },
      orderBy: { createdAt: params.sortOrder ?? 'desc' },
      ...getPrismaSkipTake(params),
    }),
    prisma.team.count(),
  ]);

  return buildPaginatedResponse(teams, total, params);
}

export async function getTeam(id: string) {
  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      },
      projects: {
        select: { id: true, name: true, slug: true, status: true },
      },
    },
  });

  if (!team) {
    throw new NotFoundError('Team', id);
  }

  return team;
}

export async function createTeam(ownerId: string, input: CreateTeamInput) {
  const slug = slugify(input.name);

  const existingSlug = await prisma.team.findUnique({ where: { slug } });
  if (existingSlug) {
    throw new ConflictError(`Team with slug '${slug}' already exists`);
  }

  const team = await prisma.team.create({
    data: {
      name: input.name,
      slug,
      description: input.description,
      ownerId,
      members: {
        create: { userId: ownerId, role: 'LEAD' },
      },
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  return team;
}

export async function updateTeam(id: string, userId: string, input: UpdateTeamInput) {
  const team = await prisma.team.findUnique({ where: { id } });
  if (!team) {
    throw new NotFoundError('Team', id);
  }

  if (team.ownerId !== userId) {
    const membership = await prisma.teamMember.findUnique({
      where: { userId_teamId: { userId, teamId: id } },
    });
    if (!membership || membership.role !== 'LEAD') {
      throw new ForbiddenError('Only team owner or lead can update team');
    }
  }

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) {
    data.name = input.name;
    data.slug = slugify(input.name);
  }
  if (input.description !== undefined) {
    data.description = input.description;
  }

  return prisma.team.update({
    where: { id },
    data,
    include: {
      owner: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function deleteTeam(id: string, userId: string) {
  const team = await prisma.team.findUnique({ where: { id } });
  if (!team) {
    throw new NotFoundError('Team', id);
  }

  if (team.ownerId !== userId) {
    throw new ForbiddenError('Only the team owner can delete the team');
  }

  await prisma.team.delete({ where: { id } });
}

export async function addMember(teamId: string, userId: string, input: AddMemberInput) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) {
    throw new NotFoundError('Team', teamId);
  }

  const targetUser = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!targetUser) {
    throw new NotFoundError('User', input.userId);
  }

  const existing = await prisma.teamMember.findUnique({
    where: { userId_teamId: { userId: input.userId, teamId } },
  });
  if (existing) {
    throw new ConflictError('User is already a member of this team');
  }

  return prisma.teamMember.create({
    data: {
      userId: input.userId,
      teamId,
      role: input.role as any,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function removeMember(teamId: string, memberId: string) {
  const membership = await prisma.teamMember.findFirst({
    where: { id: memberId, teamId },
  });
  if (!membership) {
    throw new NotFoundError('Team member', memberId);
  }

  await prisma.teamMember.delete({ where: { id: memberId } });
}
