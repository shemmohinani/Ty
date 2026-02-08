(() => {
  const startScreen = document.getElementById("startScreen");
  const gameScreen  = document.getElementById("gameScreen");
  const endScreen   = document.getElementById("endScreen");

  const startBtn = document.getElementById("startBtn");
  const playAgainBtn = document.getElementById("playAgainBtn");

  const heartsUI = document.getElementById("heartsUI");
  const livesUI  = document.getElementById("livesUI");

  const endTitle = document.getElementById("endTitle");
  const giftBtn  = document.getElementById("giftBtn");
  const questionWrap = document.getElementById("questionWrap");
  const questionText = document.getElementById("questionText");

  const yesBtn = document.getElementById("yesBtn");
  const ohYeahBtn = document.getElementById("ohYeahBtn");

  const gifWrap = document.getElementById("gifWrap");
  const response = document.getElementById("response");

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  // --- GAME CONSTANTS ---
  const SKY = "#8fd3ff";          // sky blue
  const GROUND = "#6bd46b";
  const PIPE = "#2ecc71";
  const PIPE_DARK = "#25b862";
  const BIRD = "#ffd400";         // yellow
  const HEART = "#ff2d55";

  const TARGET_HEARTS = 5;
  const MAX_LIVES = 3;

  let state;

  function resetState() {
    state = {
      running: false,
      over: false,
      reason: "gift", // "gift" or "hearts"
      t: 0,
      scoreHearts: 0,
      lives: MAX_LIVES,

      bird: { x: 140, y: 260, r: 16, vy: 0 },

      gravity: 0.42,
      flap: -7.2,

      pipes: [],
      pipeGap: 155,
      pipeW: 70,
      pipeSpeed: 2.6,
      pipeEvery: 95,

      hearts: [],
      heartEvery: 120,

      clouds: [
        { x: 40,  y: 80,  s: 1.0 },
        { x: 260, y: 120, s: 1.2 },
        { x: 170, y: 40,  s: 0.9 },
      ],

      floorY: 600,
      shake: 0,
    };

    updateUI();
  }

  function updateUI(){
    heartsUI.textContent = String(state.scoreHearts);
    livesUI.textContent = String(state.lives);
  }

  function show(screen){
    startScreen.classList.add("hidden");
    gameScreen.classList.add("hidden");
    endScreen.classList.add("hidden");
    screen.classList.remove("hidden");
  }

  function startGame(){
    resetState();
    show(gameScreen);
    state.running = true;

    giftBtn.classList.remove("open");
    questionWrap.classList.add("hidden");
    response.classList.add("hidden");
    response.textContent = "";
    gifWrap.classList.add("hidden");

    // ensure choices visible for fresh run
    const choices = document.querySelector(".choices");
    if (choices) choices.classList.remove("hidden");

    requestAnimationFrame(loop);
  }

  function endGame(reason){
    state.running = false;
    state.over = true;
    state.reason = reason;

    show(endScreen);

    if (reason === "hearts") endTitle.textContent = "You did it! 💘";
    else endTitle.textContent = "A surprise for you 🎁";

    questionText.textContent = "will you be my valentine";

    // reset end-screen UI
    giftBtn.classList.remove("open");
    questionWrap.classList.add("hidden");
    gifWrap.classList.add("hidden");
    response.classList.add("hidden");
    response.textContent = "";

    const choices = document.querySelector(".choices");
    if (choices) choices.classList.remove("hidden");
  }

  // --- INPUT ---
  function flap(){
    if (!state || !state.running) return;
    state.bird.vy = state.flap;
  }

  function onPointer(e){
    e.preventDefault();
    if (state && state.running) flap();
  }

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      if (state && state.running) flap();
    }
  }, { passive: false });

  canvas.addEventListener("pointerdown", onPointer, { passive: false });

  // --- SPAWNERS ---
  function spawnPipe(){
  const marginTop = 60;
  const marginBottom = 160;
  const gap = state.pipeGap;

  const topH = rand(marginTop, state.floorY - marginBottom - gap);
  const x = canvas.width + 20;

  // Create the pipe
  const pipe = { x, topH, gap, passed: false };
  state.pipes.push(pipe);

  // Spawn a heart centered in the gap (between the pillars)
  // Slight random vertical wiggle but always inside the gap
  const heartX = x + state.pipeW / 2;
  const gapTop = topH;
  const gapBottom = topH + gap;

  const safePad = 26; // keeps it away from edges of the gap
  const heartY = rand(gapTop + safePad, gapBottom - safePad);

  state.hearts.push({
    x: heartX,
    y: heartY,
    r: 12,
    taken: false
  });
  }

  // --- COLLISIONS ---
  function circleRectCollide(cx, cy, cr, rx, ry, rw, rh){
    const closestX = clamp(cx, rx, rx + rw);
    const closestY = clamp(cy, ry, ry + rh);
    const dx = cx - closestX;
    const dy = cy - closestY;
    return (dx*dx + dy*dy) <= cr*cr;
  }

  function circleCircle(cx, cy, cr, ox, oy, or){
    const dx = cx - ox;
    const dy = cy - oy;
    const rr = cr + or;
    return (dx*dx + dy*dy) <= rr*rr;
  }

  function restartRunKeepProgress(){
  // keep collected hearts + remaining lives, but restart the “run”
  state.t = 0;
  state.pipes = [];
  state.hearts = [];

  state.bird.x = 140;
  state.bird.y = 260;
  state.bird.vy = 0;

  state.shake = 0;

  // Optional: reset difficulty so it feels fair after each death
  state.pipeSpeed = 2.6;
  state.pipeGap = 155;
  }

  function loseLife(){
  state.lives -= 1;
  updateUI();
  state.shake = 10;

  if (state.lives <= 0){
    endGame("gift");
    return;
  }

  // Restart immediately on death
  restartRunKeepProgress();
  }


  // --- DRAWING ---
  function drawBackground(){
    ctx.fillStyle = SKY;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const c of state.clouds){
      c.x -= 0.35 * c.s;
      if (c.x < -120) c.x = canvas.width + 120;
      drawCloud(c.x, c.y, c.s);
    }

    ctx.fillStyle = GROUND;
    ctx.fillRect(0, state.floorY, canvas.width, canvas.height - state.floorY);

    ctx.globalAlpha = 0.15;
    ctx.fillStyle = "#000";
    for (let x = -((state.t*2) % 40); x < canvas.width; x += 40){
      ctx.fillRect(x, state.floorY + 12, 20, 6);
    }
    ctx.globalAlpha = 1;
  }

  function drawCloud(x, y, s){
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(x, y, 22*s, 0, Math.PI*2);
    ctx.arc(x+22*s, y+4*s, 18*s, 0, Math.PI*2);
    ctx.arc(x-18*s, y+6*s, 16*s, 0, Math.PI*2);
    ctx.arc(x+6*s, y-10*s, 18*s, 0, Math.PI*2);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawPipes(){
    for (const p of state.pipes){
      const x = p.x;
      const w = state.pipeW;
      const topH = p.topH;
      const gap = p.gap;
      const bottomY = topH + gap;
      const bottomH = state.floorY - bottomY;

      drawPipeRect(x, 0, w, topH, true);
      drawPipeRect(x, bottomY, w, bottomH, false);
    }
  }

  function drawPipeRect(x, y, w, h, isTop){
    ctx.fillStyle = PIPE;
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = PIPE_DARK;
    if (isTop) ctx.fillRect(x-6, h-18, w+12, 18);
    else ctx.fillRect(x-6, y, w+12, 18);

    ctx.globalAlpha = 0.2;
    ctx.fillStyle = "#fff";
    ctx.fillRect(x + 10, y, 10, h);
    ctx.globalAlpha = 1;
  }

  function drawHearts(){
    for (const h of state.hearts){
      if (h.taken) continue;
      drawHeart(h.x, h.y, h.r);
    }
  }

  function drawHeart(x, y, r){
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = HEART;
    ctx.beginPath();
    const topCurveHeight = r * 0.9;
    ctx.moveTo(0, topCurveHeight);
    ctx.bezierCurveTo(0, 0, -r, 0, -r, topCurveHeight);
    ctx.bezierCurveTo(-r, r*2, 0, r*2.2, 0, r*3);
    ctx.bezierCurveTo(0, r*2.2, r, r*2, r, topCurveHeight);
    ctx.bezierCurveTo(r, 0, 0, 0, 0, topCurveHeight);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-r*0.35, r*0.9, r*0.35, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  function drawBird(){
    const b = state.bird;
    const angle = clamp(b.vy / 10, -0.6, 0.8);

    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(angle);

    ctx.fillStyle = BIRD;
    ctx.beginPath();
    ctx.arc(0, 0, b.r, 0, Math.PI*2);
    ctx.fill();

    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "#ffef70";
    ctx.beginPath();
    ctx.ellipse(-4, 4, 10, 7, 0.4, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(6, -4, 3, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = "#ff8a00";
    ctx.beginPath();
    ctx.moveTo(14, 2);
    ctx.lineTo(26, 6);
    ctx.lineTo(14, 10);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function drawOverlayText(){
    if (state.scoreHearts >= 3 && state.scoreHearts < TARGET_HEARTS){
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = "#0f172a";
      ctx.font = "800 18px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      ctx.textAlign = "center";
      ctx.fillText("Almost there 💖", canvas.width/2, 70);
      ctx.globalAlpha = 1;
    }
  }

  // --- UPDATE LOOP ---
  function update(){
    state.t += 1;

    if (state.shake > 0) state.shake -= 1;

    const b = state.bird;
    b.vy += state.gravity;
    b.y += b.vy;

    if (b.y - b.r < 0) {
      b.y = b.r;
      b.vy = 0;
    }
    if (b.y + b.r > state.floorY){
      loseLife();
      if (!state.running) return;
    }

    if (state.t % state.pipeEvery === 0) spawnPipe();

    for (const p of state.pipes){
      p.x -= state.pipeSpeed;

      const x = p.x;
      const w = state.pipeW;
      const topH = p.topH;
      const gap = p.gap;
      const bottomY = topH + gap;

      const hitTop = circleRectCollide(b.x, b.y, b.r, x, 0, w, topH);
      const hitBottom = circleRectCollide(b.x, b.y, b.r, x, bottomY, w, state.floorY - bottomY);

      if (hitTop || hitBottom){
        loseLife();
        if (!state.running) return;
      }
    }

    state.pipes = state.pipes.filter(p => p.x > -state.pipeW - 40);

    for (const h of state.hearts){
      h.x -= state.pipeSpeed;

      if (!h.taken && circleCircle(b.x, b.y, b.r, h.x, h.y, h.r)){
        h.taken = true;
        state.scoreHearts += 1;
        updateUI();

        if (state.scoreHearts >= TARGET_HEARTS){
          endGame("hearts");
          return;
        }
      }
    }
    state.hearts = state.hearts.filter(h => h.x > -60 && !h.taken);

    if (state.t % 600 === 0){
      state.pipeSpeed = Math.min(3.4, state.pipeSpeed + 0.15);
      state.pipeGap = Math.max(135, state.pipeGap - 6);
    }
  }

  function render(){
    const sx = (state.shake > 0) ? rand(-2, 2) : 0;
    const sy = (state.shake > 0) ? rand(-2, 2) : 0;

    ctx.save();
    ctx.translate(sx, sy);

    drawBackground();
    drawPipes();
    drawHearts();
    drawBird();
    drawOverlayText();

    ctx.restore();
  }

  function loop(){
    if (!state.running) return;
    update();
    render();
    requestAnimationFrame(loop);
  }

  // --- END SCREEN ---
  giftBtn.addEventListener("click", () => {
    giftBtn.classList.add("open");
    questionWrap.classList.remove("hidden");

    const choices = document.querySelector(".choices");
    if (choices) choices.classList.remove("hidden");

    gifWrap.classList.add("hidden");
    response.classList.add("hidden");
    response.textContent = "";
  });

  function onYes(choiceText){
    const choices = document.querySelector(".choices");
    if (choices) choices.classList.add("hidden");

    gifWrap.classList.remove("hidden");
    response.classList.remove("hidden");
    response.textContent = choiceText;
  }

  yesBtn.addEventListener("click", () => onYes("YES!!! 💞"));
  ohYeahBtn.addEventListener("click", () => onYes("Oh YEAH!!! 💘"));

  playAgainBtn.addEventListener("click", () => {
    const choices = document.querySelector(".choices");
    if (choices) choices.classList.remove("hidden");

    gifWrap.classList.add("hidden");
    response.classList.add("hidden");
    response.textContent = "";

    show(startScreen);
  });

  // --- UTIL ---
  function rand(min, max){ return Math.random() * (max - min) + min; }
  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
  // --- START BUTTON ---
  startBtn.addEventListener("click", startGame);
  // Initialize
  resetState();
  show(startScreen);

  // prevent scroll while playing on mobile
  document.addEventListener("touchmove", (e) => {
    if (!gameScreen.classList.contains("hidden")) e.preventDefault();
  }, { passive: false });
})();