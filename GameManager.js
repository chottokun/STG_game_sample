import { AirEnemy, ZakatoEnemy, BacuraEnemy, ZoshyEnemy, DerotaEnemy, GroundEnemy } from './Enemy.js';
import { PyramidEnemy } from './PyramidEnemy.js';
import { SolObject } from './SolObject.js';
import { AndorgenesisCoreEnemy } from './AndorgenesisCoreEnemy.js';

// Constants
const INITIAL_PLAYER_LIVES = 3;
const INITIAL_GAME_STATE = 'playing';
const DEFAULT_SCROLL_SPEED = 2;
const HIGH_SCORE_STORAGE_KEY = 'xevious_highscore';

const DEFAULT_ENEMY_HP = 1;
const DEFAULT_ENEMY_SCORE = 50;
const DEFAULT_ENEMY_SPAWN_Y_OFFSET = -30;

const ZAKATO_HP = 1;
const ZAKATO_SCORE = 75;
const ZAKATO_DEFAULT_WIDTH = 35;

const BACURA_DEFAULT_WIDTH = 120;
const BACURA_DEFAULT_HEIGHT = 25;
const BACURA_DEFAULT_SPEED = 0.5;

const ZOSHY_HP = 2;
const ZOSHY_SCORE = 150;

const DEROTA_HP = 3;
const DEROTA_SCORE = 200;

const CORE_WIDTH = 120;
const DEFAULT_AREA_LENGTH = 5000;

// Sol Trigger Constants
const SOL_TRIGGER_SEQUENCE = ['left', 'right', 'middle'];
const SOL_SCORE_BONUS = 2000;

// Extend (Extra Life) System Constants
const FIRST_EXTEND_SCORE = 20000;
const SUBSEQUENT_EXTEND_INTERVAL = 80000;
const ONE_UP_DISPLAY_DURATION_FRAMES = 120;


