import { world, system, ItemStack, ItemDurabilityComponent, GameMode, ItemEnchantableComponent } from "@minecraft/server";
import { randomNum } from "../math/randomNumbers";
export class shovelminerManager {
    static start(player, brokenBlock, item, mainhand) {
        const durComp = item.getComponent(ItemDurabilityComponent.componentId);
        if (!durComp) return;
        const enchComp = item.getComponent(ItemEnchantableComponent.componentId);
        let fortuneLevel = undefined;
        let unbreakingLevel = undefined;
        let hasSilkTouch = false;
        if (enchComp) {
            if (enchComp.hasEnchantment("unbreaking")) {
                unbreakingLevel = enchComp.getEnchantment("unbreaking").level;
            }
            if (enchComp.hasEnchantment("silk_touch")) {
                hasSilkTouch = true;
            } else {
                if (enchComp.hasEnchantment("fortune")) {
                    fortuneLevel = enchComp.getEnchantment("fortune").level;
                }
                if (enchComp.hasEnchantment("unbreaking")) {
                    unbreakingLevel = enchComp.getEnchantment("unbreaking").level;
                }
            }
        }
        const blockData = this.gravelData.find((f)=>f.id == brokenBlock.typeId);
        if (!blockData) return;
        this.getBlocks(brokenBlock, player, item, mainhand, durComp, blockData, fortuneLevel, unbreakingLevel, hasSilkTouch);
    }
    static getBlocks(block, source, item, mainhand, durComp, gravelData, fortune, unbreakingLevel, hasSilkTouch) {
        const initialBlockLocation = block.location;
        let durability = durComp.damage;
        let blockNum = 0;
        let stop = false;
        const deniedLocs = [];
        function tick(block, takeDur, fortunable) {
            deniedLocs.push(block.location);
            if (blockNum >= shovelminerManager.limit) return;
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
                if (!(shovelminerManager.gravityBlockIDs.includes(block.typeId) && block.location.x == initialBlockLocation.x && block.location.z == initialBlockLocation.z && block.location.y == initialBlockLocation.y + 1)) shovelminerManager.break(block, fortune, gravelData, fortunable, hasSilkTouch);
            }
            if (takeDur == true && shovelminerManager.reduceDurability(unbreakingLevel) && !(shovelminerManager.gravityBlockIDs.includes(block.typeId) && block.location.x == initialBlockLocation.x && block.location.z == initialBlockLocation.z && block.location.y == initialBlockLocation.y + 1)) {
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
                    if (newblock.typeId == sameID && !shovelminerManager.isDenied(newloc, deniedLocs)) {
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
    static break(block, fortune, gravelData, fortunable, silkTouched) {
        const typeId = block.typeId;
        const { x , y , z  } = block.location;
        const center = block.center();
        system.runTimeout(()=>{
            if (silkTouched) {
                const lastRule = world.gameRules.doTileDrops;
                world.gameRules.doTileDrops = false;
                this.destroyBlock(block.location, block.dimension);
                world.gameRules.doTileDrops = lastRule;
                const item = new ItemStack(typeId, 1);
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
            } else {
                if (typeId == "minecraft:gravel") {
                    if (fortune && fortunable) {
                        const lastRule1 = world.gameRules.doTileDrops;
                        world.gameRules.doTileDrops = false;
                        this.destroyBlock(block.location, block.dimension);
                        world.gameRules.doTileDrops = lastRule1;
                        let itemID = "minecraft:gravel";
                        if (fortune != 3) {
                            const extra = this.calculateExtraItems(1, 0.33, fortune);
                            if (extra != 0) {
                                itemID = "minecraft:flint";
                            }
                        } else itemID = "minecraft:flint";
                        const item1 = new ItemStack(itemID, 1);
                        const itemEntity1 = this.spawnItemAnywhere(item1, block.dimension, {
                            x: center.x,
                            y: center.y - 0.4,
                            z: center.z
                        });
                        itemEntity1.applyImpulse({
                            x: randomNum(-0.1, 0.1),
                            y: randomNum(0.1, 0.25),
                            z: randomNum(-0.1, 0.1)
                        });
                    } else {
                        this.destroyBlock(block.location, block.dimension);
                    }
                } else {
                    this.destroyBlock(block.location, block.dimension);
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
    static destroyBlock(location, dimension) {
        const { x , y , z  } = location;
        dimension.runCommand("fill " + x + " " + y + " " + z + " " + x + " " + y + " " + z + " air [] destroy");
    }
}
shovelminerManager.gravityBlockIDs = [
    "minecraft:sand",
    "minecraft:gravel"
];
shovelminerManager.gravelIDs = [
    "minecraft:dirt",
    "minecraft:soul_sand",
    "minecraft:sand",
    "minecraft:grass_block",
    "minecraft:gravel",
    "minecraft:clay"
];
shovelminerManager.gravelData = [
    {
        id: "minecraft:dirt",
        chance: 0,
        itemPerLevel: 0,
        item: "minecraft:dirt",
        level: 0
    },
    {
        id: "minecraft:soul_sand",
        chance: 0,
        itemPerLevel: 0,
        item: "minecraft:soul_sand",
        level: 0
    },
    {
        id: "minecraft:sand",
        chance: 0,
        itemPerLevel: 0,
        item: "minecraft:sand",
        level: 0
    },
    {
        id: "minecraft:grass_block",
        chance: 0,
        itemPerLevel: 0,
        item: "minecraft:dirt",
        level: 0
    },
    {
        id: "minecraft:gravel",
        chance: 0,
        itemPerLevel: 0,
        item: "minecraft:flint",
        level: 0
    },
    {
        id: "minecraft:clay",
        chance: 0,
        itemPerLevel: 0,
        item: "minecraft:clay_ball",
        level: 0
    }, 
];
shovelminerManager.limit = 64;
