import { Prisma, PrismaClient } from "@generated/prisma/client";

export interface CreateReleaseNoteData {
    version_label: string;
    title: string;
    body: string;
    created_by_staff_id: number;
}

export interface GetReleaseNotesFilters {
    page?: number;
    limit?: number;
}

export class ReleaseNoteRepository {
    constructor(private readonly prisma: PrismaClient) {}

    public async create(data: CreateReleaseNoteData, tx?: Prisma.TransactionClient) {
        const db = tx ?? this.prisma;
        return db.releaseNote.create({ data });
    }

    public async findMany(filters: GetReleaseNotesFilters) {
        const { page = 1, limit = 20 } = filters;

        return this.prisma.releaseNote.findMany({
            orderBy: { published_at: "desc" },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                created_by_staff: {
                    select: { staff_id: true, first_name: true, last_name: true },
                },
            },
        });
    }

    public async count() {
        return this.prisma.releaseNote.count();
    }
}
