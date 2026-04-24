const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = true;

const timerEl = document.getElementById("timer");
const catchCountEl = document.getElementById("catch-count");
const bestCatchEl = document.getElementById("best-catch");
const riskMeterEl = document.getElementById("risk-meter");
const catchPopupEl = document.getElementById("catch-popup");
const catchSpeciesEl = document.getElementById("catch-species");
const catchWeightEl = document.getElementById("catch-weight");
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

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const WATERLINE_Y = HEIGHT * 0.14;
const SHORE_Y = HEIGHT * 0.9;
const SESSION_SECONDS = 150;

const fishTable = [
  { species: "Australian Salmon", min: 1.2, max: 4.8, color: "#d9d8c8", score: 1 },
  { species: "Tailor", min: 0.8, max: 2.9, color: "#c6dfeb", score: 1 },
  { species: "Bonito", min: 1.8, max: 5.5, color: "#d8e6ef", score: 2 },
  { species: "Yellowtail Kingfish", min: 4.5, max: 14.2, color: "#b9d0b0", score: 3 },
  { species: "Tuna", min: 6.5, max: 18.5, color: "#8fd2ea", score: 4 },
  { species: "Mackerel", min: 1.4, max: 6.4, color: "#dcca74", score: 2 },
  { species: "Trevally", min: 2.0, max: 8.0, color: "#c8d8e1", score: 2 },
  { species: "Queenfish", min: 3.5, max: 10.8, color: "#a8d8ef", score: 3 },
  { species: "Dolphinfish", min: 5.0, max: 15.0, color: "#d7e887", score: 4 },
  { species: "Cobia", min: 7.0, max: 19.0, color: "#9fc5da", score: 4 },
];

const game = {
  active: false,
  ended: false,
  timeLeft: SESSION_SECONDS,
  fish: [],
  ripples: [],
  particles: [],
  stats: null,
  pointerDown: false,
  holdBoost: false,
  lastTick: 0,
  messageTimeout: null,
  popupTimeout: null,
  hookedFish: null,
  player: {
    x: WIDTH * 0.5,
    y: SHORE_Y,
  },
  lure: {
    state: "idle",
    x: WIDTH * 0.5,
    y: SHORE_Y - 46,
    startX: WIDTH * 0.5,
    startY: SHORE_Y - 46,
    targetX: WIDTH * 0.5,
    targetY: SHORE_Y - 300,
    travel: 0,
    retrieveSpeed: 220,
    twitchPower: 0,
  },
};

function makeStats() {
  return {
    catches: 0,
    totalWeight: 0,
    bestWeight: 0,
    bestFish: null,
    sharkChance: 0.05,
    streak: 0,
  };
}

function resetGame() {
  game.active = false;
  game.ended = false;
  game.timeLeft = SESSION_SECONDS;
  game.ripples = [];
  game.particles = [];
  game.stats = makeStats();
  game.pointerDown = false;
  game.holdBoost = false;
  game.lastTick = 0;
  game.hookedFish = null;
  game.lure = {
    state: "idle",
    x: WIDTH * 0.5,
    y: SHORE_Y - 46,
    startX: WIDTH * 0.5,
    startY: SHORE_Y - 46,
    targetX: WIDTH * 0.5,
    targetY: SHORE_Y - 300,
    travel: 0,
    retrieveSpeed: 220,
    twitchPower: 0,
  };
  spawnFish();
  updateHud();
  hideCatchPopup();
  setMessage("Tap the water to cast");
}

function spawnFish() {
  game.fish = [];
  const count = 18;
  for (let i = 0; i < count; i += 1) {
    const lane = Math.random();
    game.fish.push({
      x: 80 + Math.random() * (WIDTH - 160),
      y: WATERLINE_Y + 60 + Math.random() * (HEIGHT * 0.58),
      speed: 40 + Math.random() * 100,
      dir: Math.random() > 0.5 ? 1 : -1,
      size: 14 + Math.random() * 22,
      interest: 0.3 + Math.random() * 0.7,
      depth: lane,
      wiggle: Math.random() * Math.PI * 2,
      speciesIndex: Math.floor(Math.random() * fishTable.length),
    });
  }
}

function startGame() {
  resetGame();
  game.active = true;
  startOverlayEl.classList.add("hidden");
  endOverlayEl.classList.add("hidden");
  setMessage("Tide is running");
}

