import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
const prisma = new PrismaClient();

async function main() {
  const orders = await (prisma as any).equipment_transfer_orders.findMany({
    orderBy: { created_at: 'desc' },
    take: 2,
    select: {
      id: true,
      order_no: true,
      from_manager: true,
      from_manager_id: true,
      to_manager: true,
      to_manager_id: true,
      total_items: true,
      status: true,
    }
  });

  const result: any[] = [];
  for (const o of orders) {
    const itemCount = await (prisma as any).equipment_transfer_order_items.count({ where: { order_id: o.id } });
    result.push({
      order_no: o.order_no,
      from_manager: o.from_manager,
      from_manager_id: o.from_manager_id,
      to_manager: o.to_manager,
      to_manager_id: o.to_manager_id,
      total_items: o.total_items,
      db_items_count: itemCount,
      status: o.status,
    });
  }

  fs.writeFileSync('tmp/db_result.json', JSON.stringify(result, null, 2), 'utf8');
  console.log('Done. Check tmp/db_result.json');
}

main().finally(() => prisma.$disconnect());
