import { Enemy } from './Enemy.js';
import { EnemyBullet } from './Bullet.js';

// Constants for AndorgenesisTurretEnemy
const TURRET_HP = 15;
const TURRET_SCORE = 500;
const TURRET_WIDTH = 30;
const TURRET_HEIGHT = 30;
const TURRET_COLOR_ACTIVE = 'slategray';
const TURRET_COLOR_DESTROYED = 'darkgrey';
const TURRET_BARREL_COLOR = 'grey';
const TURRET_BARREL_WIDTH = 8;
const TURRET_BARREL_LENGTH = 20;

const TURRET_ATTACK_COOLDOWN = 90;
const TURRET_BULLET_SPEED = 3.0;
const TURRET_BULLET_WIDTH = 6;
const TURRET_BULLET_HEIGHT = 6;
const TURRET_BULLET_COLOR = 'lightcoral';

export class AndorgenesisTurretEnemy extends Enemy {
    constructor(boss, offsetX, offsetY, id, config = {}) {
        const initialAbsX = boss.position.x + (boss.width / 2) + offsetX - ( (config.width || TURRET_WIDTH) / 2);
        const initialAbsY = boss.position.y + (boss.height / 2) + offsetY - ( (config.height || TURRET_HEIGHT) / 2);

        super(
            id,
            "boss_component",
            { x: initialAbsX, y: initialAbsY },
            config.hp || TURRET_HP,
            config.score || TURRET_SCORE,
            config.width || TURRET_WIDTH,
            config.height || TURRET_HEIGHT
        );

        this.boss = boss;
        this.offsetX = offsetX;
        this.offsetY = offsetY;

        this.attackTimer = Math.random() * (config.attackCooldown || TURRET_ATTACK_COOLDOWN);
        this.turretAttackCooldown = config.attackCooldown || TURRET_ATTACK_COOLDOWN;
        this.bullets = [];
        this.barrelAngle = 0;
        this.isDyingWithBoss = false;
    }

    startDyingWithBoss() {
        this.isDyingWithBoss = true;
        this.isDestroyed = true;
        this.bullets = [];
        console.log(`${this.id} is now dying with the boss.`);
    }

    update(playerPosition, canvas) {
        if (this.isDyingWithBoss) {
            return;
        }

        if (!this.boss || this.boss.isDestroyed || this.boss.state === 'dying') {
            if (!this.isDestroyed && !this.isDyingWithBoss) {
                this.startDyingWithBoss();
            }
            return;
        }

        this.position.x = this.boss.position.x + (this.boss.width / 2) + this.offsetX - (this.width / 2);
        this.position.y = this.boss.position.y + (this.boss.height / 2) + this.offsetY - (this.height / 2);

        if (!this.isDestroyed) {
            if (playerPosition) {
                const dx = playerPosition.x - (this.position.x + this.width / 2);
                const dy = playerPosition.y - (this.position.y + this.height / 2);
                this.barrelAngle = Math.atan2(dy, dx);
            } else {
                this.barrelAngle = -Math.PI / 2;
            }
            this.attackTimer--;
            if (this.attackTimer <= 0) {
                this.fireBullet();
                this.attackTimer = this.turretAttackCooldown;
            }
        }

        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update();
            if (canvas && bullet.isOffscreen(canvas.width, canvas.height)) {
                this.bullets.splice(i, 1);
            }
        }
    }

    fireBullet() {
        const bulletX = this.position.x + this.width / 2 + Math.cos(this.barrelAngle) * (TURRET_BARREL_LENGTH / 2);
        const bulletY = this.position.y + this.height / 2 + Math.sin(this.barrelAngle) * (TURRET_BARREL_LENGTH / 2);

        this.bullets.push(new EnemyBullet(
            bulletX, bulletY,
            TURRET_BULLET_WIDTH, TURRET_BULLET_HEIGHT,
            TURRET_BULLET_COLOR, TURRET_BULLET_SPEED, this.barrelAngle
        ));
    }

    onHit() {
        if (this.isDestroyed) return false;

        const oldHp = this.hp;
        this.hp--;
        if (this.hp <= 0) {
            this.isDestroyed = true; // Mark as destroyed
        }

        if (this.isDestroyed && !this.isDyingWithBoss) {
            console.log(`${this.id} destroyed independently!`);
            this.boss.turretDestroyed(this);
        }
        return oldHp > this.hp;
    }

    draw(ctx) {
        if (this.isDestroyed && !this.isDyingWithBoss) return; // Don't draw if independently destroyed

        const centerX = this.position.x + this.width / 2;
        const centerY = this.position.y + this.height / 2;
        let activeColor = TURRET_COLOR_ACTIVE;
        let barrelColor = TURRET_BARREL_COLOR;

        if (this.isDyingWithBoss) {
            activeColor = TURRET_COLOR_DESTROYED; // Use destroyed color when dying with boss
            barrelColor = 'darkred';
            // Simple flash effect when dying with boss
            if (Math.floor(Date.now() / 150) % 2 === 0) {
                return; // Skip drawing some frames to make it "glitch" or appear damaged
            }
        } else if (this.isDestroyed) { // Independently destroyed (should not happen if isDyingWithBoss is also true)
             activeColor = TURRET_COLOR_DESTROYED;
             barrelColor = 'darkgrey'; // Non-functional barrel
        }

        // Draw turret base
        ctx.fillStyle = activeColor;
        ctx.beginPath();
        ctx.arc(centerX, centerY, this.width / 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw turret barrel (only if not fully destroyed independently and not "glitching" out)
        if (!this.isDestroyed || this.isDyingWithBoss) {
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(this.barrelAngle);
            ctx.fillStyle = barrelColor;
            ctx.fillRect(0, -TURRET_BARREL_WIDTH / 2, TURRET_BARREL_LENGTH, TURRET_BARREL_WIDTH);
            ctx.restore();
        }

        if (this.isDestroyed && !this.isDyingWithBoss) { // Draw explicit destroyed state if independently destroyed
             ctx.strokeStyle = 'black';
             ctx.lineWidth = 2;
             ctx.beginPath();
             ctx.moveTo(this.position.x, this.position.y);
             ctx.lineTo(this.position.x + this.width, this.position.y + this.height);
             ctx.moveTo(this.position.x + this.width, this.position.y);
             ctx.lineTo(this.position.x, this.position.y + this.height);
             ctx.stroke();
        }

        if (!this.isDestroyed && !this.isDyingWithBoss) {
            for (const bullet of this.bullets) {
                bullet.draw(ctx);
            }
        }
    }
}