export class GameManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem(HIGH_SCORE_STORAGE_KEY) || '0');
        this.playerLives = INITIAL_PLAYER_LIVES;
        this.gameState = INITIAL_GAME_STATE;
        this.scrollSpeed = DEFAULT_SCROLL_SPEED;
        this.currentScrollPos = 0;

        this.isBossActive = false;
        this.currentArea = 1;
        this.AREA_LENGTH = DEFAULT_AREA_LENGTH;

        this.nextExtendScore = FIRST_EXTEND_SCORE;
        this.isFirstExtendAwarded = false;
        this.oneUpDisplayTimer = 0;

        this.pyramidDestructionOrder = [];
        this.solActive = false;
        this.solObject = null;

        this.enemySpawnTimeline = [
            // Start of Area 1
            { "scrollPos": 100, "enemyId": "toroid_1", "spawnX": this.canvas.width / 2, "enemyType": "AirEnemy" },
            { "scrollPos": 300, "enemyId": "toroid_2", "spawnX": this.canvas.width / 3, "enemyType": "AirEnemy" },
            { "scrollPos": 400, "enemyId": "toroid_3", "spawnX": this.canvas.width * 2 / 3, "enemyType": "AirEnemy" },

            // Pyramids for Sol Trigger
            { "scrollPos": 500, "enemyId": "pyramid_left", "spawnX": 100, "initialMapY": 500, "enemyType": "PyramidEnemy", "config": { "id": "left" } },
            { "scrollPos": 550, "enemyId": "pyramid_right", "spawnX": this.canvas.width - 100 - 30, "initialMapY": 550, "enemyType": "PyramidEnemy", "config": { "id": "right" } }, // 30 is pyramid width
            { "scrollPos": 600, "enemyId": "pyramid_middle", "spawnX": this.canvas.width / 2 - 15, "initialMapY": 600, "enemyType": "PyramidEnemy", "config": { "id": "middle" } },

            { "scrollPos": 700, "enemyId": "zakato_1", "spawnX": this.canvas.width / 2 - ZAKATO_DEFAULT_WIDTH / 2, "enemyType": "ZakatoEnemy", "config": { "amplitude": 80, "frequency": 0.025, "verticalSpeed": 1 } },
            { "scrollPos": 900, "enemyId": "zoshy_1", "spawnX": this.canvas.width / 2, "enemyType": "ZoshyEnemy", "config": { "stopY": 100 } },

            { "scrollPos": 1050, "enemyId": "bacura_1_center", "spawnX": this.canvas.width / 2 - BACURA_DEFAULT_WIDTH / 2, "enemyType": "BacuraEnemy", "config": { "speed": 0.7 } },

            { "scrollPos": 1300, "enemyId": "toroid_squad_1", "spawnX": 50, "enemyType": "AirEnemy" },
            { "scrollPos": 1350, "enemyId": "toroid_squad_2", "spawnX": 100, "enemyType": "AirEnemy" },
            { "scrollPos": 1400, "enemyId": "toroid_squad_3", "spawnX": 150, "enemyType": "AirEnemy" },

            { "scrollPos": 1500, "enemyId": "derota_front_left", "spawnX": this.canvas.width / 4 - 20, "initialMapY": 1500, "enemyType": "DerotaEnemy" },
            { "scrollPos": 1550, "enemyId": "derota_front_right", "spawnX": this.canvas.width * 3 / 4 - 20, "initialMapY": 1550, "enemyType": "DerotaEnemy" },

            { "scrollPos": 1800, "enemyId": "zakato_2_weaving", "spawnX": 150, "enemyType": "ZakatoEnemy", "config": { "amplitude": 70, "verticalSpeed": 1.2, "frequency": 0.035 } },
            { "scrollPos": 1900, "enemyId": "zakato_3_weaving", "spawnX": this.canvas.width - 150 - ZAKATO_DEFAULT_WIDTH, "enemyType": "ZakatoEnemy", "config": { "amplitude": 70, "verticalSpeed": 1.2, "frequency": 0.035 } },

            { "scrollPos": 2200, "enemyId": "zoshy_pair_1", "spawnX": this.canvas.width / 3, "enemyType": "ZoshyEnemy", "config": { "stopY": 150, "hp": 2 } },
            { "scrollPos": 2250, "enemyId": "zoshy_pair_2", "spawnX": this.canvas.width * 2 / 3, "enemyType": "ZoshyEnemy", "config": { "stopY": 150, "hp": 2 } },

            { "scrollPos": 2500, "enemyId": "bacura_long", "spawnX": this.canvas.width / 2 - 100, "enemyType": "BacuraEnemy", "config": { "width": 200, "height": 20, "speed": 0.3 } },

            { "scrollPos": 2800, "enemyId": "toroid_wave_1", "spawnX": 50, "enemyType": "AirEnemy", "hp": 2 },
            { "scrollPos": 2850, "enemyId": "toroid_wave_2", "spawnX": this.canvas.width - 50 - 30, "enemyType": "AirEnemy", "hp": 2 },
            { "scrollPos": 2900, "enemyId": "toroid_wave_3", "spawnX": 100, "enemyType": "AirEnemy", "hp": 2 },
            { "scrollPos": 2950, "enemyId": "toroid_wave_4", "spawnX": this.canvas.width - 100 - 30, "enemyType": "AirEnemy", "hp": 2 },

            { "scrollPos": 3200, "enemyId": "derota_center_strong", "spawnX": this.canvas.width/2 - 20, "initialMapY": 3200, "enemyType": "DerotaEnemy", "config": { "hp": 5, "fireCooldown": 120} },

            { "scrollPos": 3500, "enemyId": "zoshy_ambush_left", "spawnX": 80, "enemyType": "ZoshyEnemy", "config": { "stopY": 180 } },
            { "scrollPos": 3550, "enemyId": "zoshy_ambush_right", "spawnX": this.canvas.width - 80 - ZOSHY_WIDTH, "enemyType": "ZoshyEnemy", "config": { "stopY": 180 } },

            // Guard before boss
            { "scrollPos": DEFAULT_AREA_LENGTH - 700, "enemyId": "bacura_guard", "spawnX": this.canvas.width / 2 - BACURA_DEFAULT_WIDTH / 2, "enemyType": "BacuraEnemy", "config": {"speed": 0.2} },
            { "scrollPos": DEFAULT_AREA_LENGTH - 500, "enemyId": "derota_g_left", "spawnX": this.canvas.width / 4 - 20, "initialMapY": DEFAULT_AREA_LENGTH - 500, "enemyType": "DerotaEnemy", "config": { "hp": 3 } },
            { "scrollPos": DEFAULT_AREA_LENGTH - 500, "enemyId": "derota_g_right", "spawnX": this.canvas.width * 3/4 - 20, "initialMapY": DEFAULT_AREA_LENGTH - 500, "enemyType": "DerotaEnemy", "config": { "hp": 3 } },

            // End of Area 1, boss will trigger after this if DEFAULT_AREA_LENGTH is reached
        ];
        this.nextSpawnIndex = 0;
        this.isGameOverInputRegistered = false;
    }

    update(deltaTime, enemiesArray, canvas, player) {
        if (this.gameState === 'playing') {
            if (!this.isBossActive) {
                this.currentScrollPos += this.scrollSpeed;
                const scrollPosInCurrentArea = this.currentScrollPos - ((this.currentArea - 1) * this.AREA_LENGTH);
                if (scrollPosInCurrentArea >= this.AREA_LENGTH) {
                    if (enemiesArray && canvas) {
                        this.spawnBoss(enemiesArray, canvas);
                    }
                }
            }
            if (this.solActive && this.solObject && player) {
                this.updateSol(player);
            }
        }
        if (this.oneUpDisplayTimer > 0) {
            this.oneUpDisplayTimer--;
        }
    }

    spawnEnemies(enemiesArray, canvas) {
        if (this.gameState !== 'playing' || this.isBossActive) return;
        const effectiveScrollCheck = this.currentScrollPos;

        while (this.nextSpawnIndex < this.enemySpawnTimeline.length &&
               effectiveScrollCheck >= this.enemySpawnTimeline[this.nextSpawnIndex].scrollPos) {
            const spawnData = this.enemySpawnTimeline[this.nextSpawnIndex];
            let newEnemy = null;
            const enemyPosition = { x: spawnData.spawnX, y: DEFAULT_ENEMY_SPAWN_Y_OFFSET };

            if (spawnData.enemyType === "AirEnemy") {
                newEnemy = new AirEnemy(enemyPosition, spawnData.enemyId, spawnData.hp || DEFAULT_ENEMY_HP, spawnData.score || DEFAULT_ENEMY_SCORE);
            } else if (spawnData.enemyType === "ZakatoEnemy") {
                newEnemy = new ZakatoEnemy(enemyPosition, spawnData.enemyId, spawnData.hp || ZAKATO_HP, spawnData.score || ZAKATO_SCORE, spawnData.config || {});
            } else if (spawnData.enemyType === "BacuraEnemy") {
                const config = spawnData.config || {};
                newEnemy = new BacuraEnemy(enemyPosition, spawnData.enemyId, config.width || BACURA_DEFAULT_WIDTH, config.height || BACURA_DEFAULT_HEIGHT, config.speed || BACURA_DEFAULT_SPEED);
            } else if (spawnData.enemyType === "ZoshyEnemy") {
                newEnemy = new ZoshyEnemy(enemyPosition, spawnData.enemyId, spawnData.hp || ZOSHY_HP, spawnData.score || ZOSHY_SCORE, spawnData.config || {});
            } else if (spawnData.enemyType === "DerotaEnemy") {
                newEnemy = new DerotaEnemy({ x: spawnData.spawnX, y: 0 }, spawnData.enemyId, spawnData.hp || DEROTA_HP, spawnData.score || DEROTA_SCORE, spawnData.initialMapY || spawnData.scrollPos, spawnData.config || {});
            } else if (spawnData.enemyType === "PyramidEnemy") {
                newEnemy = new PyramidEnemy({ x: spawnData.spawnX, y: 0 }, spawnData.initialMapY || spawnData.scrollPos, spawnData.config.id, spawnData.config);
            } else if (spawnData.enemyType === "AndorgenesisCoreEnemy") {
                 console.warn("AndorgenesisCoreEnemy should be spawned via spawnBoss, not timeline directly.");
            } else {
                console.warn("Unknown enemy type in timeline:", spawnData.enemyType);
            }

            if (newEnemy) {
                enemiesArray.push(newEnemy);
            }
            this.nextSpawnIndex++;
        }
    }

    spawnBoss(enemiesArray, canvas) {
        if (this.isBossActive || this.gameState !== 'playing') return;
        console.log(`Spawning boss for Area ${this.currentArea} at scrollPos ${this.currentScrollPos}`);
        this.isBossActive = true;
        const bossSpawnX = canvas.width / 2 - CORE_WIDTH / 2;
        const bossInitialMapY = this.currentScrollPos;
        const boss = new AndorgenesisCoreEnemy({ x: bossSpawnX, y: 0 }, bossInitialMapY);
        enemiesArray.push(boss);
    }

    bossDefeated() {
        console.log("Boss defeated!");
        this.isBossActive = false;
        this.currentArea++;
        console.log(`Advancing to Area ${this.currentArea}. Resuming scroll.`);
    }

    pyramidDestroyed(pyramidId) {
        if (this.solActive || (this.solObject && !this.solObject.isActive)) {
             this.pyramidDestructionOrder = [];
             return;
        }
        this.pyramidDestructionOrder.push(pyramidId);
        console.log("Pyramids destroyed order:", this.pyramidDestructionOrder);

        let match = true;
        for (let i = 0; i < this.pyramidDestructionOrder.length; i++) {
            if (i >= SOL_TRIGGER_SEQUENCE.length || this.pyramidDestructionOrder[i] !== SOL_TRIGGER_SEQUENCE[i]) {
                match = false;
                break;
            }
        }

        if (!match) {
            console.log("Pyramid sequence broken. Resetting order.");
            this.pyramidDestructionOrder = [];
        } else if (this.pyramidDestructionOrder.length === SOL_TRIGGER_SEQUENCE.length) {
            console.log("Pyramid sequence complete! Spawning Sol.");
            this.spawnSol();
            this.pyramidDestructionOrder = [];
        }
    }

    spawnSol() {
        if (this.solActive || (this.solObject && !this.solObject.isActive)) return;
        this.solActive = true;
        const spawnX = this.canvas.width / 2;
        const spawnY = this.canvas.height / 3;
        this.solObject = new SolObject(spawnX, spawnY);
        console.log("Sol object spawned at", spawnX, spawnY);
    }

    updateSol(player) {
        if (!this.solObject || !this.solObject.isActive) {
            if(this.solActive && this.solObject && !this.solObject.isActive) this.solActive = false;
            this.solObject = null;
            return;
        }
        this.solObject.update();

        const sol = this.solObject;
        const playerLeft = player.position.x - player.width / 2;
        const playerRight = player.position.x + player.width / 2;
        const playerTop = player.position.y - player.height / 2;
        const playerBottom = player.position.y + player.height / 2;

        const solLeft = sol.position.x - sol.width / 2;
        const solRight = sol.position.x + sol.width / 2;
        const solTop = sol.position.y - sol.height / 2;
        const solBottom = sol.position.y + sol.height / 2;

        if (playerLeft < solRight && playerRight > solLeft &&
            playerTop < solBottom && playerBottom > solTop) {
            this.addScore(sol.scoreValue || SOL_SCORE_BONUS);
            sol.collect();
            this.solActive = false;
            this.solObject = null;
            this.pyramidDestructionOrder = [];
        }
    }

    addScore(points) {
        if (this.gameState !== 'playing') return;
        this.score += points;
        if (this.score > this.highScore) {
            this.highScore = this.score;
        }
        if (!this.isFirstExtendAwarded && this.score >= this.nextExtendScore) {
            this.playerLives++;
            this.isFirstExtendAwarded = true;
            this.nextExtendScore = this.nextExtendScore + SUBSEQUENT_EXTEND_INTERVAL;
            this.oneUpDisplayTimer = ONE_UP_DISPLAY_DURATION_FRAMES;
            console.log(`1UP! Score: ${this.score}, Lives: ${this.playerLives}. Next extend at ${this.nextExtendScore}`);
        } else if (this.isFirstExtendAwarded && this.score >= this.nextExtendScore) {
            this.playerLives++;
            this.nextExtendScore += SUBSEQUENT_EXTEND_INTERVAL;
            this.oneUpDisplayTimer = ONE_UP_DISPLAY_DURATION_FRAMES;
            console.log(`1UP! Score: ${this.score}, Lives: ${this.playerLives}. Next extend at ${this.nextExtendScore}`);
        }
    }

    playerDied() {
        if (this.gameState !== 'playing') return;
        this.playerLives--;
        if (this.playerLives < 0) {
            this.gameState = 'gameOver';
            this.saveHighScore();
            console.log("GAME OVER. Final Score:", this.score, "High Score:", this.highScore);
        } else {
            console.log("Player died. Lives remaining:", this.playerLives);
        }
    }

    saveHighScore() {
        localStorage.setItem(HIGH_SCORE_STORAGE_KEY, this.highScore.toString());
        console.log("High score saved:", this.highScore);
    }

    resetGame(player, enemiesArray) {
        console.log("Resetting game...");
        this.score = 0;
        this.playerLives = INITIAL_PLAYER_LIVES;
        this.currentScrollPos = 0;
        this.nextSpawnIndex = 0;
        this.gameState = INITIAL_GAME_STATE;

        this.isBossActive = false;
        this.currentArea = 1;

        this.nextExtendScore = FIRST_EXTEND_SCORE;
        this.isFirstExtendAwarded = false;
        this.oneUpDisplayTimer = 0;

        this.pyramidDestructionOrder = [];
        this.solActive = false;
        this.solObject = null;

        enemiesArray.length = 0;
        if (player) {
            player.reset();
        }
        console.log("Game reset. Lives:", this.playerLives, "Score:", this.score);
    }
}
