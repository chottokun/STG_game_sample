import { Player } from './Player.js';
import { AirEnemy, ZakatoEnemy, BacuraEnemy, ZoshyEnemy, DerotaEnemy, GroundEnemy } from './Enemy.js';
import { PyramidEnemy } from './PyramidEnemy.js';
import { SolObject } from './SolObject.js';
import { AndorgenesisCoreEnemy } from './AndorgenesisCoreEnemy.js';
import { AndorgenesisTurretEnemy } from './AndorgenesisTurretEnemy.js';
import { DomGramEnemy } from './DomGramEnemy.js';
import { GrobdaEnemy } from './GrobdaEnemy.js';
import { GameManager } from './GameManager.js';
import { InputManager } from './InputManager.js';
import { ZapperBullet } from './ZapperBullet.js';

console.log("Game script loaded!");

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const gameManager = new GameManager(canvas);
const inputManager = new InputManager(canvas, gameManager.soundManager);
const player = new Player(canvas, gameManager);
let enemies = [];

const num_lines = 20;
const line_properties = [];
for (let i = 0; i < num_lines; i++) {
    line_properties.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        speed: 1 + Math.random() * 2,
        height: 5 + Math.random() * 10,
        width: 1 + Math.random() * 2
    });
}

document.addEventListener('keydown', (event) => {
    if (gameManager.gameState === 'gameOver' && event.key === 'Enter') {
        if (!gameManager.isGameOverInputRegistered) {
            gameManager.isGameOverInputRegistered = true;
            gameManager.resetGame(player, enemies);
        }
    }
    if (event.key === 'r' || event.key === 'R') {
        if (gameManager.replayData.length > 1 && !gameManager.isReplayMode && gameManager.gameState !== 'playing') {
            console.log("Attempting to start replay...");
            const replayToPlay = { data: JSON.parse(JSON.stringify(gameManager.replayData)) };
            gameManager.startReplay(replayToPlay, player, enemies);
        } else if (gameManager.isReplayMode) {
            console.log("Replay is already active or finishing.");
        } else if (gameManager.gameState === 'playing' && !gameManager.isReplayMode) {
             console.log("Cannot start replay while a game is in progress. Game Over or return to Title first.");
        }
         else {
            console.log("No replay data recorded to play (or only seed entry exists).");
        }
    }
});

const initialTouchUnlock = () => {
    if (gameManager.soundManager && !gameManager.soundManager.audioUnlocked) {
        gameManager.soundManager.unlockAudioContext();
    }
    canvas.removeEventListener('touchstart', initialTouchUnlock);
};
canvas.addEventListener('touchstart', initialTouchUnlock, { once: true });


