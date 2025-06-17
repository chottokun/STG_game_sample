// Constants for base Enemy
const DEFAULT_ENEMY_ID = "enemy";
const DEFAULT_ENEMY_TYPE = "air";
const DEFAULT_ENEMY_HP = 1;
const DEFAULT_ENEMY_SCORE = 50;
const DEFAULT_ENEMY_WIDTH = 30;
const DEFAULT_ENEMY_HEIGHT = 30;
const DEFAULT_ENEMY_SPEED = 2; // Pixels per frame

export class Enemy {
    constructor(
        id = DEFAULT_ENEMY_ID,
        type = DEFAULT_ENEMY_TYPE,
        position = { x: 0, y: 0 },
        hp = DEFAULT_ENEMY_HP,
        score = DEFAULT_ENEMY_SCORE,
        width = DEFAULT_ENEMY_WIDTH,
        height = DEFAULT_ENEMY_HEIGHT
    ) {
        this.id = id;
        this.type = type;
        this.position = position;
        this.hp = hp;
        this.scoreValue = score;
        this.width = width;
        this.height = height;
        this.isDestroyed = false;
        this.speed = DEFAULT_ENEMY_SPEED;
    }

    update() {
        // Basic movement logic (e.g., move down slowly)
        this.position.y += this.speed;
    }

    draw(ctx) {
        // Generic placeholder drawing for the base Enemy class
        ctx.fillStyle = 'purple'; // Default enemy color
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
        // Add a small indicator of HP
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.hp.toString(), this.position.x + this.width / 2, this.position.y + this.height / 2 + 4);
        ctx.textAlign = 'left'; // Reset alignment
    }

    onHit() {
        this.hp -= 1;
        if (this.hp <= 0) {
            this.destroy();
        }
    }

    destroy() {
        this.isDestroyed = true;
        // In a real game, you might add an explosion animation or sound here
        console.log(`${this.id} destroyed at ${this.position.x}, ${this.position.y}`);
    }
}

import { EnemyBullet } from './Bullet.js'; // For Derota's bullets

// Constants for ZoshyEnemy
const ZOSHY_DEFAULT_ID = "zoshy";
const ZOSHY_TYPE = "air";
const ZOSHY_HP = 2;
const ZOSHY_SCORE = 150;
const ZOSHY_WIDTH = 32;
const ZOSHY_HEIGHT = 32;
const ZOSHY_COLOR = 'darkorchid'; // Purple
const ZOSHY_STOP_Y_DEFAULT = 120; // Default Y position to stop and fire
const ZOSHY_VERTICAL_SPEED_DEFAULT = 2;
const ZOSHY_LINGER_DURATION_FRAMES = 90; // Approx 1.5 seconds at 60fps
const ZOSHY_BULLET_SPEED = 3.5;
const ZOSHY_BULLET_WIDTH = 6;
const ZOSHY_BULLET_HEIGHT = 6;
const ZOSHY_BULLET_COLOR = 'deeppink';


export class ZoshyEnemy extends AirEnemy {
    constructor(position, id = ZOSHY_DEFAULT_ID, hp = ZOSHY_HP, score = ZOSHY_SCORE, config = {}) {
        super(position, id, hp, score); // AirEnemy constructor
        this.width = ZOSHY_WIDTH;
        this.height = ZOSHY_HEIGHT;

        this.stopY = config.stopY || ZOSHY_STOP_Y_DEFAULT;
        this.verticalSpeed = config.verticalSpeed || ZOSHY_VERTICAL_SPEED_DEFAULT;
        this.lingerTimer = ZOSHY_LINGER_DURATION_FRAMES;

        this.state = "descending"; // "descending", "firing", "exiting"
        this.hasFired = false;
        this.bullets = []; // Array to hold Zoshy's bullets

        this.isToroid = false; // Not a Toroid
        this.isBacura = false; // Not a Bacura
    }

