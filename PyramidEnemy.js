import { GroundEnemy } from './Enemy.js'; // Assuming GroundEnemy is in Enemy.js

// Constants for PyramidEnemy
const PYRAMID_HP = 1; // Usually destroyed in one hit
const PYRAMID_SCORE = 100;
const PYRAMID_WIDTH = 30;
const PYRAMID_HEIGHT = 30;
const PYRAMID_COLOR = 'sandybrown';
const PYRAMID_OUTLINE_COLOR = 'peru';

export class PyramidEnemy extends GroundEnemy {
    constructor(position, initialMapY, pyramidId, config = {}) {
        super(
            `pyramid_${pyramidId}`, // id
            "ground", // type
            position,
            config.hp || PYRAMID_HP,
            config.score || PYRAMID_SCORE,
            config.width || PYRAMID_WIDTH,
            config.height || PYRAMID_HEIGHT,
            initialMapY
        );
        this.pyramidId = pyramidId; // e.g., "left", "middle", "right"
        this.gameManager = null; // Will be set to allow calling gameManager.pyramidDestroyed
        this.justDestroyed = false; // Flag to signal destruction in the current frame
    }

    // Override update to store gameManager if passed
    update(currentScrollPos, gameManagerInstance) {
        super.update(currentScrollPos);
        if (gameManagerInstance && !this.gameManager) {
            this.gameManager = gameManagerInstance;
        }

        // If this pyramid was just destroyed, signal it to gameManager
        // This check is done here to ensure gameManager reference is available.
        // A more robust solution might be an event bus or callback.
        if (this.justDestroyed && this.gameManager) {
            this.gameManager.pyramidDestroyed(this.pyramidId);
            this.justDestroyed = false; // Reset flag to prevent multiple calls
        }
    }

    onHit() {
        if (this.isDestroyed) return; // Already destroyed

        this.hp--;
        if (this.hp <= 0) {
            this.isDestroyed = true;
            this.justDestroyed = true; // Set flag for processing in update/main game loop
            console.log(`Pyramid ${this.pyramidId} destroyed.`);
            // gameManager.pyramidDestroyed(this.pyramidId) will be called from update or game.js loop
        }
    }

    draw(ctx) {
        if (this.isDestroyed) return;

        ctx.fillStyle = PYRAMID_COLOR;
        ctx.strokeStyle = PYRAMID_OUTLINE_COLOR;
        ctx.lineWidth = 2;

        ctx.beginPath();
        // Apex
        ctx.moveTo(this.position.x + this.width / 2, this.position.y);
        // Bottom left
        ctx.lineTo(this.position.x, this.position.y + this.height);
        // Bottom right
        ctx.lineTo(this.position.x + this.width, this.position.y + this.height);
        ctx.closePath();

        ctx.fill();
        ctx.stroke();

        // Optional: a small identifier or different color based on pyramidId for debugging
        // ctx.fillStyle = 'black';
        // ctx.font = '10px Arial';
        // ctx.textAlign = 'center';
        // ctx.fillText(this.pyramidId.charAt(0), this.position.x + this.width / 2, this.position.y + this.height * 0.7);
        // ctx.textAlign = 'left';
    }
}