function endGame(reason) {
  game.active = false;
  game.ended = true;
  endOverlayEl.classList.remove("hidden");
  if (reason === "shark") {
    endHeadlineEl.textContent = "NOT SO BORING NOW";
    endSubheadlineEl.textContent = "LINE SNAP!";
    setMessage("Shark hooked. Session over.");
  } else {
    endHeadlineEl.textContent = "Tide Finished";
    endSubheadlineEl.textContent = "The bite window has closed.";
    setMessage("Tide window ended.");
  }
  resultCatchCountEl.textContent = String(game.stats.catches);
  resultBestFishEl.textContent = game.stats.bestFish
    ? `${game.stats.bestFish.species} ${game.stats.bestFish.weight.toFixed(1)} kg`
    : "None";
  resultTotalWeightEl.textContent = `${game.stats.totalWeight.toFixed(1)} kg`;
}

function updateHud() {
  const minutes = Math.floor(game.timeLeft / 60);
  const seconds = Math.floor(game.timeLeft % 60)
    .toString()
    .padStart(2, "0");
  timerEl.textContent = `${minutes}:${seconds}`;
  catchCountEl.textContent = String(game.stats.catches);
  bestCatchEl.textContent = game.stats.bestFish
    ? `${game.stats.bestFish.species.split(" ")[0]} ${game.stats.bestFish.weight.toFixed(1)}kg`
    : "None";

  const risk = game.stats.sharkChance;
  if (risk < 0.1) {
    riskMeterEl.textContent = "Low";
  } else if (risk < 0.18) {
    riskMeterEl.textContent = "Rising";
  } else if (risk < 0.28) {
    riskMeterEl.textContent = "Spicy";
  } else {
    riskMeterEl.textContent = "Danger";
  }
}

function setMessage(text) {
  messageBannerEl.textContent = text;
}

function showCatchPopup(species, weight) {
  catchSpeciesEl.textContent = species;
  catchWeightEl.textContent = `${weight.toFixed(1)} kg`;
  catchPopupEl.classList.remove("hidden");
  clearTimeout(game.popupTimeout);
  game.popupTimeout = setTimeout(hideCatchPopup, 1400);
}

function hideCatchPopup() {
  catchPopupEl.classList.add("hidden");
}

function pointerToCanvas(event) {
  const rect = canvas.getBoundingClientRect();
  const touch = event.touches ? event.touches[0] : event;
  return {
    x: ((touch.clientX - rect.left) / rect.width) * WIDTH,
    y: ((touch.clientY - rect.top) / rect.height) * HEIGHT,
  };
}

function castLure(x, y) {
  if (!game.active) {
    return;
  }

  if (game.lure.state === "hooked") {
    setMessage("Fish on!");
    return;
  }

  if (game.lure.state === "retrieving") {
    game.lure.twitchPower = 1;
    setMessage("Twitch!");
    return;
  }

  if (game.lure.state !== "idle") {
    return;
  }

  const clampedY = Math.min(Math.max(y, WATERLINE_Y + 30), SHORE_Y - 120);
  const clampedX = Math.min(Math.max(x, 70), WIDTH - 70);
  game.lure.state = "casting";
  game.lure.startX = game.player.x;
  game.lure.startY = game.player.y - 52;
  game.lure.targetX = clampedX;
  game.lure.targetY = clampedY;
  game.lure.travel = 0;
  setMessage("Casting...");
}

function handleLanding() {
  addRipple(game.lure.x, game.lure.y, 18);
  setMessage("Retrieve");
  game.lure.state = "retrieving";
}

function addRipple(x, y, radius) {
  game.ripples.push({
    x,
    y,
    radius,
    life: 1,
  });
}

function addBurst(x, y, count, color) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 150;
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.8 + Math.random() * 0.4,
      color,
    });
  }
}

function tryHookFish(dt) {
  if (game.lure.state !== "retrieving") {
    return;
  }

  const effectiveRange = 34 + game.lure.twitchPower * 18;
  for (const fish of game.fish) {
    const dx = fish.x - game.lure.x;
    const dy = fish.y - game.lure.y;
    const distance = Math.hypot(dx, dy);
    if (distance > fish.size * 1.6 + effectiveRange) {
      continue;
    }

    const strikeChance =
      (0.18 + fish.interest * 0.28 + game.lure.twitchPower * 0.15 + (game.holdBoost ? 0.04 : 0)) * dt;

    if (Math.random() >= strikeChance) {
      continue;
    }

    const sharkRoll = Math.random();
    if (sharkRoll < game.stats.sharkChance) {
      addBurst(game.lure.x, game.lure.y, 32, "#ff7b5d");
      game.lure.state = "idle";
      endGame("shark");
      return;
    }

    const speciesData = fishTable[fish.speciesIndex];
    const weight = speciesData.min + Math.random() * (speciesData.max - speciesData.min);
    beginHookedFight(fish, speciesData, weight);
    return;
  }
}

