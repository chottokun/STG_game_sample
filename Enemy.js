import { EnemyBullet } from './Bullet.js';

// Base Enemy Class
//--------------------------------------------------------------------
const DEFAULT_ENEMY_ID = "enemy";
const DEFAULT_ENEMY_TYPE = "air"; // Default type if not specified
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
        this.type = type; // "air" or "ground"
        this.position = position;
        this.hp = hp;
        this.scoreValue = score;
        this.width = width;
        this.height = height;
        this.isDestroyed = false;
        this.speed = DEFAULT_ENEMY_SPEED;
    }

    update() {
        // Basic movement logic (e.g., move down slowly for air enemies)
        if (this.type === "air") {
            this.position.y += this.speed;
        }
        // Ground enemies have their Y position updated by GroundEnemy.update based on scroll
    }

    draw(ctx) {
        // Generic placeholder drawing for the base Enemy class
        ctx.fillStyle = 'purple'; // Default enemy color
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
        // Add a small indicator of HP
        if (this.hp !== Infinity && this.hp > 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.hp.toString(), this.position.x + this.width / 2, this.position.y + this.height / 2 + 4);
            ctx.textAlign = 'left'; // Reset alignment
        }
    }

    onHit() {
        if (this.hp === Infinity) return; // Indestructible

        this.hp -= 1;
        if (this.hp <= 0) {
            this.destroy();
        }
    }

    destroy() {
        this.isDestroyed = true;
        console.log(`${this.id} destroyed at ${this.position.x}, ${this.position.y}`);
    }
}

// AirEnemy Base Class (for enemies that fly and are not fixed to ground scroll)
//--------------------------------------------------------------------
const AIR_ENEMY_TYPE = "air";
// Default properties for AirEnemies if not specified by subclasses
const AIR_ENEMY_DEFAULT_ID_PREFIX = "air_enemy";
const AIR_ENEMY_DEFAULT_HP = 1;
const AIR_ENEMY_DEFAULT_SCORE = 50;
const AIR_ENEMY_WIDTH = 30;
const AIR_ENEMY_HEIGHT = 30;

export class AirEnemy extends Enemy {
    constructor(position, id = AIR_ENEMY_DEFAULT_ID_PREFIX, hp = AIR_ENEMY_DEFAULT_HP, score = AIR_ENEMY_DEFAULT_SCORE, width = AIR_ENEMY_WIDTH, height = AIR_ENEMY_HEIGHT) {
        super(id, AIR_ENEMY_TYPE, position, hp, score, width, height);
        this.isToroid = this.id.toLowerCase().includes("toroid"); // Flag for specific drawing
    }

    draw(ctx) {
        if (this.isToroid) {
            // Toroid-specific drawing (donut shape)
            ctx.fillStyle = 'darkred'; // Toroid color
            ctx.beginPath();
            ctx.arc(this.position.x + this.width / 2, this.position.y + this.height / 2, this.width / 2, 0, Math.PI * 2, false);
            const innerRadius = this.width / 4;
            ctx.arc(this.position.x + this.width / 2, this.position.y + this.height / 2, innerRadius, 0, Math.PI * 2, true);
            ctx.fill();

            ctx.fillStyle = 'orangered';
            ctx.beginPath();
            ctx.arc(this.position.x + this.width / 2 + innerRadius / 2, this.position.y + this.height / 2 - innerRadius / 2, innerRadius / 3, 0, Math.PI * 2);
            ctx.fill();

            if (this.hp > 0 && this.hp !== Infinity) { // Toroid specific HP display
                ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(this.hp.toString(), this.position.x + this.width / 2, this.position.y + this.height / 2 + 4);
                ctx.textAlign = 'left';
            }
        } else {
            // Fallback for other AirEnemy types if not Toroid - use base Enemy draw
            super.draw(ctx);
        }
    }
}

// GroundEnemy Base Class (for enemies fixed to terrain, Y pos depends on scroll)
//--------------------------------------------------------------------
const GROUND_ENEMY_TYPE = "ground";

export class GroundEnemy extends Enemy {
    constructor(id, type = GROUND_ENEMY_TYPE, position, hp, score, width, height, initialMapY) {
        super(id, type, position, hp, score, width, height);
        this.initialMapY = initialMapY;
        this.position.y = this.initialMapY - 0;
    }

    update(currentScrollPos) {
        this.position.y = this.initialMapY - currentScrollPos;
    }
    // Inherits draw from Enemy unless overridden by specific ground types
}


// Specific Air Enemy Types
//--------------------------------------------------------------------

