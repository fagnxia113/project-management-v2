import { db } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';
import { equipmentServiceV3 } from './EquipmentServiceV3.js';
import { equipmentAccessoryService } from './EquipmentAccessoryService.js';
import { instanceService } from './InstanceService.js';
import { equipmentImageService } from './EquipmentImageService.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * 设备入库服务 V2
 * 支持 Multipart 上传和双轨制库存
 */
export class EquipmentInboundServiceV2 {
  private uploadDir = path.join(process.cwd(), 'uploads');

  constructor() {
    this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      console.error('创建上传目录失败:', error);
    }
  }

  /**
   * 校验管理编码唯一性
   */
  async checkManageCodeUnique(manageCode: string, excludeId?: string): Promise<boolean> {
    if (!manageCode) return true;

    // 检查设备表
    const equipResult = await db.queryOne<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM equipment_instances WHERE manage_code = ?${excludeId ? ' AND id != ?' : ''}`,
      excludeId ? [manageCode, excludeId] : [manageCode]
    );
    if (equipResult && equipResult.cnt > 0) return false;

    // 检查配件表
    const accResult = await db.queryOne<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM equipment_accessory_instances WHERE manage_code = ?${excludeId ? ' AND id != ?' : ''}`,
      excludeId ? [manageCode, excludeId] : [manageCode]
    );
    if (accResult && accResult.cnt > 0) return false;

    return true;
  }

  /**
   * 处理设备入库
   */
  async processInbound(data: {
    equipment_name: string;
    model_no: string;
    category: 'instrument' | 'fake_load' | 'cable';
    tracking_type: 'SERIALIZED' | 'BATCH';
    quantity: number;
    serial_number?: string;
    manage_code?: string;
    unit?: string;
    location_id: string;
    location_status?: 'warehouse' | 'in_project' | 'repairing' | 'transferring';
    manufacturer?: string;
    technical_params?: string;
    keeper_id?: string;
    purchase_date?: string | Date;
    purchase_price?: number | string;
    calibration_expiry?: string | Date;
    certificate_no?: string;
    certificate_issuer?: string;
    attachments?: string[];
    images?: string[];
  }) {
    const { quantity, category, images, attachments } = data;

    // 业务逻辑：假负载强制使用 BATCH 模式，且不生成管理编码
    const finalTrackingType = category === 'fake_load' ? 'BATCH' : data.tracking_type;
    const finalManageCode = category === 'fake_load' ? undefined : data.manage_code;

    // 如果提供了管理编码，校验唯一性
    if (finalManageCode) {
      const isUnique = await this.checkManageCodeUnique(finalManageCode);
      if (!isUnique) {
        throw new Error(`管理编码 "${finalManageCode}" 已存在，请使用其他编码`);
      }
    }

    // 解析位置负责人和状态
    let resolvedKeeperId = data.keeper_id;
    let resolvedLocationStatus = data.location_status;
    if (!resolvedKeeperId || !resolvedLocationStatus) {
      const locDetails = await equipmentServiceV3.getLocationDetails(data.location_id);
      if (!resolvedKeeperId) resolvedKeeperId = locDetails.manager_id || undefined;
      if (!resolvedLocationStatus) resolvedLocationStatus = locDetails.type || 'warehouse';
    }

    // 创建设备实例
    const equipment = await equipmentServiceV3.createInstance({
      equipment_name: data.equipment_name,
      model_no: data.model_no,
      category: data.category,
      tracking_type: finalTrackingType,
      quantity: data.quantity,
      serial_number: data.serial_number,
      manage_code: finalManageCode,
      unit: data.unit,
      location_status: resolvedLocationStatus as any,
      location_id: data.location_id,
      manufacturer: data.manufacturer,
      technical_params: data.technical_params,
      keeper_id: resolvedKeeperId,
      purchase_date: data.purchase_date,
      purchase_price: data.purchase_price,
      calibration_expiry: data.calibration_expiry,
      certificate_no: data.certificate_no,
      certificate_issuer: data.certificate_issuer,
      attachments: data.attachments
    });

    // 保存图片到 equipment_images 表
    if (images && images.length > 0) {
      const imageDtos = images.map((imageUrl, index) => ({
        equipment_id: equipment.id,
        equipment_name: data.equipment_name,
        model_no: data.model_no,
        category: data.category,
        image_type: 'main' as const,
        image_url: imageUrl,
        business_type: 'inbound' as const,
        notes: `入库图片 ${index + 1}`
      }));
      
      try {
        await equipmentImageService.createBatchImages(imageDtos);
        console.log(`[EquipmentInboundServiceV2] 保存了 ${images.length} 张图片`);
      } catch (error) {
        console.error('[EquipmentInboundServiceV2] 保存图片失败:', error);
      }
    }

    return equipment;
  }

  /**
   * 处理配件独立入库
   */
  async processAccessoryInbound(data: {
    accessory_name: string;
    model_no?: string;
    category: 'instrument' | 'fake_load' | 'cable';
    tracking_type: 'SERIALIZED' | 'BATCH';
    quantity: number;
    serial_number?: string;
    manage_code?: string;
    unit?: string;
    location_id: string;
    location_status?: 'warehouse' | 'in_project' | 'repairing' | 'transferring';
    manufacturer?: string;
    technical_params?: string;
    keeper_id?: string;
    purchase_date?: string | Date;
    purchase_price?: number | string;
    calibration_expiry?: string | Date;
    certificate_no?: string;
    certificate_issuer?: string;
    attachments?: string[];
    images?: string[];
    host_equipment_id?: string;
    usage_status?: 'idle' | 'in_use';
    source_type?: 'inbound_bundle' | 'inbound_separate';
  }) {
    const { images } = data;

    // 业务逻辑：假负载强制使用 BATCH 模式，且不生成管理编码
    const finalTrackingType = data.category === 'fake_load' ? 'BATCH' : data.tracking_type;
    const finalManageCode = data.category === 'fake_load' ? undefined : data.manage_code;

    // 如果提供了管理编码，校验唯一性
    if (finalManageCode) {
      const isUnique = await this.checkManageCodeUnique(finalManageCode);
      if (!isUnique) {
        throw new Error(`管理编码 "${finalManageCode}" 已存在，请使用其他编码`);
      }
    }

    // 解析位置负责人和状态
    let resolvedKeeperId = data.keeper_id;
    let resolvedLocationStatus = data.location_status;
    if (!resolvedKeeperId || !resolvedLocationStatus) {
      const locDetails = await equipmentServiceV3.getLocationDetails(data.location_id);
      if (!resolvedKeeperId) resolvedKeeperId = locDetails.manager_id || undefined;
      if (!resolvedLocationStatus) resolvedLocationStatus = locDetails.type || 'warehouse';
    }

    // 创建配件实例
    const accessory = await equipmentAccessoryService.createAccessoryInstance({
      accessory_name: data.accessory_name,
      model_no: data.model_no,
      category: data.category,
      quantity: data.quantity,
      serial_number: data.serial_number,
      manage_code: finalManageCode,
      unit: data.unit,
      location_id: data.location_id,
      location_status: resolvedLocationStatus as any,
      keeper_id: resolvedKeeperId,
      purchase_date: data.purchase_date as string,
      purchase_price: typeof data.purchase_price === 'string' ? parseFloat(data.purchase_price) : data.purchase_price,
      host_equipment_id: data.host_equipment_id,
      usage_status: data.usage_status || (data.host_equipment_id ? 'in_use' : 'idle'),
      source_type: data.source_type || 'inbound_separate',
      tracking_type: finalTrackingType
    });

    // 保存配件图片到 equipment_images 表
    if (images && images.length > 0) {
      const imageDtos = images.map((imageUrl, index) => ({
        equipment_id: accessory.id,
        equipment_name: data.accessory_name,
        model_no: data.model_no,
        category: data.category,
        image_type: 'accessory' as const,
        image_url: imageUrl,
        business_type: 'inbound' as const,
        notes: `配件入库图片 ${index + 1}`
      }));
      
      try {
        await equipmentImageService.createBatchImages(imageDtos);
        console.log(`[EquipmentInboundServiceV2] 保存了 ${images.length} 张配件图片`);
      } catch (error) {
        console.error('[EquipmentInboundServiceV2] 保存配件图片失败:', error);
      }
    }

    return accessory;
  }

  /**
   * 处理文件上传
   */
  async handleFileUpload(file: any) {
    try {
      const fileName = `${uuidv4()}-${file.originalname}`;
      const filePath = path.join(this.uploadDir, fileName);

      await fs.writeFile(filePath, file.buffer);
      return `/uploads/${fileName}`;
    } catch (error) {
      console.error('文件上传失败:', error);
      throw new Error('文件上传失败');
    }
  }

  /**
   * 批量处理文件上传
   */
  async handleBatchFileUpload(files: any[]) {
    const uploadPromises = files.map(file => this.handleFileUpload(file));
    return await Promise.all(uploadPromises);
  }

  /**
   * 从工作流驱动创建设备
   */
  async createEquipmentFromWorkflow(instanceId: string) {
    const instance = await instanceService.getInstance(instanceId);
    if (!instance) {
      throw new Error(`流程实例 ${instanceId} 不存在`);
    }

    const formData = instance.variables?.formData || {};
    console.log('[createEquipmentFromWorkflow] formData:', JSON.stringify(formData, null, 2));
    
    const items = Array.isArray(formData.items) ? formData.items : [formData];
    const locationId = formData.warehouse_id || formData.location_id || '';
    console.log('[createEquipmentFromWorkflow] locationId:', locationId);
    
    const locDetails = await equipmentServiceV3.getLocationDetails(locationId);
    console.log('[createEquipmentFromWorkflow] locDetails:', JSON.stringify(locDetails, null, 2));
    
    const resolvedKeeperId = locDetails.manager_id || formData.applicant_id;
    const locationStatus = locDetails.type || 'warehouse';
    console.log('[createEquipmentFromWorkflow] resolvedKeeperId:', resolvedKeeperId, 'locationStatus:', locationStatus);

    // 同一表单内管理编码重复校验
    const manageCodesInForm: string[] = [];
    const duplicateCodes: string[] = [];
    
    for (const item of items) {
      const manageCode = item.manage_code || item.item_code;
      if (manageCode) {
        if (manageCodesInForm.includes(manageCode)) {
          if (!duplicateCodes.includes(manageCode)) {
            duplicateCodes.push(manageCode);
          }
        } else {
          manageCodesInForm.push(manageCode);
        }
      }
      
      // 检查配件清单中的管理编码
      if (Array.isArray(item.accessory_list)) {
        for (const acc of item.accessory_list) {
          const accManageCode = acc.manage_code || acc.item_code;
          if (accManageCode) {
            if (manageCodesInForm.includes(accManageCode)) {
              if (!duplicateCodes.includes(accManageCode)) {
                duplicateCodes.push(accManageCode);
              }
            } else {
              manageCodesInForm.push(accManageCode);
            }
          }
        }
      }
    }
    
    if (duplicateCodes.length > 0) {
      throw new Error(`表单内管理编码重复: ${duplicateCodes.join(', ')}，请修改后重新提交`);
    }

    const results = [];

    for (const item of items) {
      if (!item.equipment_name && !item.category) continue;

      const itemLocation = item.location_id || locationId;

      if (item.category === 'accessory') {
        const rawAttachments = item.attachments || item.accessory_images || [];
        const accAttachments = rawAttachments.map((a: any) => typeof a === 'string' ? a : a.url).filter(Boolean);
        const rawImages = item.main_images || item.images || item.accessory_images || [];
        const accImages = rawImages.map((img: any) => typeof img === 'string' ? img : img.url).filter(Boolean);

        const accessory = await this.processAccessoryInbound({
          accessory_name: item.equipment_name || item.accessory_name || '',
          model_no: item.model_no || item.model || '',
          category: 'instrument',
          tracking_type: (item.is_independent_code === true || item.is_independent_code === 'true') ? 'SERIALIZED' : 'BATCH',
          quantity: item.quantity || item.accessory_quantity || 1,
          serial_number: item.serial_numbers || item.serial_number,
          manage_code: item.manage_code || item.item_code,
          unit: item.unit || item.accessory_unit,
          location_id: itemLocation,
          location_status: locationStatus as any,
          keeper_id: item.keeper_id || resolvedKeeperId,
          purchase_date: item.purchase_date || formData.purchase_date,
          purchase_price: item.purchase_price,
          attachments: accAttachments,
          images: accImages
        });
        results.push(accessory);
      } else {
        const rawEqAttachments = item.attachments || [];
        const eqAttachments = rawEqAttachments.map((a: any) => typeof a === 'string' ? a : a.url).filter(Boolean);
        const rawEqImages = item.main_images || item.images || [];
        const eqImages = rawEqImages.map((img: any) => typeof img === 'string' ? img : img.url).filter(Boolean);

        const isInstrument = item.category === 'instrument';
        const isIndependentCode = isInstrument || item.is_independent_code === true || item.is_independent_code === 'true';
        
        const equipment = await this.processInbound({
          equipment_name: item.equipment_name,
          model_no: item.model_no,
          category: item.category as any,
          tracking_type: isIndependentCode ? 'SERIALIZED' : 'BATCH',
          quantity: item.quantity || 1,
          serial_number: item.serial_numbers || item.serial_number,
          manage_code: item.manage_code || item.item_code,
          unit: item.unit,
          location_id: itemLocation,
          location_status: locationStatus as any,
          manufacturer: item.manufacturer,
          technical_params: item.technical_params,
          keeper_id: item.keeper_id || resolvedKeeperId,
          purchase_date: item.purchase_date || formData.purchase_date,
          purchase_price: item.purchase_price,
          calibration_expiry: item.calibration_expiry || item.certificate_expiry_date,
          certificate_no: item.certificate_no,
          certificate_issuer: item.certificate_issuer,
          attachments: eqAttachments,
          images: eqImages
        });
        results.push(equipment);

        // 处理该设备关联的配件清单
        if (Array.isArray(item.accessory_list)) {
          for (const acc of item.accessory_list) {
            if (!acc.accessory_name) continue;

            const accImages = (acc.accessory_images || []).map((img: any) => typeof img === 'string' ? img : img.url).filter(Boolean);

            try {
              await this.processAccessoryInbound({
                accessory_name: acc.accessory_name,
                model_no: acc.accessory_model,
                category: item.category === 'accessory' ? 'instrument' : item.category as any,
                tracking_type: (acc.is_independent_code === true || acc.is_independent_code === 'true') ? 'SERIALIZED' : 'BATCH',
                quantity: acc.accessory_quantity || 1,
                serial_number: acc.serial_numbers || acc.serial_number || item.serial_numbers || item.serial_number,
                manage_code: acc.manage_code || acc.item_code,
                unit: acc.accessory_unit,
                location_id: itemLocation,
                location_status: locationStatus as any,
                keeper_id: acc.keeper_id || item.keeper_id || resolvedKeeperId,
                purchase_date: acc.purchase_date || item.purchase_date || formData.purchase_date,
                purchase_price: acc.purchase_price,
                attachments: accImages,
                images: accImages,
                host_equipment_id: (equipment as any).id,
                source_type: 'inbound_bundle'
              });
            } catch (err) {
              console.warn('[createEquipmentFromWorkflow] 配件入库失败:', err);
            }
          }
        }
      }
    }

    return results;
  }
}

export const equipmentInboundServiceV2 = new EquipmentInboundServiceV2();