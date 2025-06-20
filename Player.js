// Constants
const PLAYER_INITIAL_X_FACTOR = 0.5;
const PLAYER_INITIAL_Y_OFFSET = 50;
const PLAYER_SPEED = 5;
const PLAYER_WIDTH = 30;
const PLAYER_HEIGHT = 30;

const ZAPPER_COOLDOWN_FRAMES = 10;
const MAX_ZAPPERS_ON_SCREEN = 3;
const ZAPPER_HEIGHT_FOR_OFFSET = 10;
const ZAPPER_SPAWN_OFFSET_Y = 10;

const BLASTER_SIGHT_Y_OFFSET = 100;
const BLASTER_BOMB_TIME_TO_IMPACT = 30;
const BLASTER_BOMB_EXPLOSION_RADIUS = 32;
const BLASTER_BOMB_EXPLOSION_DURATION = 15;
const BLASTER_SIGHT_SIZE = 12;
const BLASTER_SIGHT_DOT_RADIUS = 2;
const BLASTER_SIGHT_COLLISION_WIDTH = 10;
const BLASTER_SIGHT_COLLISION_HEIGHT = 10;
const BLINK_INTERVAL_FRAMES = 2;

const INVINCIBILITY_DURATION_FRAMES = 180;
const RESPAWN_DELAY_FRAMES = 60;

const FALLING_BOMB_RADIUS = 7;


export class Player {
    constructor(canvas, gameManager) {
        this.canvas = canvas;
        this.gameManager = gameManager;
        this.poolManager = gameManager.poolManager;
        this.soundManager = gameManager.soundManager;

        this.initialX = canvas.width * PLAYER_INITIAL_X_FACTOR;
        this.initialY = canvas.height - PLAYER_INITIAL_Y_OFFSET;

        this.position = { x: this.initialX, y: this.initialY };
        this.speed = PLAYER_SPEED;
        this.zapperCooldown = ZAPPER_COOLDOWN_FRAMES;
        this.zapperTimer = 0;
        this.zappersOnScreen = [];
        this.maxZappers = MAX_ZAPPERS_ON_SCREEN;
        this.blasterSightPosition = {
            x: this.position.x,
            y: this.position.y - BLASTER_SIGHT_Y_OFFSET
        };
        this.blasterBombs = [];
        this.width = PLAYER_WIDTH;
        this.height = PLAYER_HEIGHT;

        this.blasterSightTargetingGroundEnemy = false;
        this.blasterSightBlinkTimer = 0;
        this.blasterSightBlinkColor = 'white';

        this.blasterKeyHeld = false;

        this.isActive = true;
        this.isInvincible = false;
        this.invincibilityTimer = 0;
        this.respawnTimer = 0;
    }

    reset() {
        this.position = { x: this.initialX, y: this.initialY };
        this.zapperTimer = 0;

        for (const zapper of this.zappersOnScreen) {
            if (zapper.isActiveInPool) {
                this.poolManager.returnObject(zapper, 'zapperBullet');
            }
        }
        this.zappersOnScreen.length = 0;
        this.blasterBombs.length = 0;
        this.blasterSightTargetingGroundEnemy = false;
        this.blasterSightBlinkTimer = 0;
        this.blasterSightBlinkColor = 'white';
        this.blasterKeyHeld = false;

        this.isActive = true;
        this.isInvincible = false;
        this.invincibilityTimer = 0;
        this.respawnTimer = 0;
    }

    onHit() {
        this.isActive = false;
        this.respawnTimer = RESPAWN_DELAY_FRAMES;
    }

    startRespawnSequence() {
        this.isActive = true;
        this.isInvincible = true;
        this.invincibilityTimer = INVINCIBILITY_DURATION_FRAMES;
        this.position = { x: this.initialX, y: this.initialY };
    }

    toggleInvincibilityDebug() {
        this.isInvincible = !this.isInvincible;
        if (this.isInvincible) {
            this.invincibilityTimer = 999999; // A very large number for "infinite" debug invincibility
            this.isActive = true; // Ensure player is active if becoming invincible this way
            this.respawnTimer = 0; // Stop any respawn countdown
            console.log("Player Invincibility: ON (Debug)");
        } else {
            this.invincibilityTimer = 0; // Turn off immediately
            console.log("Player Invincibility: OFF (Debug)");
        }
    }

