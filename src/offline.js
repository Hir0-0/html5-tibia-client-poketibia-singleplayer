// ==========================================
// offline.js – Single-player com mapa estático
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
      position: { x: 5, y: 5, z: 0 },   // centro do mapa 10x10
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
      width: 10, height: 10, depth: 1,     // mundo pequeno, sem andares
      chunk: { width: 10, height: 10, depth: 1 },
      version: 740, clientVersion: 740, clock: 1, tick: 50
    }
  },

  // Mapa estático: 0 = vazio, 1 = grama, 2 = parede, etc.
  staticMap: [
    [2,2,2,2,2,2,2,2,2,2],
    [2,1,1,1,1,1,1,1,1,2],
    [2,1,1,1,1,1,1,1,1,2],
    [2,1,1,1,1,1,1,1,1,2],
    [2,1,1,1,1,1,1,1,1,2],
    [2,1,1,1,1,1,1,1,1,2],
    [2,1,1,1,1,1,1,1,1,2],
    [2,1,1,1,1,1,1,1,1,2],
    [2,1,1,1,1,1,1,1,1,2],
    [2,2,2,2,2,2,2,2,2,2]
  ],

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

    // Construir o mundo a partir do mapa estático
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

  // Converte o array 2D em um único chunk (já que o mundo é pequeno)
  buildWorldFromStaticMap: function() {
    const map = Offline.staticMap;
    const width = map[0].length;
    const height = map.length;
    const depth = 1;   // apenas um andar

    // Cria um array de tiles no formato esperado: {id, flags}
    let tilesArray = [];
    for (let z = 0; z < depth; z++) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let tileId = map[y][x];
          // Para simplificar: id=0 é vazio (não renderiza), id=1 é grama, id=2 é parede
          tilesArray.push({ id: tileId, flags: 0 });
        }
      }
    }

    // O mundo tem apenas um chunk, posição (0,0,0)
    let chunkPos = new Position(0, 0, 0);
    let chunk = new Chunk(null, chunkPos, tilesArray);

    // Adiciona o chunk ao mundo
    const world = gameClient.world;
    if (typeof world.setChunk === 'function') {
      world.setChunk(chunk);
    } else {
      // Fallback: armazena no mapa world.chunks
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
