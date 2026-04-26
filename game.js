const timerEl = document.getElementById("timer");
const tideFillEl = document.getElementById("tide-fill");
const catchPanelEl = document.getElementById("catch-panel");
const catchSpeciesEl = document.getElementById("catch-species");
const catchWeightEl = document.getElementById("catch-weight");
const catchSpriteCanvas = document.getElementById("catch-sprite");
const catchSpriteCtx = catchSpriteCanvas.getContext("2d");
const liveCatchCountEl = document.getElementById("live-catch-count");
const liveBestFishEl = document.getElementById("live-best-fish");
const liveTotalWeightEl = document.getElementById("live-total-weight");
const messageBannerEl = document.getElementById("message-banner");
const startOverlayEl = document.getElementById("start-overlay");
const startHeroCanvas = document.getElementById("start-hero");
const endOverlayEl = document.getElementById("end-overlay");
const startButton = document.getElementById("start-button");
const restartButton = document.getElementById("restart-button");
const endHeadlineEl = document.getElementById("end-headline");
const endSubheadlineEl = document.getElementById("end-subheadline");
const resultCatchCountEl = document.getElementById("result-catch-count");
const resultBestFishEl = document.getElementById("result-best-fish");
const resultTotalWeightEl = document.getElementById("result-total-weight");

catchSpriteCtx.imageSmoothingEnabled = false;
const startHeroCtx = startHeroCanvas.getContext("2d");
startHeroCtx.imageSmoothingEnabled = false;

const GAME_WIDTH = 900;
const GAME_HEIGHT = 1400;
const WATERLINE_Y = GAME_HEIGHT * 0.14;
const SHORE_Y = GAME_HEIGHT * 0.9;
const SESSION_SECONDS = 150;

const fishTable = [
  { species: "Australian Salmon", min: 1.2, max: 4.8, color: 0xd8d8c9, score: 1 },
  { species: "Tailor", min: 0.8, max: 2.9, color: 0xc4deea, score: 1 },
  { species: "Bonito", min: 1.8, max: 5.5, color: 0xd8e5ef, score: 2 },
  { species: "Yellowtail Kingfish", min: 4.5, max: 14.2, color: 0xbad1af, score: 3 },
  { species: "Tuna", min: 6.5, max: 18.5, color: 0x8dd2e9, score: 4 },
  { species: "Mackerel", min: 1.4, max: 6.4, color: 0xddca76, score: 2 },
  { species: "Trevally", min: 2.0, max: 8.0, color: 0xc8d9e2, score: 2 },
  { species: "Queenfish", min: 3.5, max: 10.8, color: 0xa7d7ee, score: 3 },
  { species: "Dolphinfish", min: 5.0, max: 15.0, color: 0xd7e888, score: 4 },
  { species: "Cobia", min: 7.0, max: 19.0, color: 0x9fc5da, score: 4 },
];

const speciesSpawnWeights = [20, 20, 16, 8, 4, 12, 10, 5, 3, 2];

const dom = {
  timerEl,
  tideFillEl,
  catchPanelEl,
  catchSpeciesEl,
  catchWeightEl,
  liveCatchCountEl,
  liveBestFishEl,
  liveTotalWeightEl,
  messageBannerEl,
  startOverlayEl,
  endOverlayEl,
  endHeadlineEl,
  endSubheadlineEl,
  resultCatchCountEl,
  resultBestFishEl,
  resultTotalWeightEl,
};

class BoringtideScene extends Phaser.Scene {
  constructor() {
    super("BoringtideScene");
    this.isRunning = false;
    this.timeLeft = SESSION_SECONDS;
    this.stats = null;
    this.fish = [];
    this.splashes = [];
    this.hookedFight = null;
    this.pointerHeld = false;
    this.holdBoost = false;
    this.holdStart = 0;
    this.audio = { ready: false, context: null, nodes: null };
    this.shakaBubble = null;
    this.shakaHand = null;
    this.schools = [];
    this.shark = null;
    this.retrieveTrailTimer = 0;
    this.sideAnglers = [];
    this.photoMoment = null;
    this.hypeTimer = 0;
    this.lastFightComment = "";
    this.shorelineProfile = [];
    this.currentDirection = 1;
  }

  create() {
    this.cameras.main.setBackgroundColor("#2f88aa");
    drawStartHero();
    this.createTextures();
    this.createBackground();
    this.createEntities();
    this.createInput();
    this.resetSession();
  }

  createTextures() {
    this.makeBackgroundTexture();
    this.makeRockTexture();
    this.makePlayerTexture("angler-main", {
      hat: "#1a2f3f",
      top: "#243947",
      shorts: "#e58b57",
      boots: "#5a6a56",
    });
    this.makePlayerTexture("angler-left", {
      hat: "#385164",
      top: "#5e7d4d",
      shorts: "#c97355",
      boots: "#75644d",
    });
    this.makePlayerTexture("angler-right", {
      hat: "#34253d",
      top: "#3f5d73",
      shorts: "#d7a24e",
      boots: "#536557",
    });
    this.makeLureTexture();
    this.makeFishSilhouetteTexture();
    fishTable.forEach((species, index) => {
      this.makeFishTexture(`fish-${index}`, species.color);
    });
    this.makeSharkTexture();
  }

  makeCanvasTexture(key, width, height, drawFn) {
    const texture = this.textures.createCanvas(key, width, height);
    const ctx = texture.getContext();
    ctx.imageSmoothingEnabled = false;
    drawFn(ctx, width, height);
    texture.refresh();
  }

