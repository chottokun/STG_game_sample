import { GroundEnemy } from './Enemy.js';
import { EnemyBullet } from './Bullet.js';
import { AndorgenesisTurretEnemy } from './AndorgenesisTurretEnemy.js';

// Constants for AndorgenesisCoreEnemy
const CORE_DEFAULT_ID = "andorgenesis_core";
const CORE_HP = 75;
const CORE_SCORE = 10000;
const CORE_WIDTH = 120;
const CORE_HEIGHT = 120;
const CORE_COLOR_BODY = 'darkslateblue';
const CORE_COLOR_EYE = 'crimson';
const INITIAL_ENTRY_ANIM_TIMER = 120;
const CORE_DEATH_ANIM_DURATION = 180;
const EXPLOSION_PARTICLE_COUNT = 20;

// Attack parameters
const CORE_ATTACK_COOLDOWN = 120;
const CORE_BULLET_SPEED = 3.5;
const CORE_BULLET_WIDTH = 12;
const CORE_BULLET_HEIGHT = 12;
const CORE_BULLET_COLOR = 'magenta';

export class AndorgenesisCoreEnemy extends GroundEnemy {
    constructor(position, initialMapY, config = {}) {
        super(
            CORE_DEFAULT_ID,
            "ground",
            position,
            config.hp || CORE_HP,
            config.score || CORE_SCORE,
            CORE_WIDTH,
            CORE_HEIGHT,
            initialMapY
        );

        this.state = "entering";
        this.entryAnimTimer = INITIAL_ENTRY_ANIM_TIMER;
        this.currentAlpha = 0;
        this.deathAnimTimer = CORE_DEATH_ANIM_DURATION;
        this.explosionParticles = [];

        this.attackTimer = Math.random() * CORE_ATTACK_COOLDOWN;
        this.bullets = [];

        this.turrets = [];
        const turretOffsetX = CORE_WIDTH / 2 + 10;
        this.turrets.push(new AndorgenesisTurretEnemy(this, -turretOffsetX, 0, "turret_left", { hp: 20 }));
        this.turrets.push(new AndorgenesisTurretEnemy(this, turretOffsetX, 0, "turret_right", { hp: 20 }));
    }

