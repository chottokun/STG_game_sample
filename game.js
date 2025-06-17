import { Player } from './Player.js';
import { AirEnemy } from './Enemy.js'; // Ensure correct path
import { GameManager } from './GameManager.js';

console.log("Game script loaded!");

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const gameManager = new GameManager(canvas);
const player = new Player(canvas);
const enemies = []; // Managed by game.js, passed to GameManager for spawning

const inputKeys = {};
let blasterKeyHeld = false;

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


document.addEventListener('keydown', (event) => {
    inputKeys[event.key] = true;
    if (event.key === 'x' || event.key === 'X') {
        blasterKeyHeld = true;
    }
    // Game restart on Enter if game over
    if (gameManager.gameState === 'gameOver' && event.key === 'Enter' && !gameManager.isGameOverInputRegistered) {
        gameManager.isGameOverInputRegistered = true; // Prevent multiple immediate restarts
        gameManager.resetGame(player, enemies, player.zappersOnScreen, player.blasterBombs);
        // Player state like zappers/bombs arrays are cleared in resetGame by passing them.
    }
});

document.addEventListener('keyup', (event) => {
    inputKeys[event.key] = false;
    if ((event.key === 'x' || event.key === 'X') && blasterKeyHeld) {
        player.dropBlaster();
        blasterKeyHeld = false;
    }
});


let lastTime = 0;
function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    gameManager.update(deltaTime); // Update game manager (scroll position, etc.)

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
            let yOnScreen = (p.y + gameManager.currentScrollPos * p.speed) % canvas.height;
             if (gameManager.currentScrollPos * p.speed > p.y_reset_trigger) { // pseudo property
                 // this logic isn't quite right. Let's use a simpler modulo arithmetic based on scrollPos
             }
        }
        // Corrected simple scrolling background
        for (let i = 0; i < num_lines; i++) {
            let p = line_properties[i];
            // Each line has its own 'base' y, and we shift it by scrollPos.
            // The modulo ensures it wraps around.
            // To make them appear continuously, their effective y needs to be relative to their initial random y.
            let yPos = (p.y + gameManager.currentScrollPos * (p.speed /2) ) % canvas.height;
            ctx.fillRect(p.x, yPos, p.width, p.height);
        }


        gameManager.spawnEnemies(enemies, canvas); // Call spawner

        player.update(inputKeys);

        // Update and draw enemies
        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            enemy.update();

            // Remove enemies off-screen (bottom)
            if (enemy.position.y > canvas.height) {
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

            if (!enemy.isDestroyed) {
                enemy.draw(ctx);
            }
        } // End of main enemy loop

        if (gameManager.gameState === 'gameOver') {
             // Enemies list will be cleared by resetGame if player restarts.
        } else {
             // Filter out destroyed enemies from the main array
             enemies = enemies.filter(enemy => !enemy.isDestroyed);
        }

        player.draw(ctx);

        // Draw Score, Lives, High Score
        ctx.fillStyle = "white";
        ctx.font = "16px Arial";
        ctx.fillText("Score: " + gameManager.score, 10, 20);
        ctx.fillText("Lives: " + gameManager.playerLives, canvas.width - 80, 20);
        ctx.fillText("High Score: " + gameManager.highScore, canvas.width / 2 - 60, 20);


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
