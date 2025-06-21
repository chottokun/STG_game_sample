import { GroundEnemy } from './Enemy.js'; // Assuming GroundEnemy is in Enemy.js

// Constants for DomGramEnemy
const DOMGRAM_DEFAULT_ID = "domgram";
const DOMGRAM_DEFAULT_HP = 4;
const DOMGRAM_DEFAULT_SCORE = 1500; // High score as per requirement
const DOMGRAM_DEFAULT_WIDTH = 50;
const DOMGRAM_DEFAULT_HEIGHT = 40;
const DOMGRAM_COLOR_BASE = '#556B2F'; // Dark Olive Green
const DOMGRAM_COLOR_DETAIL = '#8FBC8F'; // Dark Sea Green

export class DomGramEnemy extends GroundEnemy {
    constructor(position, initialMapY, id = DOMGRAM_DEFAULT_ID, config = {}) {
        const hp = config.hp || DOMGRAM_DEFAULT_HP;
        const score = config.score || DOMGRAM_DEFAULT_SCORE;
        const width = config.width || DOMGRAM_DEFAULT_WIDTH;
        const height = config.height || DOMGRAM_DEFAULT_HEIGHT;

        super(
            id,
            "ground", // type
            position,
            hp,
            score,
            width,
            height,
            initialMapY
        );
        // Dom-Gram is stationary and non-attacking, so no specific movement or attack properties needed here.
    }

    // update(currentScrollPos) method is inherited from GroundEnemy and is sufficient.
    // onHit() method is inherited from base Enemy, which is:
    //   this.hp--;
    //   if (this.hp <= 0) { this.destroy(); }
    // This is also sufficient.

    draw(ctx) {
        if (this.isDestroyed) return;

        // Main blocky base
        ctx.fillStyle = DOMGRAM_COLOR_BASE;
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);

        // Detail (e.g., a smaller block or dome on top)
        const detailHeight = this.height / 3;
        const detailWidth = this.width * 0.6;
        ctx.fillStyle = DOMGRAM_COLOR_DETAIL;
        ctx.fillRect(
            this.position.x + (this.width - detailWidth) / 2,
            this.position.y - detailHeight + (this.height * 0.1), // Slight overlap or just on top
            detailWidth,
            detailHeight
        );

        // Outline for definition
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.position.x, this.position.y, this.width, this.height);
        ctx.strokeRect(
            this.position.x + (this.width - detailWidth) / 2,
            this.position.y - detailHeight + (this.height * 0.1),
            detailWidth,
            detailHeight
        );

        // Display HP (optional, if not relying on base Enemy.draw)
        if (this.hp > 0) { // Only draw HP if not destroyed
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            const hpTextY = this.position.y < 20 ? this.position.y + this.height + 15 : this.position.y - 5;
            ctx.fillText(`HP: ${this.hp}`, this.position.x + this.width / 2, hpTextY);
            ctx.textAlign = 'left'; // Reset alignment
        }
    }
}
