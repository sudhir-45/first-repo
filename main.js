

import { world, EquipmentSlot, EntityEquippableComponent } from '@minecraft/server';
import { veinminerManager } from './classes/veinminerManager';
import { shovelminerManager } from './classes/shovelminerManager';
import { hoeminerManager } from './classes/hoeminerManager';
world.beforeEvents.playerBreakBlock.subscribe((data) => {
    const { block, dimension, itemStack, player } = data;
    if (!itemStack) return;
    const mainhand = player.getComponent(EntityEquippableComponent.componentId).getEquipmentSlot(EquipmentSlot.Mainhand);
    const item = mainhand.getItem();
    if (!item) return;
    if (!player.isSneaking) return;
    if (item.hasTag("minecraft:is_pickaxe")) {
        if (veinminerManager.oreIDs.includes(block.typeId)) {
            veinminerManager.start(player, block, item, mainhand);
        }
    } else if (item.hasTag("minecraft:is_shovel")) {
        if (shovelminerManager.gravelIDs.includes(block.typeId)) {
            shovelminerManager.start(player, block, item, mainhand);
        }
    } else if (item.hasTag("minecraft:is_hoe")) {
        if (hoeminerManager.hoeBlockIDs.includes(block.typeId)) {
            hoeminerManager.start(player, block, item, mainhand);
        }
    }
});
