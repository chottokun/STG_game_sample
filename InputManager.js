// InputManager.js

export class InputManager {
    constructor(canvas, soundManager) {
        this.canvas = canvas;
        this.soundManager = soundManager;
        this.audioUnlockedOnFirstInput = false;

        this.keys = {};
        this.gameActions = {};
        this.processedActions = new Set(); // For tracking actions processed this key-press cycle for isActionJustPressed

        // Replay override properties
        this.isOverridden = false;
        this.overriddenActions = {}; // Stores the input state for the current replay frame

        this.touchState = {
            isTouching: false,
            currentX: 0, currentY: 0,
            startX: 0, startY: 0,
            isDragging: false,
            id: null
        };
        this.touchActions = {
            move: false,
            fireBlasterTap: false,
            blasterTapX: 0
        };

        this.blasterUiArea = { x: 0, y: 0, width: 0, height: 0 };
        if (this.canvas) {
            this.blasterUiArea = {
                x: 0,
                y: this.canvas.height * 0.8,
                width: this.canvas.width,
                height: this.canvas.height * 0.2
            };
        }

        this.keyMap = {
            'ArrowUp': 'moveUp',
            'ArrowDown': 'moveDown',
            'ArrowLeft': 'moveLeft',
            'ArrowRight': 'moveRight',
            'z': 'fireZapper',
            'Z': 'fireZapper',
            'x': 'fireBlaster',
            'X': 'fireBlaster',
            'Enter': 'startGameAction',
            's': 'startGameAction',
            'p': 'togglePauseAction',
            'P': 'togglePauseAction',
            'i': 'debugToggleInvincibility',
            'I': 'debugToggleInvincibility',
            'k': 'debugKillAllEnemies',
            'K': 'debugKillAllEnemies',
            'n': 'debugNextArea',
            'N': 'debugNextArea',
            'd': 'debugTogglePanel',
            'D': 'debugTogglePanel'
        };

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
            this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
            this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
            this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
            this.canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: false });
        }
    }

    updateCanvasDependentProperties(canvas) {
        if (!canvas) return;
        this.canvas = canvas;
         this.blasterUiArea = {
            x: 0,
            y: this.canvas.height * 0.8,
            width: this.canvas.width,
            height: this.canvas.height * 0.2
        };
    }

    handleKeyDown(event) {
        if (this.isOverridden) return;

        if (!this.audioUnlockedOnFirstInput && this.soundManager) {
            this.soundManager.unlockAudioContext();
            this.audioUnlockedOnFirstInput = true;
        }

        const key = event.key;
        this.keys[key] = true;
        const action = this.keyMap[key];
        if (action) {
            this.gameActions[action] = true;
        }
    }

    handleKeyUp(event) {
        if (this.isOverridden) return;

        const key = event.key;
        this.keys[key] = false;
        const action = this.keyMap[key];
        if (action) {
            this.gameActions[action] = false;
            this.processedActions.delete(action);
        }
    }

    isActionActive(actionName) {
        if (this.isOverridden) {
            return !!this.overriddenActions[actionName];
        }
        return !!this.gameActions[actionName];
    }

    isActionJustPressed(actionName) {
        if (this.isOverridden) {
            // For replay, if "justPressed" is needed, it should be explicitly in replay data.
            // For debug commands during replay, this won't work as expected.
            // Debug commands are generally not meant to be part of a replay.
            return !!this.overriddenActions[actionName];
        }

        if (this.gameActions[actionName] && !this.processedActions.has(actionName)) {
            this.processedActions.add(actionName);
            return true;
        }
        return false;
    }

    isKeyPressed(keyName) {
        if (this.isOverridden) return false;
        return !!this.keys[keyName];
    }

    handleTouchStart(event) {
        if (this.isOverridden) return;
        event.preventDefault();
        if (!this.audioUnlockedOnFirstInput && this.soundManager) {
            this.soundManager.unlockAudioContext();
            this.audioUnlockedOnFirstInput = true;
        }
        if (this.touchState.id !== null && event.touches.length > 0) {
            let foundExisting = false;
            for (let i=0; i < event.changedTouches.length; i++) {
                if (event.changedTouches[i].identifier === this.touchState.id) {
                    foundExisting = true;
                    break;
                }
            }
            if(!foundExisting) return;
        }
        const touch = event.changedTouches[0];
        this.touchState.id = touch.identifier;
        const { x, y } = this.getTouchCanvasCoordinates(touch);
        this.touchState.isTouching = true;
        this.touchState.startX = x;
        this.touchState.startY = y;
        this.touchState.currentX = x;
        this.touchState.currentY = y;
        this.touchState.isDragging = false;
        if (this.isTapInBlasterArea(x, y)) {
            this.touchActions.fireBlasterTap = true;
            this.touchActions.blasterTapX = x;
            this.touchActions.move = false;
        } else {
            this.touchActions.move = true;
            this.touchActions.fireBlasterTap = false;
        }
    }

    handleTouchMove(event) {
        if (this.isOverridden) return;
        event.preventDefault();
        if (!this.touchState.isTouching || this.touchState.id === null) return;
        let currentTouch = null;
        for (let i=0; i < event.changedTouches.length; i++) {
            if (event.changedTouches[i].identifier === this.touchState.id) {
                currentTouch = event.changedTouches[i];
                break;
            }
        }
        if (!currentTouch) return;
        const { x, y } = this.getTouchCanvasCoordinates(currentTouch);
        this.touchState.currentX = x;
        this.touchState.currentY = y;
        this.touchState.isDragging = true;
        if (!this.touchActions.fireBlasterTap) {
            this.touchActions.move = true;
        }
    }

    handleTouchEnd(event) {
        if (this.isOverridden) return;
        event.preventDefault();
        let endedTouchIsPrimary = false;
        for (let i=0; i < event.changedTouches.length; i++) {
            if (event.changedTouches[i].identifier === this.touchState.id) {
                endedTouchIsPrimary = true;
                break;
            }
        }
        if (!endedTouchIsPrimary && this.touchState.isTouching) {
             return;
        }
        this.touchState.isTouching = false;
        this.touchState.isDragging = false;
        this.touchActions.move = false;
        this.touchState.id = null;
        if (this.touchActions.fireBlasterTap) {
            this.gameActions.dropBlasterTouch = true;
            this.gameActions.dropBlasterTouchX = this.touchActions.blasterTapX;
        }
        this.touchActions.fireBlasterTap = false;
    }

    getTouchCanvasCoordinates(touch) {
        if (!this.canvas) return { x: 0, y: 0 };
        const rect = this.canvas.getBoundingClientRect();
        return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }

    isTapInBlasterArea(x, y) {
        return x >= this.blasterUiArea.x && x <= this.blasterUiArea.x + this.blasterUiArea.width &&
               y >= this.blasterUiArea.y && y <= this.blasterUiArea.y + this.blasterUiArea.height;
    }

    getTouchPlayerTargetPosition() {
        if (this.isOverridden) {
            return (this.overriddenActions.touchMove && this.overriddenActions.touchX !== undefined && this.overriddenActions.touchY !== undefined) ?
                   { x: this.overriddenActions.touchX, y: this.overriddenActions.touchY } :
                   null;
        }
        if (this.touchActions.move && this.touchState.isTouching) {
            return { x: this.touchState.currentX, y: this.touchState.currentY };
        }
        return null;
    }

    shouldAutoFireZapper() {
        if (this.isOverridden) {
            return !!this.overriddenActions.touchMove;
        }
        return this.touchActions.move && this.touchState.isTouching;
    }

    getBlasterDropCoordinates() {
        if (this.isOverridden) {
            if (this.overriddenActions.dropBlasterTouch) {
                const x = this.overriddenActions.dropBlasterTouchX;
                return { x };
            }
            return undefined;
        }
        if (this.gameActions.dropBlasterTouch) {
            const x = this.gameActions.dropBlasterTouchX;
            this.gameActions.dropBlasterTouch = false;
            this.gameActions.dropBlasterTouchX = 0;
            return { x };
        }
        return undefined;
    }

    overrideInputs(inputsToApply) {
        this.isOverridden = true;
        this.overriddenActions = { ...inputsToApply };
    }

    resetOverrides() {
        this.isOverridden = false;
        this.overriddenActions = {};
    }

    getActiveGameActions() {
        const activeForReplay = {};
        // Iterate over the general gameActions set by keyboard
        for (const actionName in this.gameActions) {
            // Exclude debug actions, pause, and start game from replay recording
            if (this.gameActions[actionName] &&
                !actionName.startsWith('debug') &&
                actionName !== 'togglePauseAction' &&
                actionName !== 'startGameAction') {
                activeForReplay[actionName] = true;
            }
        }

        if (this.touchActions.move && this.touchState.isTouching) {
            activeForReplay.touchMove = true;
            activeForReplay.touchX = this.touchState.currentX;
            activeForReplay.touchY = this.touchState.currentY;
        }
        if (this.gameActions.dropBlasterTouch) {
            activeForReplay.dropBlasterTouch = true;
            activeForReplay.dropBlasterTouchX = this.gameActions.dropBlasterTouchX;
        }
        return activeForReplay;
    }
}
