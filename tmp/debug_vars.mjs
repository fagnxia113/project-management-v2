import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const instances = await prisma.workflow_instances.findMany({
    orderBy: { created_at: 'desc' },
    take: 5,
    select: {
      id: true,
      definition_key: true,
      business_id: true,
      variables: true,
      created_at: true
    }
  });

  console.log('=== Recent Workflow Instances ===');
  for (const inst of instances) {
    let vars: any = {};
    try {
      vars = typeof inst.variables === 'string' ? JSON.parse(inst.variables) : (inst.variables || {});
    } catch (e) {
      vars = { parseError: e.message };
    }
    
    console.log(`ID: ${inst.id}`);
    console.log(`Key: ${inst.definition_key}`);
    console.log(`BizID: ${inst.business_id}`);
    console.log(`formData keys: ${vars.formData ? Object.keys(vars.formData) : 'no formData'}`);
    if (vars.formData?.transferOrderId) {
      console.log(`transferOrderId in vars: ${vars.formData.transferOrderId}`);
    }
    console.log('---');
  }

  const orders = await prisma.equipment_transfer_orders.findMany({
    orderBy: { created_at: 'desc' },
    take: 5,
    select: {
      id: true,
      order_no: true,
      created_at: true
    }
  });

  console.log('\n=== Recent Transfer Orders ===');
  for (const o of orders) {
    console.log(`Order ID: ${o.id}, Order No: ${o.order_no}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
