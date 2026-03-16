import { db } from '../src/backend/database/connection.js';
import { equipmentAccessoryService } from '../src/backend/services/EquipmentAccessoryService.js';
import { v4 as uuidv4 } from 'uuid';

async function testSplitAndBind() {
  try {
    await db.connect();
    console.log('Connected to DB');

    const hostId = uuidv4(); // Dummy host
    const accessoryId = uuidv4();

    // 1. Create a test accessory with quantity 10
    await db.execute(
      `INSERT INTO equipment_accessory_instances (
        id, accessory_name, model_no, category, quantity, usage_status, location_status, location_id, tracking_type
      ) VALUES (?, 'Test Accessory', 'TS-01', 'instrument', 10, 'idle', 'warehouse', 'loc-1', 'BATCH')`,
      [accessoryId]
    );
    console.log('Created test accessory with qty 10');

    // 2. Bind 3 to a host
    console.log('Binding 3 items...');
    const result = await equipmentAccessoryService.splitAndBindAccessory(accessoryId, hostId, 3);
    console.log('Bind result:', result);

    // 3. Verify original
    const [original] = await db.query('SELECT * FROM equipment_accessory_instances WHERE id = ?', [accessoryId]);
    console.log('Original accessory qty (expected 7):', original.quantity);

    // 4. Verify new clone
    const [clone] = await db.query('SELECT * FROM equipment_accessory_instances WHERE id = ?', [result.newId]);
    console.log('Cloned accessory qty (expected 3):', clone.quantity);
    console.log('Cloned accessory host_id:', clone.host_equipment_id);

    // 5. Verify relation
    const [relation] = await db.query('SELECT * FROM equipment_accessories WHERE host_equipment_id = ? AND accessory_id = ?', [hostId, result.newId]);
    console.log('Relation quantity (expected 3):', relation.quantity);

    // Clean up
    await db.execute('DELETE FROM equipment_accessories WHERE host_equipment_id = ?', [hostId]);
    await db.execute('DELETE FROM equipment_accessory_instances WHERE id IN (?, ?)', [accessoryId, result.newId]);
    console.log('Cleaned up');

  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await db.close();
  }
}

testSplitAndBind();