    update(player, canvas) { // Needs player for aiming, canvas for bullet offscreen check
        if (this.state === "descending") {
            this.position.y += this.verticalSpeed;
            if (this.position.y >= this.stopY) {
                this.position.y = this.stopY; // Snap to stopY
                this.state = "firing";
                // lingerTimer is already set from constructor or can be reset here
            }
        } else if (this.state === "firing") {
            this.lingerTimer--;
            if (!this.hasFired && player) { // Check if player exists (might be null if game over etc)
                this.fireBullet(player.position);
                this.hasFired = true;
            }
            if (this.lingerTimer <= 0) {
                this.state = "exiting";
            }
        } else if (this.state === "exiting") {
            // Exits downwards by default, could be changed (e.g. upwards)
            this.position.y += this.verticalSpeed * 1.5; // Exit a bit faster
        }

        // Update bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update();
            if (canvas && bullet.isOffscreen(canvas.width, canvas.height)) {
                this.bullets.splice(i, 1);
            }
        }
    }

    fireBullet(playerPosition) {
        if (!playerPosition) return; // Don't fire if player doesn't exist

        const dx = playerPosition.x - (this.position.x + this.width / 2);
        const dy = playerPosition.y - (this.position.y + this.height / 2);
        const angle = Math.atan2(dy, dx);

        const bulletX = this.position.x + this.width / 2; // Fire from center
        const bulletY = this.position.y + this.height / 2;

        const newBullet = new EnemyBullet( // Using EnemyBullet from Bullet.js
            bulletX, bulletY,
            ZOSHY_BULLET_WIDTH, ZOSHY_BULLET_HEIGHT,
            ZOSHY_BULLET_COLOR, ZOSHY_BULLET_SPEED, angle
        );
        this.bullets.push(newBullet);
    }

    draw(ctx) {
        // Zoshy specific drawing (e.g., a purple diamond or circle)
        ctx.fillStyle = ZOSHY_COLOR;
        // Simple circle for now
        ctx.beginPath();
        ctx.arc(this.position.x + this.width / 2, this.position.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
        ctx.fill();

        // HP display
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.hp.toString(), this.position.x + this.width / 2, this.position.y + this.height / 2 + 4);
        ctx.textAlign = 'left';

        // Draw bullets
        for (const bullet of this.bullets) {
            bullet.draw(ctx);
        }
    }
}

// GroundEnemy Base Class
//--------------------------------------------------------------------
const GROUND_ENEMY_TYPE = "ground";

export class GroundEnemy extends Enemy {
    constructor(id, type = GROUND_ENEMY_TYPE, position, hp, score, width, height, initialMapY) {
        super(id, type, position, hp, score, width, height);
        this.initialMapY = initialMapY; // Y position on the overall game map
        this.position.y = this.initialMapY - 0; // Initial calculation assuming scrollPos = 0
    }

    update(currentScrollPos) {
        // Ground enemies move with the terrain based on scroll position
        this.position.y = this.initialMapY - currentScrollPos;
        // Specific X-axis or animation logic would go into subclasses
    }

    // draw(ctx) - Can inherit from Enemy or be overridden if ground enemies have a distinct base look
    // For now, will inherit the purple rectangle with HP from base Enemy.draw()
}

// Constants for DerotaEnemy
//--------------------------------------------------------------------
const DEROTA_DEFAULT_ID = "derota";
const DEROTA_HP = 3;
const DEROTA_SCORE = 200;
const DEROTA_WIDTH = 40; // Base width
const DEROTA_HEIGHT = 40; // Base height
const DEROTA_COLOR_BASE = 'saddlebrown';
const DEROTA_COLOR_TURRET = 'darkgrey';
const DEROTA_TURRET_WIDTH = 10;
const DEROTA_TURRET_LENGTH = 25;
const DEROTA_ROTATION_SPEED = 0.015; // Radians per frame
const DEROTA_FIRE_COOLDOWN = 180; // Frames (3 seconds at 60fps)
const DEROTA_BULLET_SPEED = 2.5;
const DEROTA_BULLET_WIDTH = 5;
const DEROTA_BULLET_HEIGHT = 5;
const DEROTA_BULLET_COLOR = 'orangered';


