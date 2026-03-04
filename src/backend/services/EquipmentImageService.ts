import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/connection.js';
import * as fs from 'fs';
import * as path from 'path';

export type ImageType = 
  | 'inbound_main'      
  | 'inbound_with_accessories'  
  | 'inbound_model'      
  | 'transfer_shipping'  
  | 'transfer_packed'    
  | 'transfer_receiving';

export type BusinessType = 'inbound' | 'transfer' | 'return' | 'repair';

export interface EquipmentImage {
  id: string;
  equipment_id?: string;
  equipment_name?: string;
  model_no?: string;
  category?: 'instrument' | 'fake_load' | 'cable';
  image_type: ImageType;
  image_url: string;
  image_name?: string;
  image_size?: number;
  image_format?: string;
  business_type?: BusinessType;
  business_id?: string;
  uploader_id?: string;
  uploader_name?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateImageDto {
  equipment_id?: string;
  equipment_name?: string;
  model_no?: string;
  category?: 'instrument' | 'fake_load' | 'cable';
  image_type: ImageType;
  image_url: string;
  image_name?: string;
  image_size?: number;
  image_format?: string;
  business_type?: BusinessType;
  business_id?: string;
  uploader_id?: string;
  uploader_name?: string;
  notes?: string;
}

export class EquipmentImageService {

  private uploadDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads', 'equipment-images');
    this.ensureUploadDir();
  }

  private ensureUploadDir(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async createImage(dto: CreateImageDto): Promise<EquipmentImage> {
    const id = uuidv4();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    await db.execute(
      `INSERT INTO equipment_images (
        id, equipment_id, equipment_name, model_no, category,
        image_type, image_url, image_name, image_size, image_format,
        business_type, business_id, uploader_id, uploader_name, notes,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.equipment_id || null,
        dto.equipment_name || null,
        dto.model_no || null,
        dto.category || null,
        dto.image_type,
        dto.image_url,
        dto.image_name || null,
        dto.image_size || null,
        dto.image_format || null,
        dto.business_type || null,
        dto.business_id || null,
        dto.uploader_id || null,
        dto.uploader_name || null,
        dto.notes || null,
        now,
        now
      ]
    );

    return {
      id,
      equipment_id: dto.equipment_id,
      equipment_name: dto.equipment_name,
      model_no: dto.model_no,
      category: dto.category,
      image_type: dto.image_type,
      image_url: dto.image_url,
      image_name: dto.image_name,
      image_size: dto.image_size,
      image_format: dto.image_format,
      business_type: dto.business_type,
      business_id: dto.business_id,
      uploader_id: dto.uploader_id,
      uploader_name: dto.uploader_name,
      notes: dto.notes,
      created_at: now,
      updated_at: now
    } as EquipmentImage;
  }

  async createBatchImages(dtos: CreateImageDto[]): Promise<EquipmentImage[]> {
    const images: EquipmentImage[] = [];
    
    for (const dto of dtos) {
      const image = await this.createImage(dto);
      images.push(image);
    }
    
    return images;
  }

  async getById(id: string): Promise<EquipmentImage | null> {
    const [rows] = await db.query(
      'SELECT * FROM equipment_images WHERE id = ?',
      [id]
    );
    return rows && rows.length > 0 ? rows[0] : null;
  }

  async getByEquipmentId(equipmentId: string): Promise<EquipmentImage[]> {
    const [rows] = await db.query(
      'SELECT * FROM equipment_images WHERE equipment_id = ? ORDER BY created_at DESC',
      [equipmentId]
    );
    return rows;
  }

  async getByBusiness(businessType: BusinessType, businessId: string): Promise<EquipmentImage[]> {
    const [rows] = await db.query(
      'SELECT * FROM equipment_images WHERE business_type = ? AND business_id = ? ORDER BY created_at DESC',
      [businessType, businessId]
    );
    return rows;
  }

  async getByType(equipmentId: string, imageType: ImageType): Promise<EquipmentImage[]> {
    const [rows] = await db.query(
      'SELECT * FROM equipment_images WHERE equipment_id = ? AND image_type = ? ORDER BY created_at DESC',
      [equipmentId, imageType]
    );
    return rows;
  }

  async getLatestImage(equipmentId: string, imageType: ImageType): Promise<EquipmentImage | null> {
    const [rows] = await db.query(
      'SELECT * FROM equipment_images WHERE equipment_id = ? AND image_type = ? ORDER BY created_at DESC LIMIT 1',
      [equipmentId, imageType]
    );
    return rows && rows.length > 0 ? rows[0] : null;
  }

  async updateImage(id: string, updates: Partial<CreateImageDto>): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.image_url !== undefined) {
      fields.push('image_url = ?');
      values.push(updates.image_url);
    }
    if (updates.notes !== undefined) {
      fields.push('notes = ?');
      values.push(updates.notes);
    }

    if (fields.length === 0) {
      return false;
    }

    values.push(id);
    await db.execute(
      `UPDATE equipment_images SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );

    return true;
  }

  async deleteImage(id: string): Promise<boolean> {
    const image = await this.getById(id);
    if (!image) {
      return false;
    }

    await db.execute('DELETE FROM equipment_images WHERE id = ?', [id]);

    return true;
  }

  async deleteByBusiness(businessType: BusinessType, businessId: string): Promise<boolean> {
    await db.execute(
      'DELETE FROM equipment_images WHERE business_type = ? AND business_id = ?',
      [businessType, businessId]
    );
    return true;
  }

  async getInboundImages(equipmentId: string): Promise<{
    mainImage?: EquipmentImage;
    withAccessoriesImage?: EquipmentImage;
    modelImage?: EquipmentImage;
  }> {
    const images = await this.getByEquipmentId(equipmentId);
    
    return {
      mainImage: images.find(img => img.image_type === 'inbound_main'),
      withAccessoriesImage: images.find(img => img.image_type === 'inbound_with_accessories'),
      modelImage: images.find(img => img.image_type === 'inbound_model')
    };
  }

  async getTransferImages(transferOrderId: string): Promise<{
    shippingImages: EquipmentImage[];
    packedImages: EquipmentImage[];
    receivingImages: EquipmentImage[];
  }> {
    const images = await this.getByBusiness('transfer', transferOrderId);
    
    return {
      shippingImages: images.filter(img => img.image_type === 'transfer_shipping'),
      packedImages: images.filter(img => img.image_type === 'transfer_packed'),
      receivingImages: images.filter(img => img.image_type === 'transfer_receiving')
    };
  }
}

export const equipmentImageService = new EquipmentImageService();
