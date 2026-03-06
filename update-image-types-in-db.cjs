const mysql = require('mysql2/promise');
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '12345678',
  database: 'project_management_v3',
  waitForConnections: true,
  connectionLimit: 10
});

(async () => {
  try {
    console.log('========== 更新设备图片类型 ==========');
    
    // 查询所有设备图片
    const [images] = await db.query(
      'SELECT id, image_type FROM equipment_images'
    );
    
    console.log(`找到 ${images.length} 张设备图片`);
    
    // 更新图片类型
    for (const image of images) {
      let newType = null;
      
      if (image.image_type === 'inbound_main') {
        newType = 'main';
      } else if (image.image_type === 'inbound_with_accessories') {
        newType = 'accessory';
      } else if (image.image_type === 'inbound_model') {
        newType = 'main';
      }
      
      if (newType && newType !== image.image_type) {
        await db.query(
          'UPDATE equipment_images SET image_type = ? WHERE id = ?',
          [newType, image.id]
        );
        console.log(`更新图片 ${image.id}: ${image.image_type} -> ${newType}`);
      }
    }
    
    console.log('\n更新完成');
    
    // 验证更新结果
    const [stats] = await db.query(
      'SELECT image_type, COUNT(*) as count FROM equipment_images GROUP BY image_type'
    );
    
    console.log('\n图片类型统计:');
    stats.forEach((stat, index) => {
      console.log(`${index + 1}. ${stat.image_type}: ${stat.count} 张`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
