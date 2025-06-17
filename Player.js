// Constants
const PLAYER_INITIAL_X_FACTOR = 0.5; // Player starts at 50% of canvas width
const PLAYER_INITIAL_Y_OFFSET = 50; // Player starts 50px from bottom
const PLAYER_SPEED = 5; // Pixels per frame
const PLAYER_WIDTH = 30;
const PLAYER_HEIGHT = 30;

const ZAPPER_COOLDOWN_FRAMES = 10;
const MAX_ZAPPERS_ON_SCREEN = 3;
const ZAPPER_WIDTH = 4;
const ZAPPER_HEIGHT = 10; // Base height, drawn as height + 2
const ZAPPER_SPEED = 15; // Pixels per frame

const BLASTER_SIGHT_Y_OFFSET = 100; // Distance ahead of player
const BLASTER_BOMB_TIME_TO_IMPACT = 30; // Frames
const BLASTER_BOMB_EXPLOSION_RADIUS = 32;
const BLASTER_BOMB_EXPLOSION_DURATION = 15; // Frames
const BLASTER_SIGHT_SIZE = 12; // For drawing crosshair
const BLASTER_SIGHT_DOT_RADIUS = 2;
const BLASTER_SIGHT_COLLISION_WIDTH = 10; // For checking ground target collision
const BLASTER_SIGHT_COLLISION_HEIGHT = 10;
const BLINK_INTERVAL_FRAMES = 2; // Blink every 2 frames (e.g. 1 frame white, 1 frame red)

const FALLING_BOMB_RADIUS = 7;


export class Player {
    constructor(canvas) {
        this.canvas = canvas;
        this.position = {
            x: canvas.width * PLAYER_INITIAL_X_FACTOR,
            y: canvas.height - PLAYER_INITIAL_Y_OFFSET
        }; // Position is center of player
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

        // Blaster sight targeting state
        this.blasterSightTargetingGroundEnemy = false;
        this.blasterSightBlinkTimer = 0;
        this.blasterSightBlinkColor = 'white'; // Default color

        this.blasterKeyHeld = false; // For blaster drop-on-release logic
    }

    reset() {
        // Resets player to initial state and position
        this.position = {
            x: this.canvas.width * PLAYER_INITIAL_X_FACTOR,
            y: this.canvas.height - PLAYER_INITIAL_Y_OFFSET
        };
        this.zapperTimer = 0;
        this.zappersOnScreen.length = 0; // Clear existing zappers
        this.blasterBombs.length = 0;   // Clear existing bombs
        // Reset other player-specific states if any (e.g., invulnerability)
        // this.isInvulnerable = false;
        // this.invulnerabilityTimer = 0;
        this.blasterSightTargetingGroundEnemy = false;
        this.blasterSightBlinkTimer = 0;
        this.blasterSightBlinkColor = 'white';
        this.blasterKeyHeld = false; // Reset blaster key state
        console.log("Player state reset.");
    }

    onHit() {
        // This method is called when the player collides with an enemy or projectile.
        // Its primary role is to handle player-specific consequences of being hit,
        // like playing an animation/sound, and resetting position/state.
        // Lives and game state are managed by GameManager.
        console.log("Player hit! Resetting position.");
        this.position = {
            x: this.canvas.width * PLAYER_INITIAL_X_FACTOR,
            y: this.canvas.height - PLAYER_INITIAL_Y_OFFSET
        }; // Reset position

        // Future enhancements:
        // - Trigger a player explosion animation/sound.
        // - Implement a brief period of invulnerability (e.g., flashing player).
        //   Example:
        //   this.isInvulnerable = true;
        //   this.invulnerabilityTimer = 120; // e.g., 2 seconds at 60 FPS
        //   Then, in update():
        //   if (this.isInvulnerable) {
        //     this.invulnerabilityTimer--;
        //     if (this.invulnerabilityTimer <= 0) {
        //       this.isInvulnerable = false;
        //     }
        //     // Add flashing effect in draw() if isInvulnerable
        //   }
        //   And collision checks in game.js should check !player.isInvulnerable.
    }

