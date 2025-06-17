import { Player } from './Player.js';
// Import all enemy types that GameManager might spawn by string name
// Import all enemy types that GameManager might spawn by string name
import { AirEnemy, ZakatoEnemy, BacuraEnemy, ZoshyEnemy, DerotaEnemy, GroundEnemy } from './Enemy.js';
import { PyramidEnemy } from './PyramidEnemy.js';
import { SolObject } from './SolObject.js';
import { AndorgenesisCoreEnemy } from './AndorgenesisCoreEnemy.js';
import { GameManager } from './GameManager.js';
import { InputManager } from './InputManager.js';

console.log("Game script loaded!");

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const gameManager = new GameManager(canvas);
const inputManager = new InputManager(canvas); // Pass canvas to InputManager
const player = new Player(canvas);
let enemies = [];

// Background scrolling elements
const num_lines = 20; // Number of lines for scrolling effect
const line_properties = [];
for (let i = 0; i < num_lines; i++) {
    line_properties.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height, // Initial y positions
        speed: 1 + Math.random() * 2, // Varying speeds for parallax (optional)
        height: 5 + Math.random() * 10,
        width: 1 + Math.random() * 2
    });
}

// Event listener for game restart (can stay here as it's game-state specific)
document.addEventListener('keydown', (event) => {
    if (gameManager.gameState === 'gameOver' && event.key === 'Enter' && !gameManager.isGameOverInputRegistered) {
        gameManager.isGameOverInputRegistered = true;
        gameManager.resetGame(player, enemies);
        // Player's projectiles are cleared within player.reset() which is called by gameManager.resetGame()
    }
});

// Old keydown/keyup listeners that set inputKeys and blasterKeyHeld are removed
// as InputManager now handles this.