export class DerotaEnemy extends GroundEnemy {
    constructor(position, id = DEROTA_DEFAULT_ID, hp = DEROTA_HP, score = DEROTA_SCORE, initialMapY, config = {}) {
        super(id, GROUND_ENEMY_TYPE, position, hp, score, DEROTA_WIDTH, DEROTA_HEIGHT, initialMapY);

        this.rotationAngle = 0;
        this.rotationSpeed = config.rotationSpeed || DEROTA_ROTATION_SPEED;
        this.fireCooldown = config.fireCooldown || DEROTA_FIRE_COOLDOWN;
        this.fireTimer = Math.random() * this.fireCooldown; // Random initial fire timer
        this.bullets = [];

        this.isToroid = false;
        this.isBacura = false;
        this.isZoshy = false; // Assuming we might add such flags
    }

    update(currentScrollPos, playerPosition, canvas) { // playerPosition for future aiming, canvas for bullet offscreen
        super.update(currentScrollPos); // Update Y position based on scrolling

        this.rotationAngle += this.rotationSpeed;
        if (this.rotationAngle > Math.PI * 2) this.rotationAngle -= Math.PI * 2;

        this.fireTimer--;
        if (this.fireTimer <= 0) {
            this.fireBurst();
            this.fireTimer = this.fireCooldown;
        }

        // Update bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update();
            // Use actual on-screen position for offscreen check
            const bulletScreenY = bullet.position.y;
            if (bulletScreenY < -bullet.height || bulletScreenY > canvas.height ||
                bullet.position.x < -bullet.width || bullet.position.x > canvas.width) {
                this.bullets.splice(i, 1);
            }
        }
    }

    fireBurst() {
        const bulletX = this.position.x + this.width / 2;
        // Y position for bullets needs to be the current on-screen Y
        const bulletY = this.position.y + this.height / 2;

        const angles = [
            this.rotationAngle,
            this.rotationAngle + Math.PI / 2,
            this.rotationAngle + Math.PI,
            this.rotationAngle + (Math.PI * 3) / 2,
        ];

        for (const angle of angles) {
            this.bullets.push(new EnemyBullet(
                bulletX, bulletY,
                DEROTA_BULLET_WIDTH, DEROTA_BULLET_HEIGHT,
                DEROTA_BULLET_COLOR, DEROTA_BULLET_SPEED, angle
            ));
        }
    }

    draw(ctx) {
        const centerX = this.position.x + this.width / 2;
        const centerY = this.position.y + this.height / 2;

        // Draw base
        ctx.fillStyle = DEROTA_COLOR_BASE;
        ctx.beginPath();
        ctx.arc(centerX, centerY, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        // HP for base (optional, if base Enemy doesn't draw it)
        // super.draw(ctx); // If you want the purple square + HP from base Enemy underneath

        // Draw turret
        ctx.save(); // Save context state
        ctx.translate(centerX, centerY); // Move origin to center of base
        ctx.rotate(this.rotationAngle); // Rotate context

        ctx.fillStyle = DEROTA_COLOR_TURRET;
        // Draw turret rectangle centered at the new origin, extending outwards
        ctx.fillRect(-DEROTA_TURRET_WIDTH / 2, -DEROTA_TURRET_LENGTH / 2, DEROTA_TURRET_WIDTH, DEROTA_TURRET_LENGTH);

        ctx.restore(); // Restore context state

        // Draw bullets
        for (const bullet of this.bullets) {
            bullet.draw(ctx);
        }
    }
}

