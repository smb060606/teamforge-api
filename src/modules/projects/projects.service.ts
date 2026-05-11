import { prisma } from '../../config/database';
import { NotFoundError, ConflictError, ForbiddenError } from '../../shared/errors';
import { PaginationParams } from '../../shared/types';
import { getPrismaSkipTake, buildPaginatedResponse } from '../../shared/pagination';
import { slugify } from '../../shared/utils';
import { CreateProjectInput, UpdateProjectInput } from './projects.schema';

export async function listProjects(params: PaginationParams, teamId?: string) {
  const where = teamId ? { teamId } : {};

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      include: {
        team: { select: { id: true, name: true, slug: true } },
        _count: { select: { deployments: true, incidents: true } },
      },
      orderBy: { createdAt: params.sortOrder ?? 'desc' },
      ...getPrismaSkipTake(params),
    }),
    prisma.project.count({ where }),
  ]);

  return buildPaginatedResponse(projects, total, params);
}

export async function getProject(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          slug: true,
          owner: { select: { id: true, name: true } },
        },
      },
      _count: { select: { deployments: true, incidents: true } },
    },
  });

  if (!project) {
    throw new NotFoundError('Project', id);
  }

  return project;
}

export async function createProject(userId: string, input: CreateProjectInput) {
  const team = await prisma.team.findUnique({ where: { id: input.teamId } });
  if (!team) {
    throw new NotFoundError('Team', input.teamId);
  }

  // Verify user is a member of the team
  const membership = await prisma.teamMember.findUnique({
    where: { userId_teamId: { userId, teamId: input.teamId } },
  });
  if (!membership && team.ownerId !== userId) {
    throw new ForbiddenError('You must be a team member to create projects');
  }

  const slug = slugify(input.name);
  const existingSlug = await prisma.project.findUnique({ where: { slug } });
  if (existingSlug) {
    throw new ConflictError(`Project with slug '${slug}' already exists`);
  }

  return prisma.project.create({
    data: {
      name: input.name,
      slug,
      description: input.description,
      teamId: input.teamId,
      repositoryUrl: input.repositoryUrl,
    },
    include: {
      team: { select: { id: true, name: true, slug: true } },
    },
  });
}

export async function updateProject(id: string, input: UpdateProjectInput) {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    throw new NotFoundError('Project', id);
  }

  const data: Record<string, unknown> = { ...input };
  if (input.name) {
    data.slug = slugify(input.name);
  }

  return prisma.project.update({
    where: { id },
    data,
    include: {
      team: { select: { id: true, name: true, slug: true } },
    },
  });
}

export async function deleteProject(id: string) {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    throw new NotFoundError('Project', id);
  }

  await prisma.project.delete({ where: { id } });
}
