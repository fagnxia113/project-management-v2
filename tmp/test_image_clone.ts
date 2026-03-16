import { db } from '../src/backend/database/connection.js';
import { equipmentAccessoryService } from '../src/backend/services/EquipmentAccessoryService.js';
import { v4 as uuidv4 } from 'uuid';

async function testImageCloning() {
  try {
    await db.connect();
    console.log('Connected to DB');

    const hostId = uuidv4();
    const accessoryId = uuidv4();
    const imageUrl = 'https://example.com/test-accessory.jpg';

    // 1. Create a test accessory
    await db.execute(
      `INSERT INTO equipment_accessory_instances (
        id, accessory_name, model_no, category, quantity, usage_status, location_status, location_id, tracking_type
      ) VALUES (?, 'Image Test Accessory', 'IMG-01', 'instrument', 10, 'idle', 'warehouse', 'loc-1', 'BATCH')`,
      [accessoryId]
    );

    // 2. Add an image relation
    await db.execute(
      `INSERT INTO equipment_images (
        id, equipment_id, equipment_name, image_type, image_url, business_type, created_at, updated_at
      ) VALUES (?, ?, 'Image Test Accessory', 'accessory', ?, 'inbound', NOW(), NOW())`,
      [uuidv4(), accessoryId, imageUrl]
    );
    console.log('Created test accessory and image relation');

    // 3. Bind 2 items (trigger split)
    console.log('Binding 2 items...');
    const result = await equipmentAccessoryService.splitAndBindAccessory(accessoryId, hostId, 2);
    console.log('Bind result:', result);

    // 4. Verify images for new clone
    const images = await db.query('SELECT * FROM equipment_images WHERE equipment_id = ?', [result.newId]);
    console.log('Cloned accessory image count (expected 1):', images.length);
    if (images.length > 0) {
      console.log('Cloned image URL:', images[0].image_url);
    }

    // Clean up
    await db.execute('DELETE FROM equipment_accessories WHERE host_equipment_id = ?', [hostId]);
    await db.execute('DELETE FROM equipment_images WHERE equipment_id IN (?, ?)', [accessoryId, result.newId]);
    await db.execute('DELETE FROM equipment_accessory_instances WHERE id IN (?, ?)', [accessoryId, result.newId]);
    console.log('Cleaned up');

  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await db.close();
  }
}

testImageCloning();