    update(inputManager, enemies = []) {
        // --- Touch Controls ---
        const touchTargetPos = inputManager.getTouchPlayerTargetPosition();
        let keyboardMovementActive =
            inputManager.isActionActive('moveUp') ||
            inputManager.isActionActive('moveDown') ||
            inputManager.isActionActive('moveLeft') ||
            inputManager.isActionActive('moveRight');

        if (touchTargetPos) {
            // Touch movement overrides keyboard if active
            this.position.x = touchTargetPos.x;
            this.position.y = touchTargetPos.y;
            keyboardMovementActive = false; // Disable keyboard movement if touch is controlling position
        }

        // --- Keyboard Movement (only if touch movement is not active) ---
        if (keyboardMovementActive) {
            if (inputManager.isActionActive('moveUp')) {
                this.position.y -= this.speed;
            }
            if (inputManager.isActionActive('moveDown')) {
                this.position.y += this.speed;
            }
            if (inputManager.isActionActive('moveLeft')) {
                this.position.x -= this.speed;
            }
            if (inputManager.isActionActive('moveRight')) {
                this.position.x += this.speed;
            }
        }

        // Keep player within canvas bounds (position is center)
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        this.position.x = Math.max(halfWidth, Math.min(this.canvas.width - halfWidth, this.position.x));
        this.position.y = Math.max(halfHeight, Math.min(this.canvas.height - halfHeight, this.position.y));

        // Update zapper timer
        if (this.zapperTimer > 0) {
            this.zapperTimer--;
        }

        // Zapper Firing (Keyboard OR Touch Auto-Fire)
        if (inputManager.isActionActive('fireZapper') || inputManager.shouldAutoFireZapper()) {
            if (this.zapperTimer === 0) {
                this.shootZapper();
                this.zapperTimer = this.zapperCooldown;
            }
        }

        // Blaster Firing Logic (Keyboard: drop on release)
        if (inputManager.isActionActive('fireBlaster')) {
            this.blasterKeyHeld = true;
        } else {
            if (this.blasterKeyHeld) {
                this.dropBlaster(); // Uses current blasterSightPosition
                this.blasterKeyHeld = false;
            }
        }

        // Blaster Firing Logic (Touch UI)
        const blasterDropData = inputManager.getBlasterDropCoordinates();
        if (blasterDropData !== undefined) {
            // Align blaster sight X with the tap, Y remains relative to player
            this.blasterSightPosition.x = blasterDropData.x;
            // this.blasterSightPosition.y is already updated based on player position
            this.dropBlaster(); // Then drop bomb using this new sight position
        }


        // Update blaster sight position:
        // Y always follows player with offset.
        // X follows player, unless it was just set by a touch-initiated blaster drop.
        if (blasterDropData === undefined) {
             this.blasterSightPosition.x = this.position.x;
        }
        // If blasterDropData was defined, this.blasterSightPosition.x was already set to blasterDropData.x

        this.blasterSightPosition.y = Math.max(0, this.position.y - BLASTER_SIGHT_Y_OFFSET);


        // Blaster sight targeting ground enemy logic
        this.blasterSightTargetingGroundEnemy = false; // Reset each frame
        const sightRectX = this.blasterSightPosition.x - BLASTER_SIGHT_COLLISION_WIDTH / 2;
        const sightRectY = this.blasterSightPosition.y - BLASTER_SIGHT_COLLISION_HEIGHT / 2;

        for (const enemy of enemies) {
            // Check if enemy is a ground type (using instanceof GroundEnemy or a type property)
            // Assuming GroundEnemy class exists and is imported/available for instanceof check in game.js context.
            // For Player.js, we might need a more generic way if GroundEnemy class is not directly known.
            // Let's assume for now that game.js passes enemies, and we can check type or instanceof.
            // A common way is to check `enemy.type === "ground"`.
            // For this specific task, we need to ensure GroundEnemy is defined and accessible for instanceof.
            // Let's assume `enemy.type === "ground"` is a reliable property.

            // To use instanceof, we'd need GroundEnemy to be imported in this file,
            // or rely on a property like enemy.isGround.
            // For now, let's assume a property `enemy.type = "ground"` exists for ground enemies.
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
            // Blink every BLINK_INTERVAL_FRAMES: 2 frames red, 2 frames white for a 4 frame cycle.
            // Or 1 frame red, 1 frame white for a 2 frame cycle.
            // Requirement: "2 フレーム毎に赤と白で点滅" (blinks red and white every 2 frames)
            // This means a full cycle is 2 frames. Frame 0: White, Frame 1: Red.
            if (this.blasterSightBlinkTimer % (BLINK_INTERVAL_FRAMES * 2) < BLINK_INTERVAL_FRAMES) {
                 this.blasterSightBlinkColor = 'white';
            } else {
                 this.blasterSightBlinkColor = 'red';
            }
        } else {
            this.blasterSightBlinkTimer = 0;
            this.blasterSightBlinkColor = 'white'; // Default non-targeting color
        }

        // Update zappers
        for (let i = this.zappersOnScreen.length - 1; i >= 0; i--) {
            const zapper = this.zappersOnScreen[i];
            zapper.y -= zapper.speed;
            if (zapper.y + zapper.height < 0) {
                this.zappersOnScreen.splice(i, 1);
            }
        }

        // Update blaster bombs
        for (let i = this.blasterBombs.length - 1; i >= 0; i--) {
            const bomb = this.blasterBombs[i];
            if (bomb.explosionTimer > 0) {
                bomb.explosionTimer--;
                if (bomb.explosionTimer === 0) {
                    this.blasterBombs.splice(i, 1); // Remove after explosion finishes
                }
            } else {
                bomb.timeToImpact--;
                if (bomb.timeToImpact <= 0) {
                    // Start explosion
                    bomb.explosionTimer = bomb.explosionDuration;
                }
            }
        }
    }

