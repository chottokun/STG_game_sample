// SolObject.js

const SOL_WIDTH = 40;
const SOL_HEIGHT = 40;
const SOL_COLOR_CORE = 'yellow';
const SOL_COLOR_RAYS = 'rgba(255, 255, 0, 0.7)'; // Semi-transparent yellow for rays
const SOL_PULSE_SPEED = 0.05; // For pulsing effect
const SOL_SCORE_BONUS = 2000; // Static property for score, or GameManager can handle it

// 8-figure movement parameters
const SOL_AMPLITUDE_X = 50;
const SOL_AMPLITUDE_Y = 25;
const SOL_FREQUENCY_X = 0.02;
const SOL_FREQUENCY_Y = 0.04; // Typically Y frequency is double X for an 8-shape (Lissajous)

export class SolObject {
    constructor(spawnX, spawnY) {
        this.initialPosition = { x: spawnX, y: spawnY }; // Position where it first appears
        this.position = { x: spawnX, y: spawnY };
        this.width = SOL_WIDTH;
        this.height = SOL_HEIGHT;

        this.age = 0; // Timer for movement and animation

        // Center of the 8-figure path will be its spawn position
        this.centerX = spawnX;
        this.centerY = spawnY;

        this.amplitudeX = SOL_AMPLITUDE_X;
        this.amplitudeY = SOL_AMPLITUDE_Y;
        this.frequencyX = SOL_FREQUENCY_X;
        this.frequencyY = SOL_FREQUENCY_Y;

        this.isActive = true; // Becomes false once collected
        this.scoreValue = SOL_SCORE_BONUS; // For GameManager to add score
    }

    update() {
        if (!this.isActive) return;

        this.age++;

        // Lissajous curve for 8-figure movement
        // X = centerX + A * sin(a*t + delta)
        // Y = centerY + B * sin(b*t)
        // For a figure 8, often a/b = 1/2 or 2/1, and delta = PI/2
        this.position.x = this.centerX + this.amplitudeX * Math.sin(this.age * this.frequencyX + Math.PI / 2);
        this.position.y = this.centerY + this.amplitudeY * Math.sin(this.age * this.frequencyY);
    }

    draw(ctx) {
        if (!this.isActive) return;

        const pulseFactor = 0.5 + (Math.sin(this.age * SOL_PULSE_SPEED) + 1) / 4; // Varies between 0.5 and 1.0

        // Draw rays
        ctx.fillStyle = SOL_COLOR_RAYS;
        const rayLength = (this.width / 2) * (1.2 + 0.3 * pulseFactor);
        for (let i = 0; i < 8; i++) { // 8 rays
            ctx.save();
            ctx.translate(this.position.x, this.position.y);
            ctx.rotate((Math.PI / 4) * i + (this.age * 0.01)); // Slight rotation of rays
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(rayLength, -5 * pulseFactor);
            ctx.lineTo(rayLength, 5 * pulseFactor);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        // Draw core
        ctx.fillStyle = SOL_COLOR_CORE;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, (this.width / 2.5) * pulseFactor, 0, Math.PI * 2);
        ctx.fill();
    }

    collect() {
        this.isActive = false;
        console.log("Sol collected!");
        // GameManager will handle score and other effects.
    }
}