    update(inputManager, enemies = []) {
        if (!this.isActive && this.respawnTimer > 0) {
            this.respawnTimer--;
            if (this.respawnTimer <= 0) {
                this.startRespawnSequence();
            }
            return;
        }
        if (!this.isActive) return;

        if (this.isInvincible) {
            // Only decrement timer if it's not the debug "infinite" value
            if (this.invincibilityTimer < 999990) {
                this.invincibilityTimer--;
            }
            // Normal invincibility wears off; debug invincibility only by toggle.
            if (this.invincibilityTimer <= 0 && this.invincibilityTimer > -1) {
                this.isInvincible = false;
            }
        }


        const touchTargetPos = inputManager.getTouchPlayerTargetPosition();
        let keyboardMovementActive =
            inputManager.isActionActive('moveUp') ||
            inputManager.isActionActive('moveDown') ||
            inputManager.isActionActive('moveLeft') ||
            inputManager.isActionActive('moveRight');

        if (touchTargetPos) {
            this.position.x = touchTargetPos.x;
            this.position.y = touchTargetPos.y;
            keyboardMovementActive = false;
        }

        if (keyboardMovementActive) {
            if (inputManager.isActionActive('moveUp')) this.position.y -= this.speed;
            if (inputManager.isActionActive('moveDown')) this.position.y += this.speed;
            if (inputManager.isActionActive('moveLeft')) this.position.x -= this.speed;
            if (inputManager.isActionActive('moveRight')) this.position.x += this.speed;
        }

        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        this.position.x = Math.max(halfWidth, Math.min(this.canvas.width - halfWidth, this.position.x));
        this.position.y = Math.max(halfHeight, Math.min(this.canvas.height - halfHeight, this.position.y));

        if (this.zapperTimer > 0) this.zapperTimer--;

        if (inputManager.isActionActive('fireZapper') || inputManager.shouldAutoFireZapper()) {
            if (this.zapperTimer === 0) {
                this.shootZapper();
                this.zapperTimer = this.zapperCooldown;
            }
        }

        if (inputManager.isActionActive('fireBlaster')) {
            this.blasterKeyHeld = true;
        } else {
            if (this.blasterKeyHeld) {
                this.dropBlaster();
                this.blasterKeyHeld = false;
            }
        }

        const blasterDropData = inputManager.getBlasterDropCoordinates();
        if (blasterDropData !== undefined) {
            this.blasterSightPosition.x = blasterDropData.x;
            this.dropBlaster();
        }

        if (blasterDropData === undefined) {
             this.blasterSightPosition.x = this.position.x;
        }
        this.blasterSightPosition.y = Math.max(0, this.position.y - BLASTER_SIGHT_Y_OFFSET);

        this.blasterSightTargetingGroundEnemy = false;
        const sightRectX = this.blasterSightPosition.x - BLASTER_SIGHT_COLLISION_WIDTH / 2;
        const sightRectY = this.blasterSightPosition.y - BLASTER_SIGHT_COLLISION_HEIGHT / 2;
        for (const enemy of enemies) {
            if (enemy.type === "ground" && !enemy.isDestroyed) {
                if (sightRectX < enemy.position.x + enemy.width &&
                    sightRectX + BLASTER_SIGHT_COLLISION_WIDTH > enemy.position.x &&
                    sightRectY < enemy.position.y + enemy.height &&
                    sightRectY + BLASTER_SIGHT_COLLISION_HEIGHT > enemy.position.y) {
                    this.blasterSightTargetingGroundEnemy = true;
                    break;
                }
            }
        }
        if (this.blasterSightTargetingGroundEnemy) {
            this.blasterSightBlinkTimer++;
            if (this.blasterSightBlinkTimer % (BLINK_INTERVAL_FRAMES * 2) < BLINK_INTERVAL_FRAMES) {
                 this.blasterSightBlinkColor = 'white';
            } else {
                 this.blasterSightBlinkColor = 'red';
            }
        } else {
            this.blasterSightBlinkTimer = 0;
            this.blasterSightBlinkColor = 'white';
        }

        for (let i = this.zappersOnScreen.length - 1; i >= 0; i--) {
            const zapper = this.zappersOnScreen[i];
            zapper.update();
            if (zapper.isOffscreen(this.canvas.height) || !zapper.isActiveInPool) {
                this.poolManager.returnObject(zapper, 'zapperBullet');
                this.zappersOnScreen.splice(i, 1);
            }
        }

        for (let i = this.blasterBombs.length - 1; i >= 0; i--) {
            const bomb = this.blasterBombs[i];
            if (bomb.explosionTimer > 0) {
                bomb.explosionTimer--;
                if (bomb.explosionTimer === 0) this.blasterBombs.splice(i, 1);
            } else {
                bomb.timeToImpact--;
                if (bomb.timeToImpact <= 0) {
                    bomb.explosionTimer = bomb.explosionDuration;
                    if (!bomb.hasExplodedSoundPlayed && this.soundManager) {
                        this.soundManager.playSound('blasterExplosion', 0.6);
                        bomb.hasExplodedSoundPlayed = true;
                    }
                }
            }
        }
    }