// Constants for ZoshyEnemy
const ZOSHY_DEFAULT_ID = "zoshy";
const ZOSHY_HP = 2;
const ZOSHY_SCORE = 150;
const ZOSHY_WIDTH = 32;
const ZOSHY_HEIGHT = 32;
const ZOSHY_COLOR = 'darkorchid';
const ZOSHY_STOP_Y_DEFAULT = 120;
const ZOSHY_VERTICAL_SPEED_DEFAULT = 2;
const ZOSHY_LINGER_DURATION_FRAMES = 90;
const ZOSHY_BULLET_SPEED = 3.5;
const ZOSHY_BULLET_WIDTH = 6;
const ZOSHY_BULLET_HEIGHT = 6;
const ZOSHY_BULLET_COLOR = 'deeppink';

export class ZoshyEnemy extends AirEnemy {
    constructor(position, id = ZOSHY_DEFAULT_ID, hp = ZOSHY_HP, score = ZOSHY_SCORE, config = {}) {
        super(position, id, hp, score, ZOSHY_WIDTH, ZOSHY_HEIGHT);

        this.stopY = config.stopY || ZOSHY_STOP_Y_DEFAULT;
        this.verticalSpeed = config.verticalSpeed || ZOSHY_VERTICAL_SPEED_DEFAULT;
        this.baseVerticalSpeed = this.verticalSpeed; // Store to modify for exit
        this.lingerTimer = ZOSHY_LINGER_DURATION_FRAMES;

        this.state = "descending";
        this.hasFired = false;
        this.bullets = [];
        this.isToroid = false;
    }

    update(player, canvas) {
        if (this.state === "descending") {
            this.position.y += this.verticalSpeed;
            if (this.position.y >= this.stopY) {
                this.position.y = this.stopY;
                this.state = "firing";
            }
        } else if (this.state === "firing") {
            this.lingerTimer--;
            if (!this.hasFired && player) {
                this.fireBullet(player.position);
                this.hasFired = true;
            }
            if (this.lingerTimer <= 0) {
                this.state = "exiting";
                this.verticalSpeed = this.baseVerticalSpeed * 1.5; // Exit a bit faster
            }
        } else if (this.state === "exiting") {
            this.position.y += this.verticalSpeed;
        }

        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update();
            if (canvas && bullet.isOffscreen(canvas.width, canvas.height)) {
                this.bullets.splice(i, 1);
            }
        }
    }

    fireBullet(playerPosition) {
        if (!playerPosition) return;
        const dx = playerPosition.x - (this.position.x + this.width / 2);
        const dy = playerPosition.y - (this.position.y + this.height / 2);
        const angle = Math.atan2(dy, dx);
        const bulletX = this.position.x + this.width / 2;
        const bulletY = this.position.y + this.height / 2;
        this.bullets.push(new EnemyBullet(bulletX, bulletY, ZOSHY_BULLET_WIDTH, ZOSHY_BULLET_HEIGHT, ZOSHY_BULLET_COLOR, ZOSHY_BULLET_SPEED, angle));
    }

    draw(ctx) {
        ctx.fillStyle = ZOSHY_COLOR;
        ctx.beginPath();
        ctx.arc(this.position.x + this.width / 2, this.position.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        super.draw(ctx); // Draw HP from base Enemy class after custom shape

        for (const bullet of this.bullets) {
            bullet.draw(ctx);
        }
    }
}

// Constants for ZakatoEnemy
const ZAKATO_DEFAULT_ID = "zakato";
const ZAKATO_HP = 1;
const ZAKATO_SCORE = 75;
const ZAKATO_WIDTH = 35;
const ZAKATO_HEIGHT = 25;
const ZAKATO_COLOR = 'mediumseagreen';
const ZAKATO_DEFAULT_AMPLITUDE = 70;
const ZAKATO_DEFAULT_FREQUENCY = 0.03;
const ZAKATO_DEFAULT_VERTICAL_SPEED = 1.5;

export class ZakatoEnemy extends AirEnemy {
    constructor(position, id = ZAKATO_DEFAULT_ID, hp = ZAKATO_HP, score = ZAKATO_SCORE, config = {}) {
        super(position, id, hp, score, ZAKATO_WIDTH, ZAKATO_HEIGHT);
        this.amplitude = config.amplitude || ZAKATO_DEFAULT_AMPLITUDE;
        this.frequency = config.frequency || ZAKATO_DEFAULT_FREQUENCY;
        this.verticalSpeed = config.verticalSpeed || ZAKATO_DEFAULT_VERTICAL_SPEED;
        this.initialX = position.x;
        this.age = 0;
        this.isToroid = false;
    }

    update() { // Zakato does not need player/canvas for its own update currently
        this.age++;
        this.position.y += this.verticalSpeed;
        const offsetX = this.amplitude * Math.sin(this.age * this.frequency);
        this.position.x = this.initialX + offsetX;
    }

