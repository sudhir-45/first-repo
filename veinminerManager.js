import { system, ItemStack, ItemDurabilityComponent, GameMode, ItemEnchantableComponent } from '@minecraft/server';
import { randomNum } from '../math/randomNumbers';
export class veinminerManager {
    static start(player, brokenBlock, item, mainhand) {
        const durComp = item.getComponent(ItemDurabilityComponent.componentId);
        if (!durComp) return;
        const enchComp = item.getComponent(ItemEnchantableComponent.componentId);
        let fortuneLevel = undefined;
        let unbreakingLevel = undefined;
        if (enchComp) {
            if (enchComp.hasEnchantment("silk_touch")) {
                return;
            } else {
                if (enchComp.hasEnchantment("fortune")) {
                    fortuneLevel = enchComp.getEnchantment("fortune").level;
                }
                if (enchComp.hasEnchantment("unbreaking")) {
                    unbreakingLevel = enchComp.getEnchantment("unbreaking").level;
                }
            }
        }
        const blockData = this.oreData.find((f)=>f.id == brokenBlock.typeId);
        if (!blockData) return;
        if (this.getPickaxeLevel(item) < blockData.level) return;
        this.getBlocks(brokenBlock, player, item, mainhand, durComp, blockData, fortuneLevel, unbreakingLevel);
    }
    static getPickaxeLevel(item) {
        let level = 5;
        switch(item.typeId){
            case "minecraft:wooden_pickaxe":
                level = 1;
                break;
            case "minecraft:golden_pickaxe":
                level = 1;
                break;
            case "minecraft:stone_pickaxe":
                level = 2;
                break;
            case "minecraft:iron_pickaxe":
                level = 3;
                break;
            case "minecraft:diamond_pickaxe":
                level = 4;
                break;
            case "minecraft:netherite_pickaxe":
                level = 5;
                break;
        }
        return level;
    }
    static getBlocks(block, source, item, mainhand, durComp, oreData, fortune, unbreakingLevel) {
        let durability = durComp.damage;
        let blockNum = 0;
        let stop = false;
        const deniedLocs = [];
        function tick(block, takeDur, fortunable) {
            deniedLocs.push(block.location);
            if (blockNum >= veinminerManager.limit) return;
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
            if (fortunable) {
                veinminerManager.break(block, fortune, oreData, fortunable);
            }
            if (takeDur == true && veinminerManager.reduceDurability(unbreakingLevel)) {
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
                    if ((newblock.typeId == sameID || sameID.includes('redstone_ore') && newblock.typeId.includes('redstone_ore')) && !veinminerManager.isDenied(newloc, deniedLocs)) {
                        blockNum = blockNum + 1;
                        if (source.getGameMode() != GameMode.creative) {
                            tick(newblock, true, true);
                        } else {
                            tick(newblock, false, true);
                        }
                    }
                }
            }
        }
        tick(block, false, false);
    }
    static isDenied(blockLoc, deniedList) {
        let isDenied = false;
        for (const loc of deniedList){
            if (blockLoc.x == loc.x && blockLoc.y == loc.y && blockLoc.z == loc.z) isDenied = true;
        }
        return isDenied;
    }
    static break(block, fortune, oreData, fortunable) {
        const { x , y , z  } = block.location;
        system.runTimeout(()=>{
            block.dimension.runCommand('fill ' + x + ' ' + y + ' ' + z + ' ' + x + ' ' + y + ' ' + z + ' air [] destroy');
            if (fortune != undefined && fortunable) {
                const extra = this.calculateExtraItems(oreData.itemPerLevel, oreData.chance, fortune);
                if (extra > 0) {
                    const center = block.center();
                    const item = new ItemStack(oreData.item, extra);
                    const itemEntity = this.spawnItemAnywhere(item, block.dimension, {
                        x: center.x,
                        y: center.y - 0.4,
                        z: center.z
                    });
                    itemEntity.applyImpulse({
                        x: randomNum(-0.1, 0.1),
                        y: randomNum(0.1, 0.25),
                        z: randomNum(-0.1, 0.1)
                    });
                }
            }
        });
    }
    static calculateExtraItems(itemsPerLevel, chance, fortuneLevel) {
        let extra = 0;
        for(let i = 0; i < fortuneLevel; i++){
            for(let i1 = 0; i1 < itemsPerLevel; i1++){
                const num = randomNum(0, 1);
                if (num <= chance) {
                    extra = extra + 1;
                }
            }
        }
        return extra;
    }
    static spawnItemAnywhere(item, dimension, location) {
        const itemEntity = dimension.spawnItem(item, {
            x: location.x,
            y: 100,
            z: location.z
        });
        itemEntity.teleport(location);
        return itemEntity;
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
veinminerManager.oreIDs = [
    "minecraft:stone",
    "minecraft:diorite",
    "minecraft:andesite",
    "minecraft:granite",
    "minecraft:coal_ore",
    "minecraft:deepslate_coal_ore",
    "minecraft:copper_ore",
    "minecraft:deepslate_copper_ore",
    "minecraft:iron_ore",
    "minecraft:deepslate_iron_ore",
    "minecraft:gold_ore",
    "minecraft:deepslate_gold_ore",
    "minecraft:redstone_ore",
    "minecraft:deepslate_redstone_ore",
    "minecraft:lit_redstone_ore",
    "minecraft:lit_deepslate_redstone_ore",
    "minecraft:lapis_ore",
    "minecraft:deepslate_lapis_ore",
    "minecraft:diamond_ore",
    "minecraft:deepslate_diamond_ore",
    "minecraft:emerald_ore",
    "minecraft:deepslate_emerald_ore",
    "minecraft:nether_gold_ore",
    "minecraft:quartz_ore"
];
veinminerManager.oreData = [
    {
        id: "minecraft:stone",
        level: 2,
        item: "minecraft:stone",
        itemPerLevel: 1,
        chance: 0.33
    },
    {
        id: "minecraft:diorite",
        level: 2,
        item: "minecraft:diorite",
        itemPerLevel: 1,
        chance: 0.33
    },
    {
        id: "minecraft:granite",
        level: 2,
        item: "minecraft:granite",
        itemPerLevel: 1,
        chance: 0.33
    },
    {
        id: "minecraft:andesite",
        level: 2,
        item: "minecraft:andesite",
        itemPerLevel: 1,
        chance: 0.33
    },
    {
        id: "minecraft:coal_ore",
        level: 1,
        item: "minecraft:coal",
        itemPerLevel: 1,
        chance: 0.33
    },
    {
        id: "minecraft:deepslate_coal_ore",
        level: 1,
        item: "minecraft:coal",
        itemPerLevel: 1,
        chance: 0.33
    },
    {
        id: "minecraft:copper_ore",
        level: 1,
        item: "minecraft:raw_copper",
        itemPerLevel: 5,
        chance: 0.33
    },
    {
        id: "minecraft:deepslate_copper_ore",
        level: 1,
        item: "minecraft:raw_copper",
        itemPerLevel: 5,
        chance: 0.33
    },
    {
        id: "minecraft:iron_ore",
        level: 2,
        item: "minecraft:raw_iron",
        itemPerLevel: 1,
        chance: 0.33
    },
    {
        id: "minecraft:deepslate_iron_ore",
        level: 2,
        item: "minecraft:raw_iron",
        itemPerLevel: 1,
        chance: 0.33
    },
    {
        id: "minecraft:gold_ore",
        level: 3,
        item: "minecraft:raw_gold",
        itemPerLevel: 1,
        chance: 0.33
    },
    {
        id: "minecraft:deepslate_gold_ore",
        level: 3,
        item: "minecraft:raw_gold",
        itemPerLevel: 1,
        chance: 0.33
    },
    {
        id: "minecraft:redstone_ore",
        level: 3,
        item: "minecraft:redstone",
        itemPerLevel: 1,
        chance: 0.33
    },
    {
        id: "minecraft:deepslate_redstone_ore",
        level: 3,
        item: "minecraft:redstone",
        itemPerLevel: 1,
        chance: 0.33
    },
    {
        id: "minecraft:lit_redstone_ore",
        level: 3,
        item: "minecraft:redstone",
        itemPerLevel: 1,
        chance: 0.33
    },
    {
        id: "minecraft:lit_deepslate_redstone_ore",
        level: 3,
        item: "minecraft:redstone",
        itemPerLevel: 1,
        chance: 0.33
    },
    {
        id: "minecraft:lapis_ore",
        level: 2,
        item: "minecraft:lapis_lazuli",
        itemPerLevel: 9,
        chance: 0.33
    },
    {
        id: "minecraft:deepslate_lapis_ore",
        level: 2,
        item: "minecraft:lapis_lazuli",
        itemPerLevel: 9,
        chance: 0.33
    },
    {
        id: "minecraft:diamond_ore",
        level: 3,
        item: "minecraft:diamond",
        itemPerLevel: 1,
        chance: 0.33
    },
    {
        id: "minecraft:deepslate_diamond_ore",
        level: 3,
        item: "minecraft:diamond",
        itemPerLevel: 1,
        chance: 0.33
    },
    {
        id: "minecraft:emerald_ore",
        level: 3,
        item: "minecraft:emerald",
        itemPerLevel: 1,
        chance: 0.33
    },
    {
        id: "minecraft:deepslate_emerald_ore",
        level: 3,
        item: "minecraft:emerald",
        itemPerLevel: 1,
        chance: 0.33
    },
    {
        id: "minecraft:nether_gold_ore",
        level: 2,
        item: "minecraft:gold_nugget",
        itemPerLevel: 6,
        chance: 0.33
    },
    {
        id: "minecraft:quartz_ore",
        level: 2,
        item: "minecraft:quartz",
        itemPerLevel: 1,
        chance: 0.33
    }
];
veinminerManager.limit = 64;
