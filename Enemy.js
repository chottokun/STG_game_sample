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
