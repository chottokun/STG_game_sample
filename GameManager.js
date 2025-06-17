import { AirEnemy, ZakatoEnemy, BacuraEnemy, ZoshyEnemy, DerotaEnemy, GroundEnemy } from './Enemy.js';
import { PyramidEnemy } from './PyramidEnemy.js';
import { SolObject } from './SolObject.js';
import { AndorgenesisCoreEnemy } from './AndorgenesisCoreEnemy.js';
import { DomGramEnemy } from './DomGramEnemy.js';
import { GrobdaEnemy } from './GrobdaEnemy.js';
import { EffectManager } from './EffectManager.js';
import { ObjectPoolManager } from './ObjectPoolManager.js';
import { ZapperBullet } from './ZapperBullet.js';

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
const ZOSHY_WIDTH = 32;

const DEROTA_HP = 3;
const DEROTA_SCORE = 200;
const DEROTA_DEFAULT_WIDTH = 40;

const DOMGRAM_DEFAULT_WIDTH = 50; // Default width for DomGram, matches DomGramEnemy.js
const GROBDA_DEFAULT_WIDTH = 40;  // Default width for Grobda, matches GrobdaEnemy.js

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

        this.effectManager = new EffectManager(this.canvas);
        this.poolManager = new ObjectPoolManager();

        this.poolManager.registerPool('zapperBullet', ZapperBullet, 5);

        this.enemySpawnTimeline = [
            // --- Area 1 --- (scrollPos 0 to AREA_LENGTH - 1)
            { "scrollPos": 100, "enemyId": "a1_toroid_1", "spawnX": this.canvas.width / 2, "enemyType": "AirEnemy" },
            { "scrollPos": 300, "enemyId": "a1_toroid_2", "spawnX": this.canvas.width / 3, "enemyType": "AirEnemy" },
            { "scrollPos": 350, "enemyId": "a1_toroid_3", "spawnX": this.canvas.width * 2 / 3, "enemyType": "AirEnemy" },
            { "scrollPos": 500, "enemyId": "a1_pyramid_left", "spawnX": 100, "initialMapY": 500, "enemyType": "PyramidEnemy", "config": { "id": "left" } },
            { "scrollPos": 550, "enemyId": "a1_pyramid_right", "spawnX": this.canvas.width - 100 - 30, "initialMapY": 550, "enemyType": "PyramidEnemy", "config": { "id": "right" } },
            { "scrollPos": 600, "enemyId": "a1_pyramid_middle", "spawnX": this.canvas.width / 2 - 15, "initialMapY": 600, "enemyType": "PyramidEnemy", "config": { "id": "middle" } },
            { "scrollPos": 700, "enemyId": "a1_zakato_1", "spawnX": this.canvas.width / 2 - ZAKATO_DEFAULT_WIDTH / 2, "enemyType": "ZakatoEnemy", "config": { "amplitude": 80, "frequency": 0.025, "verticalSpeed": 1 } },
            { "scrollPos": 900, "enemyId": "a1_zoshy_1", "spawnX": this.canvas.width / 2, "enemyType": "ZoshyEnemy", "config": { "stopY": 100 } },
            { "scrollPos": 1050, "enemyId": "a1_bacura_1", "spawnX": this.canvas.width / 2 - BACURA_DEFAULT_WIDTH / 2, "enemyType": "BacuraEnemy", "config": { "speed": 0.7 } },
            { "scrollPos": 1300, "enemyId": "a1_toroid_s1", "spawnX": 50, "enemyType": "AirEnemy" },
            { "scrollPos": 1350, "enemyId": "a1_toroid_s2", "spawnX": 100, "enemyType": "AirEnemy" },
            { "scrollPos": 1400, "enemyId": "a1_domgram_1", "spawnX": this.canvas.width - 80 - DOMGRAM_DEFAULT_WIDTH, "initialMapY": 1400, "enemyType": "DomGramEnemy" },
            { "scrollPos": 1500, "enemyId": "a1_derota_1", "spawnX": 100, "initialMapY": 1500, "enemyType": "DerotaEnemy" },
            { "scrollPos": 1700, "enemyId": "a1_grobda_1", "spawnX": this.canvas.width / 2 - GROBDA_DEFAULT_WIDTH / 2, "initialMapY": 1700, "enemyType": "GrobdaEnemy", "config": {"patrolDistance": 50}},
            { "scrollPos": 2000, "enemyId": "a1_zakato_pair1", "spawnX": 50, "enemyType": "ZakatoEnemy", "config": { "amplitude": 40, "verticalSpeed": 1.2 } },
            { "scrollPos": 2050, "enemyId": "a1_zakato_pair2", "spawnX": this.canvas.width - 50 - ZAKATO_DEFAULT_WIDTH, "enemyType": "ZakatoEnemy", "config": { "amplitude": 40, "verticalSpeed": 1.2 } },
            { "scrollPos": 2300, "enemyId": "a1_zoshy_duo1", "spawnX": this.canvas.width * 0.25, "enemyType": "ZoshyEnemy", "config": { "stopY": 120, "hp": 2 } },
            { "scrollPos": 2350, "enemyId": "a1_zoshy_duo2", "spawnX": this.canvas.width * 0.75, "enemyType": "ZoshyEnemy", "config": { "stopY": 120, "hp": 2 } },
            { "scrollPos": 2600, "enemyId": "a1_bacura_block", "spawnX": 100, "enemyType": "BacuraEnemy", "config": { "width": this.canvas.width - 200, "speed": 0.3 } },
            { "scrollPos": 3000, "enemyId": "a1_derota_pair1", "spawnX": 70, "initialMapY": 3000, "enemyType": "DerotaEnemy" },
            { "scrollPos": 3000, "enemyId": "a1_derota_pair2", "spawnX": this.canvas.width - 70 - DEROTA_DEFAULT_WIDTH, "initialMapY": 3000, "enemyType": "DerotaEnemy" },
            { "scrollPos": 3300, "enemyId": "a1_domgram_fort1", "spawnX": 50, "initialMapY": 3300, "enemyType": "DomGramEnemy", "config": {"hp": 5, "score": 1800}},
            { "scrollPos": 3300, "enemyId": "a1_domgram_fort2", "spawnX": this.canvas.width - 50 - DOMGRAM_DEFAULT_WIDTH, "initialMapY": 3300, "enemyType": "DomGramEnemy", "config": {"hp": 5, "score": 1800}},
            { "scrollPos": 3600, "enemyId": "a1_grobda_center", "spawnX": this.canvas.width / 2 - GROBDA_DEFAULT_WIDTH/2, "initialMapY": 3600, "enemyType": "GrobdaEnemy", "config": {"patrolDistance": 100, "detectionRange": 300, "hp": 5}},
            { "scrollPos": this.AREA_LENGTH - 700, "enemyId": "a1_bacura_guard", "spawnX": this.canvas.width / 2 - BACURA_DEFAULT_WIDTH / 2, "enemyType": "BacuraEnemy", "config": {"speed": 0.2} },
            { "scrollPos": this.AREA_LENGTH - 500, "enemyId": "a1_derota_g_left", "spawnX": this.canvas.width / 4 - 20, "initialMapY": this.AREA_LENGTH - 500, "enemyType": "DerotaEnemy", "config": { "hp": 3 } },
            { "scrollPos": this.AREA_LENGTH - 500, "enemyId": "a1_derota_g_right", "spawnX": this.canvas.width * 3/4 - 20, "initialMapY": this.AREA_LENGTH - 500, "enemyType": "DerotaEnemy", "config": { "hp": 3 } },

            // --- Area 2 Entries ---
            { "scrollPos": this.AREA_LENGTH + 100, "enemyId": "a2_toroid_wave1", "spawnX": 50, "enemyType": "AirEnemy", "hp": 2 },
            { "scrollPos": this.AREA_LENGTH + 150, "enemyId": "a2_toroid_wave2", "spawnX": 100, "enemyType": "AirEnemy", "hp": 2 },
            { "scrollPos": this.AREA_LENGTH + 200, "enemyId": "a2_toroid_wave3", "spawnX": 150, "enemyType": "AirEnemy", "hp": 2 },
            { "scrollPos": this.AREA_LENGTH + 250, "enemyId": "a2_toroid_wave4", "spawnX": 100, "enemyType": "AirEnemy", "hp": 2 },
            { "scrollPos": this.AREA_LENGTH + 300, "enemyId": "a2_toroid_wave5", "spawnX": 50, "enemyType": "AirEnemy", "hp": 2 },
            { "scrollPos": this.AREA_LENGTH + 500, "enemyId": "a2_zakato_pair1", "spawnX": 80, "enemyType": "ZakatoEnemy", "config": { "amplitude": 60, "verticalSpeed": 1.2, "frequency": 0.04 } },
            { "scrollPos": this.AREA_LENGTH + 550, "enemyId": "a2_zakato_pair2", "spawnX": this.canvas.width - 80 - ZAKATO_DEFAULT_WIDTH, "enemyType": "ZakatoEnemy", "config": { "amplitude": 60, "verticalSpeed": 1.2, "frequency": 0.04 } },
            { "scrollPos": this.AREA_LENGTH + 800, "enemyId": "a2_zoshy_center", "spawnX": this.canvas.width / 2 - ZOSHY_WIDTH / 2, "enemyType": "ZoshyEnemy", "config": { "stopY": 130, "hp": 3, "linger": 120 } },
            { "scrollPos": this.AREA_LENGTH + 1000, "enemyId": "a2_domgram_left", "spawnX": 50, "initialMapY": this.AREA_LENGTH + 1000, "enemyType": "DomGramEnemy", "config": {"hp": 5} },
            { "scrollPos": this.AREA_LENGTH + 1000, "enemyId": "a2_domgram_right", "spawnX": this.canvas.width - 50 - DOMGRAM_DEFAULT_WIDTH, "initialMapY": this.AREA_LENGTH + 1000, "enemyType": "DomGramEnemy", "config": {"hp": 5} },
            { "scrollPos": this.AREA_LENGTH + 1200, "enemyId": "a2_grobda_tough", "spawnX": this.canvas.width / 2 - GROBDA_DEFAULT_WIDTH / 2, "initialMapY": this.AREA_LENGTH + 1200, "enemyType": "GrobdaEnemy", "config": {"patrolDistance": 30, "hp": 5, "detectionRange": 300, "fireCooldown": 80}},
            { "scrollPos": this.AREA_LENGTH + 1500, "enemyId": "a2_bacura_center_fast", "spawnX": this.canvas.width / 2 - BACURA_DEFAULT_WIDTH / 2, "enemyType": "BacuraEnemy", "config": { "speed": 1.0 } },
            { "scrollPos": this.AREA_LENGTH + 1800, "enemyId": "a2_pyramid_L", "spawnX": 80, "initialMapY": this.AREA_LENGTH + 1800, "enemyType": "PyramidEnemy", "config": { "id": "left" } },
            { "scrollPos": this.AREA_LENGTH + 1850, "enemyId": "a2_pyramid_R", "spawnX": this.canvas.width - 80 - 30, "initialMapY": this.AREA_LENGTH + 1850, "enemyType": "PyramidEnemy", "config": { "id": "right" } },
            { "scrollPos": this.AREA_LENGTH + 1900, "enemyId": "a2_pyramid_M", "spawnX": this.canvas.width / 2 - 15, "initialMapY": this.AREA_LENGTH + 1900, "enemyType": "PyramidEnemy", "config": { "id": "middle" } },
            { "scrollPos": this.AREA_LENGTH + 2200, "enemyId": "a2_derota_ambush1", "spawnX": 60, "initialMapY": this.AREA_LENGTH + 2200, "enemyType": "DerotaEnemy" },
            { "scrollPos": this.AREA_LENGTH + 2200, "enemyId": "a2_derota_ambush2", "spawnX": this.canvas.width - 60 - DEROTA_DEFAULT_WIDTH, "initialMapY": this.AREA_LENGTH + 2200, "enemyType": "DerotaEnemy" },
            { "scrollPos": this.AREA_LENGTH + 2500, "enemyId": "a2_zakato_squad1", "spawnX": this.canvas.width * 0.25, "enemyType": "ZakatoEnemy", "config": {"verticalSpeed": 1.4, "hp": 2}},
            { "scrollPos": this.AREA_LENGTH + 2550, "enemyId": "a2_zakato_squad2", "spawnX": this.canvas.width * 0.5, "enemyType": "ZakatoEnemy", "config": {"verticalSpeed": 1.4, "hp": 2}},
            { "scrollPos": this.AREA_LENGTH + 2600, "enemyId": "a2_zakato_squad3", "spawnX": this.canvas.width * 0.75, "enemyType": "ZakatoEnemy", "config": {"verticalSpeed": 1.4, "hp": 2}},
            { "scrollPos": (2 * this.AREA_LENGTH) - 700, "enemyId": "a2_bacura_guard_final", "spawnX": this.canvas.width / 2 - (BACURA_DEFAULT_WIDTH + 20) / 2, "enemyType": "BacuraEnemy", "config": {"width": BACURA_DEFAULT_WIDTH + 20, "speed": 0.2}},
            { "scrollPos": (2 * this.AREA_LENGTH) - 500, "enemyId": "a2_derota_g_final_L", "spawnX": this.canvas.width / 4 - 20, "initialMapY": (2 * this.AREA_LENGTH) - 500, "enemyType": "DerotaEnemy", "config": { "hp": 4 } },
            { "scrollPos": (2 * this.AREA_LENGTH) - 500, "enemyId": "a2_derota_g_final_R", "spawnX": this.canvas.width * 3/4 - 20, "initialMapY": (2 * this.AREA_LENGTH) - 500, "enemyType": "DerotaEnemy", "config": { "hp": 4 } },

            // --- Area 3 Entries ---
            { "scrollPos": (2 * this.AREA_LENGTH) + 100, "enemyId": "a3_grobda_lead", "spawnX": this.canvas.width / 2 - GROBDA_DEFAULT_WIDTH/2, "initialMapY": (2 * this.AREA_LENGTH) + 100, "enemyType": "GrobdaEnemy", "config": {"hp": 5, "patrolDistance": 80} },
            { "scrollPos": (2 * this.AREA_LENGTH) + 200, "enemyId": "a3_toroid_escort1", "spawnX": this.canvas.width / 2 - 80, "enemyType": "AirEnemy", "hp": 3 },
            { "scrollPos": (2 * this.AREA_LENGTH) + 200, "enemyId": "a3_toroid_escort2", "spawnX": this.canvas.width / 2 + 80, "enemyType": "AirEnemy", "hp": 3 },
            { "scrollPos": (2 * this.AREA_LENGTH) + 400, "enemyId": "a3_domgram_central_strong", "spawnX": this.canvas.width/2 - DOMGRAM_DEFAULT_WIDTH/2, "initialMapY": (2 * this.AREA_LENGTH) + 400, "enemyType": "DomGramEnemy", "config": {"hp": 8, "score": 2500} },
            { "scrollPos": (2 * this.AREA_LENGTH) + 450, "enemyId": "a3_derota_flank1", "spawnX": this.canvas.width/2 - 100 - DEROTA_DEFAULT_WIDTH, "initialMapY": (2 * this.AREA_LENGTH) + 450, "enemyType": "DerotaEnemy"},
            { "scrollPos": (2 * this.AREA_LENGTH) + 450, "enemyId": "a3_derota_flank2", "spawnX": this.canvas.width/2 + 100, "initialMapY": (2 * this.AREA_LENGTH) + 450, "enemyType": "DerotaEnemy"},
            { "scrollPos": (2 * this.AREA_LENGTH) + 700, "enemyId": "a3_zoshy_triple1", "spawnX": this.canvas.width * 0.25, "enemyType": "ZoshyEnemy", "config": {"stopY": 100, "hp": 3}},
            { "scrollPos": (2 * this.AREA_LENGTH) + 750, "enemyId": "a3_zoshy_triple2", "spawnX": this.canvas.width * 0.50, "enemyType": "ZoshyEnemy", "config": {"stopY": 120, "hp": 3}},
            { "scrollPos": (2 * this.AREA_LENGTH) + 800, "enemyId": "a3_zoshy_triple3", "spawnX": this.canvas.width * 0.75, "enemyType": "ZoshyEnemy", "config": {"stopY": 100, "hp": 3}},
            { "scrollPos": (2 * this.AREA_LENGTH) + 1000, "enemyId": "a3_bacura_field1", "spawnX": 0, "enemyType": "BacuraEnemy", "config": {"width": this.canvas.width / 3, "speed": 0.4}},
            { "scrollPos": (2 * this.AREA_LENGTH) + 1050, "enemyId": "a3_bacura_field2", "spawnX": this.canvas.width * 2/3, "enemyType": "BacuraEnemy", "config": {"width": this.canvas.width / 3, "speed": 0.4}},
            { "scrollPos": (2 * this.AREA_LENGTH) + 1300, "enemyId": "a3_zakato_siren1", "spawnX": 0, "enemyType": "ZakatoEnemy", "config": {"amplitude": 80, "frequency": 0.05, "verticalSpeed": 2, "hp": 2}},
            { "scrollPos": (2 * this.AREA_LENGTH) + 1300, "enemyId": "a3_zakato_siren2", "spawnX": this.canvas.width - ZAKATO_DEFAULT_WIDTH, "enemyType": "ZakatoEnemy", "config": {"amplitude": -80, "initialX": this.canvas.width - ZAKATO_DEFAULT_WIDTH, "frequency": 0.05, "verticalSpeed": 2, "hp": 2}},
            { "scrollPos": (2 * this.AREA_LENGTH) + 1600, "enemyId": "a3_grobda_duo1", "spawnX": this.canvas.width * 0.3, "initialMapY": (2*this.AREA_LENGTH)+1600, "enemyType": "GrobdaEnemy", "config": {"patrolDistance": 40}},
            { "scrollPos": (2 * this.AREA_LENGTH) + 1650, "enemyId": "a3_grobda_duo2", "spawnX": this.canvas.width * 0.7 - GROBDA_DEFAULT_WIDTH, "initialMapY": (2*this.AREA_LENGTH)+1650, "enemyType": "GrobdaEnemy", "config": {"patrolDistance": 40}},
            { "scrollPos": (2 * this.AREA_LENGTH) + 2000, "enemyId": "a3_pyramid_L", "spawnX": 200, "initialMapY": (2*this.AREA_LENGTH)+2000, "enemyType": "PyramidEnemy", "config": { "id": "left" } },
            { "scrollPos": (2 * this.AREA_LENGTH) + 2000, "enemyId": "a3_pyramid_R", "spawnX": this.canvas.width - 200 - 30, "initialMapY": (2*this.AREA_LENGTH)+2000, "enemyType": "PyramidEnemy", "config": { "id": "right" } },
            { "scrollPos": (2 * this.AREA_LENGTH) + 2000, "enemyId": "a3_pyramid_M", "spawnX": this.canvas.width / 2 - 15, "initialMapY": (2*this.AREA_LENGTH)+2000, "enemyType": "PyramidEnemy", "config": { "id": "middle" } },
            { "scrollPos": (3 * this.AREA_LENGTH) - 800, "enemyId": "a3_domgram_g1", "spawnX": this.canvas.width/2 - DOMGRAM_DEFAULT_WIDTH * 1.5 - 10, "initialMapY": (3 * this.AREA_LENGTH) - 800, "enemyType": "DomGramEnemy", "config": {"hp": 6}},
            { "scrollPos": (3 * this.AREA_LENGTH) - 800, "enemyId": "a3_domgram_g2", "spawnX": this.canvas.width/2 + DOMGRAM_DEFAULT_WIDTH * 0.5 + 10, "initialMapY": (3 * this.AREA_LENGTH) - 800, "enemyType": "DomGramEnemy", "config": {"hp": 6}},
            { "scrollPos": (3 * this.AREA_LENGTH) - 600, "enemyId": "a3_grobda_g1", "spawnX": this.canvas.width * 0.25, "initialMapY": (3 * this.AREA_LENGTH) - 600, "enemyType": "GrobdaEnemy", "config": {"hp": 5, "detectionRange": 350}},
            { "scrollPos": (3 * this.AREA_LENGTH) - 600, "enemyId": "a3_grobda_g2", "spawnX": this.canvas.width * 0.75 - GROBDA_DEFAULT_WIDTH, "initialMapY": (3 * this.AREA_LENGTH) - 600, "enemyType": "GrobdaEnemy", "config": {"hp": 5, "detectionRange": 350}},
            { "scrollPos": (3 * this.AREA_LENGTH) - 400, "enemyId": "a3_bacura_final", "spawnX": this.canvas.width / 2 - BACURA_DEFAULT_WIDTH / 2, "enemyType": "BacuraEnemy", "config": {"speed": 0.1}},
        ];
        this.nextSpawnIndex = 0;
        this.isGameOverInputRegistered = false;
    }

    update(deltaTime, enemiesArray, canvas, player, inputManager) {
        if (this.gameState === 'playing') {
            this.currentFrameCount++;
            if (inputManager) {
                const frameInputs = inputManager.getActiveGameActions();
                if (Object.keys(frameInputs).length > 0) {
                    this.replayData.push({ frame: this.currentFrameCount, inputs: frameInputs });
                }
            }
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
        this.effectManager.update();
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
            } else if (spawnData.enemyType === "DomGramEnemy") {
                newEnemy = new DomGramEnemy({ x: spawnData.spawnX, y: 0 }, spawnData.initialMapY || spawnData.scrollPos, spawnData.enemyId, spawnData.config || {});
            } else if (spawnData.enemyType === "GrobdaEnemy") {
                newEnemy = new GrobdaEnemy({ x: spawnData.spawnX, y: 0 }, spawnData.initialMapY || spawnData.scrollPos, spawnData.enemyId, spawnData.config || {});
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
            this.effectManager.addEffect('screenFlash', { duration: 15, color: 'rgba(255, 255, 150, 0.6)' });
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

    playerDied(player) {
        if (this.gameState !== 'playing') return;
        this.playerLives--;
        if (this.playerLives < 0) {
            this.gameState = 'gameOver';
            this.saveHighScore();
            if (player) {
                this.effectManager.addEffect('explosion', {
                    x: player.position.x,
                    y: player.position.y,
                    size: player.width * 1.8,
                    color: 'red',
                    duration: 45
                });
            }
            console.log("GAME OVER. Final Score:", this.score, "High Score:", this.highScore);
            console.log("Replay Data Length:", this.replayData.length);
            if (this.replayData.length > 0) {
                 console.log("First few replay frames:", JSON.stringify(this.replayData.slice(0, 5)));
            }
        } else {
            if (player) {
                 this.effectManager.addEffect('explosion', {
                    x: player.position.x,
                    y: player.position.y,
                    size: player.width * 1.2,
                    color: 'rgba(220, 220, 255, 0.7)',
                    duration: 30
                });
            }
            console.log("Player lost a life. Lives remaining:", this.playerLives);
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

        this.effectManager.clear();
        this.poolManager.resetAllPools();

        enemiesArray.length = 0;
        if (player) {
            player.reset();
        }
        console.log("Game reset. Lives:", this.playerLives, "Score:", this.score);
    }
}
