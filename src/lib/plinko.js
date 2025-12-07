export class PlinkoEngine {
  constructor(config = {}) {
    this.rows = config.rows || 15;
    this.pegRadius = config.pegRadius || 4;
    this.ballRadius = config.ballRadius || 6;
    this.pegSpacingX = config.pegSpacingX || 40;
    this.pegSpacingY = config.pegSpacingY || 35;
    this.gravity = config.gravity || 0.25;
    this.friction = config.friction || 0.99;
    this.elasticity = config.elasticity || 0.6; // Bounciness
    this.hasMitosis = config.hasMitosis || false;
    this.hasExpansion = config.hasExpansion || false;
    this.hasGhostProtocol = config.hasGhostProtocol || false;
    this.hasPegSmasher = config.hasPegSmasher || false;
    this.hasSecondWind = config.hasSecondWind || false;

    this.ballsDroppedTotal = 0; // Track for Peg Smasher

    this.width = (this.rows + 2) * this.pegSpacingX;
    this.height = (this.rows + 2) * this.pegSpacingY;

    this.pegs = [];
    this.balls = [];
    this.slots = [];
    this.particles = []; // For visual effects

    this.onSlotHit = null; // Callback

    this.generateBoard();
  }

  generateBoard() {
    // Resize board if expansion is active to fit the extra slot
    if (this.hasExpansion) {
      this.width = (this.rows + 3) * this.pegSpacingX;
    } else {
      this.width = (this.rows + 2) * this.pegSpacingX;
    }

    this.pegs = [];
    const startX = this.width / 2;
    const startY = 50;

    for (let row = 0; row < this.rows; row++) {
      const pegsInRow = row + 3;
      const rowWidth = (pegsInRow - 1) * this.pegSpacingX;
      const rowStartX = startX - rowWidth / 2;

      for (let i = 0; i < pegsInRow; i++) {
        this.pegs.push({
          x: rowStartX + i * this.pegSpacingX,
          y: startY + row * this.pegSpacingY,
          radius: this.pegRadius
        });
      }
    }

    // Generate Slots
    const lastRowY = startY + (this.rows - 1) * this.pegSpacingY;
    const slotY = lastRowY + 40;
    const pegsInLastRow = this.rows + 3;
    const rowWidth = (pegsInLastRow - 1) * this.pegSpacingX;
    const rowStartX = startX - rowWidth / 2;

    // Multipliers based on distance from center (higher at edges, lower in center)
    // Standard distribution: 10, 5, 2, 1, 0.5, 0.2, 0.5, 1, 2, 5, 10
    // We need (pegsInLastRow - 1) slots
    let numSlots = pegsInLastRow - 1;
    if (this.hasExpansion) numSlots += 1;

    const centerIndex = (numSlots - 1) / 2;

    for (let i = 0; i < numSlots; i++) {
      let multiplier = 0.5;
      const dist = Math.abs(i - centerIndex);

      if (dist < 1) multiplier = 0.2;
      else if (dist < 2) multiplier = 0.2; // Center 3 slots
      else if (dist < 3.5) multiplier = 2;
      else if (dist < 4.5) multiplier = 4;
      else if (dist < 5.5) multiplier = 9;
      else if (dist < 6.5) multiplier = 26;
      else if (dist < 7.5) multiplier = 130;
      else multiplier = 1000;

      this.slots.push({
        x: rowStartX + i * this.pegSpacingX + (this.pegSpacingX / 2),
        y: slotY,
        width: this.pegSpacingX - 2,
        height: 20,
        multiplier: multiplier,
        color: this.getMultiplierColor(multiplier)
      });
    }
  }

  getMultiplierColor(m) {
    if (m >= 1000) return '#ff0000'; // Red
    if (m >= 130) return '#ff4400'; // Red-Orange
    if (m >= 26) return '#ff8800'; // Orange
    if (m >= 9) return '#ffff00'; // Yellow
    if (m >= 4) return '#00ff00'; // Green
    if (m >= 2) return '#00ffff'; // Cyan
    return '#888888'; // Grey
  }

  dropBall(xOffset = 0, betValue = 1) {
    const startX = (this.width / 2) + (Math.random() * 10 - 5) + xOffset;
    this.balls.push({
      x: startX,
      y: 10,
      vx: (Math.random() - 0.5) * 4, // Random horizontal speed (-2 to 2)
      vy: Math.random() * 2, // Random initial drop speed (0 to 2)
      radius: this.ballRadius,
      active: true,
      id: Math.random().toString(36).substr(2, 9),
      betValue: betValue,
      isSmasher: this.hasPegSmasher && (this.ballsDroppedTotal + 1) % 20 === 0,
      smashedCount: 0,
      splitCount: 0,
      age: 0
    });
    this.ballsDroppedTotal++;
  }

  update() {
    // Update Balls
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const ball = this.balls[i];
      if (!ball.active) continue;

      ball.age++;
      if (ball.age > 1000) { // ~16 seconds at 60fps
        ball.active = false;
        this.balls.splice(i, 1);
        continue;
      }

      // Gravity
      ball.vy += this.gravity;
      ball.vx *= this.friction;
      ball.vy *= this.friction;

      // Position
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Wall Collisions
      if (ball.x < 0) {
        ball.x = 0;
        ball.vx *= -0.8;
      }
      if (ball.x > this.width) {
        ball.x = this.width;
        ball.vx *= -0.8;
      }

      // Peg Collisions
      for (const peg of this.pegs) {
        const dx = ball.x - peg.x;
        const dy = ball.y - peg.y;
        const distSq = dx * dx + dy * dy;
        const minDist = ball.radius + peg.radius;

        // Ghost Protocol: 10% chance to pass through
        if (this.hasGhostProtocol && Math.random() < 0.1) continue;

        if (distSq < minDist * minDist) {
          // Peg Smasher: If ball is "heavy" (every 20th), destroy peg
          if (ball.isSmasher && ball.smashedCount < 3) {
            // Remove peg
            this.pegs.splice(this.pegs.indexOf(peg), 1);
            ball.smashedCount++;
            // Don't bounce, just continue (maybe slow down slightly?)
            ball.vx *= 0.9;
            ball.vy *= 0.9;
            continue;
          }

          const dist = Math.sqrt(distSq);

          const nx = dx / dist;
          const ny = dy / dist;

          // Resolve overlap
          const overlap = minDist - dist;
          ball.x += nx * overlap;
          ball.y += ny * overlap;

          // Bounce
          // v' = v - 2 * (v . n) * n
          const dot = ball.vx * nx + ball.vy * ny;
          ball.vx = (ball.vx - 2 * dot * nx) * this.elasticity;
          ball.vy = (ball.vy - 2 * dot * ny) * this.elasticity;

          // Add some randomness to prevent stacking
          ball.vx += (Math.random() - 0.5) * 0.12;

          // Mitosis Perk
          if (this.hasMitosis && ball.splitCount < 2 && Math.random() < 0.05) { // Limit splits
            this.balls.push({
              x: ball.x,
              y: ball.y,
              vx: -ball.vx, // Bounce opposite way
              vy: ball.vy,
              radius: this.ballRadius,
              active: true,
              id: Math.random().toString(36).substr(2, 9),
              betValue: ball.betValue,
              splitCount: ball.splitCount + 1, // Increment split count
              age: 0
            });
          }
        }
      }

      // Slot Detection
      if (ball.y > this.slots[0].y - 10) {
        for (const slot of this.slots) {
          if (Math.abs(ball.x - slot.x) < slot.width / 2) {
            this.handleSlotHit(ball, slot);
            break;
          }
        }
        // If it missed all slots (went off side), kill it
        if (ball.y > this.height) {
          ball.active = false;
          this.balls.splice(i, 1);
        }
      }
    }
  }

  handleSlotHit(ball, slot) {
    // Second Wind: 25% chance to save bad drops (< 1x)
    if (this.hasSecondWind && slot.multiplier < 1 && Math.random() < 0.25) {
      ball.vy = -12; // Shoot up
      ball.y -= 10;
      ball.vx = (Math.random() - 0.5) * 4; // Random horizontal
      return; // Don't kill ball
    }

    ball.active = false;
    // Remove ball
    this.balls = this.balls.filter(b => b.id !== ball.id);

    if (this.onSlotHit) {
      this.onSlotHit(slot.multiplier, ball.betValue, slot); // Pass slot for Combo Master
    }
  }
  simulateTrajectory(startX) {
    // Simple simulation for first few bounces
    let x = startX;
    let y = 10;
    let vx = (Math.random() - 0.5) * 0.5; // Slight random jitter for prediction
    let vy = 0;
    const path = [{ x, y }];

    // Simulate 600 frames or until hit
    for (let i = 0; i < 600; i++) {
      vy += this.gravity;
      vx *= this.friction;
      vy *= this.friction;
      x += vx;
      y += vy;

      // Peg collision (simplified)
      for (const peg of this.pegs) {
        const dx = x - peg.x;
        const dy = y - peg.y;
        const distSq = dx * dx + dy * dy;
        const minDist = this.ballRadius + peg.radius;

        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const ny = dy / dist;

          // Bounce
          const dot = vx * nx + vy * ny;
          vx = (vx - 2 * dot * nx) * this.elasticity;
          vy = (vy - 2 * dot * ny) * this.elasticity;

          // Push out
          x += nx * (minDist - dist);
          y += ny * (minDist - dist);
        }
      }

      path.push({ x, y });
      if (y > this.height) break;
    }
    return path;
  }
}