  makeBackgroundTexture() {
    this.makeCanvasTexture("bg-scene", 180, 280, (ctx, width, height) => {
      const skyGradient = ctx.createLinearGradient(0, 0, 0, 36);
      skyGradient.addColorStop(0, "#b4deeb");
      skyGradient.addColorStop(1, "#9acddd");
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, width, 36);
      const waterGradient = ctx.createLinearGradient(0, 36, 0, 220);
      waterGradient.addColorStop(0, "#4aabba");
      waterGradient.addColorStop(0.35, "#2f8aa4");
      waterGradient.addColorStop(0.72, "#246d8d");
      waterGradient.addColorStop(1, "#174e70");
      ctx.fillStyle = waterGradient;
      ctx.fillRect(0, 36, width, 184);
      ctx.fillStyle = "#1e6888";
      ctx.fillRect(0, 212, width, 10);
      ctx.fillStyle = "#d7eef6";
      for (let x = 0; x < width; x += 10) {
        ctx.fillRect(x, 212 + ((x / 10) % 2), 6, 2);
      }

      ctx.fillStyle = "#4d5961";
      const ridge = [
        [0, 238],
        [14, 226],
        [28, 232],
        [42, 216],
        [58, 222],
        [74, 208],
        [90, 215],
        [108, 203],
        [126, 211],
        [144, 198],
        [160, 205],
        [180, 194],
        [180, 280],
        [0, 280],
      ];
      ctx.beginPath();
      ctx.moveTo(ridge[0][0], ridge[0][1]);
      ridge.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#69777d";
      ctx.beginPath();
      ctx.moveTo(0, 240);
      ctx.lineTo(18, 228);
      ctx.lineTo(32, 234);
      ctx.lineTo(48, 220);
      ctx.lineTo(66, 226);
      ctx.lineTo(84, 212);
      ctx.lineTo(102, 220);
      ctx.lineTo(122, 206);
      ctx.lineTo(144, 214);
      ctx.lineTo(164, 202);
      ctx.lineTo(180, 196);
      ctx.lineTo(180, 214);
      ctx.lineTo(0, 250);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#39454b";
      ctx.fillRect(0, 246, 180, 34);
      ctx.fillStyle = "#7f8d92";
      ctx.fillRect(18, 238, 16, 5);
      ctx.fillRect(60, 228, 14, 5);
      ctx.fillRect(98, 234, 16, 5);
      ctx.fillRect(142, 224, 18, 5);

      ctx.fillStyle = "rgba(210, 241, 247, 0.35)";
      [58, 82, 108, 134, 160].forEach((y) => {
        ctx.fillRect(0, y, width, 2);
        ctx.fillRect(0, y + 1, width, 1);
      });

      ctx.fillStyle = "rgba(255,255,255,0.08)";
      for (let y = 46; y < 208; y += 14) {
        for (let x = (y / 2) % 12; x < width; x += 18) {
          ctx.fillRect(x, y, 8, 1);
          ctx.fillRect(x + 3, y + 1, 5, 1);
        }
      }

      ctx.fillStyle = "#d5eef5";
      ctx.fillRect(8, 12, 18, 4);
      ctx.fillRect(12, 8, 10, 4);
      ctx.fillRect(94, 16, 20, 4);
      ctx.fillRect(100, 12, 10, 4);
    });
  }

  makeRockTexture() {
    this.makeCanvasTexture("rock-ledge", 40, 24, (ctx) => {
      ctx.fillStyle = "#455159";
      ctx.beginPath();
      ctx.moveTo(0, 24);
      ctx.lineTo(0, 12);
      ctx.lineTo(5, 8);
      ctx.lineTo(10, 11);
      ctx.lineTo(15, 5);
      ctx.lineTo(20, 9);
      ctx.lineTo(25, 2);
      ctx.lineTo(31, 8);
      ctx.lineTo(36, 3);
      ctx.lineTo(40, 6);
      ctx.lineTo(40, 24);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#6b787d";
      ctx.fillRect(4, 11, 8, 3);
      ctx.fillRect(16, 6, 10, 3);
      ctx.fillRect(28, 4, 8, 3);
      ctx.fillStyle = "#2c363c";
      ctx.fillRect(0, 18, 40, 6);
    });
  }

  makePlayerTexture(key, palette) {
    this.makeCanvasTexture(key, 20, 28, (ctx) => {
      ctx.fillStyle = "#d4b988";
      ctx.fillRect(7, 7, 5, 4);
      ctx.fillStyle = "#f0c57c";
      ctx.fillRect(8, 9, 4, 4);
      ctx.fillStyle = palette.hat;
      ctx.fillRect(7, 6, 6, 2);
      ctx.fillRect(6, 8, 8, 1);
      ctx.fillStyle = palette.top;
      ctx.fillRect(6, 12, 8, 6);
      ctx.fillRect(5, 17, 10, 3);
      ctx.fillStyle = palette.shorts;
      ctx.fillRect(6, 20, 8, 5);
      ctx.fillStyle = palette.boots;
      ctx.fillRect(6, 25, 3, 2);
      ctx.fillRect(11, 25, 3, 2);
      ctx.fillStyle = "#0f2130";
      ctx.fillRect(4, 12, 2, 6);
      ctx.fillRect(14, 14, 1, 5);
      ctx.fillStyle = "#6b4a2b";
      ctx.fillRect(13, 10, 1, 13);
      ctx.fillRect(14, 7, 1, 4);
      ctx.fillRect(15, 6, 2, 1);
    });
  }

  makeLureTexture() {
    this.makeCanvasTexture("lure", 8, 8, (ctx) => {
      ctx.fillStyle = "#fff783";
      ctx.fillRect(1, 1, 4, 4);
      ctx.fillStyle = "#ef8b5f";
      ctx.fillRect(4, 2, 2, 2);
      ctx.fillRect(2, 5, 2, 1);
    });
  }

  makeFishTexture(key, color) {
    this.makeCanvasTexture(key, 24, 12, (ctx) => {
      const hex = `#${color.toString(16).padStart(6, "0")}`;
      ctx.fillStyle = hex;
      ctx.fillRect(6, 3, 10, 5);
      ctx.fillRect(4, 4, 2, 3);
      ctx.fillRect(16, 4, 2, 3);
      ctx.fillRect(2, 5, 2, 1);
      ctx.fillRect(0, 4, 2, 3);
      ctx.fillRect(18, 4, 2, 3);
      ctx.fillStyle = "#dbf0f7";
      ctx.fillRect(8, 2, 5, 1);
      ctx.fillStyle = "#486372";
      ctx.fillRect(14, 4, 1, 1);
    });
  }

  makeFishSilhouetteTexture() {
    this.makeCanvasTexture("fish-shadow", 24, 12, (ctx) => {
      ctx.fillStyle = "#547785";
      ctx.fillRect(6, 3, 10, 5);
      ctx.fillRect(4, 4, 2, 3);
      ctx.fillRect(16, 4, 2, 3);
      ctx.fillRect(2, 5, 2, 1);
      ctx.fillRect(0, 4, 2, 3);
      ctx.fillRect(18, 4, 2, 3);
      ctx.fillStyle = "#486774";
      ctx.fillRect(8, 2, 5, 1);
      ctx.fillRect(14, 4, 1, 1);
    });
  }

  makeSharkTexture() {
    this.makeCanvasTexture("shark", 36, 16, (ctx) => {
      ctx.fillStyle = "#5e7681";
      ctx.fillRect(8, 6, 16, 5);
      ctx.fillRect(4, 7, 4, 3);
      ctx.fillRect(24, 7, 4, 3);
      ctx.fillRect(2, 7, 2, 2);
      ctx.fillRect(0, 6, 2, 4);
      ctx.fillRect(28, 5, 4, 6);
      ctx.fillRect(14, 3, 5, 3);
      ctx.fillStyle = "#76909a";
      ctx.fillRect(9, 6, 10, 1);
      ctx.fillRect(20, 8, 2, 1);
      ctx.fillStyle = "#3a4b53";
      ctx.fillRect(22, 7, 1, 1);
    });

    this.makeCanvasTexture("shark-fin", 12, 12, (ctx) => {
      ctx.fillStyle = "#42555f";
      ctx.fillRect(5, 1, 1, 1);
      ctx.fillRect(4, 2, 2, 1);
      ctx.fillRect(4, 3, 3, 1);
      ctx.fillRect(3, 4, 4, 1);
      ctx.fillRect(3, 5, 5, 1);
      ctx.fillRect(2, 6, 5, 1);
      ctx.fillRect(2, 7, 4, 1);
      ctx.fillRect(1, 8, 4, 1);
      ctx.fillRect(1, 9, 3, 1);
      ctx.fillStyle = "#708892";
      ctx.fillRect(4, 3, 1, 3);
    });
  }

  createBackground() {
    this.background = this.add.image(0, 0, "bg-scene").setOrigin(0, 0);
    this.background.setScale(GAME_WIDTH / 180, GAME_HEIGHT / 280);
    this.waterOverlay = this.add.graphics();
    this.waterOverlay.setDepth(3);
    this.shorelineGraphics = this.add.graphics();
    this.shorelineGraphics.setDepth(4);
    this.foamGraphics = this.add.graphics();
    this.foamGraphics.setDepth(4.2);
    this.drawWaterOverlay();
  }

  createEntities() {
    this.player = this.add.image(GAME_WIDTH * 0.46, SHORE_Y - 118, "angler-main");
    this.player.setScale(4);
    this.player.setOrigin(0.5, 0.5);
    this.player.setDepth(5);

    this.npcLineGraphics = this.add.graphics();
    this.npcLineGraphics.setDepth(4.8);

    this.createSideAnglers();

    this.shakaBubble = this.add.text(this.player.x, this.player.y - 82, "YEW!", {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: "18px",
      color: "#fff0be",
      stroke: "#173247",
      strokeThickness: 4,
    });
    this.shakaBubble.setOrigin(0.5);
    this.shakaBubble.setDepth(8);
    this.shakaBubble.setVisible(false);

    this.shakaHand = this.add.graphics();
    this.shakaHand.setDepth(8);

    this.lineGraphics = this.add.graphics();

    this.lure = this.add.image(this.player.x - 6, this.player.y - 24, "lure");
    this.lure.setScale(3);
    this.lure.setDepth(6);
    this.lureState = "idle";
    this.lureTarget = new Phaser.Math.Vector2(this.player.x, this.player.y - 24);
    this.lureVelocity = new Phaser.Math.Vector2();

    this.shark = this.add.image(GAME_WIDTH * 0.2, WATERLINE_Y + 120, "shark");
    this.shark.setScale(4);
    this.shark.setDepth(1);
    this.shark.setAlpha(0.42);
    this.shark.setTint(0x6a8792);

    this.sharkFin = this.add.image(this.shark.x, this.shark.y - 78, "shark-fin");
    this.sharkFin.setScale(3.5);
    this.sharkFin.setDepth(3.4);
    this.sharkFin.setAlpha(0.9);

    this.sharkWake = this.add.graphics();
    this.sharkWake.setDepth(3.35);

    this.sharkDirection = 1;
    this.sharkSpeed = 58;
    this.sharkTurnTimer = 0.8;
  }

  createSideAnglers() {
    const configs = [
      { x: GAME_WIDTH * 0.24, y: SHORE_Y - 126, flip: false },
      { x: GAME_WIDTH * 0.74, y: SHORE_Y - 132, flip: true },
    ];

    this.sideAnglers = configs.map((config, index) => {
      const sprite = this.add.image(
        config.x,
        config.y,
        index === 0 ? "angler-left" : "angler-right"
      );
      sprite.setScale(4);
      sprite.setOrigin(0.5, 0.5);
      sprite.setDepth(4.9);
      sprite.setFlipX(config.flip);

      const cheerText = this.add.text(config.x, config.y - 80, "YEW!", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "12px",
        color: "#fff0be",
        stroke: "#173247",
        strokeThickness: 3,
      });
      cheerText.setOrigin(0.5);
      cheerText.setDepth(7.2);
      cheerText.setVisible(false);

      const castOrigin = new Phaser.Math.Vector2(
        config.x + (config.flip ? -10 : 10),
        config.y - 18
      );

      return {
        sprite,
        flip: config.flip,
        castOrigin,
        lure: castOrigin.clone(),
        castTarget: castOrigin.clone(),
        state: "waiting",
        timer: 0.9 + index * 0.8,
        progress: 0,
        castDuration: 0.4,
        holdDuration: 0.8,
        baseX: config.x,
        baseY: config.y,
        cheerText,
        cheerTimer: 0,
      };
    });
  }

  createInput() {
    this.input.on("pointerdown", (pointer) => {
      if (!this.isRunning) {
        return;
      }
      this.ensureAudioReady();
      this.pointerHeld = true;
      this.holdBoost = false;
      this.holdStart = performance.now();

      const worldPoint = new Phaser.Math.Vector2(pointer.x, pointer.y);
      if (this.lureState === "hooked") {
        this.setMessage("Fish on!");
        return;
      }

      if (this.lureState === "retrieving") {
        this.lureVelocity.add(new Phaser.Math.Vector2(Phaser.Math.Between(-18, 18), Phaser.Math.Between(-12, 12)));
        this.setMessage("Twitch!");
        return;
      }

      if (this.lureState !== "idle") {
        return;
      }

      if (worldPoint.y < SHORE_Y - 12) {
        this.castLure(worldPoint.x, worldPoint.y);
      }
    });

    this.input.on("pointerup", () => {
      this.pointerHeld = false;
      this.holdBoost = false;
    });

    this.input.on("pointerout", () => {
      this.pointerHeld = false;
      this.holdBoost = false;
    });
  }

  resetSession() {
    this.stopReelScream();
    this.timeLeft = SESSION_SECONDS;
    this.currentDirection = Math.random() > 0.5 ? 1 : -1;
    this.generateShorelineProfile();
    this.drawShoreline();
    this.stats = {
      catches: 0,
      totalWeight: 0,
      bestWeight: 0,
      bestFish: null,
      sharkChance: 0.05,
    };
    this.hookedFight = null;
    this.hideShaka();
    this.lureState = "idle";
    this.lure.setPosition(this.player.x, this.player.y - 24);
    this.lureTarget.set(this.player.x, this.player.y - 24);
    this.lureVelocity.set(0, 0);
    this.retrieveTrailTimer = 0;
    this.clearFish();
    this.spawnFish();
    this.clearSplashes();
    this.resetSideAnglers();
    this.updateHud();
    this.resetCatchPanel();
    this.setMessage("Tap the water to cast");
  }

  resetCatchPanel() {
    catchSpeciesEl.textContent = "No fish yet";
    catchWeightEl.textContent = "0.0 kg";
    drawCatchSprite(fishTable[0].species);
  }

  resetSideAnglers() {
    const leftBaseX = GAME_WIDTH * 0.24;
    const rightBaseX = GAME_WIDTH * 0.74;
    const leftBaseY = this.getSwimBoundaryY(leftBaseX) + 22;
    const rightBaseY = this.getSwimBoundaryY(rightBaseX) + 22;
    this.sideAnglers.forEach((angler, index) => {
      angler.state = "waiting";
      angler.timer = 0.9 + index * 0.7;
      angler.progress = 0;
      angler.castDuration = Phaser.Math.FloatBetween(0.34, 0.52);
      angler.holdDuration = Phaser.Math.FloatBetween(0.45, 1.2);
      angler.baseX = index === 0 ? leftBaseX : rightBaseX;
      angler.baseY = index === 0 ? leftBaseY : rightBaseY;
      angler.sprite.x = angler.baseX;
      angler.sprite.y = angler.baseY;
      angler.castOrigin.set(
        angler.sprite.x + (angler.flip ? -10 : 10),
        angler.sprite.y - 18
      );
      angler.lure.copy(angler.castOrigin);
      angler.castTarget.copy(angler.castOrigin);
      angler.cheerTimer = 0;
      angler.cheerText.setVisible(false);
      angler.cheerText.setPosition(angler.baseX, angler.baseY - 78);
    });
    this.player.x = GAME_WIDTH * 0.46;
    this.player.y = this.getSwimBoundaryY(this.player.x) + 18;
    this.lure.setPosition(this.player.x, this.player.y - 24);
    this.lureTarget.set(this.player.x, this.player.y - 24);
  }

  clearFish() {
    this.fish.forEach((fish) => fish.container.destroy());
    this.fish = [];
  }

  clearSplashes() {
    this.splashes.forEach((splash) => splash.destroy());
    this.splashes = [];
  }

  spawnFish() {
    this.schools = [];
    const schoolCount = 5;
    for (let i = 0; i < schoolCount; i += 1) {
      const heading = Phaser.Math.FloatBetween(-Math.PI, Math.PI);
      this.schools.push({
        x: Phaser.Math.Between(90, GAME_WIDTH - 90),
        y: Phaser.Math.Between(WATERLINE_Y + 70, SHORE_Y - 220),
        heading,
        targetHeading: heading,
        speed: Phaser.Math.Between(24, 68),
        turnTimer: Phaser.Math.FloatBetween(0.8, 2.2),
        spread: Phaser.Math.Between(45, 110),
      });
    }

    for (let i = 0; i < 18; i += 1) {
      const speciesIndex = pickWeightedIndex(speciesSpawnWeights);
      const species = fishTable[speciesIndex];
      const scale = Phaser.Math.FloatBetween(0.82, 1.35);
      const schoolIndex = Phaser.Math.Between(0, this.schools.length - 1);
      const school = this.schools[schoolIndex];
      const fish = {
        speciesIndex,
        schoolIndex,
        dir: Math.random() > 0.5 ? 1 : -1,
        spriteScale: scale * 2.2,
        speed: Phaser.Math.Between(24, 82),
        interest: Phaser.Math.FloatBetween(0.3, 0.95),
        size: Phaser.Math.FloatBetween(18, 34) * scale,
        depth: Math.random(),
        wiggle: Math.random() * Math.PI * 2,
        offsetX: Phaser.Math.Between(-school.spread, school.spread),
        offsetY: Phaser.Math.Between(-24, 24),
        offsetDrift: Phaser.Math.FloatBetween(-0.8, 0.8),
        hooked: false,
        container: this.makeFishSprite(speciesIndex, scale),
      };
      fish.container.setPosition(
        school.x + fish.offsetX,
        school.y + fish.offsetY
      );
      fish.container.setFlipX(school.heading < 0 || Math.abs(school.heading) > Math.PI / 2);
      fish.container.alpha = 0.26 + fish.depth * 0.14;
      fish.container.setTint(0x7aa0af);
      fish.container.setDepth(1);
      this.fish.push(fish);
    }
  }

  makeFishSprite(speciesIndex, scale) {
    const sprite = this.add.image(0, 0, "fish-shadow");
    sprite.setScale(scale * 2.2);
    sprite.setOrigin(0.5, 0.5);
    return sprite;
  }

  castLure(x, y) {
    this.playCastSwish();
    this.lureState = "casting";
    this.castStart = new Phaser.Math.Vector2(this.player.x, this.player.y - 24);
    this.castTarget = new Phaser.Math.Vector2(
      Phaser.Math.Clamp(x, 60, GAME_WIDTH - 60),
      Phaser.Math.Clamp(y, WATERLINE_Y + 30, SHORE_Y - 120)
    );
    this.castProgress = 0;
    this.setMessage("Casting...");
  }

  startSession() {
    this.resetSession();
    this.isRunning = true;
    dom.startOverlayEl.classList.add("hidden");
    dom.endOverlayEl.classList.add("hidden");
    this.setMessage("Tide is running");
  }

  endSession(reason) {
    this.isRunning = false;
    this.stopReelScream();
    dom.endOverlayEl.classList.remove("hidden");
    if (reason === "shark") {
      dom.endHeadlineEl.textContent = "NOT SO BORING NOW";
      dom.endSubheadlineEl.textContent = "LINE SNAP!";
      this.setMessage("Shark hooked. Session over.");
    } else {
      dom.endHeadlineEl.textContent = "Tide Finished";
      dom.endSubheadlineEl.textContent = "The bite window has closed.";
      this.setMessage("Tide window ended.");
    }
    dom.resultCatchCountEl.textContent = String(this.stats.catches);
    dom.resultBestFishEl.textContent = this.stats.bestFish
      ? `${this.stats.bestFish.species} ${this.stats.bestFish.weight.toFixed(1)} kg`
      : "None";
    dom.resultTotalWeightEl.textContent = `${this.stats.totalWeight.toFixed(1)} kg`;
  }

  update(_, deltaMs) {
    const dt = Math.min(0.033, deltaMs / 1000);
    this.drawWaterOverlay(deltaMs * 0.001);
    if (this.pointerHeld && performance.now() - this.holdStart > 160) {
      this.holdBoost = true;
    }

    this.updateSplashes(dt);

    if (!this.isRunning) {
      this.drawLine();
      return;
    }

    this.timeLeft = Math.max(0, this.timeLeft - dt);
    if (this.timeLeft === 0) {
      this.endSession("tide");
      this.drawLine();
      return;
    }

    this.updateFish(dt);
    this.updateShark(dt);
    this.updateSideAnglers(dt);
    this.updateLure(dt);
    this.updateHud();
    this.drawLine();
  }

  updateSideAnglers(dt) {
    if (this.photoMoment) {
      this.drawSideAnglerLines();
      return;
    }

    for (const angler of this.sideAnglers) {
      if (angler.cheerTimer > 0) {
        angler.cheerTimer = Math.max(0, angler.cheerTimer - dt);
        angler.sprite.y = angler.baseY - Math.abs(Math.sin(performance.now() * 0.02)) * 10;
        angler.cheerText.setPosition(angler.sprite.x, angler.sprite.y - 78);
        angler.cheerText.setVisible(true);
        angler.cheerText.setAlpha(Math.min(1, angler.cheerTimer * 1.4));
        if (angler.cheerTimer === 0) {
          angler.cheerText.setVisible(false);
          angler.sprite.y = angler.baseY;
        }
      } else {
        angler.sprite.y = angler.baseY;
      }

      angler.timer -= dt;

      if (angler.state === "waiting" && angler.timer <= 0) {
        angler.state = "casting";
        angler.progress = 0;
        angler.castDuration = Phaser.Math.FloatBetween(0.34, 0.52);
        const dir = angler.flip ? -1 : 1;
        const targetX = Phaser.Math.Clamp(
          angler.sprite.x + dir * Phaser.Math.Between(90, 190),
          60,
          GAME_WIDTH - 60
        );
        const targetY = Phaser.Math.Clamp(
          WATERLINE_Y + Phaser.Math.Between(120, 300),
          WATERLINE_Y + 48,
          this.getSwimBoundaryY(targetX) - 110
        );
        angler.castTarget.set(targetX, targetY);
        angler.timer = angler.castDuration;
      } else if (angler.state === "casting") {
        angler.progress = Math.min(1, angler.progress + dt / angler.castDuration);
        const arc = Math.sin(angler.progress * Math.PI) * 44;
        angler.lure.x = Phaser.Math.Linear(angler.castOrigin.x, angler.castTarget.x, angler.progress);
        angler.lure.y = Phaser.Math.Linear(angler.castOrigin.y, angler.castTarget.y, angler.progress) - arc;
        if (angler.progress >= 1) {
          angler.state = "holding";
          angler.timer = Phaser.Math.FloatBetween(0.4, 1.1);
          this.addSplash(angler.lure.x, angler.lure.y, 6, 0xd7f2fb);
        }
      } else if (angler.state === "holding") {
        if (Math.random() < 0.08) {
          this.addRipple(angler.lure.x, angler.lure.y + 6, Phaser.Math.FloatBetween(3, 6));
        }
        if (angler.timer <= 0) {
          angler.state = "retrieving";
          angler.timer = Phaser.Math.FloatBetween(0.7, 1.2);
        }
      } else if (angler.state === "retrieving") {
        angler.lure.x = Phaser.Math.Linear(angler.lure.x, angler.castOrigin.x, dt * 1.8);
        angler.lure.y = Phaser.Math.Linear(angler.lure.y, angler.castOrigin.y, dt * 1.8);
        if (Math.random() < 0.12) {
          this.addRipple(angler.lure.x, angler.lure.y + 4, Phaser.Math.FloatBetween(2, 4));
        }
      if (Phaser.Math.Distance.Between(angler.lure.x, angler.lure.y, angler.castOrigin.x, angler.castOrigin.y) < 12) {
          angler.state = "waiting";
          angler.timer = Phaser.Math.FloatBetween(1.3, 3.4);
          angler.lure.copy(angler.castOrigin);
        }
      }
    }

    this.drawSideAnglerLines();
  }

  drawSideAnglerLines() {
    this.npcLineGraphics.clear();
    this.npcLineGraphics.lineStyle(1, 0xf7edd1, 0.65);

    for (const angler of this.sideAnglers) {
      if (angler.state === "waiting") {
        continue;
      }
      this.npcLineGraphics.beginPath();
      this.npcLineGraphics.moveTo(angler.castOrigin.x, angler.castOrigin.y);
      this.npcLineGraphics.lineTo(angler.lure.x, angler.lure.y);
      this.npcLineGraphics.strokePath();
      this.npcLineGraphics.fillStyle(0xffef8d, 0.8);
      this.npcLineGraphics.fillRect(angler.lure.x - 2, angler.lure.y - 2, 4, 4);
    }
  }

  triggerSideAnglerCheer(weight, shouts) {
    const shout = shouts
      ? Phaser.Utils.Array.GetRandom(shouts)
      : weight >= 8
        ? "OOOHH!"
        : "YEW!";
    this.sideAnglers.forEach((angler, index) => {
      angler.cheerTimer = 0.8 + index * 0.12;
      angler.cheerText.setText(shout);
      angler.cheerText.setScale(weight >= 8 ? 1.08 : 1);
      angler.cheerText.setAlpha(1);
      angler.timer = Math.max(angler.timer, 0.25);
    });
  }

  updateFish(dt) {
    for (const school of this.schools) {
      school.turnTimer -= dt;
      if (school.turnTimer <= 0) {
        school.turnTimer = Phaser.Math.FloatBetween(0.9, 2.4);
        school.targetHeading += Phaser.Math.FloatBetween(-1.4, 1.4);
        school.speed = Phaser.Math.Between(24, 68);
      }
      school.heading = Phaser.Math.Angle.RotateTo(school.heading, school.targetHeading, dt * 0.9);
      school.x += Math.cos(school.heading) * school.speed * dt;
      school.y += Math.sin(school.heading) * school.speed * dt;

      const lowerBoundary = this.getSwimBoundaryY(school.x) - 110;
      if (school.x < 60) {
        school.x = 60;
        school.targetHeading = Phaser.Math.FloatBetween(-1.05, 1.05);
      } else if (school.x > GAME_WIDTH - 60) {
        school.x = GAME_WIDTH - 60;
        school.targetHeading = Math.PI + Phaser.Math.FloatBetween(-1.05, 1.05);
      }
      if (school.y < WATERLINE_Y + 72) {
        school.y = WATERLINE_Y + 72;
        school.targetHeading = Phaser.Math.FloatBetween(0.2, 1.2);
      } else if (school.y > lowerBoundary) {
        school.y = lowerBoundary;
        school.targetHeading = -Phaser.Math.FloatBetween(0.2, 1.2);
      }
    }

    for (const fish of this.fish) {
      if (fish.hooked) {
        continue;
      }
      fish.wiggle += dt * (1.8 + fish.depth);
      const school = this.schools[fish.schoolIndex];
      fish.offsetX += Math.cos(fish.wiggle * 0.8) * fish.offsetDrift * dt * 12;
      fish.offsetY += Math.sin(fish.wiggle * 0.7) * fish.offsetDrift * dt * 6;
      fish.offsetX = Phaser.Math.Clamp(fish.offsetX, -school.spread, school.spread);
      fish.offsetY = Phaser.Math.Clamp(fish.offsetY, -36, 36);

      const targetX = school.x + fish.offsetX + Math.cos(fish.wiggle * 1.6) * 10;
      const targetY = school.y + fish.offsetY + Math.sin(fish.wiggle) * 6;
      fish.container.x = Phaser.Math.Linear(fish.container.x, targetX, dt * (1.3 + fish.depth));
      fish.container.y = Phaser.Math.Linear(fish.container.y, targetY, dt * (1.15 + fish.depth));
      fish.dir = Math.cos(school.heading) >= 0 ? 1 : -1;
      fish.container.setFlipX(fish.dir < 0);

      const dx = this.lure.x - fish.container.x;
      const dy = this.lure.y - fish.container.y;
      const distance = Math.hypot(dx, dy);
      if (this.lureState === "retrieving" && distance < 180) {
        fish.container.x += (dx / (distance || 1)) * fish.interest * 18 * dt;
        fish.container.y += (dy / (distance || 1)) * fish.interest * 18 * dt;
      }

      const shorelineLimitY = this.getSwimBoundaryY(fish.container.x);
      if (fish.container.y > shorelineLimitY) {
        fish.container.y = shorelineLimitY;
      }
      fish.container.x = Phaser.Math.Clamp(fish.container.x, 22, GAME_WIDTH - 22);
      fish.container.y = Phaser.Math.Clamp(fish.container.y, WATERLINE_Y + 24, shorelineLimitY);

      fish.container.alpha = 0.2 + fish.depth * 0.16;

      if (this.lureState === "retrieving") {
        this.tryHookFish(fish, dt, distance);
      }
    }
  }

  updateShark(dt) {
    this.sharkTurnTimer -= dt;
    if (this.sharkTurnTimer <= 0) {
      this.sharkTurnTimer = Phaser.Math.FloatBetween(1.2, 2.4);
      this.sharkDirection = Math.random() > 0.5 ? 1 : -1;
      this.sharkSpeed = Phaser.Math.Between(48, 72);
      this.shark.y += Phaser.Math.Between(-26, 26);
    }

    this.shark.x += this.sharkDirection * this.sharkSpeed * dt;
    this.shark.y += Math.sin(performance.now() * 0.001 + this.shark.x * 0.01) * 10 * dt;
    if (this.shark.x < 70) {
      this.shark.x = 70;
      this.sharkDirection = 1;
    } else if (this.shark.x > GAME_WIDTH - 70) {
      this.shark.x = GAME_WIDTH - 70;
      this.sharkDirection = -1;
    }

    const sharkLimitY = this.getSwimBoundaryY(this.shark.x) - 26;
    this.shark.y = Phaser.Math.Clamp(this.shark.y, WATERLINE_Y + 42, sharkLimitY);
    this.shark.setFlipX(this.sharkDirection < 0);

    const finSurfaceY = Math.max(WATERLINE_Y + 18, this.shark.y - 72);
    this.sharkFin.setPosition(this.shark.x + this.sharkDirection * 6, finSurfaceY);
    this.sharkFin.setFlipX(this.sharkDirection < 0);

    this.sharkWake.clear();
    this.sharkWake.lineStyle(2, 0xd3eef5, 0.42);
    this.sharkWake.beginPath();
    this.sharkWake.moveTo(this.sharkFin.x - this.sharkDirection * 28, finSurfaceY + 8);
    this.sharkWake.lineTo(this.sharkFin.x - this.sharkDirection * 8, finSurfaceY + 5);
    this.sharkWake.lineTo(this.sharkFin.x + this.sharkDirection * 16, finSurfaceY + 8);
    this.sharkWake.strokePath();
  }

  updateLure(dt) {
    if (this.lureState === "casting") {
      this.castProgress = Math.min(1, this.castProgress + dt * 2.6);
      const arc = Math.sin(this.castProgress * Math.PI) * 120;
      this.lure.x = Phaser.Math.Linear(this.castStart.x, this.castTarget.x, this.castProgress);
      this.lure.y = Phaser.Math.Linear(this.castStart.y, this.castTarget.y, this.castProgress) - arc;
      if (this.castProgress >= 1) {
        this.addSplash(this.lure.x, this.lure.y, 22, 0xd7f2fb);
        this.lureState = "retrieving";
        this.setMessage("Retrieve");
      }
      return;
    }

    if (this.lureState === "retrieving") {
      const target = new Phaser.Math.Vector2(this.player.x, this.player.y - 24);
      const speed = (this.holdBoost ? 1.4 : 1) * 165;
      const toTarget = target.clone().subtract(new Phaser.Math.Vector2(this.lure.x, this.lure.y));
      if (toTarget.length() < 16) {
        this.lureState = "idle";
        this.lure.setPosition(target.x, target.y);
        this.setMessage("Tap the water to cast");
      } else {
        toTarget.normalize().scale(speed * dt);
        const stickbaitPhase = performance.now() * 0.018;
        const stickbaitAmp = this.holdBoost ? 20 : 13;
        const length = toTarget.length() || 1;
        const sideX = -toTarget.y / length;
        const sideY = toTarget.x / length;
        const zig = Math.sin(stickbaitPhase + this.lure.y * 0.02) * stickbaitAmp;
        const pop = Math.sin(stickbaitPhase * 0.5) * 3;
        this.lure.x += toTarget.x + sideX * zig * dt + this.lureVelocity.x * dt;
        this.lure.y += toTarget.y + sideY * zig * dt - Math.abs(pop) * dt + this.lureVelocity.y * dt;
        this.lureVelocity.scale(0.8);
      }
      this.retrieveTrailTimer -= dt;
      if (this.retrieveTrailTimer <= 0) {
        this.retrieveTrailTimer = this.holdBoost ? 0.05 : 0.08;
        this.addRipple(this.lure.x, this.lure.y + 8, Phaser.Math.FloatBetween(5, 9));
        this.addSplash(this.lure.x, this.lure.y + 2, this.holdBoost ? 4 : 3, 0xd7f2fb);
      }
      return;
    }

    if (this.lureState === "hooked") {
      this.updateHookedFight(dt);
      return;
    }

    this.lure.setPosition(this.player.x, this.player.y - 24);
  }

  tryHookFish(fish, dt, distance) {
    const effectiveRange = 36;
    if (distance > fish.size * 1.6 + effectiveRange) {
      return;
    }

    const strikeChance = (0.18 + fish.interest * 0.28 + (this.holdBoost ? 0.04 : 0)) * dt;
    if (Math.random() >= strikeChance) {
      return;
    }

    const sharkDistance = Phaser.Math.Distance.Between(this.lure.x, this.lure.y, this.shark.x, this.shark.y);
    const sharkThreat = sharkDistance < 120 ? 0.75 : sharkDistance < 180 ? 0.28 : this.stats.sharkChance;
    if (Math.random() < sharkThreat) {
      this.addBurst(this.lure.x, this.lure.y, 36, 0xff7b5d);
      this.lureState = "idle";
      this.endSession("shark");
      return;
    }

    const speciesData = fishTable[fish.speciesIndex];
    const weight = rollFishWeight(speciesData);
    this.beginFight(fish, speciesData, weight);
  }

  beginFight(fish, speciesData, weight) {
    fish.hooked = true;
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y - 24, fish.container.x, fish.container.y);
    const isPhotoFish = weight > 3;
    const isHeavyFish = weight >= 5;
    const isHugeFish = weight >= 8;
    this.hookedFight = {
      fish,
      species: speciesData.species,
      color: speciesData.color,
      weight,
      isPhotoFish,
      isHeavyFish,
      isHugeFish,
      score: speciesData.score,
      heading: angle + (Math.random() > 0.5 ? 1 : -1) * Phaser.Math.FloatBetween(0.4, 0.9),
      speed: 110 + weight * 11,
      turnTimer: 0.12,
      runDuration: Math.max(1.1, weight * 0.42),
      runElapsed: 0,
      reelDuration: Math.max(1.4, weight * 0.58),
      reelElapsed: 0,
      runDistanceLimit: Math.min(320, 140 + weight * 10),
      pulledDistance: 0,
      sway: Math.random() * Math.PI * 2,
    };
    this.lureState = "hooked";
    this.addBurst(this.lure.x, this.lure.y, isHugeFish ? 24 : isHeavyFish ? 18 : 12, speciesData.color);
    this.addSplash(this.lure.x, this.lure.y, isHugeFish ? 44 : isHeavyFish ? 32 : 24, speciesData.color);
    if (isHugeFish) {
      this.addRipple(this.lure.x, this.lure.y + 10, 20);
      this.addRipple(this.lure.x, this.lure.y + 16, 28);
    }
    if (isHeavyFish) {
      this.playHookExplosion(weight, isHugeFish);
      this.triggerSideAnglerCheer(weight);
      this.hypeTimer = 0.55;
      this.lastFightComment = "";
    }
    this.startReelScream(weight);
    this.showShaka(isHugeFish ? "YEWWW!" : isHeavyFish ? "OOOI!" : "YEW!", isHugeFish);
    this.playAnglerYell(weight);
    this.setMessage(
      isHugeFish
        ? `BIG FISH! ${speciesData.species} ${weight.toFixed(1)}kg`
        : `${speciesData.species} hooked`
    );
  }

  updateHookedFight(dt) {
    const fight = this.hookedFight;
    if (!fight) {
      this.lureState = "idle";
      this.stopReelScream();
      return;
    }

    fight.sway += dt * (4.2 + fight.weight * 0.1);
    if (fight.runElapsed < fight.runDuration) {
      fight.runElapsed = Math.min(fight.runDuration, fight.runElapsed + dt);
      fight.turnTimer -= dt;
      if (fight.turnTimer <= 0) {
        fight.turnTimer = 0.08 + Math.random() * 0.18;
        fight.heading += (Math.random() - 0.5) * 1.6;
        fight.speed = 100 + fight.weight * 10 + Math.random() * 75;
      }

      const step = fight.speed * dt;
      fight.pulledDistance += step;
      this.lure.x = Phaser.Math.Clamp(this.lure.x + Math.cos(fight.heading) * step, 26, GAME_WIDTH - 26);
      const shorelineLimitY = this.getSwimBoundaryY(this.lure.x) - 18;
      this.lure.y = Phaser.Math.Clamp(this.lure.y + Math.sin(fight.heading) * step, WATERLINE_Y + 24, shorelineLimitY);
      if (fight.pulledDistance > fight.runDistanceLimit) {
        fight.heading += Math.PI * 0.9 + (Math.random() - 0.5) * 0.8;
        fight.pulledDistance *= 0.62;
      }
      if (this.lure.y >= shorelineLimitY - 4) {
        fight.heading = -Math.abs(fight.heading) + Phaser.Math.FloatBetween(-0.5, 0.5);
      }
      fight.fish.container.setPosition(this.lure.x, this.lure.y);
      if (Math.random() < 0.58) {
        this.addRipple(this.lure.x, this.lure.y + 6, Phaser.Math.FloatBetween(8, 13));
        this.addSplash(this.lure.x, this.lure.y, Phaser.Math.Between(10, 16), fight.color);
      }
      this.updateFightHype(dt, fight);
      this.updateReelScream(0.82, 1 + fight.weight * 0.02);
      this.setMessage(`Fish running... ${fight.weight.toFixed(1)}kg`);
      return;
    }

    const boost = this.holdBoost ? 1.18 : 1;
    fight.reelElapsed = Math.min(fight.reelDuration, fight.reelElapsed + dt * boost);
    const t = easeInOutQuad(fight.reelElapsed / fight.reelDuration);
    const sway = Math.max(12, 28 - fight.weight * 0.28);
    this.lure.x = Phaser.Math.Linear(this.lure.x, this.player.x, dt * (0.42 + boost * 0.22));
    this.lure.y = Phaser.Math.Linear(this.lure.y, this.player.y - 24, dt * (0.36 + boost * 0.18));
    this.lure.x += Math.sin(fight.sway) * sway * (1 - t);
    this.lure.y += Math.cos(fight.sway * 0.7) * sway * 0.55 * (1 - t);
    const reelBoundaryY = this.getSwimBoundaryY(this.lure.x) - 18;
    this.lure.x = Phaser.Math.Clamp(this.lure.x, 26, GAME_WIDTH - 26);
    this.lure.y = Phaser.Math.Clamp(this.lure.y, WATERLINE_Y + 24, reelBoundaryY);
    fight.fish.container.setPosition(this.lure.x, this.lure.y);
    if (Math.random() < 0.24) {
      this.addRipple(this.lure.x, this.lure.y + 6, Phaser.Math.FloatBetween(5, 9));
      this.addSplash(this.lure.x, this.lure.y, Phaser.Math.Between(5, 9), fight.color);
    }
    this.updateFightHype(dt, fight);
    this.updateReelScream(this.holdBoost ? 0.5 : 0.35, 0.7 + fight.weight * 0.015);
    this.setMessage(this.holdBoost ? `Reeling hard... ${fight.species}` : `Reeling in ${fight.species}`);

    if (fight.reelElapsed >= fight.reelDuration) {
      this.landFight();
    }
  }

  landFight() {
    const fight = this.hookedFight;
    if (!fight) {
      return;
    }

    this.stopReelScream();
    this.hideShaka();
    this.stats.catches += 1;
    this.stats.totalWeight += fight.weight;
    this.stats.sharkChance = Math.min(0.42, this.stats.sharkChance + 0.012 + fight.score * 0.003);
    if (!this.stats.bestFish || fight.weight > this.stats.bestWeight) {
      this.stats.bestWeight = fight.weight;
      this.stats.bestFish = { species: fight.species, weight: fight.weight };
    }

    fight.fish.hooked = false;
    this.showCatchPopup(fight.species, fight.weight);
    this.addBurst(this.lure.x, this.lure.y, 18, fight.color);
    this.playCatchCelebration(fight.weight);
    if (fight.isPhotoFish) {
      this.startPhotoMoment(fight);
    } else {
      this.releaseFish(fight, () => {
        this.lureState = "idle";
        this.setMessage(`Released ${fight.species}`);
      });
    }
    this.hookedFight = null;
    this.lure.setPosition(this.player.x, this.player.y - 24);
    this.updateHud();
  }

  updateFightHype(dt, fight) {
    if (!fight.isHeavyFish) {
      return;
    }
    this.hypeTimer -= dt;
    if (this.hypeTimer > 0) {
      return;
    }

    const shouts = fight.isHugeFish
      ? ["STAY ON!", "BIG ONE!", "GO GO!", "C'MON!", "DON'T PULL!"]
      : ["YES!", "GOOD FISH!", "KEEP WINDING!", "NICE!", "ONYA!"];
    const shout = Phaser.Utils.Array.GetRandom(shouts);
    if (shout !== this.lastFightComment) {
      this.lastFightComment = shout;
      this.sideAnglers.forEach((angler, index) => {
        angler.cheerTimer = 0.55 + index * 0.08;
        angler.cheerText.setText(shout);
        angler.cheerText.setScale(fight.isHugeFish ? 1.08 : 1);
        angler.cheerText.setAlpha(1);
      });
      this.playAnglerYell(fight.isHugeFish ? Math.max(fight.weight, 8) : Math.max(fight.weight, 5));
    }
    this.hypeTimer = fight.isHugeFish ? 0.7 : 1.05;
  }

  playCatchCelebration(weight) {
    const cheers = weight >= 8
      ? ["WOOO!", "YEEEW!", "GET IN!", "HOW GOOD!"]
      : ["HAHA!", "YEAH!", "YEWWW!", "ONYA!"];
    this.triggerSideAnglerCheer(weight, cheers);
    this.showShaka(weight >= 8 ? "YEEEW!" : "HAHA!", weight >= 8);
    this.playAnglerYell(Math.max(weight + 1.5, 5));
  }

  startPhotoMoment(fight) {
    this.lureState = "photo";
    this.photoMoment = { fight };
    this.setMessage(`Crew in! ${fight.species}`);

    const fish = fight.fish;
    fish.container.setTexture(`fish-${fish.speciesIndex}`);
    fish.container.clearTint();
    fish.container.setAlpha(0.98);
    fish.container.setScale(Math.max(2.3, fish.spriteScale * 1.16));
    fish.container.setDepth(6.8);
    fish.container.setPosition(this.player.x + 18, this.player.y - 44);
    fish.container.setFlipX(false);
    fish.container.angle = -8;

    const gatherTargets = [
      { x: this.player.x - 82, y: SHORE_Y - 124 },
      { x: this.player.x + 86, y: SHORE_Y - 130 },
    ];

    this.sideAnglers.forEach((angler, index) => {
      angler.state = "photo";
      angler.cheerTimer = 0;
      angler.cheerText.setText(index === 0 ? "LOOK AT IT!" : "YEAH!");
      angler.cheerText.setVisible(true);
      angler.cheerText.setAlpha(1);
      this.tweens.add({
        targets: angler.sprite,
        x: gatherTargets[index].x,
        y: gatherTargets[index].y,
        duration: 320,
        ease: "Quad.out",
        onUpdate: () => {
          angler.castOrigin.set(
            angler.sprite.x + (angler.flip ? -10 : 10),
            angler.sprite.y - 18
          );
        },
      });
      this.tweens.add({
        targets: angler.cheerText,
        x: gatherTargets[index].x,
        y: gatherTargets[index].y - 78,
        duration: 320,
        ease: "Quad.out",
      });
    });

    this.time.delayedCall(420, () => {
      if (!this.photoMoment || this.photoMoment.fight !== fight) {
        return;
      }
      this.sideAnglers.forEach((angler, index) => {
        angler.cheerText.setText(index === 0 ? "PHOTO!" : "SHOT!");
        angler.cheerText.setVisible(true);
        angler.cheerText.setAlpha(1);
      });
      this.flashPhotoBurst();
      this.setMessage(`Snap it! ${fight.species}`);
    });

    this.time.delayedCall(980, () => {
      if (!this.photoMoment || this.photoMoment.fight !== fight) {
        return;
      }
      this.sideAnglers.forEach((angler) => {
        angler.cheerText.setVisible(false);
      });
      this.releaseFish(fight, () => this.finishPhotoMoment());
      this.setMessage(`Released ${fight.species}`);
    });
  }

  flashPhotoBurst() {
    const burst = this.add.rectangle(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.46, GAME_WIDTH, GAME_HEIGHT, 0xffffff, 0);
    burst.setDepth(20);
    this.tweens.add({
      targets: burst,
      alpha: { from: 0.75, to: 0 },
      duration: 140,
      ease: "Quad.out",
      onComplete: () => burst.destroy(),
    });

    this.time.delayedCall(160, () => {
      const second = this.add.rectangle(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.46, GAME_WIDTH, GAME_HEIGHT, 0xf9f3d1, 0);
      second.setDepth(20);
      this.tweens.add({
        targets: second,
        alpha: { from: 0.4, to: 0 },
        duration: 120,
        ease: "Quad.out",
        onComplete: () => second.destroy(),
      });
    });
  }

  generateShorelineProfile() {
    const crest = Phaser.Math.Between(-40, 24);
    this.shorelineProfile = [
      { x: 0, y: SHORE_Y - Phaser.Math.Between(92, 118) },
      { x: GAME_WIDTH * 0.16, y: SHORE_Y - Phaser.Math.Between(132, 168) },
      { x: GAME_WIDTH * 0.31, y: SHORE_Y - Phaser.Math.Between(188, 236) },
      { x: GAME_WIDTH * 0.46, y: SHORE_Y - Phaser.Math.Between(270, 312) + crest },
      { x: GAME_WIDTH * 0.62, y: SHORE_Y - Phaser.Math.Between(214, 258) },
      { x: GAME_WIDTH * 0.78, y: SHORE_Y - Phaser.Math.Between(152, 192) },
      { x: GAME_WIDTH, y: SHORE_Y - Phaser.Math.Between(118, 142) },
    ];
  }

  drawShoreline() {
    if (!this.shorelineProfile.length) {
      return;
    }
    this.shorelineGraphics.clear();
    this.foamGraphics.clear();

    this.shorelineGraphics.fillStyle(0x4d5961, 1);
    this.shorelineGraphics.beginPath();
    this.shorelineGraphics.moveTo(this.shorelineProfile[0].x, this.shorelineProfile[0].y);
    this.shorelineProfile.slice(1).forEach((point) => this.shorelineGraphics.lineTo(point.x, point.y));
    this.shorelineGraphics.lineTo(GAME_WIDTH, GAME_HEIGHT);
    this.shorelineGraphics.lineTo(0, GAME_HEIGHT);
    this.shorelineGraphics.closePath();
    this.shorelineGraphics.fillPath();

    this.shorelineGraphics.fillStyle(0x69777d, 1);
    this.shorelineProfile.forEach((point, index) => {
      if (index === this.shorelineProfile.length - 1) {
        return;
      }
      const next = this.shorelineProfile[index + 1];
      const midX = Phaser.Math.Linear(point.x, next.x, 0.45);
      const midY = Phaser.Math.Linear(point.y, next.y, 0.45);
      this.shorelineGraphics.fillRect(midX - 26, midY - 10, 30, 6);
    });

    this.shorelineGraphics.fillStyle(0x39454b, 1);
    this.shorelineGraphics.fillRect(0, SHORE_Y + 8, GAME_WIDTH, GAME_HEIGHT - SHORE_Y);

    this.foamGraphics.lineStyle(3, 0xd7eef6, 0.48);
    this.foamGraphics.beginPath();
    this.foamGraphics.moveTo(this.shorelineProfile[0].x, this.shorelineProfile[0].y - 3);
    this.shorelineProfile.slice(1).forEach((point, index) => {
      const prev = this.shorelineProfile[index];
      const midX = Phaser.Math.Linear(prev.x, point.x, 0.5);
      const midY = Phaser.Math.Linear(prev.y, point.y, 0.5) - 5;
      this.foamGraphics.lineTo(midX, midY);
      this.foamGraphics.lineTo(point.x, point.y - 3);
    });
    this.foamGraphics.strokePath();
  }

  finishPhotoMoment() {
    this.sideAnglers.forEach((angler, index) => {
      angler.state = "waiting";
      angler.timer = Phaser.Math.FloatBetween(1.0, 2.4) + index * 0.2;
      this.tweens.add({
        targets: angler.sprite,
        x: angler.baseX,
        y: angler.baseY,
        duration: 340,
        ease: "Quad.out",
        onUpdate: () => {
          angler.castOrigin.set(
            angler.sprite.x + (angler.flip ? -10 : 10),
            angler.sprite.y - 18
          );
        },
        onComplete: () => {
          angler.lure.copy(angler.castOrigin);
          angler.castTarget.copy(angler.castOrigin);
        },
      });
    });

    this.photoMoment = null;
    this.lureState = "idle";
    this.setMessage("Back to fishing");
  }

  releaseFish(fight, onComplete) {
    const fish = fight.fish;
    const releaseX = Phaser.Math.Clamp(
      this.player.x + Phaser.Math.Between(-140, 140),
      60,
      GAME_WIDTH - 60
    );
    const releaseBoundaryY = this.getSwimBoundaryY(releaseX) - 28;
    const releaseY = Phaser.Math.Clamp(
      SHORE_Y - 250 + Phaser.Math.Between(-30, 30),
      WATERLINE_Y + 70,
      releaseBoundaryY
    );
    const splashSize = Math.round(16 + fight.weight * 4.5);
    const rippleSize = 10 + fight.weight * 1.8;

    fish.container.setTexture(`fish-${fish.speciesIndex}`);
    fish.container.clearTint();
    fish.container.setAlpha(0.95);
    fish.container.setScale(Math.max(2.2, fish.spriteScale * 1.12));
    fish.container.setDepth(6.5);
    fish.container.setPosition(this.player.x + 12, this.player.y - 44);
    fish.container.setFlipX(releaseX < this.player.x);

    this.tweens.add({
      targets: fish.container,
      x: releaseX,
      y: releaseY,
      angle: releaseX < this.player.x ? -28 : 28,
      duration: 540,
      ease: "Quad.out",
      onUpdate: (tween, target) => {
        const progress = tween.progress;
        target.y -= Math.sin(progress * Math.PI) * (80 + fight.weight * 3.5);
      },
      onComplete: () => {
        fish.container.angle = 0;
        this.addSplash(releaseX, releaseY, splashSize, fight.color);
        this.addRipple(releaseX, releaseY + 10, rippleSize);
        if (fight.weight >= 5) {
          this.playHookExplosion(fight.weight, fight.weight >= 8);
        }

        fish.speciesIndex = pickWeightedIndex(speciesSpawnWeights);
        fish.container.setTexture("fish-shadow");
        fish.container.setScale(fish.spriteScale);
        fish.container.setTint(0x7aa0af);
        fish.container.setAlpha(0.2 + fish.depth * 0.16);
        fish.container.setDepth(1);
        fish.dir = Math.random() > 0.5 ? 1 : -1;
        fish.container.setFlipX(fish.dir < 0);
        fish.schoolIndex = Phaser.Math.Between(0, this.schools.length - 1);
        fish.offsetX = Phaser.Math.Between(-this.schools[fish.schoolIndex].spread, this.schools[fish.schoolIndex].spread);
        fish.offsetY = Phaser.Math.Between(-24, 24);
        fish.offsetDrift = Phaser.Math.FloatBetween(-0.8, 0.8);
        const school = this.schools[fish.schoolIndex];
        fish.container.setPosition(
          Phaser.Math.Clamp(school.x + fish.offsetX, 22, GAME_WIDTH - 22),
          Phaser.Math.Clamp(
            school.y + fish.offsetY,
            WATERLINE_Y + 24,
            this.getSwimBoundaryY(school.x + fish.offsetX)
          )
        );
        if (onComplete) {
          onComplete();
        }
      },
    });
  }

  addRipple(x, y, radius) {
    const ripple = this.add.circle(x, y, radius, 0xffffff, 0);
    ripple.setStrokeStyle(2, 0xdcf5ff, 0.5);
    ripple.life = 0.8;
    ripple.setDepth(7);
    this.splashes.push(ripple);
  }

  addSplash(x, y, count, color) {
    for (let i = 0; i < count; i += 1) {
      const drop = this.add.circle(x, y, Phaser.Math.Between(2, 5), Math.random() > 0.65 ? color : 0xd7f2fb, 0.9);
      drop.vx = Math.cos(-Math.PI / 2 + (Math.random() - 0.5) * 1.8) * Phaser.Math.Between(30, 130);
      drop.vy = Math.sin(-Math.PI / 2 + (Math.random() - 0.5) * 1.8) * Phaser.Math.Between(30, 130);
      drop.life = Phaser.Math.FloatBetween(0.35, 0.8);
      drop.isDrop = true;
      drop.setDepth(7);
      this.splashes.push(drop);
    }
  }

  addBurst(x, y, count, color) {
    this.addSplash(x, y, count, color);
  }

  updateSplashes(dt) {
    this.splashes = this.splashes.filter((splash) => {
      splash.life -= dt;
      if (splash.isDrop) {
        splash.x += splash.vx * dt;
        splash.y += splash.vy * dt;
        splash.vx *= 0.97;
        splash.vy *= 0.97;
        splash.setAlpha(Math.max(0, splash.life));
      } else {
        splash.radius += 42 * dt;
        splash.setRadius(splash.radius);
        splash.setStrokeStyle(2, 0xdcf5ff, Math.max(0, splash.life * 0.55));
      }
      if (splash.life <= 0) {
        splash.destroy();
        return false;
      }
      return true;
    });
  }

  drawLine() {
    this.lineGraphics.clear();
    this.lineGraphics.setDepth(6);
    this.lineGraphics.lineStyle(2, 0xfff6d6, 1);
    this.lineGraphics.beginPath();
    this.lineGraphics.moveTo(this.player.x, this.player.y - 24);
    this.lineGraphics.lineTo(this.lure.x, this.lure.y);
    this.lineGraphics.strokePath();
  }

  drawWaterOverlay(time = 0) {
    this.waterOverlay.clear();
    this.waterOverlay.fillStyle(0x6eb6c9, 0.08);
    this.waterOverlay.fillRect(0, WATERLINE_Y + 10, GAME_WIDTH, SHORE_Y - WATERLINE_Y - 18);

    this.waterOverlay.fillStyle(0x9ed6e4, 0.08);
    for (let i = 0; i < 6; i += 1) {
      const y = WATERLINE_Y + 28 + i * 74;
      const offset = Math.sin(time * 1.2 + i * 0.7) * 24;
      this.waterOverlay.fillRect(0, y, GAME_WIDTH, 2);
      for (let x = -40; x < GAME_WIDTH + 40; x += 64) {
        this.waterOverlay.fillRect(x + offset, y - 6, 18, 1);
        this.waterOverlay.fillRect(x + 20 + offset, y - 3, 12, 1);
      }
    }

    this.waterOverlay.lineStyle(2, 0xc2e8f0, 0.12);
    for (let i = 0; i < 7; i += 1) {
      const baseY = WATERLINE_Y + 54 + i * 66;
      this.waterOverlay.beginPath();
      for (let x = -20; x <= GAME_WIDTH + 20; x += 20) {
        const drift = this.currentDirection * time * 42;
        const y = baseY + Math.sin((x + drift) * 0.022 + i) * 6;
        if (x === -20) {
          this.waterOverlay.moveTo(x, y);
        } else {
          this.waterOverlay.lineTo(x, y);
        }
      }
      this.waterOverlay.strokePath();
    }

    this.waterOverlay.fillStyle(0xd5eef5, 0.1);
    for (let i = 0; i < 18; i += 1) {
      const progress = ((time * 34 * this.currentDirection) + i * 47) % (GAME_WIDTH + 120);
      const x = this.currentDirection > 0 ? progress - 60 : GAME_WIDTH - progress + 60;
      const y = WATERLINE_Y + 80 + (i % 6) * 84 + Math.sin(time * 1.8 + i) * 10;
      this.waterOverlay.fillTriangle(x, y, x - 10 * this.currentDirection, y - 4, x - 10 * this.currentDirection, y + 4);
    }

    this.waterOverlay.fillGradientStyle(0x7bc1d3, 0x7bc1d3, 0x1d5f80, 0x1d5f80, 0.1);
    this.waterOverlay.fillRect(0, WATERLINE_Y + 20, GAME_WIDTH, SHORE_Y - WATERLINE_Y - 20);
  }

  showCatchPopup(species, weight) {
    catchSpeciesEl.textContent = species;
    catchWeightEl.textContent = `${weight.toFixed(1)} kg`;
    drawCatchSprite(species);
  }

  setMessage(text) {
    messageBannerEl.textContent = text;
  }

  updateHud() {
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = Math.floor(this.timeLeft % 60)
      .toString()
      .padStart(2, "0");
    timerEl.textContent = `${minutes}:${seconds}`;
    tideFillEl.style.transform = `scaleX(${this.timeLeft / SESSION_SECONDS})`;
    liveCatchCountEl.textContent = String(this.stats.catches);
    liveBestFishEl.textContent = this.stats.bestFish
      ? `${this.stats.bestFish.species} ${this.stats.bestFish.weight.toFixed(1)}kg`
      : "None";
    liveTotalWeightEl.textContent = `${this.stats.totalWeight.toFixed(1)} kg`;
  }

  getSwimBoundaryY(x) {
    const points = this.shorelineProfile.length
      ? this.shorelineProfile
      : [
          { x: 0, y: SHORE_Y - 110 },
          { x: GAME_WIDTH * 0.16, y: SHORE_Y - 150 },
          { x: GAME_WIDTH * 0.3, y: SHORE_Y - 220 },
          { x: GAME_WIDTH * 0.46, y: SHORE_Y - 300 },
          { x: GAME_WIDTH * 0.62, y: SHORE_Y - 240 },
          { x: GAME_WIDTH * 0.78, y: SHORE_Y - 170 },
          { x: GAME_WIDTH, y: SHORE_Y - 130 },
        ];

    if (x <= points[0].x) {
      return points[0].y;
    }

    for (let i = 1; i < points.length; i += 1) {
      const left = points[i - 1];
      const right = points[i];
      if (x <= right.x) {
        const t = (x - left.x) / (right.x - left.x);
        return Phaser.Math.Linear(left.y, right.y, t);
      }
    }

    return points[points.length - 1].y;
  }

  showShaka(text = "YEW!", emphatic = false) {
    this.hideShaka();
    this.shakaBubble.setText(text);
    this.shakaBubble.setPosition(this.player.x, this.player.y - 82);
    this.shakaBubble.setScale(emphatic ? 0.92 : 0.8);
    this.shakaBubble.setAlpha(1);
    this.shakaBubble.setVisible(true);
    this.drawShakaHand(this.player.x + 44, this.player.y - 52, emphatic ? 1.22 : 1);
    this.tweens.add({
      targets: this.shakaBubble,
      y: emphatic ? this.player.y - 108 : this.player.y - 98,
      scale: emphatic ? 1.12 : 1,
      duration: emphatic ? 160 : 120,
      ease: "Quad.out",
    });
    this.tweens.add({
      targets: this.shakaHand,
      angle: emphatic ? -8 : -4,
      y: emphatic ? -10 : -6,
      yoyo: true,
      repeat: emphatic ? 2 : 1,
      duration: emphatic ? 90 : 120,
      ease: "Sine.inOut",
    });
    this.time.delayedCall(emphatic ? 1350 : 850, () => this.hideShaka());
  }

  hideShaka() {
    if (this.shakaBubble) {
      this.shakaBubble.setVisible(false);
    }
    if (this.shakaHand) {
      this.shakaHand.clear();
    }
  }

  drawShakaHand(x, y, scale) {
    this.shakaHand.clear();
    this.shakaHand.fillStyle(0xf5c46f, 1);
    this.shakaHand.fillRect(x, y, 6 * scale, 14 * scale);
    this.shakaHand.fillRect(x - 4 * scale, y + 10 * scale, 8 * scale, 4 * scale);
    this.shakaHand.fillRect(x + 4 * scale, y - 4 * scale, 4 * scale, 6 * scale);
    this.shakaHand.fillRect(x + 5 * scale, y + 2 * scale, 3 * scale, 6 * scale);
    this.shakaHand.fillRect(x + 6 * scale, y + 7 * scale, 3 * scale, 5 * scale);
  }

  ensureAudioReady() {
    if (this.audio.ready) {
      if (this.audio.context && this.audio.context.state === "suspended") {
        this.audio.context.resume();
      }
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      return;
    }
    this.audio.context = new AudioCtx();
    this.audio.ready = true;
  }

  startReelScream(weight) {
    if (!this.audio.ready || !this.audio.context) {
      return;
    }
    this.stopReelScream();
    const ctxAudio = this.audio.context;
    const master = ctxAudio.createGain();
    const tone = ctxAudio.createOscillator();
    const wobble = ctxAudio.createOscillator();
    const wobbleGain = ctxAudio.createGain();
    const filter = ctxAudio.createBiquadFilter();

    tone.type = "sawtooth";
    tone.frequency.value = 320 + weight * 10;
    wobble.type = "triangle";
    wobble.frequency.value = 8;
    wobbleGain.gain.value = 18;
    filter.type = "bandpass";
    filter.frequency.value = 900;
    filter.Q.value = 1.5;
    master.gain.value = 0.0001;

    wobble.connect(wobbleGain);
    wobbleGain.connect(tone.frequency);
    tone.connect(filter);
    filter.connect(master);
    master.connect(ctxAudio.destination);

    const now = ctxAudio.currentTime;
    master.gain.exponentialRampToValueAtTime(0.028, now + 0.05);
    tone.start();
    wobble.start();

    this.audio.nodes = { master, tone, wobble, filter };
  }

  updateReelScream(intensity, tension) {
    if (!this.audio.nodes || !this.audio.context) {
      return;
    }
    const now = this.audio.context.currentTime;
    const base = 310 + tension * 180;
    this.audio.nodes.tone.frequency.setTargetAtTime(base + Math.random() * 30, now, 0.04);
    this.audio.nodes.filter.frequency.setTargetAtTime(720 + intensity * 900, now, 0.06);
    this.audio.nodes.master.gain.setTargetAtTime(0.01 + intensity * 0.03, now, 0.05);
  }

  stopReelScream() {
    if (!this.audio.nodes || !this.audio.context) {
      return;
    }
    const { master, tone, wobble } = this.audio.nodes;
    const now = this.audio.context.currentTime;
    master.gain.setTargetAtTime(0.0001, now, 0.07);
    tone.stop(now + 0.15);
    wobble.stop(now + 0.15);
    this.audio.nodes = null;
  }

  playCastSwish() {
    if (!this.audio.ready || !this.audio.context) {
      return;
    }

    const ctxAudio = this.audio.context;
    const noiseBuffer = ctxAudio.createBuffer(1, ctxAudio.sampleRate * 0.24, ctxAudio.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      const progress = i / data.length;
      const decay = Math.pow(1 - progress, 1.8);
      data[i] = (Math.random() * 2 - 1) * decay;
    }

    const noiseSource = ctxAudio.createBufferSource();
    const bandpass = ctxAudio.createBiquadFilter();
    const highpass = ctxAudio.createBiquadFilter();
    const noiseGain = ctxAudio.createGain();
    const stickTone = ctxAudio.createOscillator();
    const stickGain = ctxAudio.createGain();
    const master = ctxAudio.createGain();

    noiseSource.buffer = noiseBuffer;
    bandpass.type = "bandpass";
    bandpass.frequency.value = 1650;
    bandpass.Q.value = 0.8;
    highpass.type = "highpass";
    highpass.frequency.value = 900;
    noiseGain.gain.value = 0.0001;

    stickTone.type = "triangle";
    stickTone.frequency.value = 620;
    stickGain.gain.value = 0.0001;
    master.gain.value = 0.85;

    noiseSource.connect(bandpass);
    bandpass.connect(highpass);
    highpass.connect(noiseGain);
    noiseGain.connect(master);

    stickTone.connect(stickGain);
    stickGain.connect(master);
    master.connect(ctxAudio.destination);

    const now = ctxAudio.currentTime;
    noiseGain.gain.exponentialRampToValueAtTime(0.075, now + 0.012);
    noiseGain.gain.exponentialRampToValueAtTime(0.018, now + 0.08);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

    stickTone.frequency.setValueAtTime(760, now);
    stickTone.frequency.exponentialRampToValueAtTime(300, now + 0.16);
    stickGain.gain.exponentialRampToValueAtTime(0.03, now + 0.008);
    stickGain.gain.exponentialRampToValueAtTime(0.008, now + 0.06);
    stickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    noiseSource.start(now);
    noiseSource.stop(now + 0.26);
    stickTone.start(now);
    stickTone.stop(now + 0.2);
  }

  playHookExplosion(weight, huge = false) {
    if (!this.audio.ready || !this.audio.context) {
      return;
    }

    const ctxAudio = this.audio.context;
    const duration = huge ? 0.7 : 0.46;
    const noiseBuffer = ctxAudio.createBuffer(1, Math.floor(ctxAudio.sampleRate * duration), ctxAudio.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      const progress = i / data.length;
      const decay = Math.pow(1 - progress, huge ? 1.1 : 1.45);
      data[i] = (Math.random() * 2 - 1) * decay;
    }

    const noise = ctxAudio.createBufferSource();
    const lowpass = ctxAudio.createBiquadFilter();
    const bandpass = ctxAudio.createBiquadFilter();
    const noiseGain = ctxAudio.createGain();
    const thump = ctxAudio.createOscillator();
    const thumpGain = ctxAudio.createGain();
    const master = ctxAudio.createGain();

    noise.buffer = noiseBuffer;
    lowpass.type = "lowpass";
    lowpass.frequency.value = huge ? 900 : 1200;
    bandpass.type = "bandpass";
    bandpass.frequency.value = huge ? 520 : 680;
    bandpass.Q.value = 0.8;
    noiseGain.gain.value = 0.0001;

    thump.type = "sine";
    thump.frequency.value = huge ? 120 : 150;
    thumpGain.gain.value = 0.0001;
    master.gain.value = Math.min(1, 0.8 + weight * 0.015);

    noise.connect(lowpass);
    lowpass.connect(bandpass);
    bandpass.connect(noiseGain);
    noiseGain.connect(master);

    thump.connect(thumpGain);
    thumpGain.connect(master);
    master.connect(ctxAudio.destination);

    const now = ctxAudio.currentTime;
    noiseGain.gain.exponentialRampToValueAtTime(huge ? 0.11 : 0.075, now + 0.01);
    noiseGain.gain.exponentialRampToValueAtTime(0.02, now + (huge ? 0.22 : 0.12));
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    thump.frequency.setValueAtTime(huge ? 130 : 160, now);
    thump.frequency.exponentialRampToValueAtTime(huge ? 56 : 74, now + (huge ? 0.34 : 0.22));
    thumpGain.gain.exponentialRampToValueAtTime(huge ? 0.16 : 0.1, now + 0.012);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + (huge ? 0.4 : 0.26));

    noise.start(now);
    noise.stop(now + duration + 0.05);
    thump.start(now);
    thump.stop(now + (huge ? 0.42 : 0.28));
  }

  playAnglerYell(weight) {
    if (!this.audio.ready || !this.audio.context) {
      return;
    }

    const ctxAudio = this.audio.context;
    const osc = ctxAudio.createOscillator();
    const formant = ctxAudio.createBiquadFilter();
    const gain = ctxAudio.createGain();

    osc.type = "sawtooth";
    formant.type = "bandpass";
    formant.frequency.value = weight >= 8 ? 980 : 1180;
    formant.Q.value = 2.4;
    gain.gain.value = 0.0001;

    osc.connect(formant);
    formant.connect(gain);
    gain.connect(ctxAudio.destination);

    const now = ctxAudio.currentTime;
    const end = weight >= 8 ? 0.42 : 0.28;
    osc.frequency.setValueAtTime(weight >= 8 ? 420 : 520, now);
    osc.frequency.exponentialRampToValueAtTime(weight >= 8 ? 300 : 370, now + end);
    gain.gain.exponentialRampToValueAtTime(weight >= 8 ? 0.05 : 0.028, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + end);
    osc.start(now);
    osc.stop(now + end + 0.03);
  }
}