function beginHookedFight(fish, speciesData, weight) {
  const dx = fish.x - game.player.x;
  const dy = fish.y - (game.player.y - 52);
  const baseAngle = Math.atan2(dy, dx);
  const runAngle = baseAngle + (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.45);
  const runDistance = Math.min(260, 120 + weight * 9);

  fish.hooked = true;
  game.lure.state = "hooked";
  game.hookedFish = {
    fish,
    species: speciesData.species,
    color: speciesData.color,
    weight,
    runElapsed: 0,
    runDuration: 0.45 + weight * 0.055,
    reelElapsed: 0,
    reelDuration: 1.4 + weight * 0.14,
    originX: game.lure.x,
    originY: game.lure.y,
    runTargetX: clamp(game.lure.x + Math.cos(runAngle) * runDistance, 50, WIDTH - 50),
    runTargetY: clamp(game.lure.y + Math.sin(runAngle) * runDistance, WATERLINE_Y + 30, SHORE_Y - 140),
    sway: Math.random() * Math.PI * 2,
  };

  addBurst(game.lure.x, game.lure.y, 12, speciesData.color);
  setMessage(`${speciesData.species} hooked`);
}

function updateFish(dt) {
  for (const fish of game.fish) {
    if (fish.hooked) {
      continue;
    }

    fish.wiggle += dt * (1.8 + fish.depth);
    fish.x += fish.dir * fish.speed * dt;
    fish.y += Math.sin(fish.wiggle) * 10 * dt;

    if (fish.x < -80) {
      fish.x = WIDTH + 80;
    } else if (fish.x > WIDTH + 80) {
      fish.x = -80;
    }

    const lureDx = game.lure.x - fish.x;
    const lureDy = game.lure.y - fish.y;
    const lureDistance = Math.hypot(lureDx, lureDy);

    if (game.lure.state === "retrieving" && lureDistance < 180) {
      fish.x += (lureDx / (lureDistance || 1)) * fish.interest * 18 * dt;
      fish.y += (lureDy / (lureDistance || 1)) * fish.interest * 18 * dt;
    }
  }
}

function updateLure(dt) {
  const lure = game.lure;
  if (lure.state === "casting") {
    lure.travel += dt * 2.6;
    const arc = Math.sin(Math.min(lure.travel, 1) * Math.PI) * 120;
    lure.x = lerp(lure.startX, lure.targetX, Math.min(lure.travel, 1));
    lure.y = lerp(lure.startY, lure.targetY, Math.min(lure.travel, 1)) - arc;
    if (lure.travel >= 1) {
      lure.x = lure.targetX;
      lure.y = lure.targetY;
      handleLanding();
    }
  } else if (lure.state === "retrieving") {
    const boost = game.holdBoost ? 1.8 : 1;
    const speed = lure.retrieveSpeed * boost + lure.twitchPower * 140;
    const dx = game.player.x - lure.x;
    const dy = game.player.y - 52 - lure.y;
    const distance = Math.hypot(dx, dy);

    if (distance < 18) {
      lure.state = "idle";
      lure.x = game.player.x;
      lure.y = game.player.y - 46;
      setMessage("Tap the water to cast");
    } else {
      lure.x += (dx / distance) * speed * dt;
      lure.y += (dy / distance) * speed * dt;
    }

    if (Math.random() < 0.14) {
      addRipple(lure.x, lure.y + 8, 4 + Math.random() * 6);
    }

    lure.twitchPower = Math.max(0, lure.twitchPower - dt * 2.4);
  } else if (lure.state === "hooked") {
    updateHookedFish(dt);
  } else {
    lure.x = game.player.x;
    lure.y = game.player.y - 46;
  }
}

