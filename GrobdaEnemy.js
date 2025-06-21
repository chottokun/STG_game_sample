import { GroundEnemy } from './Enemy.js';
import { EnemyBullet } from './Bullet.js';

// Constants for GrobdaEnemy
const GROBDA_DEFAULT_ID = "grobda";
const GROBDA_DEFAULT_HP = 4;
const GROBDA_DEFAULT_SCORE = 400;
const GROBDA_DEFAULT_WIDTH = 40;
const GROBDA_DEFAULT_HEIGHT = 30; // Chassis height
const GROBDA_COLOR_CHASSIS = 'darkolivegreen';
const GROBDA_COLOR_TURRET = 'dimgray';
const GROBDA_TURRET_WIDTH = 12;
const GROBDA_TURRET_LENGTH = 20;

const GROBDA_MOVEMENT_SPEED = 0.75; // Horizontal patrol speed
const GROBDA_DEFAULT_PATROL_DISTANCE = 50; // Max distance to patrol left/right from initial X
const GROBDA_DETECTION_RANGE = 250; // Range to detect player and stop/fire
const GROBDA_FIRE_COOLDOWN = 100; // Frames
const GROBDA_BULLET_SPEED = 3.0;
const GROBDA_BULLET_WIDTH = 7;
const GROBDA_BULLET_HEIGHT = 7;
const GROBDA_BULLET_COLOR = 'coral';

export class GrobdaEnemy extends GroundEnemy {
    constructor(position, initialMapY, id = GROBDA_DEFAULT_ID, config = {}) {
        const hp = config.hp || GROBDA_DEFAULT_HP;
        const score = config.score || GROBDA_DEFAULT_SCORE;
        const width = config.width || GROBDA_DEFAULT_WIDTH;
        const height = config.height || GROBDA_DEFAULT_HEIGHT;

        super(id, "ground", position, hp, score, width, height, initialMapY);

        this.initialSpawnX = position.x; // Store original X to patrol around
        this.movementSpeed = config.movementSpeed || GROBDA_MOVEMENT_SPEED;
        this.patrolDistance = config.patrolDistance || GROBDA_DEFAULT_PATROL_DISTANCE;
        this.patrolDirection = 1; // 1 for right, -1 for left

        this.detectionRange = config.detectionRange || GROBDA_DETECTION_RANGE;
        this.isStopped = false;

        this.fireCooldown = config.fireCooldown || GROBDA_FIRE_COOLDOWN;
        this.fireTimer = Math.random() * this.fireCooldown; // Initial random delay
        this.bullets = [];
        this.turretAngle = -Math.PI / 2; // Default: turret points up or forward from sprite view
    }

    update(currentScrollPos, player, canvas) { // player is Player object for position
        super.update(currentScrollPos); // Update Y position based on scrolling
        if (this.isDestroyed) return;

        let playerDetected = false;
        if (player && player.position) {
            const dx = player.position.x - (this.position.x + this.width / 2);
            const dy = player.position.y - (this.position.y + this.height / 2);
            const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);

            // Player is in range and somewhat in front or at same level (not too far behind)
            if (distanceToPlayer < this.detectionRange && player.position.y <= this.position.y + this.height + 20) {
                playerDetected = true;
            }
        }

        if (playerDetected) {
            this.isStopped = true;
            // Aim turret
            const dxPlayer = player.position.x - (this.position.x + this.width / 2);
            const dyPlayer = player.position.y - (this.position.y + this.height / 2);
            this.turretAngle = Math.atan2(dyPlayer, dxPlayer);

            this.fireTimer--;
            if (this.fireTimer <= 0) {
                this.fireBullet();
                this.fireTimer = this.fireCooldown;
            }
        } else {
            this.isStopped = false;
            // Default turret angle when not firing (e.g., forward)
            // this.turretAngle = (this.patrolDirection === 1) ? 0 : Math.PI; // Or keep last angle
        }

        if (!this.isStopped) {
            this.position.x += this.movementSpeed * this.patrolDirection;
            // Check patrol bounds
            if (this.patrolDirection === 1 && this.position.x >= this.initialSpawnX + this.patrolDistance) {
                this.position.x = this.initialSpawnX + this.patrolDistance;
                this.patrolDirection = -1;
            } else if (this.patrolDirection === -1 && this.position.x <= this.initialSpawnX - this.patrolDistance) {
                this.position.x = this.initialSpawnX - this.patrolDistance;
                this.patrolDirection = 1;
            }
        }

        // Update bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update();
            if (canvas && bullet.isOffscreen(canvas.width, canvas.height)) {
                this.bullets.splice(i, 1);
            }
        }
    }

    fireBullet() {
        // Fire from turret tip
        const turretCenterX = this.position.x + this.width / 2;
        const turretCenterY = this.position.y + this.height / 2; // Assuming turret is centered on chassis

        const bulletStartX = turretCenterX + Math.cos(this.turretAngle) * (GROBDA_TURRET_LENGTH / 2);
        const bulletStartY = turretCenterY + Math.sin(this.turretAngle) * (GROBDA_TURRET_LENGTH / 2);

        this.bullets.push(new EnemyBullet(
            bulletStartX, bulletStartY,
            GROBDA_BULLET_WIDTH, GROBDA_BULLET_HEIGHT,
            GROBDA_BULLET_COLOR, GROBDA_BULLET_SPEED, this.turretAngle
        ));
    }

    // onHit() is inherited from base Enemy class.

    draw(ctx) {
        if (this.isDestroyed) return;

        const chassisX = this.position.x;
        const chassisY = this.position.y;
        const turretCenterX = chassisX + this.width / 2;
        const turretCenterY = chassisY + this.height / 2; // Simple centering for turret

        // Draw chassis
        ctx.fillStyle = GROBDA_COLOR_CHASSIS;
        ctx.fillRect(chassisX, chassisY, this.width, this.height);
        // Simple tracks detail
        ctx.fillStyle = 'black';
        ctx.fillRect(chassisX, chassisY + this.height - 5, this.width, 5);
        ctx.fillRect(chassisX, chassisY, this.width, 5);


        // Draw turret
        ctx.save();
        ctx.translate(turretCenterX, turretCenterY);
        ctx.rotate(this.turretAngle);
        ctx.fillStyle = GROBDA_COLOR_TURRET;
        // Barrel is drawn from the new origin (0,0) which is turretCenter
        ctx.fillRect(0, -GROBDA_TURRET_WIDTH / 2, GROBDA_TURRET_LENGTH, GROBDA_TURRET_WIDTH);
        // Small circular base for turret
        ctx.beginPath();
        ctx.arc(0, 0, GROBDA_TURRET_WIDTH * 0.75, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Draw HP (from base class or custom)
        super.draw(ctx); // This will draw the purple box and HP from Enemy if not overridden elsewhere

        // Draw bullets
        for (const bullet of this.bullets) {
            bullet.draw(ctx);
        }
    }
}