function drawCatchSprite(species) {
  const fish = fishTable.find((entry) => entry.species === species) || fishTable[0];
  catchSpriteCtx.clearRect(0, 0, catchSpriteCanvas.width, catchSpriteCanvas.height);
  const pixels = [
    "......................",
    "...........11.........",
    "......222222221.......",
    "..222222222222211.....",
    "2222222222222222211...",
    "..222222222222211.....",
    "......222222221.......",
    "...........11.........",
  ];
  const scale = 4;
  const offsetX = 0;
  const offsetY = 8;

  for (let y = 0; y < pixels.length; y += 1) {
    for (let x = 0; x < pixels[y].length; x += 1) {
      const cell = pixels[y][x];
      if (cell === ".") {
        continue;
      }
      catchSpriteCtx.fillStyle = cell === "1" ? "#d9f0fa" : `#${fish.color.toString(16).padStart(6, "0")}`;
      catchSpriteCtx.fillRect(offsetX + x * scale, offsetY + y * scale, scale, scale);
    }
  }

  catchSpriteCtx.fillStyle = "#466273";
  catchSpriteCtx.fillRect(66, 23, 4, 4);
}

function drawStartHero() {
  startHeroCtx.clearRect(0, 0, startHeroCanvas.width, startHeroCanvas.height);
  const c = startHeroCtx;
  c.fillStyle = "#d4d6d2";
  c.fillRect(0, 0, 192, 112);

  c.fillStyle = "#dce2de";
  c.fillRect(0, 0, 192, 36);
  c.fillStyle = "#c3cbc7";
  c.fillRect(0, 36, 192, 24);
  c.fillStyle = "#e4e4de";
  c.beginPath();
  c.moveTo(0, 24);
  c.lineTo(24, 12);
  c.lineTo(50, 28);
  c.lineTo(74, 10);
  c.lineTo(110, 20);
  c.lineTo(142, 8);
  c.lineTo(174, 26);
  c.lineTo(192, 18);
  c.lineTo(192, 60);
  c.lineTo(0, 60);
  c.closePath();
  c.fill();
  c.fillStyle = "#b3c7d7";
  c.fillRect(142, 4, 30, 16);

  c.fillStyle = "#5f6266";
  c.fillRect(0, 96, 192, 16);
  c.fillStyle = "#7b7f83";
  c.fillRect(0, 92, 192, 4);

  c.fillStyle = "#186c70";
  c.beginPath();
  c.moveTo(18, 112);
  c.lineTo(24, 76);
  c.lineTo(42, 74);
  c.lineTo(48, 112);
  c.closePath();
  c.fill();
  c.beginPath();
  c.moveTo(144, 112);
  c.lineTo(150, 78);
  c.lineTo(170, 76);
  c.lineTo(176, 112);
  c.closePath();
  c.fill();
  c.fillStyle = "#854a4a";
  c.fillRect(72, 88, 36, 16);
  c.fillStyle = "#a87f6d";
  c.fillRect(80, 82, 8, 6);
  c.fillRect(96, 80, 4, 8);

  drawPhotoAngler(24, 40, {
    shirt: "#d5d3cf",
    shorts: "#6d6b68",
    hair: "#2c2420",
    skin: "#7a5b42",
    prop: "#3e2f25",
    accent: "#1c1c1c",
  }, "left");

  drawPhotoAngler(80, 42, {
    shirt: "#24252a",
    shorts: "#676665",
    hair: "#8f775f",
    skin: "#8a684d",
    prop: "#5d4431",
    accent: "#ece7dc",
  }, "center");

  drawPhotoAngler(136, 34, {
    shirt: "#5d5d63",
    shorts: "#4b4c50",
    hair: "#2b2625",
    skin: "#815e44",
    prop: "#2b2a2a",
    accent: "#f0ede2",
  }, "right");
}