function updateHookedFish(dt) {
  const hooked = game.hookedFish;
  if (!hooked) {
    game.lure.state = "idle";
    return;
  }

  hooked.sway += dt * (3.4 + hooked.weight * 0.08);
  if (hooked.runElapsed < hooked.runDuration) {
    hooked.runElapsed = Math.min(hooked.runDuration, hooked.runElapsed + dt);
    const t = easeOutCubic(hooked.runElapsed / hooked.runDuration);
    game.lure.x = lerp(hooked.originX, hooked.runTargetX, t);
    game.lure.y = lerp(hooked.originY, hooked.runTargetY, t);
    hooked.fish.x = game.lure.x;
    hooked.fish.y = game.lure.y;
    if (Math.random() < 0.28) {
      addRipple(game.lure.x, game.lure.y + 6, 6 + Math.random() * 8);
    }
    setMessage(`Fish running... ${hooked.weight.toFixed(1)}kg`);
    return;
  }

  const reelBoost = game.holdBoost ? 1.65 : 1;
  hooked.reelElapsed = Math.min(hooked.reelDuration, hooked.reelElapsed + dt * reelBoost);
  const t = easeInOutQuad(hooked.reelElapsed / hooked.reelDuration);
  const targetX = game.player.x;
  const targetY = game.player.y - 46;
  const swayAmount = Math.max(8, 20 - hooked.weight * 0.35);
  game.lure.x = lerp(hooked.runTargetX, targetX, t) + Math.sin(hooked.sway) * swayAmount * (1 - t);
  game.lure.y = lerp(hooked.runTargetY, targetY, t) + Math.cos(hooked.sway * 0.7) * swayAmount * 0.45 * (1 - t);
  hooked.fish.x = game.lure.x;
  hooked.fish.y = game.lure.y;
  if (Math.random() < 0.18) {
    addRipple(game.lure.x, game.lure.y + 6, 4 + Math.random() * 6);
  }
  setMessage(game.holdBoost ? `Reeling hard... ${hooked.species}` : `Reeling in ${hooked.species}`);

  if (hooked.reelElapsed >= hooked.reelDuration) {
    landHookedFish();
  }
}

function landHookedFish() {
  const hooked = game.hookedFish;
  if (!hooked) {
    return;
  }

  game.stats.catches += 1;
  game.stats.totalWeight += hooked.weight;
  game.stats.streak += 1;
  game.stats.sharkChance = Math.min(0.42, game.stats.sharkChance + 0.012 + getSpeciesScore(hooked.species) * 0.003);

  if (!game.stats.bestFish || hooked.weight > game.stats.bestWeight) {
    game.stats.bestWeight = hooked.weight;
    game.stats.bestFish = { species: hooked.species, weight: hooked.weight };
  }

  hooked.fish.hooked = false;
  hooked.fish.x = -50;
  hooked.fish.y = WATERLINE_Y + 70 + Math.random() * (HEIGHT * 0.55);
  hooked.fish.speciesIndex = Math.floor(Math.random() * fishTable.length);
  hooked.fish.dir *= -1;

  showCatchPopup(hooked.species, hooked.weight);
  setMessage(`${hooked.species} landed`);
  addBurst(game.lure.x, game.lure.y, 14, hooked.color);
  game.hookedFish = null;
  game.lure.state = "idle";
  game.lure.x = game.player.x;
  game.lure.y = game.player.y - 46;
  updateHud();
}

function updateRipples(dt) {
  game.ripples = game.ripples.filter((ripple) => {
    ripple.radius += 50 * dt;
    ripple.life -= dt * 0.8;
    return ripple.life > 0;
  });
}

function updateParticles(dt) {
  game.particles = game.particles.filter((particle) => {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 0.97;
    particle.vy *= 0.97;
    particle.life -= dt;
    return particle.life > 0;
  });
}

function updateTimer(dt) {
  if (!game.active) {
    return;
  }
  game.timeLeft = Math.max(0, game.timeLeft - dt);
  if (game.timeLeft === 0) {
    endGame("tide");
  }
}

function drawBackground() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  const sky = ctx.createLinearGradient(0, 0, 0, WATERLINE_Y);
  sky.addColorStop(0, "#a8dfef");
  sky.addColorStop(1, "#b8edf7");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, WATERLINE_Y);

  ctx.fillStyle = "#3ba2bd";
  ctx.fillRect(0, WATERLINE_Y, WIDTH, HEIGHT - WATERLINE_Y);

  ctx.fillStyle = "#f5cf7d";
  ctx.fillRect(0, SHORE_Y, WIDTH, HEIGHT - SHORE_Y);

  const bands = 6;
  for (let i = 0; i < bands; i += 1) {
    const y = WATERLINE_Y + i * ((SHORE_Y - WATERLINE_Y) / bands);
    const alpha = 0.08 + i * 0.02;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fillRect(0, y, WIDTH, 4);
  }
}

