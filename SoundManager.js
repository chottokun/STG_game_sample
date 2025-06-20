// SoundManager.js

export class SoundManager {
    constructor() {
        this.sounds = {}; // Stores Audio objects
        this.isMuted = false;
        this.audioUnlocked = false; // Has user interaction occurred?

        this.soundPaths = {
            'zapper': 'sounds/zapper.wav',
            'blasterFire': 'sounds/blaster_fire.wav',
            'blasterExplosion': 'sounds/blaster_explosion.wav',
            'enemyExplosion': 'sounds/enemy_explosion.wav',
            'playerHit': 'sounds/player_hit.wav',
            'playerDeath': 'sounds/player_death.wav',
            'solCollected': 'sounds/sol_collected.wav',
            'oneUp': 'sounds/one_up.wav',
            'bossHit': 'sounds/boss_hit.wav',
            'bossExplosion': 'sounds/boss_explosion.wav',
            'bgm_area1': 'sounds/bgm_area1.mp3',
            'bgm_boss': 'sounds/bgm_boss.mp3',
            // Tiny silent WAV data URI for unlocking audio context
            'unlock': "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA"
        };

        this.loadSounds();
    }

    loadSounds() {
        // console.log("SoundManager: Initializing sounds (conceptually)...");
        for (const name in this.soundPaths) {
            const path = this.soundPaths[name];
            const audio = new Audio();
            if (name === 'unlock' || path.startsWith('data:')) {
                audio.src = path;
            }
            this.sounds[name] = audio;
        }
    }

    unlockAudioContext() {
        if (this.audioUnlocked) return;

        const unlockSound = this.sounds['unlock'];
        if (unlockSound) {
            unlockSound.volume = 0.001;
            unlockSound.play()
                .then(() => {
                    this.audioUnlocked = true;
                    console.log("SoundManager: Audio context unlocked by user interaction.");
                })
                .catch(error => {
                    // console.warn(`SoundManager: Unlock sound play failed: ${error.message}. Audio might remain locked.`);
                    // Fallback: assume unlocked on any interaction attempt, even if silent play fails.
                    this.audioUnlocked = true;
                });
        } else {
            // console.warn("SoundManager: 'unlock' sound not found for unlocking audio context. Assuming unlocked.");
            this.audioUnlocked = true;
        }
    }

    playSound(name, volume = 0.5) {
        if (this.isMuted || !this.sounds[name]) return;
        if (!this.audioUnlocked) {
             // console.log(`SoundManager: Audio not unlocked. Play for "${name}" might fail or be silent.`);
             // Attempt to play anyway, or queue it. For now, let it try.
        }

        const sound = this.sounds[name];
        const path = this.soundPaths[name];

        if ((!sound.src || sound.src !== path) && path && !path.startsWith('data:')) {
            console.log(`SoundManager: (Conceptual) Play SFX: "${name}" (path: ${path}) | Volume: ${volume}`);
            return;
        }

        if (path && path.startsWith('data:') && (!sound.src || sound.src !== path) ) {
            sound.src = path; // Ensure data URI is set if not already
        }

        sound.currentTime = 0;
        sound.volume = volume;
        sound.play()
            .catch(error => {
                // console.warn(`SoundManager: Error playing sound "${name}": ${error.message}`);
            });
    }

    playBGM(name, volume = 0.3) {
        if (this.isMuted || !this.sounds[name]) return;
        if (!this.audioUnlocked) {
            // console.log(`SoundManager: BGM "${name}" playback deferred (Muted: ${this.isMuted}, Unlocked: ${this.audioUnlocked}).`);
            return;
        }

        const bgm = this.sounds[name];
        const path = this.soundPaths[name];

        if ((!bgm.src || bgm.src !== path) && path && !path.startsWith('data:')) {
             console.log(`SoundManager: (Conceptual) Play BGM: "${name}" (path: ${path}) | Volume: ${volume}, Loop: true`);
             return;
        }
        if (path && path.startsWith('data:') && (!bgm.src || bgm.src !== path)) {
            bgm.src = path;
        }

        if (bgm.paused || bgm.ended || bgm.currentTime === 0) {
            bgm.loop = true;
            bgm.volume = volume;
            bgm.play()
                .then(() => { console.log(`SoundManager: BGM "${name}" playing.`); })
                .catch(error => {
                    // console.warn(`SoundManager: Error playing BGM "${name}": ${error.message}`);
                });
        }
    }

    stopBGM(name) {
        const bgm = this.sounds[name];
        if (bgm && !bgm.paused) {
            bgm.pause();
            bgm.currentTime = 0;
            console.log(`SoundManager: BGM "${name}" stopped.`);
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        console.log(`SoundManager: Mute toggled. isMuted = ${this.isMuted}`);
        if (this.isMuted) {
            for (const name in this.sounds) {
                const sound = this.sounds[name];
                if (sound && !sound.paused) {
                    sound.pause();
                    if (name.startsWith('bgm_')) sound.currentTime = 0;
                }
            }
        }
    }
}
