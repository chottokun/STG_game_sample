class CollisionManager {
    constructor() {
        // Constructor can be used for initialization if needed
    }

    /**
     * Checks for collisions between the player and enemies.
     * @param {Object} player - The player object.
     * @param {Array<Object>} enemies - An array of enemy objects.
     * @param {Object} gameManager - The game manager object.
     */
    checkPlayerVsEnemy(player, enemies, gameManager) {
        if (!player.isActive || player.isInvincible) {
            return;
        }

        const playerRect = {
            x: player.x,
            y: player.y,
            width: player.width,
            height: player.height
        };

        for (const enemy of enemies) {
            if (!enemy.isActive || enemy.isDestroyed) {
                continue;
            }

            // Check collision with the main enemy body
            const enemyRect = {
                x: enemy.x,
                y: enemy.y,
                width: enemy.width,
                height: enemy.height
            };

            if (this.isRectCollision(playerRect, enemyRect)) {
                player.onHit(); // Player takes damage or loses a life
                gameManager.playerDied(player); // Handles game state, lives, etc.

                // Enemy also takes damage, could be a ramming enemy or specific interaction
                const enemyDestroyed = enemy.onHit(); // Assume onHit returns true if destroyed
                if (enemyDestroyed) {
                    gameManager.addScore(enemy.scoreValue);
                    gameManager.effectManager.addEffect('explosion', enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                    gameManager.soundManager.playSound('enemyExplosion');
                }

                if (gameManager.gameState === 'gameOver') {
                    return; // No need to check further if game is over
                }
                // Player can only collide with one enemy at a time directly.
                // Or, if player is not destroyed, they might pass through and hit another.
                // For simplicity, let's assume one collision is enough to process for this frame for the player.
                // If player.onHit() makes player invincible, this loop won't run next frame.
                return;
            }

            // Check collision with sub-components if the enemy has them (e.g., Volgard turrets)
            if (enemy.turrets && enemy.turrets.length > 0) {
                for (const turret of enemy.turrets) {
                    if (!turret.isActive || turret.isDestroyed) {
                        continue;
                    }
                    const turretRect = {
                        x: turret.x,
                        y: turret.y,
                        width: turret.width,
                        height: turret.height
                    };
                    if (this.isRectCollision(playerRect, turretRect)) {
                        player.onHit();
                        gameManager.playerDied(player);

                        const turretDestroyed = turret.onHit();
                        if (turretDestroyed) {
                            gameManager.addScore(turret.scoreValue);
                             gameManager.effectManager.addEffect('explosion', turret.x + turret.width / 2, turret.y + turret.height / 2);
                             gameManager.soundManager.playSound('enemyExplosion');
                        }
                        if (gameManager.gameState === 'gameOver') {
                            return;
                        }
                        return;
                    }
                }
            }
             // Check collision with shield generators if the enemy has them (e.g., VolgardCore)
            if (enemy.shieldGenerators && enemy.shieldGenerators.length > 0) {
                for (const shieldGen of enemy.shieldGenerators) {
                    if (!shieldGen.isActive || shieldGen.isDestroyed) {
                        continue;
                    }
                    const shieldGenRect = {
                        x: shieldGen.x,
                        y: shieldGen.y,
                        width: shieldGen.width,
                        height: shieldGen.height
                    };
                    if (this.isRectCollision(playerRect, shieldGenRect)) {
                        player.onHit();
                        gameManager.playerDied(player);

                        // Shield generators might not be "destroyed" by player collision,
                        // but player is affected. For now, no direct damage to shield gen from player body.
                        // const shieldGenDestroyed = shieldGen.onHit(); // Player body doesn't damage shield gens

                        if (gameManager.gameState === 'gameOver') {
                            return;
                        }
                        return;
                    }
                }
            }
        }
    }

    /**
     * Checks for collisions between player projectiles and enemies.
     * @param {Array<Object>} playerProjectiles - An array of player projectile objects.
     * @param {Array<Object>} enemies - An array of enemy objects.
     * @param {Object} gameManager - The game manager object to handle scoring and effects.
     */
    checkPlayerProjectilesVsEnemies(viperShots, enemies, gameManager) { // Renamed playerProjectiles to viperShots for clarity based on task
        for (let i = viperShots.length - 1; i >= 0; i--) {
            const shot = viperShots[i];
            if (!shot.isActive) {
                continue;
            }

            const shotRect = { x: shot.x, y: shot.y, width: shot.width, height: shot.height };
            let shotConsumedThisLoop = false; // Flag to ensure one shot doesn't hit multiple things in the same check pass

            for (const enemy of enemies) {
                if (!enemy.isActive || (enemy.isDestroyed && enemy.enemyType !== 'VolgardCore')) { // VolgardCore might have active parts even if "main body" is technically destroyed
                    continue;
                }
                if (shotConsumedThisLoop) break; // If shot already hit something, move to next shot

                // Helper function to process hit on an enemy part
                const processHit = (enemyPart, partRect) => {
                    if (!enemyPart.isActive || (typeof enemyPart.isDestroyed !== 'undefined' && enemyPart.isDestroyed)) return false;

                    if (this.isRectCollision(shotRect, partRect)) {
                        const damageDealt = enemyPart.onHit(shot.damage);

                        if (damageDealt) {
                            const shotType = shot.type || (shot.radius ? 'bombardBomb' : 'viperShot');
                            gameManager.poolManager.returnObject(shot, shotType);
                            viperShots.splice(i, 1);
                            shotConsumedThisLoop = true; // Mark shot as consumed

                            if (enemyPart.isDestroyed) {
                                gameManager.addScore(enemyPart.scoreValue || 0);
                                gameManager.effectManager.addEffect('explosion', enemyPart.x + enemyPart.width / 2, enemyPart.y + enemyPart.height / 2, enemyPart.explosionSize || 'normal');
                                gameManager.soundManager.playSound('enemyExplosion');
                                // Special handling for VolgardCore parts
                                if (enemy.enemyType === 'VolgardCore' && (enemyPart.type === 'turret' || enemyPart.type === 'shieldGenerator')) {
                                    enemy.checkShieldStatus(); // Re-check shields if a component is destroyed
                                    enemy.checkIfDestroyed(); // Check if core itself is now destroyed
                                }
                            } else {
                                gameManager.effectManager.addEffect('hitSpark', shot.x + shot.width / 2, shot.y + shot.height / 2);
                            }
                        }
                        return true; // Collision occurred
                    }
                    return false; // No collision
                };

                // 1. Check Volgard Core Shield Generators first
                if (enemy.enemyType === 'VolgardCore' && enemy.shieldGenerators && enemy.shieldGenerators.length > 0 && enemy.areShieldsActive) {
                    for (const shieldGen of enemy.shieldGenerators) {
                        if (!shieldGen.isActive || shieldGen.isDestroyed) continue;
                        const shieldGenRect = { x: shieldGen.x, y: shieldGen.y, width: shieldGen.width, height: shieldGen.height };
                        if (processHit(shieldGen, shieldGenRect)) {
                           // enemy.checkShieldStatus(); // Done in processHit
                           break;
                        }
                    }
                    if (shotConsumedThisLoop) continue;
                }

                // 2. Check turrets (for VolgardCore or any other enemy type)
                if (enemy.turrets && enemy.turrets.length > 0) {
                    for (const turret of enemy.turrets) {
                         if (!turret.isActive || turret.isDestroyed) continue;
                        const turretRect = { x: turret.x, y: turret.y, width: turret.width, height: turret.height };
                        if (processHit(turret, turretRect)) {
                            break;
                        }
                    }
                    if (shotConsumedThisLoop) continue;
                }

                // 3. Check main enemy body
                let mainBodyVulnerable = true;
                if (enemy.enemyType === 'VolgardCore') {
                    const anyActiveGenerator = enemy.shieldGenerators && enemy.shieldGenerators.some(sg => sg.isActive && !sg.isDestroyed);
                    if (enemy.areShieldsActive && anyActiveGenerator) {
                         mainBodyVulnerable = false;
                    }
                     // If all shield gens are destroyed, VolgardCore itself might not be "hittable" directly, but rather its destruction is triggered.
                    // However, we'll assume it can be hit if shields are down.
                    if (enemy.isDestroyed) mainBodyVulnerable = false; // if core already flagged as destroyed
                }

                if (mainBodyVulnerable && !enemy.isDestroyed) {
                    const enemyRect = { x: enemy.x, y: enemy.y, width: enemy.width, height: enemy.height };
                     if (processHit(enemy, enemyRect)) {
                        break;
                    }
                }
            }
        }
    }

    /**
     * Checks for collisions between enemy projectiles and the player.
     * @param {Array<Object>} enemyProjectiles - An array of enemy projectile objects.
     * @param {Object} player - The player object.
     * @param {Object} gameManager - The game manager object to handle player damage.
     */
    checkEnemyProjectilesVsPlayer(allEnemyBullets, player, gameManager) {
        if (!player.isActive || player.isInvincible) {
            return;
        }

        const playerRect = {
            x: player.x,
            y: player.y,
            width: player.width,
            height: player.height
        };

        for (let i = allEnemyBullets.length - 1; i >= 0; i--) {
            const bullet = allEnemyBullets[i];
            if (!bullet.isActive) {
                continue;
            }

            const bulletRect = {
                x: bullet.x,
                y: bullet.y,
                width: bullet.width,
                height: bullet.height
            };

            if (this.isRectCollision(playerRect, bulletRect)) {
                player.onHit(); // Player takes damage/loses life
                // gameManager.playerDied(player); // player.onHit should ideally trigger this via gameManager if life is lost. Let's assume player.onHit tells gameManager.
                                                // If player.onHit directly results in isDestroyed or similar, gameManager.playerDied might be redundant here.
                                                // For now, let's assume player.onHit handles consequences, and if a life is lost, gameManager.playerDied will be called from player.

                // Deactivate or return the bullet to its pool
                bullet.isActive = false; // Mark as inactive
                // gameManager.poolManager.returnObject(bullet, bullet.type); // If enemy bullets are pooled, which they should be.
                                                                            // This requires bullet.type to be set.
                                                                            // And allEnemyBullets needs to be the source array for splice to work.
                                                                            // For now, just deactivate. game.js's main loop will clean up.
                                                                            // OR, if allEnemyBullets is a temporary combined list, splicing here is fine.
                allEnemyBullets.splice(i, 1); // Remove from the checked list.

                gameManager.effectManager.addEffect('hitSpark', player.x + player.width / 2, player.y + player.height / 2); // Player hit effect
                gameManager.soundManager.playSound('playerHit');


                if (player.lives <= 0 && gameManager.gameState !== 'gameOver') { // Check if player is out of lives
                     gameManager.playerDied(player); // Ensure game over is triggered
                }


                if (gameManager.gameState === 'gameOver') {
                    return; // No need to check further if game is over
                }
                // Player can be hit by multiple projectiles in one frame if they overlap.
                // So, don't return; continue checking other bullets.
            }
        }
    }

    /**
     * Checks for collisions between player bombs and enemies.
     * @param {Array<Object>} playerBombs - An array of player bomb objects.
     * @param {Array<Object>} enemies - An array of enemy objects.
     * @param {Object} gameManager - The game manager object to handle bomb damage, scoring, and effects.
     */
    checkBombardVsEnemies(playerBombs, enemies, gameManager) {
        for (const bomb of playerBombs) {
            if (!bomb.isActive || bomb.explosionTimer <= 0) { // Bomb must be active and in explosion phase
                continue;
            }

            // The bomb's hitEnemyIds should be reset at the start of its explosion phase,
            // typically in its update or explode method. Here, we just use it.
            // if (bomb.explosionTimer === bomb.initialExplosionTime) { // Example: reset on first frame of explosion
            // bomb.hitEnemyIds.clear();
            // }


            for (const enemy of enemies) {
                if (!enemy.isActive || enemy.isDestroyed) {
                    continue;
                }

                const processBombHit = (enemyPart, partRect) => {
                    if (!enemyPart.isActive || enemyPart.isDestroyed || (bomb.hitEnemyIds && bomb.hitEnemyIds.has(enemyPart.id))) {
                        return false;
                    }
                     // Ensure enemyPart has an id. If not, generate a temporary one for tracking during this bomb's explosion.
                    if (!enemyPart.id) {
                        enemyPart.id = `temp_${Math.random().toString(36).substr(2, 9)}`;
                    }


                    // Find the closest point on the rectangle to the circle's center
                    const closestX = Math.max(partRect.x, Math.min(bomb.x, partRect.x + partRect.width));
                    const closestY = Math.max(partRect.y, Math.min(bomb.y, partRect.y + partRect.height));

                    const distanceSquared = ((bomb.x - closestX) ** 2) + ((bomb.y - closestY) ** 2);

                    if (distanceSquared < (bomb.explosionRadius * bomb.explosionRadius)) {
                        if (bomb.hitEnemyIds && bomb.hitEnemyIds.size >= (bomb.maxTargets || 4) ) { // Limit number of targets hit by one bomb
                            return false; // Max targets reached for this bomb
                        }

                        const damageDealt = enemyPart.onHit(bomb.damage); // Bomb damage
                        if (damageDealt) {
                            if (bomb.hitEnemyIds) bomb.hitEnemyIds.add(enemyPart.id);

                            if (enemyPart.isDestroyed) {
                                gameManager.addScore(enemyPart.scoreValue || 0);
                                gameManager.effectManager.addEffect('explosion', enemyPart.x + enemyPart.width / 2, enemyPart.y + enemyPart.height / 2, enemyPart.explosionSize || 'large'); // Bombs cause large explosions
                                gameManager.soundManager.playSound('enemyExplosion');
                                 // Special handling for VolgardCore parts
                                if (enemy.enemyType === 'VolgardCore' && (enemyPart.type === 'turret' || enemyPart.type === 'shieldGenerator')) {
                                    enemy.checkShieldStatus();
                                    enemy.checkIfDestroyed();
                                }
                            } else {
                                // Potentially a different effect for bomb hits if not destroyed
                                gameManager.effectManager.addEffect('hitSpark', enemyPart.x + enemyPart.width / 2, enemyPart.y + enemyPart.height / 2);
                            }
                        }
                        return true; // Hit processed
                    }
                    return false; // No hit
                };

                // Check sub-components first (turrets, shield generators)
                if (enemy.shieldGenerators && enemy.shieldGenerators.length > 0 && enemy.enemyType === 'VolgardCore') { // Only Volgard for now
                    for (const shieldGen of enemy.shieldGenerators) {
                        const shieldGenRect = { x: shieldGen.x, y: shieldGen.y, width: shieldGen.width, height: shieldGen.height, id: shieldGen.id };
                        processBombHit(shieldGen, shieldGenRect);
                    }
                }
                if (enemy.turrets && enemy.turrets.length > 0) {
                    for (const turret of enemy.turrets) {
                        const turretRect = { x: turret.x, y: turret.y, width: turret.width, height: turret.height, id: turret.id };
                        processBombHit(turret, turretRect);
                    }
                }

                // Check main enemy body
                const enemyRect = { x: enemy.x, y: enemy.y, width: enemy.width, height: enemy.height, id: enemy.id };
                processBombHit(enemy, enemyRect);
            }
        }
    }

    /**
     * Helper method to check for collision between two rectangles.
     * Assumes rectangles have x, y, width, and height properties.
     * @param {Object} rect1 - The first rectangle.
     * @param {Object} rect2 - The second rectangle.
     * @returns {boolean} True if the rectangles collide, false otherwise.
     */
    isRectCollision(rect1, rect2) {
        if (!rect1 || !rect2) {
            return false; // Ensure both rectangles are defined
        }
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
}

export { CollisionManager };
