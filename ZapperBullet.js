// ZapperBullet.js

const ZAPPER_BULLET_WIDTH = 4;
const ZAPPER_BULLET_HEIGHT = 12; // Slightly elongated visual
const ZAPPER_BULLET_DRAW_HEIGHT_EXTENSION = 2; // For visual only
const ZAPPER_BULLET_COLOR = 'gold';
const ZAPPER_BULLET_SPEED = 15; // Pixels per frame, upwards

export class ZapperBullet {
    constructor() {
        this.position = { x: 0, y: 0 };
        this.width = ZAPPER_BULLET_WIDTH;
        this.height = ZAPPER_BULLET_HEIGHT; // Hitbox height
        this.color = ZAPPER_BULLET_COLOR;
        this.speed = ZAPPER_BULLET_SPEED;

        this.isActiveInPool = false; // True when in use, false when in pool's inactive list
    }

    /**
     * Initializes or re-initializes the bullet when taken from the pool.
     * @param {number} x - Initial x position (center of bullet).
     * @param {number} y - Initial y position (center of bullet, typically top of player).
     */
    init(x, y) {
        this.position.x = x;
        this.position.y = y;
        this.isActiveInPool = true;
    }

    update() {
        if (!this.isActiveInPool) return; // Do not update if not active
        this.position.y -= this.speed;
    }

    draw(ctx) {
        if (!this.isActiveInPool) return; // Do not draw if not active

        ctx.fillStyle = this.color;
        // Draw centered, visual height is slightly more than hitbox height
        ctx.fillRect(
            this.position.x - this.width / 2,
            this.position.y - (this.height / 2) - (ZAPPER_BULLET_DRAW_HEIGHT_EXTENSION / 2),
            this.width,
            this.height + ZAPPER_BULLET_DRAW_HEIGHT_EXTENSION
        );
    }

    /**
     * Checks if the bullet is off the top of the screen.
     * @param {number} canvasHeight - Not used directly, but common signature.
     * @returns {boolean} True if off-screen (top).
     */
    isOffscreen(canvasHeight) { // canvasHeight is not strictly needed if only checking top bound
        return this.position.y < -this.height; // Off top of screen
    }
}
