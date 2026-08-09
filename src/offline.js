// ==========================================
// offline.js – Chunks gerados corretamente no array world.chunks
// ==========================================

const Offline = {

  worldConfig: {
    width: 2048, height: 2048, depth: 16,
    chunk: { width: 32, height: 32, depth: 4 },
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
    console.log("Offline.start() executado");

    if (!gameClient.interface.areAssetsLoaded()) {
      gameClient.networkManager.loadGameFilesServer();
      setTimeout(() => Offline.start(), 500);
      return;
    }

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

    const pos = this.startPosition;
    this.generateChunksAround(pos.x, pos.y, pos.z, 1);  // raio 1 (3x3 chunks)

    const startPos = new Position(pos.x, pos.y, pos.z);
    const pdata = this.playerData;
    gameClient.handleAcceptLogin({
      id: pdata.id, name: pdata.name, sex: pdata.sex,
      level: pdata.level, experience: pdata.experience,
      health: pdata.health, maxHealth: pdata.maxHealth,
      mana: pdata.mana, maxMana: pdata.maxMana,
      capacity: pdata.capacity, speed: pdata.speed,
      position: startPos,
      equipment: pdata.equipment,
      outfit: pdata.outfits[0],
      outfits: pdata.outfits,
      mounts: pdata.mounts
    });

    document.getElementById("save-button").style.display = "inline-block";
    document.getElementById("load-button").style.display = "inline-block";
    console.log("Sobrevivente está offline. O apocalipse começou.");
  },

  generateChunksAround: function(wx, wy, wz, radius) {
    const world = gameClient.world;
    const CHUNK_W = this.worldConfig.chunk.width;
    const CHUNK_H = this.worldConfig.chunk.height;
    const CHUNK_D = this.worldConfig.chunk.depth;

    // Posição do setor (usando o método do mundo)
    const sectorPos = world.getChunkPositionFromWorldPosition({x: wx, y: wy, z: wz});
    const sx = sectorPos.x;
    const sy = sectorPos.y;
    const sz = sectorPos.z;   // para z<8 será 0

    console.log("Setor central:", sx, sy, sz);

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const cx = sx + dx;
        const cy = sy + dy;
        const cz = sz;   // todos os chunks no mesmo nível vertical

        // Verifica se o chunk já foi criado (usando o id único)
        const chunkPos = new Position(cx, cy, cz);
        const chunkId = world.getChunkIndex(chunkPos);
        if (this.createdChunkIds.has(chunkId)) continue;
        this.createdChunkIds.add(chunkId);

        // Cria os tiles (apenas o andar do jogador (7) recebe grama)
        const tiles = [];
        for (let z = 0; z < CHUNK_D; z++) {
          for (let y = 0; y < CHUNK_H; y++) {
            for (let x = 0; x < CHUNK_W; x++) {
              const tileWZ = cz * CHUNK_D + z;   // world Z
              let tileId = 0;
              if (tileWZ === wz) {
                tileId = 2;   // grama
              }
              tiles.push({ id: tileId, flags: 0 });
            }
          }
        }

        const chunk = new Chunk(null, chunkPos, tiles);
        chunk.id = chunkId;   // define o id para ser encontrado por findChunk

        // Adiciona ao array de chunks do mundo
        world.chunks.push(chunk);
        console.log("Chunk adicionado: id=%d, pos=(%d,%d,%d)", chunkId, cx, cy, cz);
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
        clientVersion: Offline.worldConfig.clientVersion, version: Offline.worldConfig.version,
        clock: Offline.worldConfig.clock, tick: Offline.worldConfig.tick,
        chunk: Offline.worldConfig.chunk,
        width: Offline.worldConfig.width, height: Offline.worldConfig.height, depth: Offline.worldConfig.depth
      });
      const pos = state.player.position;
      Offline.createdChunkIds.clear();
      Offline.generateChunksAround(pos.x, pos.y, pos.z, 1);
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
      document.getElementById("save-button").style.display = "inline-block";
      document.getElementById("load-button").style.display = "inline-block";
      console.log("Jogo carregado.");
    };
    reader.readAsText(file);
  }
};

document.addEventListener("DOMContentLoaded", function() {
  document.getElementById("save-button")?.addEventListener("click", Offline.save);
  document.getElementById("load-button")?.addEventListener("click", function() {
    document.getElementById("load-file-input").click();
  });
  document.getElementById("load-file-input")?.addEventListener("change", function(e) {
    if (e.target.files[0]) Offline.load(e.target.files[0]);
  });
});
