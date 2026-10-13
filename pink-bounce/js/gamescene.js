/* GameScene - all gameplay: paddle, balls, blocks, obstacles, power-ups, scoring, lives. */
(function () {
  'use strict';
  const C = PB.CFG, P = PB.POWERUPS;
  const clamp = Phaser.Math.Clamp;
  const BASE_POINTS = { n: 10, r: 30, b: 100 };
  const DROP_CHANCE = { n: 0.07, r: 0.14, b: 1 };

  class GameScene extends Phaser.Scene {
    constructor() { super({ key: 'Game' }); }

    /* =============================== setup =============================== */
    create() {
      const cam = this.cameras.main;
      if (cam.resetFX) cam.resetFX();
      PB.addBackground(this);

      // ---- game state (fully re-initialised on every (re)start) ----
      this.state = 'ready';            // ready | playing | lost | levelclear | over
      this.score = 0; this.level = 1; this.lives = C.START_LIVES;
      this.combo = 0; this.mult = 1;
      this.mode = PB.Save.data.mode;
      this.skin = PB.skin(); this.theme = PB.theme();
      this.best = PB.loadBest(this.mode); this.startBest = this.best; this.newBest = false;
      this.run = { blocks: 0, powerups: 0, maxMult: 1, fortressClears: 0 };
      this.effects = {};               // key -> { left, total }  (left = Infinity for shield)
      this.protectMs = 0; this.readyMs = 0; this.wallOn = false;
      this.fx = []; this.killQueue = []; this.pendingClear = false;
      this.dropPity = 0; this.pointerTarget = null;
      this.hudDirty = true; this.hudAccum = 0; this.remaining = 0;
      this.ballSpeed = 360; this.baseW = C.PADDLE_W; this.padW = C.PADDLE_W; this.padTarget = C.PADDLE_W; this.lastPadW = 0;
      this.hitStreak = 0;

      PB.setMode('playing');
      PB.UI.reset();
      PB.UI.hideAll();
      PB.UI.setPaused(false);

      // ---- physics world ----
      const world = this.physics.world;
      world.setBounds(0, 0, C.W, C.H);
      world.setBoundsCollision(true, true, true, false);   // open at the bottom: that is the slit
      world.on('worldbounds', this.onWorldBounds, this);

      this.blocks = this.physics.add.staticGroup();
      this.obstacles = this.physics.add.group({ immovable: true, allowGravity: false });
      this.balls = this.physics.add.group();
      this.drops = this.physics.add.group();

      this.paddle = this.add.zone(C.W / 2, C.PADDLE_Y, C.PADDLE_W, C.PADDLE_H);
      this.physics.add.existing(this.paddle);
      this.paddle.body.setImmovable(true).setAllowGravity(false);

      this.wall = this.add.zone(C.W / 2, C.WALL_Y, C.W, C.WALL_H);
      this.physics.add.existing(this.wall, true);

      this.physics.add.collider(this.balls, this.blocks, this.onBallBlock, this.procBallBlock, this);
      this.physics.add.collider(this.balls, this.obstacles, this.onBallObstacle, null, this);
      this.physics.add.collider(this.balls, this.paddle, this.onBallPaddle, this.procBallPaddle, this);
      this.physics.add.collider(this.balls, this.wall, this.onBallWall, this.procBallWall, this);
      this.physics.add.overlap(this.drops, this.paddle, this.onDropPaddle, null, this);

      // ---- graphics layers ----
      this.slitGfx = this.add.graphics().setDepth(1);
      this.trailGfx = this.add.graphics().setDepth(4);
      this.padGfx = this.add.graphics().setDepth(6);
      this.fxGfx = this.add.graphics().setDepth(8).setBlendMode(Phaser.BlendModes.ADD);
      this.prompt = this.add.text(C.W / 2, C.PADDLE_Y - 70, 'TAP / CLICK / SPACE TO LAUNCH', {
        fontFamily: C.FONT, fontSize: '17px', fontStyle: 'bold', color: '#ffffff',
        shadow: { offsetX: 0, offsetY: 0, color: '#ff3df2', blur: 12, fill: true }
      }).setOrigin(0.5).setDepth(12);
      this.tweens.add({ targets: this.prompt, alpha: 0.35, duration: 500, yoyo: true, repeat: -1 });

      // ---- input ----
      const kb = this.input.keyboard;
      this.keys = kb.addKeys({ left: 'LEFT', right: 'RIGHT', a: 'A', d: 'D', space: 'SPACE', up: 'UP', enter: 'ENTER' });
      this.input.on('pointermove', this.onPointer, this);
      this.input.on('pointerdown', (p) => { this.onPointer(p); this.launch(); }, this);
      this.input.on('pointerup', () => { /* touch: paddle stays where the finger left it */ }, this);
      this.keys.space.on('down', this.launch, this);
      this.keys.up.on('down', this.launch, this);
      this.keys.enter.on('down', this.launch, this);

      this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);

      this.loadLevel();
      this.spawnReadyBall();
      this.banner('LEVEL 1', PB.MODES[this.mode].name);
      this.syncHud(true);
      PB.UI.announce('Level 1');
    }

    onShutdown() {
      // plugins may already be torn down when SHUTDOWN fires, so guard every access
      if (this.physics && this.physics.world) this.physics.world.off('worldbounds', this.onWorldBounds, this);
      if (this.input) this.input.off('pointermove', this.onPointer, this);
      this.fx.length = 0; this.killQueue.length = 0;
    }

    /* ============================== levels =============================== */
    loadLevel() {
      this.blocks.clear(true, true);
      this.obstacles.clear(true, true);
      this.drops.clear(true, true);

      const L = PB.buildLevel(this.level, this.mode);
      this.ballSpeed = L.ballSpeed;
      this.baseW = L.paddleW;
      this.remaining = 0;
      this.dropPity = 0;

      L.cells.forEach((k) => {
        const x = C.GRID_X + k.c * C.CELL_W + C.CELL_W / 2;
        const y = C.GRID_Y + k.r * C.CELL_H + C.CELL_H / 2;
        const blk = this.blocks.create(x, y, this.blockKey(k.kind, k.hp, k.r));
        blk.kind = k.kind; blk.hp = k.hp; blk.maxHp = k.hp; blk.row = k.r;
        blk.breakable = k.kind !== 'u'; blk.dead = false;
        blk.setDepth(3);
        blk.body.setSize(C.BLOCK_W, C.BLOCK_H);
        if (blk.breakable) this.remaining++;
        blk.setAlpha(0);
        this.tweens.add({ targets: blk, alpha: 1, duration: 260, delay: (k.c + k.r) * 22 });
      });

      L.obstacles.forEach((o) => {
        const ob = this.obstacles.create(o.x, o.y, 'obs');
        ob.setDepth(3).setImmovable(true);
        ob.body.setSize(96, 16);
        ob.body.setAllowGravity(false);
        ob.dir = o.dir; ob.speed = o.speed;
        ob.body.setVelocityX(o.dir * o.speed);
      });
      this.recalcEffects();
    }

    blockKey(kind, hp, row) {
      if (kind === 'n') return 'blk_n' + (row % 4);
      if (kind === 'r') return 'blk_r' + hp;
      return 'blk_' + kind;
    }

    /* ============================== update =============================== */
    update(time, delta) {
      const dt = Math.min(delta, 50);
      this.gridSprite.tilePositionY -= dt * 0.012;

      if (this.state !== 'over') {
        this.updatePaddle(dt);
        this.updateEffects(dt);
        this.updateObstacles();
        this.updateBalls(dt);
        this.updateDrops(time);
        if (this.pendingClear && this.lives > 0 && (this.state === 'playing' || this.state === 'ready' || this.state === 'lost')) this.levelComplete();
      }
      this.processKills();
      this.draw(time, dt);
      this.syncHud(false, dt);
    }

    updatePaddle(dt) {
      const k = this.keys;
      let dir = 0;
      if (k.left.isDown || k.a.isDown) dir -= 1;
      if (k.right.isDown || k.d.isDown) dir += 1;
      if (dir !== 0) {
        this.pointerTarget = null;
        this.paddle.x += dir * C.PADDLE_SPEED * dt / 1000;
      } else if (this.pointerTarget !== null) {
        const step = C.PADDLE_FOLLOW * dt / 1000;
        this.paddle.x += clamp(this.pointerTarget - this.paddle.x, -step, step);
      }
      this.padW += (this.padTarget - this.padW) * Math.min(1, dt / 90);
      if (Math.abs(this.padTarget - this.padW) < 0.4) this.padW = this.padTarget;
      const half = this.padW / 2;
      this.paddle.x = clamp(this.paddle.x, half, C.W - half);
      if (this.padW !== this.lastPadW) {
        this.lastPadW = this.padW;
        this.paddle.setSize(this.padW, C.PADDLE_H);
        this.paddle.body.setSize(this.padW, C.PADDLE_H);
      }
    }

    onPointer(p) { this.pointerTarget = p.x; }

    updateEffects(dt) {
      let changed = false;
      Object.keys(this.effects).forEach((key) => {
        const e = this.effects[key];
        if (e.left === Infinity) return;
        e.left -= dt;
        if (e.left <= 0) { delete this.effects[key]; changed = true; PB.Audio.play('expire'); }
      });
      if (changed) this.recalcEffects();
      if (this.state === 'playing' && this.protectMs > 0) this.protectMs = Math.max(0, this.protectMs - dt);
    }

    updateObstacles() {
      this.obstacles.getChildren().forEach((ob) => {
        const lo = 52, hi = C.W - 52;
        if (ob.x <= lo) { ob.x = lo; ob.dir = 1; }
        else if (ob.x >= hi) { ob.x = hi; ob.dir = -1; }
        ob.body.setVelocityX(ob.dir * ob.speed);
      });
    }

    updateBalls(dt) {
      const list = this.balls.getChildren().slice();
      const padTop = C.PADDLE_Y - C.PADDLE_H / 2;
      list.forEach((b) => {
        if (!b.active) return;
        if (b.attached) {
          b.x = this.paddle.x; b.y = padTop - b.r - 1;
          b.body.updateFromGameObject(); b.body.setVelocity(0, 0);
          return;
        }
        this.fixSpeed(b);
        if (!isFinite(b.x) || !isFinite(b.y)) { b.setPosition(this.paddle.x, padTop - b.r - 2); }
        b.y = clamp(b.y, -50, C.H + 100);
        if (b.y > C.SLIT_Y) this.ballInSlit(b);
      });

      if (this.state === 'ready') {
        this.readyMs += dt;
        this.prompt.setVisible(true);
        if (this.readyMs >= C.AUTO_LAUNCH_MS) this.launch();
      } else {
        this.prompt.setVisible(false);
      }
    }

    fixSpeed(b) {
      const body = b.body, v = body.velocity;
      const target = this.ballSpeed * (this.has('slow') ? C.SLOW_FACTOR : 1);
      let sp = Math.hypot(v.x, v.y);
      let nx, ny;
      if (!isFinite(sp) || sp < 1) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
        nx = Math.cos(a); ny = Math.sin(a);
      } else { nx = v.x / sp; ny = v.y / sp; }
      if (Math.abs(ny) < C.MIN_VY) {
        ny = (ny < 0 || ny === 0 ? -1 : 1) * C.MIN_VY;
        nx = (nx < 0 ? -1 : 1) * Math.sqrt(1 - ny * ny);
      }
      if (Math.abs(nx) < C.MIN_VX) {
        nx = (Math.random() < 0.5 ? -1 : 1) * C.MIN_VX;
        ny = (ny < 0 ? -1 : 1) * Math.sqrt(1 - nx * nx);
      }
      body.setVelocity(nx * target, ny * target);
    }

    /* ============================== balls ================================ */
    createBall(x, y) {
      const b = this.balls.create(x, y, 'ball');
      b.isBall = true; b.attached = false; b.trail = []; b.styleKey = '';
      b.setDepth(5).setBounce(1).setCollideWorldBounds(true);
      b.body.onWorldBounds = true;
      b.body.setAllowGravity(false);
      this.styleBall(b);
      return b;
    }

    styleBall(b) {
      const big = this.has('big'), fire = this.has('fire');
      const key = fire ? (big ? 'ball_big_fire' : 'ball_fire') : (big ? 'ball_big_' : 'ball_') + this.skin.id;
      if (b.styleKey === key) return;
      b.styleKey = key;
      b.setTexture(key);
      b.r = big ? C.BIG_R : C.BALL_R;
      const half = big ? 48 : 32;
      b.body.setCircle(b.r, half - b.r, half - b.r);
    }

    spawnReadyBall() {
      this.state = 'ready';
      this.readyMs = 0;
      const b = this.createBall(this.paddle.x, C.PADDLE_Y - C.PADDLE_H / 2 - C.BALL_R - 1);
      b.attached = true;
    }

    launch() {
      if (this.state !== 'ready') return;
      this.balls.getChildren().forEach((b) => {
        if (!b.attached) return;
        b.attached = false;
        const a = (Math.random() - 0.5) * 0.7;               // slight random launch angle
        const sp = this.ballSpeed * (this.has('slow') ? C.SLOW_FACTOR : 1);
        b.body.setVelocity(Math.sin(a) * sp, -Math.cos(a) * sp);
      });
      this.state = 'playing';
      this.protectMs = C.PROTECT_MS;
      PB.Audio.play('launch');
    }

    /** X3 Balls: split the ball closest to the paddle into three. */
    splitBall() {
      const live = this.balls.getChildren().filter((b) => b.active);
      if (!live.length) return false;
      let src = live[0];
      live.forEach((b) => { if (b.y > src.y) src = b; });
      if (src.attached) this.launch();
      const room = C.MAX_BALLS - live.length;
      if (room <= 0) return false;
      const v = src.body.velocity, sp = Math.hypot(v.x, v.y) || this.ballSpeed;
      const base = Math.atan2(v.y, v.x);
      [-0.38, 0.38].slice(0, room).forEach((off) => {
        const nb = this.createBall(src.x, src.y);
        nb.body.setVelocity(Math.cos(base + off) * sp, Math.sin(base + off) * sp);
        this.burst(nb.x, nb.y, this.skin.trail, 8, 120);
      });
      PB.Audio.play('split');
      return true;
    }

    /* ========================= collision handlers ======================== */
    onWorldBounds() { PB.Audio.play('wall', 0, 40); }

    procBallBlock(ball, blk) {
      if (!blk.active || blk.dead) return false;
      if (blk.breakable && this.has('fire')) {   // fireball pierces: one-hit kill, no bounce
        this.hitBlock(ball, blk);
        return false;
      }
      return true;
    }
    onBallBlock(ball, blk) { this.hitBlock(ball, blk); }

    hitBlock(ball, blk) {
      if (blk.dead || !blk.active) return;
      if (!blk.breakable) { PB.Audio.play('clank', 0, 60); this.burst(ball.x, ball.y, 0x94a3b8, 3, 60); return; }
      const dmg = this.has('fire') ? 99 : (this.has('big') ? 2 : 1);
      blk.hp -= dmg;
      if (blk.hp <= 0) { this.breakBlock(blk); return; }
      // reinforced block survives: show damage
      blk.setTexture(this.blockKey(blk.kind, blk.hp, blk.row));
      blk.body.setSize(C.BLOCK_W, C.BLOCK_H);
      blk.setTintFill(0xffffff);
      this.time.delayedCall(60, () => { if (blk.active) blk.clearTint(); });
      this.combo++; this.mult = this.calcMult();
      this.addScore(5 * this.mult);
      this.burst(ball.x, ball.y, 0xc084fc, 5, 90);
      PB.Audio.play('hit', this.combo, 20);
    }

    breakBlock(blk) {
      blk.dead = true;
      blk.body.enable = false;
      this.combo++; this.mult = this.calcMult();
      this.run.blocks++; this.run.maxMult = Math.max(this.run.maxMult, this.mult);
      const pts = BASE_POINTS[blk.kind] * this.mult;
      this.addScore(pts, blk.x, blk.y);
      const col = blk.kind === 'b' ? 0xfde047 : (blk.kind === 'r' ? 0xc084fc : this.theme.tints[blk.row % 4]);
      this.burst(blk.x, blk.y, col, blk.kind === 'b' ? 20 : 12, 190);
      const ghost = this.add.rectangle(blk.x, blk.y, C.BLOCK_W, C.BLOCK_H, col).setDepth(7).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: ghost, scaleX: 1.7, scaleY: 2.2, alpha: 0, duration: 230, onComplete: () => ghost.destroy() });
      PB.Audio.play('break', this.combo, 15);
      this.maybeDrop(blk);
      this.killQueue.push(blk);
      this.remaining--;
      if (this.remaining <= 0) this.pendingClear = true;
    }

    calcMult() { return Math.min(8, 1 + Math.floor(this.combo / 4)); }

    onBallObstacle(ball) { PB.Audio.play('clank', 0, 60); this.burst(ball.x, ball.y, 0xff4d6d, 3, 70); }

    procBallPaddle(a, b) {
      const ball = a.isBall ? a : b;
      if (ball.attached) return false;
      // only a falling ball whose centre is still above the paddle's mid-line can be caught
      return ball.body.velocity.y > 0 && ball.y < C.PADDLE_Y + 2;
    }

    onBallPaddle(a, b) {
      const ball = a.isBall ? a : b;
      const padTop = C.PADDLE_Y - C.PADDLE_H / 2;
      const rel = clamp((ball.x - this.paddle.x) / (this.padW / 2 + ball.r), -1, 1);
      const ang = rel * C.MAX_BOUNCE_ANGLE;
      const sp = this.ballSpeed * (this.has('slow') ? C.SLOW_FACTOR : 1);
      ball.y = padTop - ball.r - 0.5;               // lift out of the paddle: no clipping
      ball.body.updateFromGameObject();
      ball.body.setVelocity(Math.sin(ang) * sp, -Math.cos(ang) * sp);
      this.combo = 0; this.mult = 1; this.hudDirty = true;
      PB.Audio.play('paddle');
      this.burst(ball.x, padTop, 0xff9be8, 5, 110);
      this.padFlash = 1;
    }

    procBallWall(a, b) {
      const ball = a.isBall ? a : b;
      return this.wallOn && ball.y < C.WALL_Y && !ball.attached;
    }
    onBallWall(a, b) {
      const ball = a.isBall ? a : b;
      ball.y = C.WALL_Y - C.WALL_H / 2 - ball.r - 0.5;
      ball.body.updateFromGameObject();
      ball.body.setVelocityY(-Math.abs(ball.body.velocity.y) || -this.ballSpeed);
      PB.Audio.play('paddle', 0, 40);
      this.burst(ball.x, C.WALL_Y, 0x3b82ff, 6, 110);
    }

    /* ========================== slit / lives ============================= */
    ballInSlit(b) {
      const active = this.balls.getChildren().filter((x) => x.active).length;
      const shield = this.has('shield');
      const lastBall = active <= 1;
      if (this.protectMs > 0 || (shield && lastBall)) {
        // rescue: bounce it back out of the slit
        b.y = C.SLIT_Y - b.r - 2;
        b.body.updateFromGameObject();
        b.body.setVelocityY(-Math.abs(b.body.velocity.y) || -this.ballSpeed);
        if (this.protectMs <= 0 && shield) {
          delete this.effects.shield; this.recalcEffects();
          this.floatText(b.x, C.SLIT_Y - 40, 'SHIELD USED', '#4ade80');
          this.cameras.main.flash(160, 74, 222, 128);
          PB.Audio.play('shield');
        } else {
          PB.Audio.play('paddle');
        }
        this.burst(b.x, C.SLIT_Y, 0x4ade80, 14, 180);
        return;
      }
      this.burst(b.x, C.SLIT_Y, 0xff2d55, 14, 160);
      b.destroy();                                   // removed before anything can count it twice
      if (!this.balls.getChildren().some((x) => x.active)) this.loseLife();
    }

    loseLife() {
      if (this.state !== 'playing') return;          // guard: no duplicate life losses
      this.state = 'lost';
      this.lives = Math.max(0, this.lives - 1);
      this.combo = 0; this.mult = 1;
      this.effects = {}; this.recalcEffects();       // power-ups do not survive a lost life
      this.drops.clear(true, true);
      this.protectMs = 0;
      this.hudDirty = true;
      this.cameras.main.shake(260, 0.008);
      this.cameras.main.flash(200, 255, 45, 85);
      PB.Audio.play('lost');
      if (this.lives <= 0) { this.time.delayedCall(450, () => this.gameOver()); return; }
      PB.UI.announce(this.lives + ' lives left');
      this.time.delayedCall(900, () => { if (this.state === 'lost') this.spawnReadyBall(); });
    }

    gameOver() {
      if (this.state === 'over') return;
      this.state = 'over';
      this.balls.clear(true, true); this.drops.clear(true, true);
      this.prompt.setVisible(false);
      this.best = Math.max(this.best, this.score);
      this.newBest = this.score > this.startBest;
      PB.saveBest(this.mode, this.best);
      const coins = PB.Progress.coinsFor(this.score);
      PB.Save.data.coins += coins;
      PB.Progress.addBoardEntry(this.score, this.mode, this.level);
      const unlocked = PB.Progress.record(this.run, { level: this.level, score: this.score, gameOver: true });
      PB.setMode('over');
      PB.Audio.play('over');
      this.hudDirty = true; this.syncHud(true);
      PB.UI.announce('Game over. Score ' + this.score);
      PB.UI.gameOver({ score: this.score, best: this.best, isNew: this.newBest, level: this.level, coins, mode: this.mode, unlocked });
    }

    /* ============================ level flow ============================= */
    levelComplete() {
      this.pendingClear = false;
      this.state = 'levelclear';
      this.balls.getChildren().slice().forEach((b) => { this.burst(b.x, b.y, 0xff3df2, 10, 150); b.destroy(); });
      this.drops.clear(true, true);
      const bonus = 500 * this.level + 100 * this.lives;
      this.addScore(bonus);
      PB.saveBest(this.mode, this.best);
      if (this.mode === 'fortress') this.run.fortressClears++;
      PB.Progress.record(this.run, { level: this.level + 1, score: this.score, gameOver: false })
        .forEach((a) => PB.UI.toast('Achievement: ' + a.name + ' (+' + a.reward + ' coins)'));
      PB.Audio.play('level');
      this.banner('LEVEL ' + this.level + ' CLEAR', '+' + bonus.toLocaleString('en-US') + ' bonus');
      this.cameras.main.flash(250, 255, 61, 242);
      this.time.delayedCall(1700, () => { if (this.state === 'levelclear') this.cameras.main.fadeOut(250, 7, 3, 15); });
      this.time.delayedCall(2000, () => {
        if (this.state !== 'levelclear') return;
        this.level++;
        this.loadLevel();
        this.spawnReadyBall();
        this.cameras.main.fadeIn(300, 7, 3, 15);
        this.banner('LEVEL ' + this.level, PB.MODES[this.mode].name);
        this.hudDirty = true;
        PB.UI.announce('Level ' + this.level);
      });
    }

    /* ============================ power-ups ============================== */
    has(key) { return !!this.effects[key]; }

    maybeDrop(blk) {
      this.dropPity++;
      let chance = DROP_CHANCE[blk.kind] || 0.07;
      if (this.dropPity >= 10) chance = 1;           // pity timer keeps drops flowing
      if (Math.random() >= chance) return;
      this.dropPity = 0;
      const ballCount = this.balls.countActive(true);
      const pool = PB.POWERUP_KEYS.filter((k) =>
        !(k === 'x3' && ballCount >= C.MAX_BALLS - 2) &&
        !(k === 'life' && this.lives >= C.MAX_LIVES) &&
        !(k === 'shield' && this.has('shield')));
      let total = 0; pool.forEach((k) => { total += P[k].weight; });
      let roll = Math.random() * total, pick = pool[0];
      for (const k of pool) { roll -= P[k].weight; if (roll <= 0) { pick = k; break; } }
      const d = this.drops.create(blk.x, blk.y, 'pu_' + pick);
      d.isDrop = true; d.key = pick; d.collected = false;
      d.setDepth(6);
      d.body.setSize(48, 24);
      d.body.setAllowGravity(false);
      d.body.setVelocity(0, 135);
    }

    updateDrops(time) {
      this.drops.getChildren().slice().forEach((d) => {
        if (!d.active || d.collected) return;
        if (d.y > C.H + 30) { d.destroy(); return; }
        d.setScale(1 + Math.sin(time / 120 + d.x) * 0.05);
      });
    }

    onDropPaddle(a, b) {
      const d = a.isDrop ? a : b;
      if (!d.active || d.collected || this.state === 'over') return;
      d.collected = true; d.body.enable = false;
      this.killQueue.push(d);
      this.collect(d.key, d.x, d.y);
    }

    collect(key, x, y) {
      const def = P[key];
      this.addScore(50); this.run.powerups++;
      this.floatText(x, y - 14, def.name.toUpperCase(), def.css);
      this.burst(x, y, def.color, 16, 200);
      if (key === 'life') {
        this.lives = Math.min(C.MAX_LIVES, this.lives + 3);
        this.hudDirty = true;
        PB.Audio.play('life');
      } else if (key === 'x3') {
        this.splitBall();
        PB.Audio.play('pickup');
      } else {
        // re-collecting refreshes the timer; different effects overlap freely
        this.effects[key] = { left: def.duration > 0 ? def.duration : Infinity, total: def.duration > 0 ? def.duration : Infinity };
        this.recalcEffects();
        PB.Audio.play(key === 'shield' ? 'shield' : 'pickup');
      }
      PB.UI.announce(def.name);
    }

    /** Re-derive everything that depends on the active effect set. */
    recalcEffects() {
      this.padTarget = this.has('wide') ? Math.min(this.baseW * 1.65, C.W * 0.45) : this.baseW;
      this.wallOn = this.has('wall');
      this.wall.body.enable = this.wallOn;
      this.balls.getChildren().forEach((b) => { if (b.active) this.styleBall(b); });
      this.hudDirty = true;
    }

    /* ============================== scoring ============================== */
    addScore(n, x, y) {
      this.score += n;
      if (this.score > this.best) this.best = this.score;
      this.hudDirty = true;
      if (x !== undefined) this.floatText(x, y, '+' + n + (this.mult > 1 ? ' x' + this.mult : ''), this.mult > 1 ? '#fde047' : '#ffffff', 15);
    }

    /* ============================ visual effects ========================= */
    burst(x, y, color, n, speed) {
      for (let i = 0; i < n && this.fx.length < 420; i++) {
        const a = Math.random() * Math.PI * 2, s = speed * (0.25 + Math.random() * 0.75);
        const life = 280 + Math.random() * 380;
        this.fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, size: 1.5 + Math.random() * 2.5, color });
      }
    }

    floatText(x, y, str, css, size) {
      const t = this.add.text(clamp(x, 60, C.W - 60), y, str, {
        fontFamily: C.FONT, fontSize: (size || 16) + 'px', fontStyle: 'bold', color: css,
        stroke: '#000000', strokeThickness: 3
      }).setOrigin(0.5).setDepth(15);
      this.tweens.add({ targets: t, y: y - 38, alpha: 0, duration: 800, ease: 'Quad.Out', onComplete: () => t.destroy() });
    }

    banner(title, sub) {
      const mk = (txt, y, size, color) => this.add.text(C.W / 2, y, txt, {
        fontFamily: C.FONT, fontSize: size + 'px', fontStyle: 'bold', color,
        stroke: '#ff3df2', strokeThickness: size > 30 ? 2 : 0,
        shadow: { offsetX: 0, offsetY: 0, color: '#ff3df2', blur: 18, fill: true, stroke: true }
      }).setOrigin(0.5).setDepth(20).setAlpha(0).setScale(0.7);
      const t1 = mk(title, 400, 44, '#ffffff'), t2 = mk(sub, 448, 18, '#d8b4fe');
      [t1, t2].forEach((t) => this.tweens.add({
        targets: t, alpha: 1, scale: 1, duration: 260, ease: 'Back.Out', hold: 1100, yoyo: true,
        onComplete: () => t.destroy()
      }));
    }

    processKills() {
      if (!this.killQueue.length) return;
      this.killQueue.forEach((o) => { if (o && o.scene) o.destroy(); });
      this.killQueue.length = 0;
    }

    draw(time, dt) {
      const sec = dt / 1000;
      // --- slit (danger zone) ---
      const g = this.slitGfx; g.clear();
      const pulse = 0.7 + 0.3 * Math.sin(time / 180);
      g.fillStyle(0x000000, 1).fillRect(0, C.SLIT_Y, C.W, C.H - C.SLIT_Y);
      g.lineStyle(3, 0xff2d55, pulse).lineBetween(0, C.SLIT_Y, C.W, C.SLIT_Y);
      g.fillStyle(0xff2d55, 0.55);
      for (let x = 0; x < C.W; x += 22) g.fillTriangle(x + 2, C.SLIT_Y + 6, x + 18, C.SLIT_Y + 6, x + 10, C.SLIT_Y + 20);
      // --- safety wall ---
      if (this.wallOn) {
        const left = this.effects.wall.left;
        const a = left < 2000 ? (Math.sin(time / 60) > 0 ? 1 : 0.35) : 1;
        g.fillStyle(0x3b82ff, 0.25 * a).fillRect(0, C.WALL_Y - 9, C.W, 18);
        g.fillStyle(0x93c5fd, a).fillRect(0, C.WALL_Y - C.WALL_H / 2, C.W, C.WALL_H);
        g.lineStyle(2, 0x3b82ff, a).strokeRect(0, C.WALL_Y - C.WALL_H / 2, C.W, C.WALL_H);
      }
      // --- paddle ---
      const p = this.padGfx; p.clear();
      const px = this.paddle.x - this.padW / 2, py = C.PADDLE_Y - C.PADDLE_H / 2;
      const wide = this.has('wide'), fl = this.padFlash || 0;
      const edge = wide ? 0xfde047 : this.theme.paddle;
      p.fillStyle(edge, 0.12 + 0.1 * fl).fillRoundedRect(px - 8, py - 8, this.padW + 16, C.PADDLE_H + 16, 14);
      p.fillStyle(edge, 0.25 + 0.15 * fl).fillRoundedRect(px - 4, py - 4, this.padW + 8, C.PADDLE_H + 8, 11);
      p.fillStyle(this.theme.paddleDark, 1).fillRoundedRect(px, py, this.padW, C.PADDLE_H, 8);
      p.fillStyle(edge, 1).fillRoundedRect(px, py, this.padW, 6, { tl: 8, tr: 8, bl: 0, br: 0 });
      p.fillStyle(0xffffff, 0.8).fillRoundedRect(px + 8, py + 1.5, this.padW - 16, 2, 1);
      if (this.has('shield')) {
        p.lineStyle(2, 0x4ade80, 0.55 + 0.35 * Math.sin(time / 140)).strokeRoundedRect(px - 7, py - 7, this.padW + 14, C.PADDLE_H + 14, 13);
      }
      this.padFlash = Math.max(0, fl - sec * 5);

      // --- ball trails & protection ring ---
      const t = this.trailGfx; t.clear();
      this.balls.getChildren().forEach((b) => {
        if (!b.active) return;
        if (!b.attached) {
          b.trail.push(b.x, b.y);
          if (b.trail.length > 24) b.trail.splice(0, 2);
        } else b.trail.length = 0;
        const n = b.trail.length / 2, col = this.has('fire') ? 0xff8a1f : this.skin.trail;
        for (let i = 0; i < n - 1; i++) {
          const k = i / n;
          t.fillStyle(col, k * 0.4);
          t.fillCircle(b.trail[i * 2], b.trail[i * 2 + 1], b.r * (0.35 + 0.65 * k));
        }
        if (this.protectMs > 0 || b.attached) {
          const warn = this.protectMs > 0 && this.protectMs < 700 && Math.sin(time / 50) > 0;
          t.lineStyle(2, 0x22d3ee, warn ? 0.2 : 0.8).strokeCircle(b.x, b.y, b.r + 6 + Math.sin(time / 120) * 1.5);
        }
      });

      // --- particles ---
      const f = this.fxGfx; f.clear();
      for (let i = this.fx.length - 1; i >= 0; i--) {
        const q = this.fx[i];
        q.life -= dt;
        if (q.life <= 0) { this.fx[i] = this.fx[this.fx.length - 1]; this.fx.pop(); continue; }
        q.x += q.vx * sec; q.y += q.vy * sec; q.vy += 160 * sec; q.vx *= 0.985;
        f.fillStyle(q.color, q.life / q.max);
        f.fillCircle(q.x, q.y, q.size * (0.5 + 0.5 * q.life / q.max));
      }
    }

    /* =============================== HUD ================================= */
    syncHud(force, dt) {
      if (this.hudDirty || force) {
        this.hudDirty = false;
        PB.UI.hud({ score: this.score, best: this.best, level: this.level, lives: this.lives, mult: this.mult });
      }
      this.hudAccum += dt || 0;
      if (force || this.hudAccum >= 100) {
        this.hudAccum = 0;
        const list = [];
        PB.POWERUP_KEYS.forEach((k) => {
          const e = this.effects[k];
          if (!e) return;
          const d = P[k];
          list.push({
            key: k, label: d.label === 'SHLD' ? 'SHIELD' : d.name.toUpperCase(), css: d.css,
            frac: e.left === Infinity ? 1 : e.left / e.total,
            text: e.left === Infinity ? 'ON' : Math.ceil(e.left / 1000) + 's'
          });
        });
        if (this.protectMs > 0 && this.state === 'playing') {
          list.push({ key: 'prot', label: 'PROTECTED', css: '#22d3ee', frac: this.protectMs / C.PROTECT_MS, text: Math.ceil(this.protectMs / 1000) + 's' });
        }
        PB.UI.effects(list);
      }
    }
  }

  PB.GameScene = GameScene;
})();