let lastTime = 0;
function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    // Pass enemies, canvas, and player to gameManager.update
    gameManager.update(deltaTime, enemies, canvas, player);

    if (gameManager.gameState === 'playing') {
        // Clear canvas
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw simple scrolling background
        ctx.fillStyle = 'darkgreen';
        for (const line of line_properties) {
            // Update line's base position based on its individual speed relative to game scroll
            // For a simple unified scroll, just use gameManager.scrollSpeed
            line.y = (line.y + line.speed * (gameManager.scrollSpeed / 2) ) % canvas.height; // line.y is its "base" un-scrolled position

            let yPos = (line.y - gameManager.currentScrollPos * (line.speed / gameManager.scrollSpeed) ) % canvas.height;
             // This calculation needs to be robust for yPos to wrap around correctly.
             // Let's simplify: draw based on currentScrollPos and re-randomize when off-screen.
        }

        // Simpler background scrolling:
        ctx.fillStyle = '#224422'; // Dark green
        for(let i=0; i < line_properties.length; i++) {
            let p = line_properties[i];
            // Each line has its own 'base' y, and we shift it by scrollPos.
            // The modulo ensures it wraps around.
            let yPos = (p.y + gameManager.currentScrollPos * (p.speed /2) ) % canvas.height;
            ctx.fillRect(p.x, yPos, p.width, p.height);
        }


        gameManager.spawnEnemies(enemies, canvas); // Call spawner

        player.update(inputManager, enemies); // Pass InputManager instance

        // Update and draw enemies
        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];

        // Update logic for different enemy types
        if (enemy instanceof AndorgenesisCoreEnemy) {
            enemy.update(gameManager.currentScrollPos, player, canvas, gameManager);
        } else if (enemy instanceof PyramidEnemy) {
            enemy.update(gameManager.currentScrollPos, gameManager); // Pass gameManager for pyramidDestroyed callback
        } else if (enemy instanceof DerotaEnemy) {
            enemy.update(gameManager.currentScrollPos, player, canvas);
        } else if (enemy instanceof GroundEnemy) {
            enemy.update(gameManager.currentScrollPos);
        } else if (enemy instanceof ZoshyEnemy) {
            enemy.update(player, canvas);
        } else if (enemy instanceof AirEnemy) {
            enemy.update();
        } else {
            enemy.update();
        }

        // Remove enemies off-screen (top or bottom)
        if (enemy.position.y > canvas.height || enemy.position.y < -enemy.height) {
                enemies.splice(i, 1);
                continue;
            }

            // Collision: Player's Zappers vs Enemies
            for (let j = player.zappersOnScreen.length - 1; j >= 0; j--) {
                const zapper = player.zappersOnScreen[j];
                if (zapper.x < enemy.position.x + enemy.width &&
                    zapper.x + zapper.width > enemy.position.x &&
                    zapper.y < enemy.position.y + enemy.height &&
                    zapper.y + zapper.height > enemy.position.y) {

                    enemy.onHit();
                    player.zappersOnScreen.splice(j, 1);
                    if (enemy.isDestroyed) {
                        gameManager.addScore(enemy.scoreValue);
                    }
                    break;
                }
            }

            // Collision: Player's Blaster Bombs (Explosions) vs Enemies
            if (!enemy.isDestroyed) {
                for (const bomb of player.blasterBombs) {
                    if (bomb.explosionTimer > 0) { // If bomb is currently exploding
                        const bombCenterX = bomb.x;
                        const bombCenterY = bomb.y;
                        // Basic Circle-Rectangle collision detection
                        const closestX = Math.max(enemy.position.x, Math.min(bombCenterX, enemy.position.x + enemy.width));
                        const closestY = Math.max(enemy.position.y, Math.min(bombCenterY, enemy.position.y + enemy.height));
                        const distanceSquared = ((bombCenterX - closestX) ** 2) + ((bombCenterY - closestY) ** 2);

                        if (distanceSquared < (bomb.explosionRadius * bomb.explosionRadius)) {
                            const wasAlive = !enemy.isDestroyed; // Check if enemy was alive before this hit
                            enemy.onHit(); // Apply damage, potentially destroying the enemy

                            if (wasAlive && enemy.isDestroyed) { // If this hit destroyed the enemy
                                gameManager.addScore(enemy.scoreValue);
                                // No need for scoreCountedForThisBomb if we check wasAlive && enemy.isDestroyed
                            }
                            // Note: An enemy might be hit multiple times by the same explosion if the explosion
                            // lasts several frames and the enemy is still within radius and not destroyed.
                            // This is acceptable under "all ground objects within the blast radius are targeted".
                            // The "max 4 targets" is not yet implemented.
                        }
                    }
                }
            }

            // Collision: Player vs Enemies
            // (No changes to this part based on current refactoring point, but ensure it's also robust)
            if (!enemy.isDestroyed) {
                const playerLeft = player.position.x - player.width / 2;
                const playerTop = player.position.y - player.height / 2;
                if (playerLeft < enemy.position.x + enemy.width &&
                    playerLeft + player.width > enemy.position.x &&
                    playerTop < enemy.position.y + enemy.height &&
                    playerTop + player.height > enemy.position.y) {

                    // Player.onHit() is called to reset position / play sound etc.
                    player.onHit();
                    gameManager.playerDied();

                    const wasEnemyAlive = !enemy.isDestroyed;
                    enemy.onHit();
                    if (wasEnemyAlive && enemy.isDestroyed) {
                         gameManager.addScore(enemy.scoreValue);
                    }

                    if (gameManager.gameState === 'gameOver') break;
                }
            }

            // Collision: Player vs Enemy Bullets
            if (enemy.bullets && enemy.bullets.length > 0) {
                for (let k = enemy.bullets.length - 1; k >= 0; k--) {
                    const bullet = enemy.bullets[k];
                    // Basic rectangle collision for player vs bullet
                    // Player position is center, bullet position is center (as per Bullet.draw)
                    const playerLeft = player.position.x - player.width / 2;
                    const playerRight = player.position.x + player.width / 2;
                    const playerTop = player.position.y - player.height / 2;
                    const playerBottom = player.position.y + player.height / 2;

                    const bulletLeft = bullet.position.x - bullet.width / 2;
                    const bulletRight = bullet.position.x + bullet.width / 2;
                    const bulletTop = bullet.position.y - bullet.height / 2;
                    const bulletBottom = bullet.position.y + bullet.height / 2;

                    if (playerLeft < bulletRight && playerRight > bulletLeft &&
                        playerTop < bulletBottom && playerBottom > bulletTop) {

                        player.onHit(); // Player takes a hit
                        gameManager.playerDied(); // GameManager updates lives/state
                        enemy.bullets.splice(k, 1); // Remove bullet

                        if (gameManager.gameState === 'gameOver') {
                            // Break all loops if game over
                            // This requires breaking from outer enemy loop as well.
                            // A flag or returning early from gameLoop might be better.
                            // For now, just break this inner loop.
                            break;
                        }
                    }
                }
                if (gameManager.gameState === 'gameOver') break; // Break enemy loop if game over
            }


            if (!enemy.isDestroyed) {
                enemy.draw(ctx); // Enemy draws itself and its bullets
            }
        } // End of main enemy loop

        if (gameManager.gameState === 'gameOver') {
             // Enemies list will be cleared by resetGame if player restarts.
        } else {
             // Filter out destroyed enemies from the main array
             // Also, trigger pyramidDestroyed callback here if a pyramid was just destroyed.
             // This was moved to PyramidEnemy.update() for simplicity with gameManager reference.
             enemies = enemies.filter(enemy => !enemy.isDestroyed);
        }

        player.draw(ctx);

    // Draw Sol object if it's active
    if (gameManager.solActive && gameManager.solObject) {
        gameManager.solObject.draw(ctx);
    }

    // Draw Blaster UI Area (visual cue for touch controls)
    if (inputManager.blasterUiArea && inputManager.blasterUiArea.height > 0) { // Check if area is defined
        ctx.fillStyle = "rgba(100, 100, 100, 0.2)"; // Semi-transparent grey
        ctx.fillRect(
            inputManager.blasterUiArea.x,
            inputManager.blasterUiArea.y,
            inputManager.blasterUiArea.width,
            inputManager.blasterUiArea.height
        );
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)"; // Lighter text for the cue
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.fillText(
            "BLASTER ZONE",
            canvas.width / 2,
            inputManager.blasterUiArea.y + inputManager.blasterUiArea.height / 2 + 8 // Adjust text position
        );
        ctx.textAlign = "left"; // Reset alignment
    }


        // Draw Score, Lives, High Score
        ctx.fillStyle = "white";
        ctx.font = "16px Arial";
        ctx.fillText("Score: " + gameManager.score, 10, 20);
        ctx.fillText("Lives: " + gameManager.playerLives, canvas.width - 80, 20);
        ctx.fillText("High Score: " + gameManager.highScore, canvas.width / 2 - 60, 20);

        // Display "1UP" message if timer is active
        if (gameManager.oneUpDisplayTimer > 0) {
            ctx.fillStyle = "yellow";
            ctx.font = "bold 24px Arial";
            ctx.textAlign = "center";
            ctx.fillText("1UP", canvas.width / 2, canvas.height / 2 - 60); // Positioned above center
            ctx.textAlign = "left"; // Reset alignment
        }

    } else if (gameManager.gameState === 'gameOver') {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "red";
        ctx.font = "48px Arial";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 40);
        ctx.fillStyle = "white";
        ctx.font = "24px Arial";
        ctx.fillText("Final Score: " + gameManager.score, canvas.width / 2, canvas.height / 2);
        ctx.fillText("Press Enter to Restart", canvas.width / 2, canvas.height / 2 + 40);
        ctx.textAlign = "left"; // Reset alignment
    }

    requestAnimationFrame(gameLoop);
}

// Start the game loop
lastTime = performance.now(); // Initialize lastTime before first call
requestAnimationFrame(gameLoop);
