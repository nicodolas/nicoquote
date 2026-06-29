import { PrismaClient } from '../../generated/prisma/index';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../config/env';

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export interface QuoteFilters {
    author?: string;
    tag?: string;
    limit?: number;
}

export class QuoteService {
    // 1.1.1 — filter by author (case-insensitive), tag, limit (default 50, max 100)
    async getAll(filters: QuoteFilters = {}) {
        const where: Record<string, unknown> = {};

        if (filters.author) {
            where.author = { contains: filters.author, mode: 'insensitive' };
        }

        if (filters.tag) {
            where.tags = { has: filters.tag };
        }

        const take = Math.min(filters.limit ?? 50, 100);

        return prisma.quote.findMany({ where, take, orderBy: { createdAt: 'desc' } });
    }

    // 1.1.2 — return null if not found
    async getById(id: string) {
        return prisma.quote.findUnique({ where: { id } });
    }

    // 1.1.3 — random quote; return null if DB is empty
    async getRandom() {
        const count = await prisma.quote.count();
        if (count === 0) return null;

        const skip = Math.floor(Math.random() * count);
        return prisma.quote.findFirst({ skip });
    }

    // 1.1.4 — insert new quote, return created record
    async create(data: { content: string; author: string; tags?: string[] }) {
        return prisma.quote.create({ data });
    }

    // 1.1.5 — partial update; return null if not found
    async update(id: string, data: { content?: string; author?: string; tags?: string[] }) {
        const existing = await prisma.quote.findUnique({ where: { id } });
        if (!existing) return null;

        return prisma.quote.update({ where: { id }, data });
    }

    // 1.1.6 — delete; return null if not found
    async delete(id: string) {
        const existing = await prisma.quote.findUnique({ where: { id } });
        if (!existing) return null;

        return prisma.quote.delete({ where: { id } });
    }
}

export const quoteService = new QuoteService();