    draw(ctx) {
        ctx.fillStyle = ZAKATO_COLOR;
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
        super.draw(ctx); // Draw HP from base Enemy class
    }
}

// Constants for BacuraEnemy
const BACURA_DEFAULT_ID = "bacura";
const BACURA_HP = Infinity;
const BACURA_SCORE = 0;
const BACURA_DEFAULT_WIDTH = 120;
const BACURA_DEFAULT_HEIGHT = 25;
const BACURA_COLOR = 'darkslategrey';
const BACURA_DEFAULT_SPEED = 0.5;

export class BacuraEnemy extends AirEnemy { // Bacura is an obstacle, but treated as Air for layer & simple Y movement
    constructor(position, id = BACURA_DEFAULT_ID, width = BACURA_DEFAULT_WIDTH, height = BACURA_DEFAULT_HEIGHT, speed = BACURA_DEFAULT_SPEED) {
        super(position, id, BACURA_HP, BACURA_SCORE, width, height);
        this.speed = speed;
        this.isToroid = false;
    }

    update() { // Overrides AirEnemy update if different speed logic or no type check needed
        this.position.y += this.speed;
    }

    onHit() { /* Indestructible */ }

    draw(ctx) {
        ctx.fillStyle = BACURA_COLOR;
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
        ctx.strokeStyle = 'grey';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.position.x, this.position.y, this.width, this.height);
        for(let i=1; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(this.position.x, this.position.y + (this.height/4)*i);
            ctx.lineTo(this.position.x + this.width, this.position.y + (this.height/4)*i);
            ctx.stroke();
        }
    }
}

// Specific Ground Enemy Types
//--------------------------------------------------------------------

// Constants for DerotaEnemy
const DEROTA_DEFAULT_ID = "derota";
const DEROTA_HP = 3;
const DEROTA_SCORE = 200;
const DEROTA_WIDTH = 40;
const DEROTA_HEIGHT = 40;
const DEROTA_COLOR_BASE = 'saddlebrown';
const DEROTA_COLOR_TURRET = 'darkgrey';
const DEROTA_TURRET_WIDTH = 10;
const DEROTA_TURRET_LENGTH = 25;
const DEROTA_ROTATION_SPEED = 0.015;
const DEROTA_FIRE_COOLDOWN = 180;
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
        this.fireTimer = Math.random() * this.fireCooldown;
        this.bullets = [];
    }

    update(currentScrollPos, playerPosition, canvas) {
        super.update(currentScrollPos);
        this.rotationAngle += this.rotationSpeed;
        if (this.rotationAngle > Math.PI * 2) this.rotationAngle -= Math.PI * 2;
        this.fireTimer--;
        if (this.fireTimer <= 0) {
            this.fireBurst();
            this.fireTimer = this.fireCooldown;
        }
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update();
            if (canvas && bullet.isOffscreen(canvas.width, canvas.height)) { // Check canvas exists
                this.bullets.splice(i, 1);
            }
        }
    }

    fireBurst() {
        const bulletX = this.position.x + this.width / 2;
        const bulletY = this.position.y + this.height / 2;
        const angles = [
            this.rotationAngle, this.rotationAngle + Math.PI / 2,
            this.rotationAngle + Math.PI, this.rotationAngle + (Math.PI * 3) / 2,
        ];
        for (const angle of angles) {
            this.bullets.push(new EnemyBullet(
                bulletX, bulletY, DEROTA_BULLET_WIDTH, DEROTA_BULLET_HEIGHT,
                DEROTA_BULLET_COLOR, DEROTA_BULLET_SPEED, angle
            ));
        }
    }

    draw(ctx) {
        const centerX = this.position.x + this.width / 2;
        const centerY = this.position.y + this.height / 2;
        ctx.fillStyle = DEROTA_COLOR_BASE;
        ctx.beginPath();
        ctx.arc(centerX, centerY, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        // Base Enemy.draw() would draw purple rect + HP. We want custom Derota look.
        // If HP needs to be drawn for Derota, do it here or in a shared GroundEnemy draw method.
        // For now, no explicit HP for Derota, relying on visual damage states later.

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(this.rotationAngle);
        ctx.fillStyle = DEROTA_COLOR_TURRET;
        ctx.fillRect(-DEROTA_TURRET_WIDTH / 2, -DEROTA_TURRET_LENGTH / 2, DEROTA_TURRET_WIDTH, DEROTA_TURRET_LENGTH);
        ctx.restore();

        for (const bullet of this.bullets) {
            bullet.draw(ctx);
        }
    }
}
