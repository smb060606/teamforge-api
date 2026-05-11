import { prisma } from '../../config/database';
import { NotFoundError } from '../../shared/errors';
import { PaginationParams } from '../../shared/types';
import { getPrismaSkipTake, buildPaginatedResponse } from '../../shared/pagination';
import { UpdateUserInput } from './users.schema';

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  avatarUrl: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
};

export async function listUsers(params: PaginationParams) {
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      select: USER_SELECT,
      orderBy: { createdAt: params.sortOrder ?? 'desc' },
      ...getPrismaSkipTake(params),
    }),
    prisma.user.count(),
  ]);

  return buildPaginatedResponse(users, total, params);
}

export async function getUser(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      ...USER_SELECT,
      ownedTeams: { select: { id: true, name: true, slug: true } },
      teamMemberships: {
        select: {
          role: true,
          team: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });

  if (!user) {
    throw new NotFoundError('User', id);
  }

  return user;
}

export async function updateUser(id: string, input: UpdateUserInput) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('User', id);
  }

  return prisma.user.update({
    where: { id },
    data: input,
    select: USER_SELECT,
  });
}

export async function deleteUser(id: string) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('User', id);
  }

  await prisma.user.delete({ where: { id } });
}
