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
const CORE_COLOR_EYE_PHASE2 = 'orangered';
const INITIAL_ENTRY_ANIM_TIMER = 120;
const CORE_DEATH_ANIM_DURATION = 180;
const EXPLOSION_PARTICLE_COUNT = 20;

// Attack parameters
const CORE_ATTACK_COOLDOWN_PHASE1 = 120;
const CORE_ATTACK_COOLDOWN_PHASE2 = 80;
const CORE_BULLET_SPEED = 3.5;
const CORE_BULLET_WIDTH = 12;
const CORE_BULLET_HEIGHT = 12;
const CORE_BULLET_COLOR = 'magenta';
const SPREAD_ANGLE = Math.PI / 15;

const CORE_FAST_BULLET_SPEED = 5.0;
const CORE_FAST_BULLET_WIDTH = 10;
const CORE_FAST_BULLET_HEIGHT = 10;
const CORE_FAST_BULLET_COLOR = 'yellow';

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

        this.phase = 1;
        this.turretsDestroyedCount = 0;
        this.attackTimer = Math.random() * CORE_ATTACK_COOLDOWN_PHASE1;
        this.bullets = [];

        this.turrets = [];
        const turretOffsetX = CORE_WIDTH / 2 + 10;
        this.turrets.push(new AndorgenesisTurretEnemy(this, -turretOffsetX, 0, "turret_left", { hp: 20 }));
        this.turrets.push(new AndorgenesisTurretEnemy(this, turretOffsetX, 0, "turret_right", { hp: 20 }));
    }

    update(currentScrollPos, playerPosition, canvas, gameManager) {
        super.update(currentScrollPos);
        if (this.isDestroyed && this.state !== 'dying') return;

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
                        this.attackTimer = (this.phase === 1) ? CORE_ATTACK_COOLDOWN_PHASE1 : CORE_ATTACK_COOLDOWN_PHASE2;
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
            turret.update(playerPosition, canvas);
        }
    }

    turretDestroyed(turret) {
        console.log(`Boss notified: ${turret.id} destroyed.`);
        this.turretsDestroyedCount++;

        if (this.phase === 1 && this.turretsDestroyedCount >= this.turrets.length) {
            this.phase = 2;
            console.log("All turrets destroyed! Andorgenesis Core entering Phase 2!");
            this.attackTimer = CORE_ATTACK_COOLDOWN_PHASE2 / 2;
        }
    }

    fireBullet(playerPosition, canvas) {
        const bulletX = this.position.x + this.width / 2;
        const bulletY = this.position.y + this.height / 2;
        const centerAngle = Math.atan2(playerPosition.y - bulletY, playerPosition.x - bulletX);

        if (this.phase === 1) {
            this.bullets.push(new EnemyBullet(
                bulletX, bulletY,
                CORE_BULLET_WIDTH, CORE_BULLET_HEIGHT,
                CORE_BULLET_COLOR, CORE_BULLET_SPEED, centerAngle
            ));
        } else { // Phase 2: 3-way spread shot + one fast aimed shot
            const angles = [centerAngle - SPREAD_ANGLE, centerAngle, centerAngle + SPREAD_ANGLE];
            for (const angle of angles) {
                this.bullets.push(new EnemyBullet(
                    bulletX, bulletY,
                    CORE_BULLET_WIDTH, CORE_BULLET_HEIGHT,
                    CORE_BULLET_COLOR,
                    CORE_BULLET_SPEED,
                    angle
                ));
            }
            // Add the additional fast, aimed bullet
            this.bullets.push(new EnemyBullet(
                bulletX, bulletY,
                CORE_FAST_BULLET_WIDTH, CORE_FAST_BULLET_HEIGHT,
                CORE_FAST_BULLET_COLOR,
                CORE_FAST_BULLET_SPEED,
                centerAngle
            ));
        }
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
                if (!turret.isDestroyed) {
                    turret.startDyingWithBoss();
                }
            }
        }
        return oldHp > this.hp;
    }

    draw(ctx) {
        if (this.isDestroyed && this.state !== 'dying') return;

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
        let eyeColor = (this.phase === 2 && this.state === 'active') ? CORE_COLOR_EYE_PHASE2 : CORE_COLOR_EYE;
        if (this.state === 'dying') {
            eyeColor = (Math.floor(this.deathAnimTimer / 5) % 2 === 0) ? 'darkred' : 'black';
        }
        ctx.fillStyle = eyeColor;
        ctx.beginPath();
        ctx.arc(this.position.x + this.width / 2, this.position.y + this.height / 2, eyeRadius, 0, Math.PI * 2);
        ctx.fill();

        let hpBarOverallAlpha = 1.0;
        if (this.state === "entering") hpBarOverallAlpha = this.currentAlpha;
        else if (this.state === "dying") hpBarOverallAlpha = Math.max(0, (this.deathAnimTimer / CORE_DEATH_ANIM_DURATION));


        if ((this.state === 'active' || (this.state === 'entering' && this.currentAlpha > 0.1) || this.state === 'dying') && this.hp > 0) {
            const maxHpForBar = CORE_HP;
            const hpPercentage = Math.max(0, this.hp / maxHpForBar);
            const hpBarWidth = this.width * 0.8;
            const hpBarHeight = 10;
            const currentHpWidth = hpBarWidth * hpPercentage;

            ctx.fillStyle = `rgba(128, 128, 128, ${hpBarOverallAlpha * 0.7})`;
            ctx.fillRect(this.position.x + (this.width - hpBarWidth)/2, this.position.y - hpBarHeight - 5, hpBarWidth, hpBarHeight);
            ctx.fillStyle = `rgba(0, 255, 0, ${hpBarOverallAlpha})`;
            ctx.fillRect(this.position.x + (this.width - hpBarWidth)/2, this.position.y - hpBarHeight - 5, currentHpWidth, hpBarHeight);
        }

        ctx.restore();

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
             if (this.state === "dying") {
                 ctx.save();
                 ctx.globalAlpha = Math.max(0, (this.deathAnimTimer / CORE_DEATH_ANIM_DURATION));
                 turret.draw(ctx);
                 ctx.restore();
            } else {
                turret.draw(ctx);
            }
        }
    }
}
