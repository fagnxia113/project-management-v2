import { db } from './src/backend/database/connection.ts';

async function addMissingFields() {
  try {
    // 连接数据库
    await db.connect();
    
    // 检查并添加缺失的字段
    console.log('开始添加缺失的字段到 equipment_instances 表...');
    
    // 添加 manufacturer 字段
    try {
      await db.execute(
        `ALTER TABLE equipment_instances 
         ADD COLUMN manufacturer VARCHAR(200) NULL COMMENT '生产厂家'`
      );
      console.log('✓ 添加 manufacturer 字段成功');
    } catch (error) {
      console.log('⚠️ manufacturer 字段可能已存在:', error.message);
    }
    
    // 添加 technical_params 字段
    try {
      await db.execute(
        `ALTER TABLE equipment_instances 
         ADD COLUMN technical_params TEXT NULL COMMENT '技术参数'`
      );
      console.log('✓ 添加 technical_params 字段成功');
    } catch (error) {
      console.log('⚠️ technical_params 字段可能已存在:', error.message);
    }
    
    // 添加 certificate_no 字段
    try {
      await db.execute(
        `ALTER TABLE equipment_instances 
         ADD COLUMN certificate_no VARCHAR(100) NULL COMMENT '证书编号'`
      );
      console.log('✓ 添加 certificate_no 字段成功');
    } catch (error) {
      console.log('⚠️ certificate_no 字段可能已存在:', error.message);
    }
    
    // 添加 certificate_issuer 字段
    try {
      await db.execute(
        `ALTER TABLE equipment_instances 
         ADD COLUMN certificate_issuer VARCHAR(200) NULL COMMENT '发证单位'`
      );
      console.log('✓ 添加 certificate_issuer 字段成功');
    } catch (error) {
      console.log('⚠️ certificate_issuer 字段可能已存在:', error.message);
    }
    
    // 添加 accessory_desc 字段
    try {
      await db.execute(
        `ALTER TABLE equipment_instances 
         ADD COLUMN accessory_desc TEXT NULL COMMENT '配件描述'`
      );
      console.log('✓ 添加 accessory_desc 字段成功');
    } catch (error) {
      console.log('⚠️ accessory_desc 字段可能已存在:', error.message);
    }
    
    console.log('\n字段添加完成！');
    await db.close();
  } catch (error) {
    console.error('添加字段失败:', error);
  }
}

addMissingFields();