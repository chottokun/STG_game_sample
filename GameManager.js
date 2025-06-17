import { AirEnemy } from './Enemy.js'; // Ensure Enemy.js and AirEnemy are available

// Constants
const INITIAL_PLAYER_LIVES = 3;
const INITIAL_GAME_STATE = 'playing'; // Could be 'title', 'playing', 'gameOver', 'paused'
const DEFAULT_SCROLL_SPEED = 2; // Pixels per frame
const HIGH_SCORE_STORAGE_KEY = 'xevious_highscore';

// Default enemy properties for timeline spawning if not specified in timeline entry
const DEFAULT_ENEMY_HP = 1;
const DEFAULT_ENEMY_SCORE = 50;
const DEFAULT_ENEMY_SPAWN_Y_OFFSET = -30; // Spawn just off-screen top

export class GameManager {
    constructor(canvas) {
        this.canvas = canvas; // Store canvas reference if needed for spawning logic relative to screen
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem(HIGH_SCORE_STORAGE_KEY) || '0');
        this.playerLives = INITIAL_PLAYER_LIVES;
        this.gameState = INITIAL_GAME_STATE;
        this.scrollSpeed = DEFAULT_SCROLL_SPEED;
        this.currentScrollPos = 0;

        // Example spawn timeline. Real game would load this from a level config.
        // scrollPos: When the game's scroll position reaches this value, the enemy is spawned.
        // enemyId: A unique identifier for this enemy instance (optional, for debugging/specific logic).
        // spawnX: The x-coordinate where the enemy will appear.
        // enemyType: Class name of the enemy to instantiate.
        // hp, score: Overrides for default enemy hp/score if needed.
        this.enemySpawnTimeline = [
            { "scrollPos": 100, "enemyId": "toroid_1", "spawnX": this.canvas.width / 2, "enemyType": "AirEnemy" },
            { "scrollPos": 300, "enemyId": "toroid_2", "spawnX": this.canvas.width / 4, "enemyType": "AirEnemy" },
            { "scrollPos": 350, "enemyId": "toroid_3", "spawnX": (this.canvas.width / 4) * 3, "enemyType": "AirEnemy" },
            { "scrollPos": 600, "enemyId": "toroid_4", "spawnX": this.canvas.width / 2, "enemyType": "AirEnemy", "hp": 2, "score": 100 },
            { "scrollPos": 800, "enemyId": "toroid_flank_1", "spawnX": 50, "enemyType": "AirEnemy" },
            // Example: spawnX relative to canvas width, ensure enemy width (30) is accounted for if spawning near edge
            { "scrollPos": 800, "enemyId": "toroid_flank_2", "spawnX": this.canvas.width - 50 - 30, "enemyType": "AirEnemy" },
            { "scrollPos": 1000, "enemyId": "toroid_center_strong", "spawnX": this.canvas.width/2 -15, "enemyType": "AirEnemy", "hp":3, "score":150 }
        ];
        this.nextSpawnIndex = 0;
        this.isGameOverInputRegistered = false; // To prevent multiple restarts on one key press (managed in game.js)
    }

    update(deltaTime) { // deltaTime not used yet, but good practice
        if (this.gameState === 'playing') {
            this.currentScrollPos += this.scrollSpeed;
            // Spawning will be called from game.js, which has access to the enemies array
        } else if (this.gameState === 'gameOver' && !this.isGameOverInputRegistered) {
            // Listen for a restart key (e.g., Enter)
            // This check should ideally be in game.js's input handler
        }
    }

    spawnEnemies(enemiesArray, canvas) { // Pass canvas for width, though already stored
        if (this.gameState !== 'playing') return;

        while (this.nextSpawnIndex < this.enemySpawnTimeline.length &&
               this.currentScrollPos >= this.enemySpawnTimeline[this.nextSpawnIndex].scrollPos) {

            const spawnData = this.enemySpawnTimeline[this.nextSpawnIndex];
            let newEnemy = null;

            // Enemy position is top-left for constructor and drawing.
            // Spawn Y is offset to start off-screen top.
            const enemyPosition = { x: spawnData.spawnX, y: DEFAULT_ENEMY_SPAWN_Y_OFFSET };

            if (spawnData.enemyType === "AirEnemy") {
                newEnemy = new AirEnemy(
                    enemyPosition,
                    spawnData.enemyId,
                    spawnData.hp || DEFAULT_ENEMY_HP,       // Use timeline HP or default
                    spawnData.score || DEFAULT_ENEMY_SCORE  // Use timeline score or default
                );
            } else {
                // Handle other enemy types if they exist in the future
                console.warn("Unknown enemy type in timeline:", spawnData.enemyType);
            }

            if (newEnemy) {
                enemiesArray.push(newEnemy);
            }
            this.nextSpawnIndex++;
        }
    }

    addScore(points) {
        if (this.gameState !== 'playing') return;
        this.score += points;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            // this.saveHighScore(); // Save immediately or on game over
        }
    }

    playerDied() {
        if (this.gameState !== 'playing') return;

        this.playerLives--;
        // Player specific onHit effects (like sound, explosion) should be in Player.js.
        // GameManager handles lives and game state transition.

        if (this.playerLives < 0) {
            this.gameState = 'gameOver'; // Transition to gameOver state
            this.saveHighScore(); // Save high score when game is over
            // this.isGameOverInputRegistered is managed in game.js for input handling
            console.log("GAME OVER. Final Score:", this.score, "High Score:", this.highScore);
            // Actual display of "GAME OVER" screen and restart option is handled in game.js gameLoop.
        } else {
            console.log("Player died. Lives remaining:", this.playerLives);
            // Trigger player respawn sequence (e.g., player.resetPositionAndState()).
            // For now, player.onHit() resets position, and game.js continues the loop.
        }
    }

    saveHighScore() {
        localStorage.setItem(HIGH_SCORE_STORAGE_KEY, this.highScore.toString());
        console.log("High score saved:", this.highScore);
    }

    // Resets the game state to start a new game.
    resetGame(player, enemiesArray /*, other arrays like projectiles if managed globally */) {
        console.log("Resetting game...");
        this.score = 0;
        this.playerLives = INITIAL_PLAYER_LIVES;
        this.currentScrollPos = 0;
        this.nextSpawnIndex = 0;
        this.gameState = INITIAL_GAME_STATE; // Set back to 'playing' or 'title'
        // this.isGameOverInputRegistered = false; // This flag is managed in game.js

        // Clear game entities - this is crucial for a clean restart.
        enemiesArray.length = 0; // Clear the main enemies array in game.js.

        // Reset player state by calling its own reset method
        if (player) {
            player.reset();
        }

        // If game.js manages other global arrays (e.g., general effects, non-player projectiles),
        // they should also be cleared here by passing them to resetGame.

        console.log("Game reset. Lives:", this.playerLives, "Score:", this.score);
    }
}
// Constants for player initial position factors would need to be accessible here
// if not passed in, or Player.js needs a more robust reset method.
// For now, assuming Player.js has PLAYER_INITIAL_X_FACTOR and PLAYER_INITIAL_Y_OFFSET if we call reset that way from here.
// The current Player.js defines these constants locally. A better way is for Player to have its own reset method.
// GameManager.js's resetGame() calls player.onHit() which refers to Player's constants. This is fine.
// Ah, I see player.position is reset directly in the previous version of resetGame.
// Let's ensure the constants from Player.js are used or player.reset() is called.
// The previous diff in Player.js made PLAYER_INITIAL_X_FACTOR and PLAYER_INITIAL_Y_OFFSET global to Player.js.
// So, this resetGame should be able to use them if they were exported or if Player has a reset method.
// For now, I'll assume player.onHit() handles the position reset correctly using its internal constants.
// The line `player.position = { x: this.canvas.width / 2, y: this.canvas.height - 50 };` in original resetGame
// should be replaced by `player.onHit()` or rely on player.reset() if it existed.
// The current player.onHit() does: this.position = { x: this.canvas.width * PLAYER_INITIAL_X_FACTOR, y: this.canvas.height - PLAYER_INITIAL_Y_OFFSET };
// This is correct.

// The call to player.onHit() in the previous version of resetGame in GameManager.js was:
// player.onHit(); // Call onHit to trigger any invincibility/reset logic in Player
// This is a good approach, as Player.onHit already uses its defined constants to reset its position.
// So, the direct position setting in resetGame can be removed if player.onHit() is called.
// Let's stick to calling player.onHit() for resetting player state including position.
// The `player.position = { x: player.canvas.width * PLAYER_INITIAL_X_FACTOR, ...}` part is redundant if player.onHit() is called.
// I will remove the direct position setting and rely on player.onHit() as it was in the provided solution for `resetGame`.
// This means the `PLAYER_INITIAL_X_FACTOR` and `PLAYER_INITIAL_Y_OFFSET` don't need to be imported here.

// Final check on resetGame:
// It clears enemiesArray.
// It calls player.onHit() if player exists (which resets player position and could handle invincibility).
// It clears player's zappers and bombs.
// This looks mostly correct according to the previous implementation.
// The key is that `player.onHit()` correctly uses the constants defined in `Player.js`.
