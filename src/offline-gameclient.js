// ==========================================
// offline-gameclient.js – Game Client Offline
// ==========================================

const OfflineGameClient = {

  // IDs de grama testados e aprovados (walkable)
  GRASS_CANDIDATES: [101, 415, 440], // 101 = tall grass, 415 = green grass, 440 = grass (alguns packs)

  GRASS_ID: null,

  worldConfig: {
    width: 2048, height: 2048, depth: 16,
    chunk: { width: 32, height: 32, depth: 16 },
    version: 740, clientVersion: 740, clock: 1, tick: 50
  },

  startPosition: { x: 100, y: 100, z: 7 },

  playerData: {
    id: 1, name: "Sobrevivente", sex: 0, level: 1, experience: 0,
    health: 100, maxHealth: 100, mana: 50, maxMana: 50,
    capacity: 50000, speed: 200,
    equipment: {
      head: null, neck: null, backpack: null, armor: null,
      right: null, left: null, legs: null, feet: null, ring: null
    },
    outfits: [{
      id: 128,
      details: { head: 78, body: 106, legs: 95, feet: 76 },
      mount: 0, mounted: false, addonOne: false, addonTwo: false
    }],
    mounts: []
  },

  createdChunkIds: new Set(),

  start: function() {
    console.log("OfflineGameClient iniciando…");

    if (!gameClient.interface.areAssetsLoaded()) {
      gameClient.networkManager.loadGameFilesServer();
      setTimeout(() => OfflineGameClient.start(), 500);
      return;
    }

    // Escolhe ID de grama walkable
    this.GRASS_ID = this.findWorkingGrassId();
    console.log("ID da grama:", this.GRASS_ID);

    gameClient.setServerData({
      clientVersion: this.worldConfig.clientVersion,
      version: this.worldConfig.version,
      clock: this.worldConfig.clock,
      tick: this.worldConfig.tick,
      chunk: this.worldConfig.chunk,
      width: this.worldConfig.width,
      height: this.worldConfig.height,
      depth: this.worldConfig.depth
    });

    this.disableMinimap();
    this.disableDatabase();

    this.generateChunksAround(this.startPosition.x, this.startPosition.y, this.startPosition.z, 1, this.GRASS_ID);
    gameClient.world.referenceTileNeighbours();

    const pos = new Position(this.startPosition.x, this.startPosition.y, this.startPosition.z);
    const pdata = this.playerData;
    gameClient.handleAcceptLogin({
      id: pdata.id, name: pdata.name, sex: pdata.sex,
      level: pdata.level, experience: pdata.experience,
      health: pdata.health, maxHealth: pdata.maxHealth,
      mana: pdata.mana, maxMana: pdata.maxMana,
      capacity: pdata.capacity, speed: pdata.speed,
      position: pos,
      equipment: pdata.equipment,
      outfit: pdata.outfits[0],
      outfits: pdata.outfits,
      mounts: pdata.mounts
    });

    // Corrigir limite de andares visíveis (máximo 8 para o renderizador)
    gameClient.player.getMaxFloor = function() {
      return 8; // cobre z=0 até z=7
    };
    // Forçar atualização do tile cache com o novo limite
    gameClient.renderer.updateTileCache();

    document.getElementById("save-button").style.display = "inline-block";
    document.getElementById("load-button").style.display = "inline-block";
    console.log("Sobrevivente está offline. Movimento liberado!");
  },

  // Encontra um ID que tenha frameGroups e seja walkable (não tenha DatFlagNotWalkable)
  findWorkingGrassId: function() {
    const objects = gameClient.dataObjects;
    for (const id of this.GRASS_CANDIDATES) {
      const obj = objects.get(id);
      if (obj && obj.frameGroups) {
        // Verifica se o tile é caminhável (não tem flag NotWalkable)
        if (!obj.hasFlag || !obj.hasFlag(PropBitFlag.prototype.flags.DatFlagNotWalkable)) {
          return id;
        }
      }
    }
    // Fallback: varre do 100 ao 5000 atrás de um walkable com frameGroups
    for (let i = 100; i < 5000; i++) {
      const obj = objects.get(i);
      if (obj && obj.frameGroups) {
        if (!obj.hasFlag || !obj.hasFlag(PropBitFlag.prototype.flags.DatFlagNotWalkable)) {
          return i;
        }
      }
    }
    console.warn("Nenhum tile walkable encontrado, usando 101 como último recurso");
    return 101;
  },

  disableMinimap: function() {
    const mm = gameClient.renderer?.minimap;
    if (!mm) return;
    mm.cache = mm.update = mm.chunkUpdate = mm.setRenderLayer = mm.setCenter = mm.save = function() {};
  },

  disableDatabase: function() {
    const db = gameClient.database;
    if (!db) return;
    db.loadChunk = db.preloadCallback = db.clear = db.init = function() {};
  },

  generateChunksAround: function(wx, wy, wz, radius, grassId) {
    const world = gameClient.world;
    const CHUNK_W = this.worldConfig.chunk.width;
    const CHUNK_H = this.worldConfig.chunk.height;
    const CHUNK_D = this.worldConfig.chunk.depth;

    const cxCenter = Math.floor(wx / CHUNK_W);
    const cyCenter = Math.floor(wy / CHUNK_H);
    const cz = 0;

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const cx = cxCenter + dx;
        const cy = cyCenter + dy;

        const chunkPos = new Position(cx, cy, cz);
        const chunkId = world.getChunkIndex(chunkPos);
        if (this.createdChunkIds.has(chunkId)) continue;
        this.createdChunkIds.add(chunkId);

        const tiles = [];
        for (let z = 0; z < CHUNK_D; z++) {
          for (let y = 0; y < CHUNK_H; y++) {
            for (let x = 0; x < CHUNK_W; x++) {
              const tileWZ = cz * CHUNK_D + z;
              let tileId = 0;
              if (tileWZ === wz) tileId = grassId;
              tiles.push({ id: tileId, flags: 0 });
            }
          }
        }

        const chunk = new Chunk(null, chunkPos, tiles);
        chunk.id = chunkId;
        world.chunks.push(chunk);
      }
    }
  },

  save: function() {
    if (!gameClient.player) return;
    const pos = gameClient.player.getPosition();
    const state = {
      player: {
        id: gameClient.player.id, name: gameClient.player.name, sex: gameClient.player.sex,
        level: gameClient.player.state.level, experience: gameClient.player.state.experience,
        health: gameClient.player.state.health, maxHealth: gameClient.player.state.maxHealth,
        mana: gameClient.player.state.mana, maxMana: gameClient.player.state.maxMana,
        capacity: gameClient.player.state.capacity, speed: gameClient.player.state.speed,
        position: { x: pos.x, y: pos.y, z: pos.z },
        equipment: gameClient.player.equipment, outfits: gameClient.player.outfits, mounts: gameClient.player.mounts
      },
      timestamp: new Date().toISOString()
    };
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "sobrevivencia-save.json"; a.click();
    URL.revokeObjectURL(url);
  },

  load: function(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const state = JSON.parse(e.target.result);
      gameClient.reset();
      gameClient.setServerData({
        clientVersion: OfflineGameClient.worldConfig.clientVersion, version: OfflineGameClient.worldConfig.version,
        clock: OfflineGameClient.worldConfig.clock, tick: OfflineGameClient.worldConfig.tick,
        chunk: OfflineGameClient.worldConfig.chunk,
        width: OfflineGameClient.worldConfig.width, height: OfflineGameClient.worldConfig.height, depth: OfflineGameClient.worldConfig.depth
      });
      OfflineGameClient.disableMinimap();
      OfflineGameClient.disableDatabase();
      const pos = state.player.position;
      OfflineGameClient.createdChunkIds.clear();
      const grassId = OfflineGameClient.findWorkingGrassId();
      OfflineGameClient.generateChunksAround(pos.x, pos.y, pos.z, 1, grassId);
      gameClient.world.referenceTileNeighbours();
      const startPos = new Position(pos.x, pos.y, pos.z);
      gameClient.handleAcceptLogin({
        id: state.player.id, name: state.player.name, sex: state.player.sex,
        level: state.player.level, experience: state.player.experience,
        health: state.player.health, maxHealth: state.player.maxHealth,
        mana: state.player.mana, maxMana: state.player.maxMana,
        capacity: state.player.capacity, speed: state.player.speed,
        position: startPos,
        equipment: state.player.equipment,
        outfit: state.player.outfits[0],
        outfits: state.player.outfits,
        mounts: state.player.mounts
      });
      // Corrigir max floor também no load
      gameClient.player.getMaxFloor = function() { return 8; };
      gameClient.renderer.updateTileCache();
      document.getElementById("save-button").style.display = "inline-block";
      document.getElementById("load-button").style.display = "inline-block";
      console.log("Jogo carregado.");
    };
    reader.readAsText(file);
  }
};

window.OfflineGameClient = OfflineGameClient;
window.Offline = OfflineGameClient;

document.addEventListener("DOMContentLoaded", function() {
  document.getElementById("save-button")?.addEventListener("click", OfflineGameClient.save);
  document.getElementById("load-button")?.addEventListener("click", function() {
    document.getElementById("load-file-input").click();
  });
  document.getElementById("load-file-input")?.addEventListener("change", function(e) {
    if (e.target.files[0]) OfflineGameClient.load(e.target.files[0]);
  });
});
