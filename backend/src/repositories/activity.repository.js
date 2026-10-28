import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

class ActivityRepository {
  async create(data) {
    return await prisma.activity.create({ data });
  }

  async update(id, data) {
    return await prisma.activity.update({
      where: { id },
      data,
    });
  }

  async findById(id) {
    return await prisma.activity.findUnique({ where: { id } });
  }
}

export default new ActivityRepository();