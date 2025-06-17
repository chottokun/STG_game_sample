// InputManager.js

export class InputManager {
    constructor(canvas) { // Added canvas for touch events and UI area
        this.canvas = canvas;
        this.keys = {};
        this.gameActions = {};

        // For touch controls
        this.touchState = {
            isTouching: false,
            currentX: 0, currentY: 0,
            startX: 0, startY: 0,
            isDragging: false,
            id: null // Store the ID of the primary touch
        };
        // Abstracted touch actions
        this.touchActions = {
            move: false,        // True if player should follow touch
            fireBlasterTap: false, // True if a tap occurred in the blaster UI area
            blasterTapX: 0    // X coordinate of the blaster tap
        };

        // Define Blaster UI area (example: bottom 20% of canvas)
        // Ensure canvas is available before accessing its properties
        this.blasterUiArea = { x: 0, y: 0, width: 0, height: 0 };
        if (this.canvas) {
            this.blasterUiArea = {
                x: 0,
                y: this.canvas.height * 0.8,
                width: this.canvas.width,
                height: this.canvas.height * 0.2
            };
        } else {
            console.warn("Canvas not provided to InputManager constructor; Blaster UI area not initialized.");
        }


        this.keyMap = {
            'ArrowUp': 'moveUp',
            'ArrowDown': 'moveDown',
            'ArrowLeft': 'moveLeft',
            'ArrowRight': 'moveRight',
            'z': 'fireZapper', // Lowercase 'z'
            'Z': 'fireZapper', // Uppercase 'Z' (maps to the same action)
            'x': 'fireBlaster',// Lowercase 'x'
            'X': 'fireBlaster' // Uppercase 'X' (maps to the same action)
            // Add other keys like 'Enter' for 'confirm' or 'Space' for 'pause' if needed globally
        };

        // Initialize all game actions to false
        for (const key in this.keyMap) {
            const action = this.keyMap[key];
            if (action && !this.gameActions.hasOwnProperty(action)) {
                this.gameActions[action] = false;
            }
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));

