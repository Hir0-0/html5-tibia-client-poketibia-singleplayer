// ==========================================
// offline.js – Inicializador single-player
// ==========================================

const Offline = {
  
  // Estado padrão do jogo (nosso "save inicial")
  defaultState: {
    player: {
      id: 1,
      name: "Pokétrainer",
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
      outfits: [{ looktype: 128, lookhead: 78, lookbody: 106, looklegs: 95, lookfeet: 76 }],
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

  // Inicializa o jogo em modo offline
  start: function() {
    // Carrega os assets automaticamente (se houver na pasta data/)
    if (!gameClient.interface.areAssetsLoaded()) {
      gameClient.networkManager.loadGameFilesServer();
      // Pequeno atraso para carregar assets antes de iniciar
      setTimeout(() => Offline.start(), 500);
      return;
    }

    // Simula o pacote setServerData
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

    // Simula o pacote LOGIN_SUCCESS
    let playerData = Offline.defaultState.player;
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
      position: playerData.position,
      equipment: playerData.equipment,
      outfits: playerData.outfits,
      mounts: playerData.mounts
    });

    // Mostra os botões de save/load
    document.getElementById("save-button").style.display = "inline-block";
    document.getElementById("load-button").style.display = "inline-block";

    console.log("Pokétibia offline iniciado! Bom jogo.");
  },

  // Salva o estado atual em um arquivo JSON
  save: function() {
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
        position: gameClient.player.getPosition(),
        equipment: gameClient.player.equipment.save ? gameClient.player.equipment.save() : gameClient.player.equipment,
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
    a.download = "poketibia-save.json";
    a.click();
    URL.revokeObjectURL(url);
  },

  // Carrega um estado de um arquivo JSON
  load: function(file) {
    let reader = new FileReader();
    reader.onload = function(e) {
      let state = JSON.parse(e.target.result);
      
      // Reinicia o jogo com os dados carregados
      gameClient.reset();
      
      // Reaplica os dados do mundo (fixos por enquanto)
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

      // Cria o jogador com os dados salvos
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
        position: state.player.position,
        equipment: state.player.equipment,
        outfits: state.player.outfits,
        mounts: state.player.mounts
      });

      document.getElementById("save-button").style.display = "inline-block";
      document.getElementById("load-button").style.display = "inline-block";
      console.log("Jogo carregado do save.");
    };
    reader.readAsText(file);
  }
};

// Adiciona os listeners assim que o DOM estiver pronto
document.addEventListener("DOMContentLoaded", function() {
  document.getElementById("save-button").addEventListener("click", Offline.save);
  document.getElementById("load-button").addEventListener("click", function() {
    document.getElementById("load-file-input").click();
  });
  document.getElementById("load-file-input").addEventListener("change", function(e) {
    if (e.target.files[0]) {
      Offline.load(e.target.files[0]);
    }
  });
});
