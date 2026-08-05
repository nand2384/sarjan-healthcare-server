import { PrismaClient } from "@generated/prisma/client";

export class SystemSettingRepository {
    constructor(private readonly prisma: PrismaClient) {}

    public async findByKey(key: string) {
        return this.prisma.systemSetting.findUnique({ where: { setting_key: key } });
    }

    public async upsert(key: string, value: string) {
        return this.prisma.systemSetting.upsert({
            where: { setting_key: key },
            create: { setting_key: key, setting_value: value },
            update: { setting_value: value },
        });
    }
}
