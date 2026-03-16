import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Querying workflow instances...');
    const instances = await prisma.workflow_instances.findMany({
        where: {
            definition_key: {
                in: ['equipment-transfer', 'preset-equipment-transfer']
            }
        },
        orderBy: { created_at: 'desc' },
        take: 3
    });

    console.log("Recent instances:");
    instances.forEach(row => {
        let varsStr = '{}';
        if (row.variables) {
            varsStr = typeof row.variables === 'string' ? row.variables : JSON.stringify(row.variables);
        }
        let vars = '{}';
        try { vars = JSON.parse(varsStr); } catch(e){}
        
        console.log(`\nID: ${row.id} - ${row.title}`);
        console.log(`fromManagerName: ${vars.formData?._fromManagerName}`);
        console.log(`toManagerName: ${vars.formData?._toManagerName}`);
        console.log(`items length: ${vars.formData?.items?.length}`);
        console.log(`items:`, JSON.stringify(vars.formData?.items));
    });
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
