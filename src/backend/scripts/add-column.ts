import { prisma } from '../database/prisma.js'

async function main() {
  try {
    const orders = await prisma.$queryRaw`
      SELECT id, order_no, status, transfer_reason, total_items, created_at 
      FROM equipment_transfer_orders 
      ORDER BY created_at DESC 
      LIMIT 1;
    `
    console.log('最新调拨单:')
    console.log(JSON.stringify(orders, null, 2))
    
    if (orders && orders.length > 0) {
      const items = await prisma.$queryRaw`
        SELECT id, order_id, equipment_name, category, quantity, equipment_id, accessory_id
        FROM equipment_transfer_order_items 
        WHERE order_id = ${(orders as any[])[0].id};
      `
      console.log('\n调拨单明细:')
      console.log(JSON.stringify(items, null, 2))
    }
  } catch (e) {
    console.log('错误:', e.message)
  }
  process.exit(0)
}

main()