let lastTime = 0;
function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    if (!inputManager.isOverridden) {
        if (inputManager.isActionJustPressed('debugToggleInvincibility')) {
            player.toggleInvincibilityDebug();
        }
        if (inputManager.isActionJustPressed('debugKillAllEnemies')) {
            gameManager.debugKillAllEnemies(enemies);
        }
        if (inputManager.isActionJustPressed('debugNextArea')) {
            gameManager.debugNextAreaOrBoss(enemies, canvas);
        }
        if (inputManager.isActionJustPressed('debugTogglePanel')) {
            console.log('--- Debug: Before toggleDebugPanel ---');
            console.log('gameManager object:', gameManager);
            console.log('typeof gameManager.toggleDebugPanel:', typeof gameManager.toggleDebugPanel);
            console.log('gameManager instanceof GameManager:', gameManager instanceof GameManager);
            if (gameManager && typeof gameManager.constructor === 'function' && gameManager.constructor.prototype) {
                console.log('GameManager.prototype.hasOwnProperty("toggleDebugPanel"):', gameManager.constructor.prototype.hasOwnProperty('toggleDebugPanel'));
            }
            gameManager.toggleDebugPanel();
        }
    }

    if (inputManager.isActionJustPressed('togglePauseAction') &&
        (gameManager.gameState === 'playing' || gameManager.gameState === 'paused')) {
        gameManager.togglePause();
    }

    gameManager.update(deltaTime, enemies, canvas, player, inputManager);

    if (gameManager.gameState === 'titleScreen') {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('STG Xevi', canvas.width / 2, canvas.height / 3 - 20);
        ctx.font = '28px Arial';
        ctx.fillText('Press Enter or "S" to Start', canvas.width / 2, canvas.height / 2 + 20);
        ctx.fillStyle = 'yellow';
        ctx.font = 'bold 22px Arial';
        ctx.fillText('High Score: ' + gameManager.highScore, canvas.width / 2, canvas.height / 2 + 70);
        ctx.font = '18px Arial';
        ctx.fillStyle = 'lightgrey';
        ctx.fillText('Press "R" to Play Last Recording (if available)', canvas.width / 2, canvas.height / 2 + 110);

        ctx.textAlign = 'left';
        ctx.fillStyle = 'white';

        if (inputManager.isActionJustPressed('startGameAction')) {
            gameManager.resetGame(player, enemies);
            player.reset();
            enemies.length = 0;

            console.log('--- Debug: Before startGame ---');
            console.log('gameManager object:', gameManager);
            console.log('typeof gameManager.startGame:', typeof gameManager.startGame);
            console.log('gameManager instanceof GameManager:', gameManager instanceof GameManager);
            if (gameManager && typeof gameManager.constructor === 'function' && gameManager.constructor.prototype) {
                console.log('GameManager.prototype.hasOwnProperty("startGame"):', gameManager.constructor.prototype.hasOwnProperty('startGame'));
            }
            gameManager.startGame(); // Arguments removed as per Turn 89 fix

            gameManager.isGameOverInputRegistered = false;
        }

    } else if (gameManager.gameState === 'playing') {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#224422';
        for(let i=0; i < line_properties.length; i++) {
            let p = line_properties[i];
            let yPos = (p.y + gameManager.currentScrollPos * (p.speed /2) ) % canvas.height;
            ctx.fillRect(p.x, yPos, p.width, p.height);
        }

        gameManager.spawnEnemies(enemies, canvas);
        player.update(inputManager, enemies);

        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];

            if (enemy instanceof AndorgenesisCoreEnemy) {
                enemy.update(gameManager.currentScrollPos, player, canvas, gameManager);
            } else if (enemy instanceof GrobdaEnemy) {
                enemy.update(gameManager.currentScrollPos, player, canvas);
            } else if (enemy instanceof PyramidEnemy) {
                enemy.update(gameManager.currentScrollPos, gameManager);
            } else if (enemy instanceof DerotaEnemy) {
                enemy.update(gameManager.currentScrollPos, player, canvas);
            } else if (enemy instanceof DomGramEnemy) {
                enemy.update(gameManager.currentScrollPos);
            } else if (enemy instanceof GroundEnemy) {
                enemy.update(gameManager.currentScrollPos);
            } else if (enemy instanceof ZoshyEnemy) {
                enemy.update(player, canvas);
            } else if (enemy instanceof AirEnemy) {
                enemy.update();
            } else {
                enemy.update();
            }

            if (enemy.position.y > canvas.height || enemy.position.y < -enemy.height) {
                enemies.splice(i, 1);
                continue;
            }

            if (player.isActive && !player.isInvincible) {
                const enemyWasInitiallyAlive = !enemy.isDestroyed;
                for (let j = player.zappersOnScreen.length - 1; j >= 0; j--) {
                    const zapper = player.zappersOnScreen[j];
                    if (!zapper.isActiveInPool) continue;
                    if (zapper.position.x - zapper.width/2 < enemy.position.x + enemy.width &&
                        zapper.position.x + zapper.width/2 > enemy.position.x &&
                        zapper.position.y - zapper.height/2 < enemy.position.y + enemy.height &&
                        zapper.position.y + zapper.height/2 > enemy.position.y) {
                        const enemyWasAliveForThisHit = !enemy.isDestroyed;
                        const enemyTookDamage = enemy.onHit();
                        gameManager.poolManager.returnObject(zapper, 'zapperBullet');
                        player.zappersOnScreen.splice(j, 1);
                        if (enemyTookDamage && !enemy.isDestroyed && enemyWasAliveForThisHit) {
                            gameManager.effectManager.addEffect('hitSpark', { x: zapper.position.x, y: zapper.position.y, size: 8, color: 'yellow', duration: 8 });
                        }
                        if (enemyWasAliveForThisHit && enemy.isDestroyed) {
                            gameManager.addScore(enemy.scoreValue);
                            gameManager.effectManager.addEffect('explosion', { x: enemy.position.x + enemy.width/2, y: enemy.position.y + enemy.height/2, size: Math.max(enemy.width, enemy.height) * 0.9, color: 'orange', duration: 15 });
                            gameManager.soundManager.playSound('enemyExplosion', 0.4);
                        }
                        break;
                    }
                }

                if (!enemy.isDestroyed && enemyWasInitiallyAlive) {
                    for (const bomb of player.blasterBombs) {
                        if (bomb.explosionTimer > 0) {
                            const bombCenterX = bomb.x;
                            const bombCenterY = bomb.y;
                            const closestX = Math.max(enemy.position.x, Math.min(bombCenterX, enemy.position.x + enemy.width));
                            const closestY = Math.max(enemy.position.y, Math.min(bombCenterY, enemy.position.y + enemy.height));
                            const distanceSquared = ((bombCenterX - closestX) ** 2) + ((bombCenterY - closestY) ** 2);
                            if (distanceSquared < (bomb.explosionRadius * bomb.explosionRadius)) {
                                const enemyWasAlivePreBomb = !enemy.isDestroyed;
                                const tookDamage = enemy.onHit();
                                if (tookDamage && !enemy.isDestroyed && enemyWasAlivePreBomb) {
                                    gameManager.effectManager.addEffect('hitSpark', { x: enemy.position.x + enemy.width/2, y: enemy.position.y + enemy.height/2, size: 12, color: 'white', duration: 10 });
                                }
                                if (enemyWasAlivePreBomb && enemy.isDestroyed) {
                                    gameManager.addScore(enemy.scoreValue);
                                    gameManager.effectManager.addEffect('explosion', { x: enemy.position.x + enemy.width/2, y: enemy.position.y + enemy.height/2, size: Math.max(enemy.width, enemy.height), color: 'darkorange', duration: 20 });
                                    gameManager.soundManager.playSound('enemyExplosion', 0.4);
                                }
                            }
                        }
                    }
                }

                if (!enemy.isDestroyed && enemyWasInitiallyAlive) {
                    const playerRect = {x: player.position.x - player.width/2, y: player.position.y - player.height/2, width: player.width, height: player.height};
                    const enemyRect = {x: enemy.position.x, y: enemy.position.y, width: enemy.width, height: enemy.height};
                    if (playerRect.x < enemyRect.x + enemyRect.width && playerRect.x + playerRect.width > enemyRect.x &&
                        playerRect.y < enemyRect.y + enemyRect.height && playerRect.y + playerRect.height > enemyRect.y) {
                        player.onHit();
                        gameManager.playerDied(player);
                        const enemyWasAlivePrePlayerCollision = !enemy.isDestroyed;
                        enemy.onHit();
                        if (enemyWasAlivePrePlayerCollision && enemy.isDestroyed) {
                             gameManager.addScore(enemy.scoreValue);
                             gameManager.effectManager.addEffect('explosion', { x: enemy.position.x + enemy.width/2, y: enemy.position.y + enemy.height/2, size: Math.max(enemy.width, enemy.height) * 0.8, color: 'red' });
                             gameManager.soundManager.playSound('enemyExplosion', 0.3);
                        }
                        if (gameManager.gameState === 'gameOver') break;
                    }
                }

                let allEnemyBullets = [];
                if (enemy.bullets && enemy.bullets.length > 0) {
                    allEnemyBullets = allEnemyBullets.concat(enemy.bullets);
                }
                if (enemy instanceof AndorgenesisCoreEnemy && enemy.turrets) {
                    for (const turret of enemy.turrets) {
                        if (!turret.isDestroyed && turret.bullets && turret.bullets.length > 0) {
                            allEnemyBullets = allEnemyBullets.concat(turret.bullets);
                        }
                    }
                }
                for (let k = allEnemyBullets.length - 1; k >= 0; k--) {
                    const bullet = allEnemyBullets[k];
                    if (bullet.isActive === false) continue;
                    const playerRect = {x: player.position.x - player.width/2, y: player.position.y - player.height/2, width: player.width, height: player.height};
                    const bulletRect = {x: bullet.position.x - bullet.width/2, y: bullet.position.y - bullet.height/2, width: bullet.width, height: bullet.height};
                    if (playerRect.x < bulletRect.x + bulletRect.width && playerRect.x + playerRect.width > bulletRect.x &&
                        playerRect.y < bulletRect.y + bulletRect.height && playerRect.y + playerRect.height > bulletRect.y) {
                        player.onHit();
                        gameManager.playerDied(player);
                        bullet.isActive = false;
                        if (gameManager.gameState === 'gameOver') break;
                    }
                }
                if (gameManager.gameState === 'gameOver') break;
            }

            if (enemy instanceof AndorgenesisCoreEnemy && enemy.turrets) {
                for (const turret of enemy.turrets) {
                    if (!turret.isDestroyed) {
                        const turretWasInitiallyAlive = !turret.isDestroyed;
                        for (let j = player.zappersOnScreen.length - 1; j >= 0; j--) {
                            const zapper = player.zappersOnScreen[j];
                            if (!zapper.isActiveInPool) continue;
                            if (zapper.position.x - zapper.width/2 < turret.position.x + turret.width &&
                                zapper.position.x + zapper.width/2 > turret.position.x &&
                                zapper.position.y - zapper.height/2 < turret.position.y + turret.height &&
                                zapper.position.y + zapper.height/2 > turret.position.y) {
                                const turretTookDamage = turret.onHit();
                                gameManager.poolManager.returnObject(zapper, 'zapperBullet');
                                player.zappersOnScreen.splice(j, 1);
                                if (turretTookDamage && !turret.isDestroyed && turretWasInitiallyAlive) {
                                    gameManager.effectManager.addEffect('hitSpark', { x: zapper.position.x, y: zapper.position.y, size: 8, color: 'yellow', duration: 8 });
                                }
                                if (turretWasInitiallyAlive && turret.isDestroyed) {
                                    gameManager.addScore(turret.scoreValue);
                                    gameManager.effectManager.addEffect('explosion', { x: turret.position.x + turret.width/2, y: turret.position.y + turret.height/2, size: turret.width, color: 'orange', duration: 15 });
                                    gameManager.soundManager.playSound('enemyExplosion', 0.3);
                                }
                                break;
                            }
                        }
                        if (turret.isDestroyed && turretWasInitiallyAlive && !turret.isDyingWithBoss) continue;
                        for (const bomb of player.blasterBombs) {
                            if (bomb.explosionTimer > 0) {
                                const bombCenterX = bomb.x;
                                const bombCenterY = bomb.y;
                                const closestX = Math.max(turret.position.x, Math.min(bombCenterX, turret.position.x + turret.width));
                                const closestY = Math.max(turret.position.y, Math.min(bombCenterY, turret.position.y + turret.height));
                                const distanceSquared = ((bombCenterX - closestX) ** 2) + ((bombCenterY - closestY) ** 2);
                                if (distanceSquared < (bomb.explosionRadius * bomb.explosionRadius)) {
                                    const turretWasAlivePreBomb = !turret.isDestroyed;
                                    const turretTookDamage = turret.onHit();
                                    if (turretTookDamage && !turret.isDestroyed && turretWasAlivePreBomb) {
                                        gameManager.effectManager.addEffect('hitSpark', { x: turret.position.x + turret.width/2, y: turret.position.y + turret.height/2, size: 10, color: 'white', duration: 10 });
                                    }
                                    if (turretWasAlivePreBomb && turret.isDestroyed) {
                                        gameManager.addScore(turret.scoreValue);
                                        gameManager.effectManager.addEffect('explosion', { x: turret.position.x + turret.width/2, y: turret.position.y + turret.height/2, size: turret.width, color: 'orange', duration: 15 });
                                        gameManager.soundManager.playSound('enemyExplosion', 0.3);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (enemy.bullets) {
                enemy.bullets = enemy.bullets.filter(b => b.isActive !== false);
            }
            if (enemy instanceof AndorgenesisCoreEnemy && enemy.turrets) {
                for (const turret of enemy.turrets) {
                    if (turret.bullets) {
                        turret.bullets = turret.bullets.filter(b => b.isActive !== false);
                    }
                }
            }
            if (!enemy.isDestroyed) {
                enemy.draw(ctx);
            }
        }

        player.draw(ctx);

        if (gameManager.solActive && gameManager.solObject) {
            gameManager.solObject.draw(ctx);
        }

        gameManager.effectManager.draw(ctx);

        if (inputManager.blasterUiArea && inputManager.blasterUiArea.height > 0) {
            ctx.fillStyle = "rgba(100, 100, 100, 0.2)";
            ctx.fillRect(
                inputManager.blasterUiArea.x,
                inputManager.blasterUiArea.y,
                inputManager.blasterUiArea.width,
                inputManager.blasterUiArea.height
            );
            ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
            ctx.font = "16px Arial";
            ctx.textAlign = "center";
            ctx.fillText(
                "BLASTER ZONE",
                canvas.width / 2,
                inputManager.blasterUiArea.y + inputManager.blasterUiArea.height / 2 + 8
            );
            ctx.textAlign = "left";
        }

        ctx.fillStyle = "white";
        ctx.font = "16px Arial";
        ctx.fillText("Score: " + gameManager.score, 10, 20);
        ctx.fillText("Lives: " + gameManager.playerLives, canvas.width - 80, 20);
        ctx.fillText("High Score: " + gameManager.highScore, canvas.width / 2 - 60, 20);

        if (gameManager.oneUpDisplayTimer > 0) {
            ctx.fillStyle = "yellow";
            ctx.font = "bold 24px Arial";
            ctx.textAlign = "center";
            ctx.fillText("1UP", canvas.width / 2, canvas.height / 2 - 60);
            ctx.textAlign = "left";
        }

    } else if (gameManager.gameState === 'paused') {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.font = "48px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Paused", canvas.width / 2, canvas.height / 2);
        ctx.font = "24px Arial";
        ctx.fillText("Press P to Resume", canvas.width/2, canvas.height/2 + 40);
        ctx.textAlign = "left";

    } else if (gameManager.gameState === 'gameOver') {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "red";
        ctx.font = "bold 48px Arial";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 80);
        ctx.fillStyle = "white";
        ctx.font = "24px Arial";
        ctx.fillText("Final Score: " + gameManager.score, canvas.width / 2, canvas.height / 2 - 20);
        ctx.fillStyle = 'yellow';
        ctx.font = 'bold 22px Arial';
        ctx.fillText("High Score: " + gameManager.highScore, canvas.width / 2, canvas.height / 2 + 20);
        ctx.fillStyle = "white";
        ctx.font = "20px Arial";
        ctx.fillText("Press Enter to Return to Title Screen", canvas.width / 2, canvas.height / 2 + 70);
        ctx.textAlign = "left";

        gameManager.effectManager.draw(ctx);
    }

    // Draw Debug Panel if visible (drawn on top of everything)
    if (gameManager.isDebugPanelVisible) {
        const panelX = 10;
        const panelY = canvas.height - 110;
        const panelWidth = 220;
        const panelHeight = 95;
        const lineHeight = 15;

        ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
        ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

        ctx.fillStyle = "white";
        ctx.font = "12px Arial";
        ctx.textAlign = "left";
        let lineNum = 0;

        const fps = (deltaTime > 0 ? (1000 / deltaTime) : 0).toFixed(1);
        ctx.fillText(`FPS: ${fps}`, panelX + 5, panelY + 10 + (lineNum++ * lineHeight));
        ctx.fillText(`Enemies: ${enemies.length}`, panelX + 5, panelY + 10 + (lineNum++ * lineHeight));
        ctx.fillText(`Player X: ${player.position.x.toFixed(1)}, Y: ${player.position.y.toFixed(1)}`, panelX + 5, panelY + 10 + (lineNum++ * lineHeight));
        ctx.fillText(`Invincible: ${player.isInvincible} (${player.isInvincible ? (player.invincibilityTimer > 900000 ? 'Debug' : player.invincibilityTimer.toFixed(0)) : 'No'})`, panelX + 5, panelY + 10 + (lineNum++ * lineHeight));
        ctx.fillText(`Scroll: ${gameManager.currentScrollPos.toFixed(0)}`, panelX + 5, panelY + 10 + (lineNum++ * lineHeight));
        ctx.fillText(`Area: ${gameManager.currentArea} | Boss: ${gameManager.isBossActive}`, panelX + 5, panelY + 10 + (lineNum++ * lineHeight));
    }

    requestAnimationFrame(gameLoop);
}

lastTime = performance.now();
requestAnimationFrame(gameLoop);
