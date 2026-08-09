// ==========================================
// offline.js – Inicializador single-player
// ==========================================

const Offline = {
  
  // Estado padrão do jogo (coordenadas puras, sem métodos)
  defaultState: {
    player: {
      id: 1,
      name: "Sobrevivente",
      sex: 0,
      level: 1,
      experience: 0,
      health: 100,
      maxHealth: 100,
      mana: 50,
      maxMana: 50,
      capacity: 50000,
      speed: 200,
      position: { x: 100, y: 100, z: 7 },
      equipment: {
        head: null, neck: null, backpack: null, armor: null,
        right: null, left: null, legs: null, feet: null, ring: null
      },
      outfits: [
        {
          id: 128,
          details: { head: 78, body: 106, legs: 95, feet: 76 },
          mount: 0,
          mounted: false,
          addonOne: false,
          addonTwo: false
        }
      ],
      mounts: []
    },
    world: {
      width: 2048,
      height: 2048,
      depth: 16,
      chunk: { width: 32, height: 32, depth: 4 },
      version: 740,
      clientVersion: 740,
      clock: 1,
      tick: 50
    }
  },

  start: function() {
    console.log("Offline.start() executado");

    if (!gameClient.interface.areAssetsLoaded()) {
      gameClient.networkManager.loadGameFilesServer();
      setTimeout(() => Offline.start(), 500);
      return;
    }

    let worldData = Offline.defaultState.world;
    gameClient.setServerData({
      clientVersion: worldData.clientVersion,
      version: worldData.version,
      clock: worldData.clock,
      tick: worldData.tick,
      chunk: worldData.chunk,
      width: worldData.width,
      height: worldData.height,
      depth: worldData.depth
    });

    let playerData = Offline.defaultState.player;
    console.log("Dados do jogador:", JSON.stringify(playerData, null, 2));

    // CRIA UM OBJETO Position VÁLIDO
    let startPos = new Position(playerData.position.x, playerData.position.y, playerData.position.z);

    // Gera o chão AO REDOR ANTES de criar o jogador
    Offline.generateGround(playerData.position.x, playerData.position.y, playerData.position.z, 30);
    gameClient.renderer.updateTileCache();

    gameClient.handleAcceptLogin({
      id: playerData.id,
      name: playerData.name,
      sex: playerData.sex,
      level: playerData.level,
      experience: playerData.experience,
      health: playerData.health,
      maxHealth: playerData.maxHealth,
      mana: playerData.mana,
      maxMana: playerData.maxMana,
      capacity: playerData.capacity,
      speed: playerData.speed,
      position: startPos,
      equipment: playerData.equipment,
      outfit: playerData.outfits[0],
      outfits: playerData.outfits,
      mounts: playerData.mounts
    });

    document.getElementById("save-button").style.display = "inline-block";
    document.getElementById("load-button").style.display = "inline-block";

    console.log("Sobrevivente está offline. O apocalipse começou.");
  },

  // Gera um chão de grama ao redor da posição (cx, cy, z)
  generateGround: function(cx, cy, z, radius) {
    const world = gameClient.world;
    if (!world) return;

    const CHUNK_W = Chunk.prototype.WIDTH;
    const CHUNK_H = Chunk.prototype.HEIGHT;
    const CHUNK_D = Chunk.prototype.DEPTH;
    const TILES_PER_CHUNK = CHUNK_W * CHUNK_H * CHUNK_D;

    // Conjunto para evitar recriar o mesmo chunk múltiplas vezes
    const createdChunks = new Set();

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        let wx = cx + dx;
        let wy = cy + dy;

        // Verifica se o chunk já existe
        let existingChunk = world.getChunkFromWorldPosition({x: wx, y: wy, z: z});
        if (existingChunk) continue;  // já tem tiles, pula

        // Calcula o canto do chunk (múltiplo das dimensões)
        let chunkStartX = wx - (wx % CHUNK_W);
        let chunkStartY = wy - (wy % CHUNK_H);
        let chunkStartZ = z - (z % CHUNK_D);

        // Cria uma chave única para este chunk
        let key = Math.floor(chunkStartX / CHUNK_W) + "," + Math.floor(chunkStartY / CHUNK_H) + "," + Math.floor(chunkStartZ / CHUNK_D);
        if (createdChunks.has(key)) continue;
        createdChunks.add(key);

        // Cria um array de tiles vazio com tamanho TILES_PER_CHUNK
        let tilesArray = new Array(TILES_PER_CHUNK);
        for (let i = 0; i < TILES_PER_CHUNK; i++) {
          tilesArray[i] = { id: 2, flags: 0 };  // grama
        }

        // Cria o chunk com a posição correta (em índices de chunk)
        let chunkPos = new Position(Math.floor(chunkStartX / CHUNK_W), Math.floor(chunkStartY / CHUNK_H), Math.floor(chunkStartZ / CHUNK_D));
        let newChunk = new Chunk(null, chunkPos, tilesArray);

        // Adiciona o chunk ao mundo
        if (typeof world.setChunk === 'function') {
          world.setChunk(newChunk);
        } else {
          // Fallback: armazena no mapa world.chunks
          if (!world.chunks) world.chunks = {};
          world.chunks[key] = newChunk;
        }
      }
    }
  },

  save: function() {
    if (!gameClient.player) return;
    let pos = gameClient.player.getPosition();
    let state = {
      player: {
        id: gameClient.player.id,
        name: gameClient.player.name,
        sex: gameClient.player.sex,
        level: gameClient.player.state.level,
        experience: gameClient.player.state.experience,
        health: gameClient.player.state.health,
        maxHealth: gameClient.player.state.maxHealth,
        mana: gameClient.player.state.mana,
        maxMana: gameClient.player.state.maxMana,
        capacity: gameClient.player.state.capacity,
        speed: gameClient.player.state.speed,
        position: { x: pos.x, y: pos.y, z: pos.z },
        equipment: gameClient.player.equipment,
        outfits: gameClient.player.outfits,
        mounts: gameClient.player.mounts
      },
      timestamp: new Date().toISOString()
    };

    let json = JSON.stringify(state, null, 2);
    let blob = new Blob([json], { type: "application/json" });
    let url = URL.createObjectURL(blob);
    
    let a = document.createElement("a");
    a.href = url;
    a.download = "sobrevivencia-save.json";
    a.click();
    URL.revokeObjectURL(url);
  },

  load: function(file) {
    let reader = new FileReader();
    reader.onload = function(e) {
      let state = JSON.parse(e.target.result);
      gameClient.reset();
      
      let worldData = Offline.defaultState.world;
      gameClient.setServerData({
        clientVersion: worldData.clientVersion,
        version: worldData.version,
        clock: worldData.clock,
        tick: worldData.tick,
        chunk: worldData.chunk,
        width: worldData.width,
        height: worldData.height,
        depth: worldData.depth
      });

      // Gera o chão ao redor da posição carregada
      Offline.generateGround(state.player.position.x, state.player.position.y, state.player.position.z, 30);
      gameClient.renderer.updateTileCache();
      
      let pos = new Position(state.player.position.x, state.player.position.y, state.player.position.z);
      gameClient.handleAcceptLogin({
        id: state.player.id,
        name: state.player.name,
        sex: state.player.sex,
        level: state.player.level,
        experience: state.player.experience,
        health: state.player.health,
        maxHealth: state.player.maxHealth,
        mana: state.player.mana,
        maxMana: state.player.maxMana,
        capacity: state.player.capacity,
        speed: state.player.speed,
        position: pos,
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
