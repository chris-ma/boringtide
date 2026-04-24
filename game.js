const timerEl = document.getElementById("timer");
const catchCountEl = document.getElementById("catch-count");
const bestCatchEl = document.getElementById("best-catch");
const riskMeterEl = document.getElementById("risk-meter");
const catchPopupEl = document.getElementById("catch-popup");
const catchSpeciesEl = document.getElementById("catch-species");
const catchWeightEl = document.getElementById("catch-weight");
const catchSpriteCanvas = document.getElementById("catch-sprite");
const catchSpriteCtx = catchSpriteCanvas.getContext("2d");
const messageBannerEl = document.getElementById("message-banner");
const startOverlayEl = document.getElementById("start-overlay");
const endOverlayEl = document.getElementById("end-overlay");
const startButton = document.getElementById("start-button");
const restartButton = document.getElementById("restart-button");
const endHeadlineEl = document.getElementById("end-headline");
const endSubheadlineEl = document.getElementById("end-subheadline");
const resultCatchCountEl = document.getElementById("result-catch-count");
const resultBestFishEl = document.getElementById("result-best-fish");
const resultTotalWeightEl = document.getElementById("result-total-weight");

catchSpriteCtx.imageSmoothingEnabled = false;

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

const dom = {
  timerEl,
  catchCountEl,
  bestCatchEl,
  riskMeterEl,
  catchPopupEl,
  catchSpeciesEl,
  catchWeightEl,
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
  }

  create() {
    this.cameras.main.setBackgroundColor("#2f88aa");
    this.createBackground();
    this.createEntities();
    this.createInput();
    this.resetSession();
  }

  createBackground() {
    this.skyGraphics = this.add.graphics();
    this.waterBands = this.add.graphics();
    this.shoreGraphics = this.add.graphics();
    this.drawBackground();
  }

  createEntities() {
    this.player = this.add.container(GAME_WIDTH * 0.5, SHORE_Y - 4);
    const playerBody = this.add.graphics();
    playerBody.fillStyle(0x213f52, 1);
    playerBody.fillEllipse(0, -22, 56, 48);
    playerBody.fillStyle(0xee7a57, 1);
    playerBody.fillRect(-18, -6, 36, 28);
    playerBody.fillStyle(0xffca74, 1);
    playerBody.fillCircle(0, -46, 16);
    playerBody.fillStyle(0x4b6656, 1);
    playerBody.fillEllipse(0, 16, 20, 12);
    playerBody.lineStyle(4, 0x6a4a2b, 1);
    playerBody.beginPath();
    playerBody.moveTo(4, -18);
    playerBody.lineTo(4, -76);
    playerBody.lineTo(34, -98);
    playerBody.strokePath();
    this.player.add(playerBody);

    this.lineGraphics = this.add.graphics();

    this.lure = this.add.container(this.player.x, this.player.y - 42);
    this.lureBall = this.add.graphics();
    this.lureBall.fillStyle(0xfff783, 1);
    this.lureBall.fillCircle(0, 0, 8);
    this.lureBall.fillStyle(0xef8b5f, 1);
    this.lureBall.fillCircle(3, -1, 4);
    this.lure.add(this.lureBall);
    this.lureState = "idle";
    this.lureTarget = new Phaser.Math.Vector2(this.player.x, this.player.y - 42);
    this.lureVelocity = new Phaser.Math.Vector2();
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

      const worldPoint = this.scalePointer(pointer);
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
    this.stats = {
      catches: 0,
      totalWeight: 0,
      bestWeight: 0,
      bestFish: null,
      sharkChance: 0.05,
    };
    this.hookedFight = null;
    this.lureState = "idle";
    this.lure.setPosition(this.player.x, this.player.y - 42);
    this.lureTarget.set(this.player.x, this.player.y - 42);
    this.lureVelocity.set(0, 0);
    this.clearFish();
    this.spawnFish();
    this.clearSplashes();
    this.updateHud();
    this.hideCatchPopup();
    this.setMessage("Tap the water to cast");
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
    for (let i = 0; i < 18; i += 1) {
      const speciesIndex = Phaser.Math.Between(0, fishTable.length - 1);
      const species = fishTable[speciesIndex];
      const scale = Phaser.Math.FloatBetween(0.82, 1.35);
      const fish = {
        speciesIndex,
        dir: Math.random() > 0.5 ? 1 : -1,
        speed: Phaser.Math.Between(36, 110),
        interest: Phaser.Math.FloatBetween(0.3, 0.95),
        size: Phaser.Math.FloatBetween(18, 34) * scale,
        depth: Math.random(),
        wiggle: Math.random() * Math.PI * 2,
        hooked: false,
        container: this.makeFishSprite(species.color, scale),
      };
      fish.container.setPosition(
        Phaser.Math.Between(40, GAME_WIDTH - 40),
        Phaser.Math.Between(WATERLINE_Y + 60, SHORE_Y - 150)
      );
      fish.container.setScale(fish.dir, 1);
      fish.container.alpha = 0.92;
      this.fish.push(fish);
    }
  }

  makeFishSprite(color, scale) {
    const container = this.add.container(0, 0);
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillEllipse(0, 0, 48 * scale, 20 * scale);
    g.beginPath();
    g.moveTo(-20 * scale, 0);
    g.lineTo(-36 * scale, -10 * scale);
    g.lineTo(-36 * scale, 10 * scale);
    g.closePath();
    g.fillPath();
    g.fillStyle(0x496577, 1);
    g.fillCircle(13 * scale, -1 * scale, Math.max(2, 2.6 * scale));
    container.add(g);
    return container;
  }

  scalePointer(pointer) {
    const x = (pointer.x / this.scale.width) * GAME_WIDTH;
    const y = (pointer.y / this.scale.height) * GAME_HEIGHT;
    return new Phaser.Math.Vector2(x, y);
  }

  castLure(x, y) {
    this.lureState = "casting";
    this.castStart = new Phaser.Math.Vector2(this.player.x, this.player.y - 42);
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
    this.updateLure(dt);
    this.updateHud();
    this.drawLine();
  }

  updateFish(dt) {
    for (const fish of this.fish) {
      if (fish.hooked) {
        continue;
      }
      fish.wiggle += dt * (1.8 + fish.depth);
      fish.container.x += fish.dir * fish.speed * dt;
      fish.container.y += Math.sin(fish.wiggle) * 10 * dt;

      if (fish.container.x < -60) {
        fish.container.x = GAME_WIDTH + 60;
      } else if (fish.container.x > GAME_WIDTH + 60) {
        fish.container.x = -60;
      }

      const dx = this.lure.x - fish.container.x;
      const dy = this.lure.y - fish.container.y;
      const distance = Math.hypot(dx, dy);
      if (this.lureState === "retrieving" && distance < 180) {
        fish.container.x += (dx / (distance || 1)) * fish.interest * 18 * dt;
        fish.container.y += (dy / (distance || 1)) * fish.interest * 18 * dt;
      }

      if (this.lureState === "retrieving") {
        this.tryHookFish(fish, dt, distance);
      }
    }
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
      const target = new Phaser.Math.Vector2(this.player.x, this.player.y - 42);
      const speed = (this.holdBoost ? 1.4 : 1) * 165;
      const toTarget = target.clone().subtract(new Phaser.Math.Vector2(this.lure.x, this.lure.y));
      if (toTarget.length() < 16) {
        this.lureState = "idle";
        this.lure.setPosition(target.x, target.y);
        this.setMessage("Tap the water to cast");
      } else {
        toTarget.normalize().scale(speed * dt);
        this.lure.x += toTarget.x + this.lureVelocity.x * dt;
        this.lure.y += toTarget.y + this.lureVelocity.y * dt;
        this.lureVelocity.scale(0.88);
      }
      if (Math.random() < 0.14) {
        this.addRipple(this.lure.x, this.lure.y + 8, Phaser.Math.FloatBetween(5, 9));
      }
      return;
    }

    if (this.lureState === "hooked") {
      this.updateHookedFight(dt);
      return;
    }

    this.lure.setPosition(this.player.x, this.player.y - 42);
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

    if (Math.random() < this.stats.sharkChance) {
      this.addBurst(this.lure.x, this.lure.y, 36, 0xff7b5d);
      this.lureState = "idle";
      this.endSession("shark");
      return;
    }

    const speciesData = fishTable[fish.speciesIndex];
    const weight = speciesData.min + Math.random() * (speciesData.max - speciesData.min);
    this.beginFight(fish, speciesData, weight);
  }

  beginFight(fish, speciesData, weight) {
    fish.hooked = true;
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y - 42, fish.container.x, fish.container.y);
    this.hookedFight = {
      fish,
      species: speciesData.species,
      color: speciesData.color,
      weight,
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
    this.addBurst(this.lure.x, this.lure.y, 12, speciesData.color);
    this.addSplash(this.lure.x, this.lure.y, 24, speciesData.color);
    this.startReelScream(weight);
    this.setMessage(`${speciesData.species} hooked`);
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
      this.lure.y = Phaser.Math.Clamp(this.lure.y + Math.sin(fight.heading) * step, WATERLINE_Y + 24, SHORE_Y - 138);
      if (fight.pulledDistance > fight.runDistanceLimit) {
        fight.heading += Math.PI * 0.9 + (Math.random() - 0.5) * 0.8;
        fight.pulledDistance *= 0.62;
      }
      fight.fish.container.setPosition(this.lure.x, this.lure.y);
      if (Math.random() < 0.58) {
        this.addRipple(this.lure.x, this.lure.y + 6, Phaser.Math.FloatBetween(8, 13));
        this.addSplash(this.lure.x, this.lure.y, Phaser.Math.Between(10, 16), fight.color);
      }
      this.updateReelScream(0.82, 1 + fight.weight * 0.02);
      this.setMessage(`Fish running... ${fight.weight.toFixed(1)}kg`);
      return;
    }

    const boost = this.holdBoost ? 1.18 : 1;
    fight.reelElapsed = Math.min(fight.reelDuration, fight.reelElapsed + dt * boost);
    const t = easeInOutQuad(fight.reelElapsed / fight.reelDuration);
    const sway = Math.max(12, 28 - fight.weight * 0.28);
    this.lure.x = Phaser.Math.Linear(this.lure.x, this.player.x, dt * (0.42 + boost * 0.22));
    this.lure.y = Phaser.Math.Linear(this.lure.y, this.player.y - 42, dt * (0.36 + boost * 0.18));
    this.lure.x += Math.sin(fight.sway) * sway * (1 - t);
    this.lure.y += Math.cos(fight.sway * 0.7) * sway * 0.55 * (1 - t);
    fight.fish.container.setPosition(this.lure.x, this.lure.y);
    if (Math.random() < 0.24) {
      this.addRipple(this.lure.x, this.lure.y + 6, Phaser.Math.FloatBetween(5, 9));
      this.addSplash(this.lure.x, this.lure.y, Phaser.Math.Between(5, 9), fight.color);
    }
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
    this.stats.catches += 1;
    this.stats.totalWeight += fight.weight;
    this.stats.sharkChance = Math.min(0.42, this.stats.sharkChance + 0.012 + fight.score * 0.003);
    if (!this.stats.bestFish || fight.weight > this.stats.bestWeight) {
      this.stats.bestWeight = fight.weight;
      this.stats.bestFish = { species: fight.species, weight: fight.weight };
    }

    fight.fish.hooked = false;
    fight.fish.speciesIndex = Phaser.Math.Between(0, fishTable.length - 1);
    fight.fish.container.setPosition(-80, Phaser.Math.Between(WATERLINE_Y + 80, SHORE_Y - 180));
    fight.fish.dir *= -1;
    fight.fish.container.setScale(fight.fish.dir, 1);

    this.showCatchPopup(fight.species, fight.weight);
    this.addBurst(this.lure.x, this.lure.y, 18, fight.color);
    this.hookedFight = null;
    this.lureState = "idle";
    this.lure.setPosition(this.player.x, this.player.y - 42);
    this.updateHud();
    this.setMessage(`${fight.species} landed`);
  }

  addRipple(x, y, radius) {
    const ripple = this.add.circle(x, y, radius, 0xffffff, 0);
    ripple.setStrokeStyle(2, 0xdcf5ff, 0.5);
    ripple.life = 0.8;
    this.splashes.push(ripple);
  }

  addSplash(x, y, count, color) {
    for (let i = 0; i < count; i += 1) {
      const drop = this.add.circle(x, y, Phaser.Math.Between(2, 5), Math.random() > 0.65 ? color : 0xd7f2fb, 0.9);
      drop.vx = Math.cos(-Math.PI / 2 + (Math.random() - 0.5) * 1.8) * Phaser.Math.Between(30, 130);
      drop.vy = Math.sin(-Math.PI / 2 + (Math.random() - 0.5) * 1.8) * Phaser.Math.Between(30, 130);
      drop.life = Phaser.Math.FloatBetween(0.35, 0.8);
      drop.isDrop = true;
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
    this.lineGraphics.lineStyle(2, 0xfff6d6, 1);
    this.lineGraphics.beginPath();
    this.lineGraphics.moveTo(this.player.x, this.player.y - 42);
    this.lineGraphics.lineTo(this.lure.x, this.lure.y);
    this.lineGraphics.strokePath();
  }

  drawBackground() {
    this.skyGraphics.clear();
    this.waterBands.clear();
    this.shoreGraphics.clear();

    this.skyGraphics.fillStyle(0xa4d6e6, 1);
    this.skyGraphics.fillRect(0, 0, GAME_WIDTH, WATERLINE_Y);

    this.waterBands.fillGradientStyle(0x3ea7c0, 0x3ea7c0, 0x1b5a7d, 0x1b5a7d, 1);
    this.waterBands.fillRect(0, WATERLINE_Y, GAME_WIDTH, SHORE_Y - WATERLINE_Y);
    for (let i = 0; i < 5; i += 1) {
      const y = WATERLINE_Y + 8 + i * ((SHORE_Y - WATERLINE_Y) / 5);
      this.waterBands.fillStyle(0xb9e5f2, 0.38);
      this.waterBands.fillRect(0, y, GAME_WIDTH, 4);
    }

    this.shoreGraphics.fillStyle(0xf5cf7d, 1);
    this.shoreGraphics.fillRect(0, SHORE_Y, GAME_WIDTH, GAME_HEIGHT - SHORE_Y);
  }

  showCatchPopup(species, weight) {
    catchSpeciesEl.textContent = species;
    catchWeightEl.textContent = `${weight.toFixed(1)} kg`;
    drawCatchSprite(species);
    catchPopupEl.classList.remove("hidden");
    clearTimeout(this.popupTimer);
    this.popupTimer = setTimeout(() => this.hideCatchPopup(), 1800);
  }

  hideCatchPopup() {
    catchPopupEl.classList.add("hidden");
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
    catchCountEl.textContent = String(this.stats.catches);
    bestCatchEl.textContent = this.stats.bestFish
      ? `${this.stats.bestFish.species.split(" ")[0]} ${this.stats.bestFish.weight.toFixed(1)}kg`
      : "None";

    const risk = this.stats.sharkChance;
    riskMeterEl.textContent = risk < 0.1 ? "Low" : risk < 0.18 ? "Rising" : risk < 0.28 ? "Hot" : "Danger";
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

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
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
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: "100%",
    height: "100%",
  },
  scene: [scene],
});

startButton.addEventListener("click", () => scene.startSession());
restartButton.addEventListener("click", () => scene.startSession());