function drawPhotoAngler(x, y, palette, pose) {
  const c = startHeroCtx;
  c.fillStyle = palette.skin;
  c.fillRect(x + 7, y, 6, 5);

  c.fillStyle = palette.hair;
  c.fillRect(x + 6, y - 1, 8, 2);
  if (pose === "right") {
    c.fillStyle = "#24242a";
    c.fillRect(x + 6, y - 1, 8, 3);
    c.fillStyle = palette.accent;
    c.fillRect(x + 9, y, 2, 1);
  } else if (pose === "left") {
    c.fillStyle = "#1d1d1d";
    c.fillRect(x + 7, y + 2, 6, 2);
  } else {
    c.fillStyle = palette.accent;
    c.fillRect(x + 6, y + 2, 8, 4);
    c.fillStyle = "#222327";
    c.fillRect(x + 8, y + 3, 4, 2);
  }

  c.fillStyle = palette.shirt;
  c.fillRect(x + 4, y + 5, 12, 18);
  c.fillRect(x + 2, y + 9, 4, 12);
  c.fillRect(x + 14, y + 8, 4, 13);
  c.fillStyle = palette.shorts;
  c.fillRect(x + 5, y + 23, 10, 8);
  c.fillStyle = palette.skin;
  c.fillRect(x + 6, y + 31, 3, 16);
  c.fillRect(x + 12, y + 31, 3, 16);
  c.fillStyle = "#2e2f31";
  c.fillRect(x + 5, y + 46, 4, 2);
  c.fillRect(x + 11, y + 46, 4, 2);

  if (pose === "left") {
    c.fillStyle = palette.prop;
    c.fillRect(x - 3, y + 7, 7, 10);
    c.strokeStyle = "#3b332f";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x + 17, y + 12);
    c.lineTo(x + 30, y - 2);
    c.stroke();
  } else if (pose === "center") {
    c.fillStyle = "#58a79b";
    c.fillRect(x + 1, y + 16, 8, 8);
    c.fillStyle = "#7e563f";
    c.fillRect(x + 17, y + 21, 4, 10);
    c.strokeStyle = "#403532";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x + 9, y + 13);
    c.lineTo(x - 2, y - 10);
    c.stroke();
    c.beginPath();
    c.moveTo(x + 11, y + 10);
    c.lineTo(x + 28, y - 4);
    c.stroke();
  } else {
    c.fillStyle = "#262227";
    c.beginPath();
    c.moveTo(x + 17, y + 10);
    c.lineTo(x + 30, y + 4);
    c.lineTo(x + 33, y + 10);
    c.lineTo(x + 18, y + 14);
    c.closePath();
    c.fill();
    c.strokeStyle = "#1f1d1f";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x + 2, y + 11);
    c.lineTo(x - 10, y - 8);
    c.stroke();
    c.beginPath();
    c.moveTo(x + 18, y + 13);
    c.lineTo(x + 40, y + 2);
    c.stroke();
  }
}

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function pickWeightedIndex(weights) {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < weights.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) {
      return i;
    }
  }
  return weights.length - 1;
}

function rollFishWeight(speciesData) {
  const bias = Math.pow(Math.random(), 1.85);
  const weight = Phaser.Math.Linear(speciesData.min, speciesData.max, bias);
  return Number(weight.toFixed(1));
}

const scene = new BoringtideScene();
const phaserGame = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game-root",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  transparent: true,
  backgroundColor: "#2f88aa",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  scene: [scene],
});

startButton.addEventListener("click", () => scene.startSession());
restartButton.addEventListener("click", () => scene.startSession());