// Constants for AirEnemy / Toroid (can be more specific if Toroid becomes its own class)
const AIR_ENEMY_DEFAULT_ID_PREFIX = "toroid"; // Used to identify Toroids for drawing
const AIR_ENEMY_TYPE = "air";
const AIR_ENEMY_DEFAULT_HP = 1; // These might be redundant if base defaults are used
const AIR_ENEMY_DEFAULT_SCORE = 50;
const AIR_ENEMY_WIDTH = 30;
const AIR_ENEMY_HEIGHT = 30;

export class AirEnemy extends Enemy {
    constructor(position, id = AIR_ENEMY_DEFAULT_ID_PREFIX, hp = AIR_ENEMY_DEFAULT_HP, score = AIR_ENEMY_DEFAULT_SCORE) {
        super(id, AIR_ENEMY_TYPE, position, hp, score, AIR_ENEMY_WIDTH, AIR_ENEMY_HEIGHT);
        // Toroid specific properties can be added here
        this.isToroid = this.id.toLowerCase().includes(AIR_ENEMY_DEFAULT_ID_PREFIX); // Flag for specific drawing
    }

    draw(ctx) {
        if (this.isToroid) {
            // Toroid-specific drawing (donut shape)
            ctx.fillStyle = 'darkred'; // Toroid color
            ctx.beginPath();
            // Outer circle - position.x, position.y is top-left, so adjust for center
            ctx.arc(this.position.x + this.width / 2, this.position.y + this.height / 2, this.width / 2, 0, Math.PI * 2, false);
            // Inner circle (for donut hole)
            const innerRadius = this.width / 4;
            ctx.arc(this.position.x + this.width / 2, this.position.y + this.height / 2, innerRadius, 0, Math.PI * 2, true); // counter-clockwise for hole
            ctx.fill();

            // Optional: add a small highlight or detail
            ctx.fillStyle = 'orangered';
            ctx.beginPath();
            ctx.arc(this.position.x + this.width / 2 + innerRadius / 2, this.position.y + this.height / 2 - innerRadius / 2, innerRadius / 3, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Fallback for other AirEnemy types if not Toroid
            // Uses the base class draw method.
            super.draw(ctx);
        }
        // Common AirEnemy drawing elements (e.g. HP) can be added here, or rely on base.draw()
        // If super.draw() is called, it will draw the HP for Toroids too.
        // For now, let Toroid draw its own, and other AirEnemies use base.
        if (!this.isToroid) { // If not toroid, base.draw already drew HP.
             // If Toroid needs specific HP drawing, do it here. Otherwise, it's drawn by its own logic.
        } else { // Toroid specific HP display if needed, or remove if highlight is enough
            ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.hp.toString(), this.position.x + this.width / 2, this.position.y + this.height / 2 + 4);
            ctx.textAlign = 'left'; // Reset alignment
        }
    }

    // Override update for specific AirEnemy behaviors if needed
    // For "straight_down", the base Enemy update is sufficient if speed is set.
    // If other behaviors like "sine_wave" were needed, they'd go here.
}

// Constants for BacuraEnemy
const BACURA_DEFAULT_ID = "bacura";
const BACURA_TYPE = "air"; // Treated as an air unit for layer, though it's more of an obstacle
const BACURA_HP = Infinity; // Indestructible
const BACURA_SCORE = 0; // No score for hitting/destroying
const BACURA_DEFAULT_WIDTH = 120;
const BACURA_DEFAULT_HEIGHT = 25;
const BACURA_COLOR = 'darkslategrey';
const BACURA_DEFAULT_SPEED = 0.5; // Very slow downward movement

export class BacuraEnemy extends AirEnemy {
    constructor(position, id = BACURA_DEFAULT_ID, width = BACURA_DEFAULT_WIDTH, height = BACURA_DEFAULT_HEIGHT, speed = BACURA_DEFAULT_SPEED) {
        // Note: HP and Score are fixed for Bacura
        super(position, id, BACURA_HP, BACURA_SCORE);
        this.width = width;
        this.height = height;
        this.speed = speed; // Override default AirEnemy speed if needed, or use base Enemy speed.

        this.isToroid = false; // Ensure it doesn't use Toroid drawing
        this.isBacura = true; // Flag for specific identification if needed
    }

