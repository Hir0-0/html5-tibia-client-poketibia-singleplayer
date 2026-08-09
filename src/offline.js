// ==========================================
// offline.js – Single-player com mapa estático (32x32)
// ==========================================

const Offline = {
  
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
      position: { x: 16, y: 16, z: 7 },  // centro do mapa 32x32
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

    // Tenta forçar o carregamento dos assets se ainda não estiverem prontos
    if (!gameClient.interface.areAssetsLoaded()) {
      // Chama o carregador automático do servidor (busca em ./data/74/)
      gameClient.networkManager.loadGameFilesServer();
      // Aguarda um pouco e tenta novamente
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

    // Constrói o mundo a partir do mapa estático (32x32)
    Offline.buildWorldFromStaticMap();

    let playerData = Offline.defaultState.player;
    let startPos = new Position(playerData.position.x, playerData.position.y, playerData.position.z);

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

  // Mapa estático 32x32 (exemplo: borda de parede, interior de grama)
  staticMap: Array(32).fill().map((_, y) =>
    Array(32).fill().map((_, x) => {
      if (x === 0 || x === 31 || y === 0 || y === 31) return 2; // paredes
      return 1; // grama
    })
  ),

  // Converte o array 2D em chunks compatíveis (32x32x4)
  buildWorldFromStaticMap: function() {
    const map = Offline.staticMap;
    const width = map[0].length;
    const height = map.length;
    const depth = 4;   // profundidade do chunk (4 andares)

    // Cria um único chunk (índice 0,0,0) e preenche todos os andares com o mesmo mapa
    let tilesArray = [];
    for (let z = 0; z < depth; z++) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let tileId = map[y][x];
          // Abaixo do chão principal (z<3) deixa vazio (id=0) para não renderizar nada
          if (z < depth - 1) {
            tileId = 0;
          }
          tilesArray.push({ id: tileId, flags: 0 });
        }
      }
    }

    // Posição do chunk no mundo (índice de chunk, não coordenadas absolutas)
    let chunkPos = new Position(0, 0, 0);
    let chunk = new Chunk(null, chunkPos, tilesArray);

    const world = gameClient.world;
    if (typeof world.setChunk === 'function') {
      world.setChunk(chunk);
    } else {
      if (!world.chunks) world.chunks = {};
      world.chunks["0,0,0"] = chunk;
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

      Offline.buildWorldFromStaticMap();
      
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