function drawFish() {
  for (const fish of game.fish) {
    if (fish.hooked) {
      continue;
    }
    const species = fishTable[fish.speciesIndex];
    ctx.save();
    ctx.translate(fish.x, fish.y);
    ctx.scale(fish.dir, 1);
    ctx.globalAlpha = 0.55 + fish.depth * 0.35;
    drawSoftFish(fish.size * 1.55, fish.size * 0.7, species.color);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawRipples() {
  for (const ripple of game.ripples) {
    ctx.strokeStyle = `rgba(220, 245, 255, ${ripple.life * 0.55})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawParticles() {
  for (const particle of game.particles) {
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = Math.max(0, particle.life);
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPlayerAndLure() {
  const { player, lure } = game;

  ctx.strokeStyle = "#fff6d6";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y - 42);
  ctx.lineTo(lure.x, lure.y);
  ctx.stroke();

  drawSoftAngler(player.x, player.y);
  drawSoftLure(lure.x, lure.y);
}

function drawDangerFlash() {
  if (game.active) {
    return;
  }
  if (endHeadlineEl.textContent !== "NOT SO BORING NOW") {
    return;
  }
  const pulse = 0.18 + Math.sin(performance.now() * 0.02) * 0.08;
  ctx.fillStyle = `rgba(255, 60, 50, ${pulse})`;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function draw() {
  drawBackground();
  drawFish();
  drawRipples();
  drawParticles();
  drawPlayerAndLure();
  drawDangerFlash();
}

function loop(timestamp) {
  if (!game.lastTick) {
    game.lastTick = timestamp;
  }
  const dt = Math.min(0.033, (timestamp - game.lastTick) / 1000);
  game.lastTick = timestamp;

  if (game.active) {
    updateTimer(dt);
    updateFish(dt);
    updateLure(dt);
    updateRipples(dt);
    updateParticles(dt);
    tryHookFish(dt);
    updateHud();
  } else {
    updateRipples(dt);
    updateParticles(dt);
  }

  draw();
  requestAnimationFrame(loop);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function getSpeciesScore(species) {
  const match = fishTable.find((fish) => fish.species === species);
  return match ? match.score : 1;
}

function drawSoftFish(bodyWidth, bodyHeight, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, bodyWidth, bodyHeight, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(bodyWidth * -0.9, 0);
  ctx.lineTo(bodyWidth * -1.45, bodyHeight * -0.65);
  ctx.lineTo(bodyWidth * -1.45, bodyHeight * 0.65);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.ellipse(bodyWidth * 0.15, -bodyHeight * 0.18, bodyWidth * 0.56, bodyHeight * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#496577";
  ctx.beginPath();
  ctx.arc(bodyWidth * 0.72, -bodyHeight * 0.08, Math.max(1.8, bodyHeight * 0.12), 0, Math.PI * 2);
  ctx.fill();
}

function drawSoftAngler(x, y) {
  ctx.fillStyle = "#213f52";
  ctx.beginPath();
  ctx.ellipse(x, y - 22, 28, 24, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ee7a57";
  ctx.fillRect(x - 18, y - 6, 36, 28);

  ctx.fillStyle = "#ffca74";
  ctx.beginPath();
  ctx.arc(x, y - 46, 16, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#4b6656";
  ctx.beginPath();
  ctx.ellipse(x, y + 16, 10, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#6a4a2b";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x + 4, y - 18);
  ctx.lineTo(x + 4, y - 76);
  ctx.lineTo(x + 34, y - 98);
  ctx.stroke();
}

function drawSoftLure(x, y) {
  ctx.fillStyle = "#fff783";
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ef8b5f";
  ctx.beginPath();
  ctx.arc(x + 3, y - 1, 4, 0, Math.PI * 2);
  ctx.fill();
}

canvas.addEventListener("pointerdown", (event) => {
  if (event.cancelable) {
    event.preventDefault();
  }
  game.pointerDown = true;
  game.holdBoost = false;

  if (!game.active) {
    return;
  }

  const point = pointerToCanvas(event);
  if (point.y < SHORE_Y - 10) {
    castLure(point.x, point.y);
  }

  const holdTimer = setTimeout(() => {
    if (game.pointerDown && game.active) {
      game.holdBoost = true;
      setMessage("Burn it back!");
    }
  }, 160);

  const clearHold = () => {
    clearTimeout(holdTimer);
    canvas.removeEventListener("pointerup", clearHold);
    canvas.removeEventListener("pointercancel", clearHold);
    canvas.removeEventListener("pointerleave", clearHold);
  };

  canvas.addEventListener("pointerup", clearHold, { once: true });
  canvas.addEventListener("pointercancel", clearHold, { once: true });
  canvas.addEventListener("pointerleave", clearHold, { once: true });
});

canvas.addEventListener("pointerup", () => {
  game.pointerDown = false;
  game.holdBoost = false;
});

canvas.addEventListener("pointercancel", () => {
  game.pointerDown = false;
  game.holdBoost = false;
});

canvas.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);

resetGame();
requestAnimationFrame(loop);
