import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const result = await (prisma as any).$queryRaw`DESCRIBE equipment_transfer_order_items`;
    console.log('Columns in equipment_transfer_order_items:');
    result.forEach((row: any) => {
      console.log(`- ${row.Field} (${row.Type})`);
    });
  } catch (e) {
    console.error('Error describing table:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
