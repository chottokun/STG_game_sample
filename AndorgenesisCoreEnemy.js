import { GroundEnemy } from './Enemy.js'; // Assuming GroundEnemy is in Enemy.js

// Constants for AndorgenesisCoreEnemy
const CORE_DEFAULT_ID = "andorgenesis_core";
const CORE_HP = 75; // Example HP
const CORE_SCORE = 10000;
const CORE_WIDTH = 120;
const CORE_HEIGHT = 120;
const CORE_COLOR_BODY = 'darkslateblue';
const CORE_COLOR_EYE = 'crimson';
const CORE_ENTRY_ANIM_DURATION = 120; // 2 seconds at 60fps
const CORE_DEATH_ANIM_DURATION = 180; // 3 seconds

export class AndorgenesisCoreEnemy extends GroundEnemy {
    constructor(position, initialMapY, config = {}) {
        super(
            CORE_DEFAULT_ID,
            "ground", // type
            position,
            config.hp || CORE_HP,
            config.score || CORE_SCORE,
            CORE_WIDTH,
            CORE_HEIGHT,
            initialMapY
        );

        this.state = "entering"; // "entering", "active", "dying"
        this.entryAnimTimer = CORE_ENTRY_ANIM_DURATION;
        this.deathAnimTimer = CORE_DEATH_ANIM_DURATION;

        // Future: weakPoints, attackPatterns, attackTimer
        // For Phase 1, it's non-attacking.
    }

    update(currentScrollPos, playerPosition, canvas, gameManager) { // Added gameManager for bossDefeated call
        super.update(currentScrollPos); // Update Y position based on scrolling

        switch (this.state) {
            case "entering":
                this.entryAnimTimer--;
                if (this.entryAnimTimer <= 0) {
                    this.state = "active";
                    console.log("Andorgenesis Core is now active!");
                }
                break;
            case "active":
                // Non-attacking in this phase.
                // HP check is handled by onHit to transition to "dying"
                break;
            case "dying":
                this.deathAnimTimer--;
                if (this.deathAnimTimer <= 0) {
                    this.isDestroyed = true; // Mark for removal
                    if (gameManager) {
                        gameManager.bossDefeated(); // Notify GameManager
                    }
                }
                break;
        }
        // Note: Bullets array and logic would be here if it fired.
    }

    onHit() {
        if (this.state !== "active") return; // Can only be hit when active

        this.hp--;
        console.log(`Andorgenesis Core HP: ${this.hp}`);
        if (this.hp <= 0 && this.state !== "dying") {
            this.state = "dying";
            this.deathAnimTimer = CORE_DEATH_ANIM_DURATION; // Reset timer for death animation
            console.log("Andorgenesis Core is dying!");
            // Future: Trigger explosion sound/visuals manager
        }
    }

    draw(ctx) {
        // Base drawing, can be simple for now
        ctx.fillStyle = CORE_COLOR_BODY;
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);

        // Central "eye" or core element
        const eyeRadius = this.width / 4;
        ctx.fillStyle = (this.state === 'dying') ? 'grey' : CORE_COLOR_EYE; // Eye changes color when dying
        ctx.beginPath();
        ctx.arc(this.position.x + this.width / 2, this.position.y + this.height / 2, eyeRadius, 0, Math.PI * 2);
        ctx.fill();

        // HP Bar (simple version)
        if (this.state === 'active' || this.state === 'entering') {
            const hpBarWidth = this.width * 0.8;
            const hpBarHeight = 10;
            const currentHpWidth = hpBarWidth * (this.hp / (CORE_HP)); // Assumes CORE_HP is max HP

            ctx.fillStyle = 'grey';
            ctx.fillRect(this.position.x + (this.width - hpBarWidth)/2, this.position.y - hpBarHeight - 5, hpBarWidth, hpBarHeight);
            ctx.fillStyle = 'green';
            ctx.fillRect(this.position.x + (this.width - hpBarWidth)/2, this.position.y - hpBarHeight - 5, currentHpWidth, hpBarHeight);
        }

        // Dying animation placeholder: make it flash or shrink
        if (this.state === "dying") {
            const flash = Math.floor(this.deathAnimTimer / 10) % 2 === 0;
            if (flash) {
                ctx.fillStyle = `rgba(255, 255, 255, ${this.deathAnimTimer / CORE_DEATH_ANIM_DURATION * 0.5})`;
                ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
            }
            // Shrinking effect
            const scale = this.deathAnimTimer / CORE_DEATH_ANIM_DURATION;
            const scaledWidth = this.width * scale;
            const scaledHeight = this.height * scale;
            // Would need to adjust drawing position if scaling from center
        }
    }
}
