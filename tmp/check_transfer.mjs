import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 1. Check recent transfer orders in DB
  const orders = await prisma.equipment_transfer_orders.findMany({
    orderBy: { created_at: 'desc' },
    take: 3,
    select: {
      id: true,
      order_no: true,
      from_manager: true,
      from_manager_id: true,
      to_manager: true,
      to_manager_id: true,
      from_warehouse_name: true,
      from_project_name: true,
      to_warehouse_name: true,
      to_project_name: true,
      status: true,
      total_items: true,
      created_at: true
    }
  });

  console.log('=== Recent Transfer Orders ===');
  for (const o of orders) {
    console.log(`\nOrder: ${o.order_no} (${o.id})`);
    console.log(`  from_manager: "${o.from_manager}" (id: ${o.from_manager_id})`);
    console.log(`  to_manager: "${o.to_manager}" (id: ${o.to_manager_id})`);
    console.log(`  from: ${o.from_warehouse_name || o.from_project_name}`);
    console.log(`  to: ${o.to_warehouse_name || o.to_project_name}`);
    console.log(`  status: ${o.status}, total_items: ${o.total_items}`);

    // Check items count
    const itemCount = await prisma.equipment_transfer_order_items.count({
      where: { order_id: o.id }
    });
    console.log(`  items in DB: ${itemCount}`);
  }

  // 2. Check workflow instances for equipment-transfer
  const instances = await prisma.workflow_instances.findMany({
    where: {
      definition_key: { in: ['equipment-transfer', 'preset-equipment-transfer'] }
    },
    orderBy: { created_at: 'desc' },
    take: 3,
    select: {
      id: true,
      title: true,
      definition_key: true,
      business_id: true,
      variables: true,
      created_at: true
    }
  });

  console.log('\n=== Recent Workflow Instances ===');
  for (const inst of instances) {
    console.log(`\nInstance: ${inst.id}`);
    console.log(`  title: ${inst.title}`);
    console.log(`  definition_key: ${inst.definition_key}`);
    console.log(`  business_id: ${inst.business_id}`);
    
    let vars = {};
    try {
      vars = typeof inst.variables === 'string' ? JSON.parse(inst.variables) : (inst.variables || {});
    } catch(e) {}
    
    const fd = vars.formData || {};
    console.log(`  formData keys: ${Object.keys(fd).join(', ')}`);
    console.log(`  formData._fromManagerName: ${fd._fromManagerName}`);
    console.log(`  formData._toManagerName: ${fd._toManagerName}`);
    console.log(`  formData.items: ${fd.items ? `array of ${fd.items.length}` : 'undefined'}`);
    console.log(`  formData.fromManagerId: ${fd.fromManagerId}`);
    console.log(`  formData.fromLocationType: ${fd.fromLocationType}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
