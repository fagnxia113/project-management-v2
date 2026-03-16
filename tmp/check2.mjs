import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.equipment_transfer_orders.findMany({
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
    }
  });

  for (const o of orders) {
    const itemCount = await prisma.equipment_transfer_order_items.count({ where: { order_id: o.id } });
    console.log(`[ORDER] ${o.order_no} | from_mgr="${o.from_manager}" id=${o.from_manager_id} | to_mgr="${o.to_manager}" id=${o.to_manager_id} | total=${o.total_items} | db_items=${itemCount}`);
  }

  const instances = await prisma.workflow_instances.findMany({
    where: { definition_key: { in: ['equipment-transfer'] } },
    orderBy: { created_at: 'desc' },
    take: 2,
    select: { id: true, business_id: true, variables: true }
  });

  for (const inst of instances) {
    let vars: any = {};
    try { vars = typeof inst.variables === 'string' ? JSON.parse(inst.variables) : (inst.variables || {}); } catch(e) {}
    const fd = vars.formData || {};
    console.log(`[INST] ${inst.id.substring(0,8)} | biz_id=${inst.business_id} | fd_keys=${Object.keys(fd).join(',')} | _fromMgr=${fd._fromManagerName} | items=${fd.items ? fd.items.length : 'none'}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
