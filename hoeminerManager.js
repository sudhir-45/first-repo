import { system, ItemDurabilityComponent, GameMode, ItemEnchantableComponent } from '@minecraft/server';
import { randomNum } from '../math/randomNumbers';
export class hoeminerManager {
    static start(player, brokenBlock, item, mainhand) {
        const durComp = item.getComponent(ItemDurabilityComponent.componentId);
        if (!durComp) return;
        const enchComp = item.getComponent(ItemEnchantableComponent.componentId);
        let unbreakingLevel = undefined;
        if (enchComp) {
            if (enchComp.hasEnchantment("unbreaking")) {
                unbreakingLevel = enchComp.getEnchantment("unbreaking").level;
            }
        }
        this.getBlocks(brokenBlock, player, item, mainhand, durComp, unbreakingLevel);
    }
    static getBlocks(block, source, item, mainhand, durComp, unbreakingLevel) {
        let durability = durComp.damage;
        let blockNum = 0;
        let stop = false;
        const deniedLocs = [];
        function tick(block, takeDur) {
            deniedLocs.push(block.location);
            if (blockNum >= hoeminerManager.limit) return;
            if (stop == true) return;
            const sameID = block.typeId;
            let above = undefined;
            try {
                above = block.above(1);
            } catch  {}
            let below = undefined;
            try {
                below = block.below(1);
            } catch  {}
            let north = undefined;
            try {
                north = block.north(1);
            } catch  {}
            let south = undefined;
            try {
                south = block.south(1);
            } catch  {}
            let east = undefined;
            try {
                east = block.east(1);
            } catch  {}
            let west = undefined;
            try {
                west = block.west(1);
            } catch  {}
            const blocks = [
                above,
                below,
                north,
                south,
                east,
                west
            ];
            hoeminerManager.break(block);
            if (takeDur == true && hoeminerManager.reduceDurability(unbreakingLevel)) {
                durability = durability + 1;
                if (durability == durComp.maxDurability) {
                    stop = true;
                    system.runTimeout(()=>{
                        source.dimension.playSound("random.break", source.location);
                        mainhand.setItem(undefined);
                    });
                    return;
                } else {
                    system.runTimeout(()=>{
                        durComp.damage = durability;
                        mainhand.setItem(item);
                    });
                }
            }
            for (const newblock of blocks){
                if (newblock != undefined) {
                    const newloc = newblock.location;
                    if (newblock.typeId == sameID && !hoeminerManager.isDenied(newloc, deniedLocs)) {
                        blockNum = blockNum + 1;
                        if (source.getGameMode() != GameMode.creative) {
                            tick(newblock, true);
                        } else {
                            tick(newblock, false);
                        }
                    }
                }
            }
        }
        tick(block, false);
    }
    static isDenied(blockLoc, deniedList) {
        let isDenied = false;
        for (const loc of deniedList){
            if (blockLoc.x == loc.x && blockLoc.y == loc.y && blockLoc.z == loc.z) isDenied = true;
        }
        return isDenied;
    }
    static break(block) {
        const { x , y , z  } = block.location;
        system.runTimeout(()=>{
            block.dimension.runCommand('fill ' + x + ' ' + y + ' ' + z + ' ' + x + ' ' + y + ' ' + z + ' air [] destroy');
        });
    }
    static reduceDurability(unbreakingLevel) {
        let reduce = true;
        const random = randomNum(0, 100);
        if (unbreakingLevel == undefined) {
            return reduce;
        } else {
            switch(unbreakingLevel){
                case 1:
                    if (random <= 20) reduce = false;
                    break;
                case 2:
                    if (random <= 26.7) reduce = false;
                    break;
                case 3:
                    if (random <= 30) reduce = false;
                    break;
            }
        }
        return reduce;
    }
}
hoeminerManager.hoeBlockIDs = [
    "minecraft:hay_block"
];
hoeminerManager.limit = 64;
