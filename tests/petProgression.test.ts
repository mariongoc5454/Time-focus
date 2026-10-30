import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { initializeDatabase } from '../electron/db/schema';
import * as petService from '../electron/db/petService';

describe('Virtual Pet Progression & Feeding Suite', () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    initializeDatabase(db);
  });

  afterEach(() => {
    db.close();
  });

  it('updates pet level and food inventory accurately when fed', () => {
    const pet = petService.getActivePet(db);
    expect(pet.level).toBe(1);
    expect(pet.current_xp).toBe(0);
    expect(pet.xp_to_next_level).toBe(100);

    // Initial berry count seeded in default data is 5
    const inventoryBefore = petService.getInventory(db);
    const berryItem = inventoryBefore.find((i) => i.id === 'food_berry')!;
    expect(berryItem.quantity).toBe(5);

    // 1. Feed 1 berry (+20 XP)
    const feed1 = petService.feedPet(db, pet.id, 'food_berry');
    expect(feed1.success).toBe(true);
    expect(feed1.petLeveledUp).toBe(false);
    expect(feed1.pet.current_xp).toBe(20);

    // Check inventory decreased to 4
    const invAfter1 = petService.getInventory(db);
    expect(invAfter1.find((i) => i.id === 'food_berry')?.quantity).toBe(4);

    // 2. Feed Focus Bento (+80 XP, total 100 XP -> should LEVEL UP to level 2!)
    const feed2 = petService.feedPet(db, pet.id, 'food_bento');
    expect(feed2.success).toBe(true);
    expect(feed2.petLeveledUp).toBe(true);
    expect(feed2.newPetLevel).toBe(2);
    expect(feed2.pet.level).toBe(2);
    expect(feed2.pet.current_xp).toBe(0);
    expect(feed2.pet.xp_to_next_level).toBe(200); // 100 * level 2
  });

  it('handles multi-level progression when gaining large XP amounts', () => {
    const pet = petService.getActivePet(db);
    // Level 1: needs 100 XP
    // Level 2: needs 200 XP
    // Giving 350 XP should jump to Level 3 with 50 XP remainder!
    const { pet: advancedPet, leveledUp, newLevel } = petService.addXPToPet(pet, 350);

    expect(leveledUp).toBe(true);
    expect(newLevel).toBe(3);
    expect(advancedPet.level).toBe(3);
    expect(advancedPet.current_xp).toBe(50);
    expect(advancedPet.xp_to_next_level).toBe(300);
  });
});
