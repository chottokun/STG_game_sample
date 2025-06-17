// EffectManager.js

export class EffectManager {
    constructor(canvas) {
        this.canvas = canvas; // Store canvas reference for width/height if needed by effects
        this.effects = [];
    }

    /**
     * Adds a new visual effect.
     * @param {string} type - Type of effect (e.g., "screenFlash", "hitSpark", "explosion").
     * @param {object} config - Configuration for the effect (duration, color, position, size, etc.).
     */
    addEffect(type, config = {}) {
        const effectBase = {
            type: type,
            duration: config.duration || 20, // Default duration in frames
            timer: config.duration || 20,
            color: config.color || 'white',
        };

        switch (type) {
            case 'screenFlash':
                this.effects.push({
                    ...effectBase,
                    // Screen flash specific: color is main property
                });
                break;
            case 'hitSpark':
                this.effects.push({
                    ...effectBase,
                    x: config.x || 0,
                    y: config.y || 0,
                    size: config.size || 8,
                    // Hit spark might just be a quick flash of a shape
                });
                break;
            case 'explosion':
                this.effects.push({
                    ...effectBase,
                    x: config.x || 0,
                    y: config.y || 0,
                    radius: 0, // Starts at 0 and expands
                    maxRadius: config.size || 30, // Max size of explosion circle
                    // Explosion might have multiple particles or more complex visuals later
                });
                break;
            default:
                console.warn(`EffectManager: Unknown effect type "${type}"`);
                return;
        }
        // console.log("Added effect:", this.effects[this.effects.length-1]);
    }

    update() {
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];
            effect.timer--;

            if (effect.type === 'explosion') {
                // Expand radius from 0 to maxRadius over the duration
                effect.radius = effect.maxRadius * (1 - (effect.timer / effect.duration));
            }

            if (effect.type === 'screenFlash') {
                 // Calculate alpha based on timer to fade out
                effect.currentAlpha = Math.max(0, (effect.timer / effect.duration) * 0.8); // Max alpha 0.8
            }


            if (effect.timer <= 0) {
                this.effects.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        if (!this.canvas && this.effects.some(e => e.type === 'screenFlash')) {
            console.warn("EffectManager: Canvas reference needed for screenFlash but not provided.");
        }

        for (const effect of this.effects) {
            switch (effect.type) {
                case 'screenFlash':
                    if (this.canvas) {
                        ctx.fillStyle = effect.color.startsWith('rgba') ? effect.color : `rgba(${this.hexToRgb(effect.color).r}, ${this.hexToRgb(effect.color).g}, ${this.hexToRgb(effect.color).b}, ${effect.currentAlpha})`;
                        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                    }
                    break;
                case 'hitSpark':
                    // Simple flashing square for hit spark
                    if (effect.timer % 4 < 2) { // Flash on/off every 2 frames
                        ctx.fillStyle = effect.color;
                        ctx.fillRect(effect.x - effect.size / 2, effect.y - effect.size / 2, effect.size, effect.size);
                    }
                    break;
                case 'explosion':
                    ctx.fillStyle = effect.color;
                    ctx.beginPath();
                    ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
                    ctx.fill();
                    break;
            }
        }
    }

    // Helper to convert hex colors (if used) to rgba for screenFlash opacity
    hexToRgb(hex) {
        let r = 0, g = 0, b = 0;
        if (hex.length == 4) { // #RGB
            r = "0x" + hex[1] + hex[1];
            g = "0x" + hex[2] + hex[2];
            b = "0x" + hex[3] + hex[3];
        } else if (hex.length == 7) { // #RRGGBB
            r = "0x" + hex[1] + hex[2];
            g = "0x" + hex[3] + hex[4];
            b = "0x" + hex[5] + hex[6];
        }
        return { r: +r, g: +g, b: +b };
    }

    clear() {
        this.effects = [];
    }
}