    update(currentScrollPos, playerPosition, canvas, gameManager) {
        super.update(currentScrollPos);
        if (this.isDestroyed) return; // Already fully destroyed, no updates.

        switch (this.state) {
            case "entering":
                this.entryAnimTimer--;
                this.currentAlpha = 1.0 - (this.entryAnimTimer / INITIAL_ENTRY_ANIM_TIMER);
                if (this.entryAnimTimer <= 0) {
                    this.state = "active";
                    this.currentAlpha = 1.0;
                    console.log("Andorgenesis Core is now active!");
                }
                break;
            case "active":
                if (playerPosition) {
                    this.attackTimer--;
                    if (this.attackTimer <= 0) {
                        this.fireBullet(playerPosition, canvas);
                        this.attackTimer = CORE_ATTACK_COOLDOWN;
                    }
                }
                break;
            case "dying":
                this.bullets = [];
                this.deathAnimTimer--;
                if (this.explosionParticles.length === 0 && this.deathAnimTimer > 0) {
                    for (let i = 0; i < EXPLOSION_PARTICLE_COUNT; i++) {
                        this.explosionParticles.push({
                            x: this.position.x + this.width / 2 + (Math.random() - 0.5) * this.width * 0.5,
                            y: this.position.y + this.height / 2 + (Math.random() - 0.5) * this.height * 0.5,
                            size: Math.random() * 15 + 5,
                            speedX: (Math.random() - 0.5) * 4,
                            speedY: (Math.random() - 0.5) * 4,
                            alpha: 1.0,
                            decay: 0.01 + Math.random() * 0.01
                        });
                    }
                }
                this.explosionParticles.forEach(p => {
                    p.x += p.speedX;
                    p.y += p.speedY;
                    p.alpha -= p.decay;
                });
                this.explosionParticles = this.explosionParticles.filter(p => p.alpha > 0);
                if (this.deathAnimTimer <= 0) {
                    this.isDestroyed = true;
                    if (gameManager) {
                        gameManager.bossDefeated();
                    }
                }
                break;
        }

        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update();
            if (canvas && bullet.isOffscreen(canvas.width, canvas.height)) {
                this.bullets.splice(i, 1);
            }
        }
        for (const turret of this.turrets) {
             // Turret update logic now checks boss state internally
            turret.update(playerPosition, canvas);
        }
    }

    turretDestroyed(turret) {
        console.log(`Boss notified: ${turret.id} destroyed.`);
        const allTurretsDestroyed = this.turrets.every(t => t.isDestroyed);
        if (allTurretsDestroyed) {
            console.log("All Andorgenesis turrets destroyed!");
        }
    }

    fireBullet(playerPosition, canvas) {
        const bulletX = this.position.x + this.width / 2;
        const bulletY = this.position.y + this.height / 2;
        const angle = Math.atan2(playerPosition.y - bulletY, playerPosition.x - bulletX);
        this.bullets.push(new EnemyBullet(
            bulletX, bulletY,
            CORE_BULLET_WIDTH, CORE_BULLET_HEIGHT,
            CORE_BULLET_COLOR, CORE_BULLET_SPEED, angle
        ));
    }

    onHit() {
        if (this.state !== "active" || this.isDestroyed) return false;

        const oldHp = this.hp;
        this.hp--;

        if (this.hp <= 0 && oldHp > 0 && this.state !== "dying") {
            this.state = "dying";
            this.deathAnimTimer = CORE_DEATH_ANIM_DURATION;
            this.explosionParticles = [];
            console.log("Andorgenesis Core is dying!");
            for (const turret of this.turrets) {
                if (!turret.isDestroyed) { // Check if not already destroyed
                    turret.startDyingWithBoss();
                }
            }
        }
        return oldHp > this.hp;
    }

    draw(ctx) {
        if (this.isDestroyed && this.state !== 'dying') return; // Don't draw if fully destroyed and not in death anim

        ctx.save();

        if (this.state === "entering") {
            ctx.globalAlpha = this.currentAlpha;
        } else if (this.state === "dying") {
            if (Math.floor(this.deathAnimTimer / 8) % 2 === 0) {
                ctx.globalAlpha = 0.5 + (this.deathAnimTimer / CORE_DEATH_ANIM_DURATION) * 0.5;
            } else {
                ctx.globalAlpha = 0.2 + (this.deathAnimTimer / CORE_DEATH_ANIM_DURATION) * 0.3;
            }
        } else {
            ctx.globalAlpha = 1.0;
        }

        ctx.fillStyle = CORE_COLOR_BODY;
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);

        const eyeRadius = this.width / 4;
        ctx.fillStyle = (this.state === 'dying' && Math.floor(this.deathAnimTimer / 5) % 2 === 0) ? 'darkred' : CORE_COLOR_EYE;
        ctx.beginPath();
        ctx.arc(this.position.x + this.width / 2, this.position.y + this.height / 2, eyeRadius, 0, Math.PI * 2);
        ctx.fill();

        const currentEffectAlpha = (this.state === "entering") ? this.currentAlpha : 1.0;
        if (this.state === 'active' || (this.state === 'entering' && this.currentAlpha > 0.1)) {
            const hpPercentage = Math.max(0, this.hp / CORE_HP);
            const hpBarWidth = this.width * 0.8;
            const hpBarHeight = 10;
            const currentHpWidth = hpBarWidth * hpPercentage;
            ctx.fillStyle = `rgba(128, 128, 128, ${currentEffectAlpha * 0.7})`;
            ctx.fillRect(this.position.x + (this.width - hpBarWidth)/2, this.position.y - hpBarHeight - 5, hpBarWidth, hpBarHeight);
            ctx.fillStyle = `rgba(0, 255, 0, ${currentEffectAlpha})`;
            ctx.fillRect(this.position.x + (this.width - hpBarWidth)/2, this.position.y - hpBarHeight - 5, currentHpWidth, hpBarHeight);
        }

        ctx.restore(); // Restore global alpha for subsequent drawings (turrets, bullets)

        if (this.state === "dying") {
            this.explosionParticles.forEach(p => {
                ctx.fillStyle = `rgba(255, ${Math.random()*155 + 100}, 0, ${p.alpha})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        for (const bullet of this.bullets) {
            bullet.draw(ctx);
        }
        for (const turret of this.turrets) {
            // Turrets manage their own visibility when boss is dying via startDyingWithBoss
            // Or if core's main draw method applies an alpha, that might affect them too.
            // For now, turrets draw themselves if not independently destroyed or boss isn't making them fade.
             if (this.state === "dying") {
                 ctx.save();
                 // Turrets fade with boss, ensure alpha doesn't go negative
                 ctx.globalAlpha = Math.max(0, (this.deathAnimTimer / CORE_DEATH_ANIM_DURATION) * this.currentAlpha);
                 turret.draw(ctx);
                 ctx.restore();
            } else {
                turret.draw(ctx);
            }
        }
    }
}