    shootZapper() {
        if (this.zappersOnScreen.length < this.maxZappers) {
            const newZapper = {
                // Shoots from the center-top of the player
                x: this.position.x - ZAPPER_WIDTH / 2, // Centered
                y: this.position.y - (this.height / 2) - (ZAPPER_HEIGHT / 2), // Fire from just above the player's center top
                width: ZAPPER_WIDTH,
                height: ZAPPER_HEIGHT,
                speed: ZAPPER_SPEED
            };
            this.zappersOnScreen.push(newZapper);
        }
    }

    dropBlaster() {
        const newBomb = {
            x: this.blasterSightPosition.x,
            y: this.blasterSightPosition.y,
            timeToImpact: BLASTER_BOMB_TIME_TO_IMPACT,
            explosionRadius: BLASTER_BOMB_EXPLOSION_RADIUS,
            explosionTimer: 0, // 0 means not exploding yet
            explosionDuration: BLASTER_BOMB_EXPLOSION_DURATION,
            color: 'grey'
        };
        this.blasterBombs.push(newBomb);
    }

    draw(ctx) {
        // Draw player (simple blue triangle spaceship, centered at this.position)
        ctx.fillStyle = 'dodgerblue'; // Changed color slightly
        ctx.beginPath();
        // Nose
        ctx.moveTo(this.position.x, this.position.y - this.height / 2);
        // Left wingtip
        ctx.lineTo(this.position.x - this.width / 2, this.position.y + this.height / 2);
        // Right wingtip
        ctx.lineTo(this.position.x + this.width / 2, this.position.y + this.height / 2);
        ctx.closePath();
        ctx.fill();

        // Optional: Add a small cockpit or detail
        ctx.fillStyle = 'skyblue';
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.width / 4, 0, Math.PI * 2);
        ctx.fill();


        // Draw blaster sight (white crosshair with a center dot)
        // Color is now dynamic based on targeting ground enemies.
        ctx.strokeStyle = this.blasterSightBlinkColor;
        ctx.fillStyle = this.blasterSightBlinkColor; // For the center dot
        ctx.lineWidth = 1;

        ctx.beginPath();
        // Horizontal line
        ctx.moveTo(this.blasterSightPosition.x - BLASTER_SIGHT_SIZE / 2, this.blasterSightPosition.y);
        ctx.lineTo(this.blasterSightPosition.x + BLASTER_SIGHT_SIZE / 2, this.blasterSightPosition.y);
        // Vertical line
        ctx.moveTo(this.blasterSightPosition.x, this.blasterSightPosition.y - BLASTER_SIGHT_SIZE / 2);
        ctx.lineTo(this.blasterSightPosition.x, this.blasterSightPosition.y + BLASTER_SIGHT_SIZE / 2);
        ctx.stroke();

        // Center dot
        ctx.beginPath();
        ctx.arc(this.blasterSightPosition.x, this.blasterSightPosition.y, BLASTER_SIGHT_DOT_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        // Draw zappers (bright yellow, slightly more elongated)
        ctx.fillStyle = 'gold'; // Brighter yellow
        for (const zapper of this.zappersOnScreen) {
            ctx.fillRect(zapper.x, zapper.y, zapper.width, zapper.height + 2); // Slightly elongated (visual only, hitbox is zapper.height)
        }

        // Draw blaster bombs
        for (const bomb of this.blasterBombs) {
            if (bomb.explosionTimer > 0) {
                // Exploding (expanding orange/red circle)
                const currentRadius = bomb.explosionRadius * (1 - (bomb.explosionTimer / bomb.explosionDuration));
                ctx.fillStyle = `rgba(255, ${100 + (bomb.explosionTimer/bomb.explosionDuration)*100}, 0, 0.7)`; // Fades and changes color
                ctx.beginPath();
                ctx.arc(bomb.x, bomb.y, currentRadius, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Falling (darker grey circle with a 'fuse')
                ctx.fillStyle = 'dimgray'; // Darker grey
                ctx.beginPath();
                ctx.arc(bomb.x, bomb.y, FALLING_BOMB_RADIUS, 0, Math.PI * 2);
                ctx.fill();
                // Simple fuse
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(bomb.x, bomb.y - (FALLING_BOMB_RADIUS - 2));
                ctx.lineTo(bomb.x + 2, bomb.y - (FALLING_BOMB_RADIUS + 2));
                // ctx.fill(); // Fuse should be stroked, not filled
                ctx.stroke();
            }
        }
    }
}
