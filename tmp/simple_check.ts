import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const instances = await (prisma as any).workflow_instances.findMany({
    orderBy: { created_at: 'desc' },
    take: 5,
  });

  console.log('INSTANCES:');
  for (const i of instances) {
    console.log(`- ID: ${i.id}, Key: ${i.definition_key}, BizID: ${i.business_id}`);
    try {
      const vars = typeof i.variables === 'string' ? JSON.parse(i.variables) : i.variables;
      console.log(`  transferOrderId: ${vars?.formData?.transferOrderId}`);
    } catch(e) {}
  }

  const orders = await (prisma as any).equipment_transfer_orders.findMany({
    orderBy: { created_at: 'desc' },
    take: 3,
  });

  console.log('ORDERS:');
  for (const o of orders) {
    console.log(`- ID: ${o.id}, No: ${o.order_no}`);
  }
}

main().finally(() => prisma.$disconnect());
