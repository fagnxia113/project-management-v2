const fetch = require('node-fetch').default;

async function testWarehouseAPI() {
  try {
    console.log('测试 /api/data/Warehouse API...\n');
    
    const response = await fetch('http://localhost:8081/api/data/Warehouse', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    const result = await response.json();
    console.log('\nResponse data:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success && result.data) {
      console.log(`\n返回了 ${result.data.length} 条数据`);
    } else {
      console.log('\n没有返回数据');
    }
    
  } catch (error) {
    console.error('测试失败:', error);
  }
}

testWarehouseAPI();