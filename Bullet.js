// Bullet.js

export class Bullet {
    constructor(x, y, width, height, color, speed, angle) {
        this.position = { x, y };
        this.width = width;
        this.height = height;
        this.color = color;
        this.speed = speed;
        this.angle = angle; // Angle in radians

        this.velocity = {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed
        };
    }

    update() {
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.position.x - this.width / 2, this.position.y - this.height / 2, this.width, this.height);
    }

    isOffscreen(canvasWidth, canvasHeight) {
        return this.position.x < -this.width || // Completely off left
               this.position.x > canvasWidth ||  // Completely off right
               this.position.y < -this.height || // Completely off top
               this.position.y > canvasHeight;   // Completely off bottom
    }
}

export class EnemyBullet extends Bullet {
    constructor(x, y, width, height, color, speed, angle) {
        super(x, y, width, height, color, speed, angle);
        // EnemyBullet specific properties or behaviors can be added here
        // For now, it's identical to the base Bullet.
    }
    // Example: Enemy bullets might have a slightly different draw or update behavior later
    // draw(ctx) {
    //     super.draw(ctx); // Call base draw
    //     // Add a trail or something specific
    // }
}