        if (this.canvas) {
            // Touch events for player movement and blaster UI
            // { passive: false } to allow preventDefault()
            this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
            this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
            this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
            this.canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: false });
        }
    }

    updateCanvasDependentProperties(canvas) { // Call if canvas size changes
        if (!canvas) return;
        this.canvas = canvas; // Update canvas reference if it changes
         this.blasterUiArea = {
            x: 0,
            y: this.canvas.height * 0.8,
            width: this.canvas.width,
            height: this.canvas.height * 0.2
        };
    }

    handleKeyDown(event) {
        const key = event.key;
        this.keys[key] = true;

        const action = this.keyMap[key];
        if (action) {
            this.gameActions[action] = true;
            // console.log(`Action activated: ${action}`); // For debugging
        }
    }

    handleKeyUp(event) {
        const key = event.key;
        this.keys[key] = false;

        const action = this.keyMap[key];
        if (action) {
            // If multiple keys map to the same action, only set action to false if ALL those keys are up.
            // For now, a simpler approach: if any key for an action is released, the action is false.
            // This is typical for most game inputs (e.g. if 'z' and 'mouse_button_1' both fire, releasing one stops firing).
            this.gameActions[action] = false;
            // console.log(`Action deactivated: ${action}`); // For debugging
        }
    }

    /**
     * Checks if a specific game action is currently active (e.g., 'moveUp' is being pressed).
     * @param {string} actionName - The name of the game action (e.g., 'moveUp', 'fireZapper').
     * @returns {boolean} True if the action is active, false otherwise.
     */
    isActionActive(actionName) {
        return !!this.gameActions[actionName];
    }

    isKeyPressed(keyName) {
        return !!this.keys[keyName];
    }

    // --- Touch Event Handlers ---
    getTouchCanvasCoordinates(touch) {
        if (!this.canvas) return { x: 0, y: 0 };
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top
        };
    }

    isTapInBlasterArea(x, y) {
        return x >= this.blasterUiArea.x &&
               x <= this.blasterUiArea.x + this.blasterUiArea.width &&
               y >= this.blasterUiArea.y &&
               y <= this.blasterUiArea.y + this.blasterUiArea.height;
    }

    handleTouchStart(event) {
        event.preventDefault();
        if (this.touchState.id !== null && event.touches.length > 0) { // Already tracking a primary touch
            // Could handle multi-touch here if needed (e.g. second finger for blaster while first moves)
            // For now, only process if we are not already tracking a primary touch, or if it's the same one.
            let foundExisting = false;
            for (let i=0; i < event.changedTouches.length; i++) {
                if (event.changedTouches[i].identifier === this.touchState.id) {
                    foundExisting = true;
                    break;
                }
            }
            if(!foundExisting) return; // Not our primary touch, ignore others for now
        }


        const touch = event.changedTouches[0]; // Use changedTouches to get the touch that started
        this.touchState.id = touch.identifier; // Store the ID of this primary touch
        const { x, y } = this.getTouchCanvasCoordinates(touch);

        this.touchState.isTouching = true;
        this.touchState.startX = x;
        this.touchState.startY = y;
        this.touchState.currentX = x;
        this.touchState.currentY = y;
        this.touchState.isDragging = false;

        if (this.isTapInBlasterArea(x, y)) {
            // If tap starts in blaster area, prioritize it as a blaster tap for now.
            // Game can decide if a drag out of this area cancels it or still fires.
            this.touchActions.fireBlasterTap = true;
            this.touchActions.blasterTapX = x;
            this.touchActions.move = false; // Don't initiate move if starting in blaster area
        } else {
            this.touchActions.move = true; // Player should start moving/following immediately
            this.touchActions.fireBlasterTap = false;
        }
    }

    handleTouchMove(event) {
        event.preventDefault();
        if (!this.touchState.isTouching) return;

        let currentTouch = null;
        for (let i=0; i < event.changedTouches.length; i++) {
            if (event.changedTouches[i].identifier === this.touchState.id) {
                currentTouch = event.changedTouches[i];
                break;
            }
        }
        if (!currentTouch) return; // Not the touch we are tracking

        const { x, y } = this.getTouchCanvasCoordinates(currentTouch);
        this.touchState.currentX = x;
        this.touchState.currentY = y;
        this.touchState.isDragging = true;

        // If the touch started outside blaster area, it's for movement.
        // If it started inside, it's a blaster tap; dragging usually doesn't change that intent.
        // So, only set touchActions.move if not already a blaster tap in progress.
        if (!this.touchActions.fireBlasterTap) {
            this.touchActions.move = true;
        }
    }

    handleTouchEnd(event) {
        event.preventDefault();

        let endedTouchIsPrimary = false;
        for (let i=0; i < event.changedTouches.length; i++) {
            if (event.changedTouches[i].identifier === this.touchState.id) {
                endedTouchIsPrimary = true;
                break;
            }
        }

        if (!endedTouchIsPrimary && this.touchState.isTouching) {
             // Another touch ended, but not the one we're tracking for movement/blaster. Ignore.
             return;
        }


        this.touchState.isTouching = false;
        this.touchState.isDragging = false;
        this.touchActions.move = false;
        this.touchState.id = null; // Clear tracked touch ID

        if (this.touchActions.fireBlasterTap) {
            // If fireBlasterTap was true, it means the touch started in the UI area.
            // We can now signal to the game to actually drop the blaster.
            // Using gameActions to be consistent with how Player polls for blaster.
            this.gameActions.dropBlasterTouch = true;
            this.gameActions.dropBlasterTouchX = this.touchActions.blasterTapX;
            // console.log("Blaster drop signaled via touch at X:", this.touchActions.blasterTapX);
        }
        this.touchActions.fireBlasterTap = false; // Reset for next touch
    }

    // --- Public methods for game to query touch actions ---

    /**
     * Gets the player's target position based on touch input.
     * @returns {{x: number, y: number} | null} Target position or null if no touch movement.
     */
    getTouchPlayerTargetPosition() {
        if (this.touchActions.move && this.touchState.isTouching) {
            return { x: this.touchState.currentX, y: this.touchState.currentY };
        }
        return null;
    }

    /**
     * Checks if the zapper should be auto-fired due to touch interaction.
     * @returns {boolean} True if zapper should auto-fire.
     */
    shouldAutoFireZapper() {
        // Zapper fires if player is being moved by touch (i.e., touch is active outside blaster UI area)
        return this.touchActions.move && this.touchState.isTouching;
    }

    /**
     * Checks if a blaster drop was triggered by touch and returns the X coordinate.
     * Resets the trigger after being called.
     * @returns {{x: number} | undefined} X-coordinate for blaster drop or undefined.
     */
    getBlasterDropCoordinates() {
        if (this.gameActions.dropBlasterTouch) {
            const x = this.gameActions.dropBlasterTouchX;
            this.gameActions.dropBlasterTouch = false; // Consume the action
            this.gameActions.dropBlasterTouchX = 0;
            return { x };
        }
        return undefined;
    }

    getActiveGameActions() {
        const activeForReplay = {};

        // Keyboard actions
        if (this.gameActions.moveUp) activeForReplay.moveUp = true;
        if (this.gameActions.moveDown) activeForReplay.moveDown = true;
        if (this.gameActions.moveLeft) activeForReplay.moveLeft = true;
        if (this.gameActions.moveRight) activeForReplay.moveRight = true;
        if (this.gameActions.fireZapper) activeForReplay.fireZapper = true;
        if (this.gameActions.fireBlaster) activeForReplay.fireBlaster = true; // Records if key is held

        // Touch actions that translate to game logic
        // Player movement from touch is direct position setting, recorded if touch is active.
        if (this.touchActions.move && this.touchState.isTouching) {
            activeForReplay.touchMove = true;
            activeForReplay.touchX = this.touchState.currentX;
            activeForReplay.touchY = this.touchState.currentY;
        }

        // For blaster drop via touch:
        // This flag is set on touchEnd and consumed by getBlasterDropCoordinates in Player.js.
        // To record it, getActiveGameActions must be called *before* Player.update consumes it.
        if (this.gameActions.dropBlasterTouch) {
            activeForReplay.dropBlasterTouch = true;
            activeForReplay.dropBlasterTouchX = this.gameActions.dropBlasterTouchX;
        }

        return activeForReplay;
    }
}
