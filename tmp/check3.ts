import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const orders = await (prisma as any).equipment_transfer_orders.findMany({
      orderBy: { created_at: 'desc' },
      take: 2,
    });

    for (const o of orders) {
      const itemCount = await (prisma as any).equipment_transfer_order_items.count({ where: { order_id: o.id } });
      console.log(`ORDER: ${o.order_no}`);
      console.log(`  from_manager: [${o.from_manager}]`);
      console.log(`  from_manager_id: [${o.from_manager_id}]`);
      console.log(`  to_manager: [${o.to_manager}]`);
      console.log(`  to_manager_id: [${o.to_manager_id}]`);
      console.log(`  items_count: ${itemCount}`);
      console.log(`  status: ${o.status}`);
      console.log('---');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

main().finally(() => prisma.$disconnect());