    shootZapper() {
        if (this.zappersOnScreen.length < this.maxZappers) {
            const zapper = this.poolManager.getObject('zapperBullet');
            if (zapper) {
                const spawnX = this.position.x;
                const spawnY = this.position.y - (this.height / 2) - (ZAPPER_HEIGHT_FOR_OFFSET / 2) + ZAPPER_SPAWN_OFFSET_Y;
                zapper.init(spawnX, spawnY);
                this.zappersOnScreen.push(zapper);
                if (this.soundManager) {
                    this.soundManager.playSound('zapper', 0.3);
                }
            }
        }
    }

    dropBlaster() {
        if (this.soundManager) {
            this.soundManager.playSound('blasterFire', 0.5);
        }
        const newBomb = {
            x: this.blasterSightPosition.x,
            y: this.blasterSightPosition.y,
            timeToImpact: BLASTER_BOMB_TIME_TO_IMPACT,
            explosionRadius: BLASTER_BOMB_EXPLOSION_RADIUS,
            explosionTimer: 0,
            explosionDuration: BLASTER_BOMB_EXPLOSION_DURATION,
            color: 'grey',
            hasExplodedSoundPlayed: false
        };
        this.blasterBombs.push(newBomb);
    }

    draw(ctx) {
        if (!this.isActive) return;
        ctx.save();
        if (this.isInvincible) {
            const flashAlternate = (this.invincibilityTimer < 999990) ?
                                   (Math.floor(this.invincibilityTimer / 6) % 2 === 0) :
                                   (Math.floor(Date.now() / 100) % 2 === 0); // Continuous flash for debug
            if (flashAlternate) {
                ctx.globalAlpha = 0.6;
            } else {
                ctx.globalAlpha = 1.0;
            }
        }

        ctx.fillStyle = 'dodgerblue';
        ctx.beginPath();
        ctx.moveTo(this.position.x, this.position.y - this.height / 2);
        ctx.lineTo(this.position.x - this.width / 2, this.position.y + this.height / 2);
        ctx.lineTo(this.position.x + this.width / 2, this.position.y + this.height / 2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'skyblue';
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.width / 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        ctx.strokeStyle = this.blasterSightBlinkColor;
        ctx.fillStyle = this.blasterSightBlinkColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.blasterSightPosition.x - BLASTER_SIGHT_SIZE / 2, this.blasterSightPosition.y);
        ctx.lineTo(this.blasterSightPosition.x + BLASTER_SIGHT_SIZE / 2, this.blasterSightPosition.y);
        ctx.moveTo(this.blasterSightPosition.x, this.blasterSightPosition.y - BLASTER_SIGHT_SIZE / 2);
        ctx.lineTo(this.blasterSightPosition.x, this.blasterSightPosition.y + BLASTER_SIGHT_SIZE / 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(this.blasterSightPosition.x, this.blasterSightPosition.y, BLASTER_SIGHT_DOT_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        for (const zapper of this.zappersOnScreen) {
            if (zapper.isActiveInPool) {
                zapper.draw(ctx);
            }
        }
        for (const bomb of this.blasterBombs) {
            if (bomb.explosionTimer > 0) {
                const currentRadius = bomb.explosionRadius * (1 - (bomb.explosionTimer / bomb.explosionDuration));
                ctx.fillStyle = `rgba(255, ${100 + (bomb.explosionTimer/bomb.explosionDuration)*100}, 0, 0.7)`;
                ctx.beginPath();
                ctx.arc(bomb.x, bomb.y, currentRadius, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = 'dimgray';
                ctx.beginPath();
                ctx.arc(bomb.x, bomb.y, FALLING_BOMB_RADIUS, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(bomb.x, bomb.y - (FALLING_BOMB_RADIUS - 2));
                ctx.lineTo(bomb.x + 2, bomb.y - (FALLING_BOMB_RADIUS + 2));
                ctx.stroke();
            }
        }
    }
}