    update() {
        // Simple straight down movement, speed is set in constructor (or defaults from base Enemy)
        this.position.y += this.speed;

        // Despawn if it goes way off screen (optional, game.js also handles this)
        // if (this.position.y > some_canvas_height_limit) { this.isDestroyed = true; }
    }

    onHit() {
        // Bacura is indestructible. This method is called, but does nothing to HP.
        // console.log("Bacura was hit, but is indestructible.");
        // Future: Play a specific "clank" sound effect here.
    }

    draw(ctx) {
        // Bacura-specific drawing: a wide, flat, dark grey rectangle
        ctx.fillStyle = BACURA_COLOR;
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);

        // Optional: Add some detailing to make it look more "plate-like" or metallic
        ctx.strokeStyle = 'grey';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.position.x, this.position.y, this.width, this.height);
        // Simple line details
        for(let i=1; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(this.position.x, this.position.y + (this.height/4)*i);
            ctx.lineTo(this.position.x + this.width, this.position.y + (this.height/4)*i);
            ctx.stroke();
        }
    }
}


// Constants for ZakatoEnemy
const ZAKATO_DEFAULT_ID = "zakato";
const ZAKATO_TYPE = "air"; // Zakato is also an air enemy
const ZAKATO_HP = 1;
const ZAKATO_SCORE = 75;
const ZAKATO_WIDTH = 35;
const ZAKATO_HEIGHT = 25; // Flatter than Toroid
const ZAKATO_COLOR = 'mediumseagreen'; // Greenish

const ZAKATO_DEFAULT_AMPLITUDE = 70; // Pixels for sine wave horizontal movement
const ZAKATO_DEFAULT_FREQUENCY = 0.03; // Controls speed of sine wave
const ZAKATO_DEFAULT_VERTICAL_SPEED = 1.5; // Pixels per frame downwards

export class ZakatoEnemy extends AirEnemy {
    constructor(position, id = ZAKATO_DEFAULT_ID, hp = ZAKATO_HP, score = ZAKATO_SCORE, config = {}) {
        super(position, id, hp, score); // AirEnemy constructor will set type to "air"
        this.width = ZAKATO_WIDTH;
        this.height = ZAKATO_HEIGHT;

        this.amplitude = config.amplitude || ZAKATO_DEFAULT_AMPLITUDE;
        this.frequency = config.frequency || ZAKATO_DEFAULT_FREQUENCY;
        this.verticalSpeed = config.verticalSpeed || ZAKATO_DEFAULT_VERTICAL_SPEED;

        this.initialX = position.x; // Store the initial X to calculate sine offset from
        this.age = 0; // Counter for sine wave calculation

        this.isToroid = false; // Ensure it doesn't use Toroid drawing logic from AirEnemy
    }

    update() {
        this.age++;
        this.position.y += this.verticalSpeed;

        // Sine wave horizontal movement
        const offsetX = this.amplitude * Math.sin(this.age * this.frequency);
        this.position.x = this.initialX + offsetX;

        // Basic off-screen check (top part of enemy is off bottom of screen)
        // This is usually handled in game.js, but good to have as a fallback.
        // if (this.position.y > canvas.height) { this.isDestroyed = true; }
    }

    draw(ctx) {
        // Zakato-specific drawing (e.g., a green oval or rectangle)
        ctx.fillStyle = ZAKATO_COLOR;
        // Simple rectangle for now, can be changed to oval: ctx.ellipse(...)
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);

        // HP display (optional, could inherit from a base method if desired)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.hp.toString(), this.position.x + this.width / 2, this.position.y + this.height / 2 + 4);
        ctx.textAlign = 'left'; // Reset alignment
    }
}
