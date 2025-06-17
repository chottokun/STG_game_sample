// ObjectPoolManager.js

export class ObjectPoolManager {
    constructor() {
        this.pools = {}; // e.g., this.pools['zapperBullet'] = { active: new Set(), inactive: [] }
        this.objectConstructors = {}; // e.g., this.objectConstructors['zapperBullet'] = ZapperBulletClass;
    }

    /**
     * Registers a new object pool.
     * @param {string} poolName - A unique name for this pool (e.g., 'zapperBullet').
     * @param {Function} constructorClass - The class constructor for objects in this pool.
     * @param {number} initialSize - The number of objects to pre-allocate.
     */
    registerPool(poolName, constructorClass, initialSize = 20) {
        if (this.pools[poolName]) {
            console.warn(`Pool "${poolName}" already registered.`);
            return;
        }

        this.objectConstructors[poolName] = constructorClass;
        const pool = { active: new Set(), inactive: [] };
        this.pools[poolName] = pool;

        for (let i = 0; i < initialSize; i++) {
            try {
                const obj = new constructorClass();
                obj.isActiveInPool = false; // Mark as inactive initially
                pool.inactive.push(obj);
            } catch (e) {
                console.error(`Error constructing object for pool "${poolName}":`, e);
                // Stop trying to populate this pool if construction fails
                return;
            }
        }
        console.log(`Pool "${poolName}" registered with ${initialSize} objects.`);
    }

    /**
     * Retrieves an object from the specified pool.
     * Initializes and activates the object.
     * @param {string} poolName - The name of the pool.
     * @returns {object|null} An object from the pool, or null if pool doesn't exist.
     */
    getObject(poolName) {
        const pool = this.pools[poolName];
        if (!pool) {
            console.warn(`Pool "${poolName}" does not exist.`);
            return null;
        }

        let obj = null;
        if (pool.inactive.length > 0) {
            obj = pool.inactive.pop();
        } else {
            // Pool is empty, expand it by creating a new object
            console.warn(`Pool "${poolName}" expanded beyond initial size.`);
            try {
                obj = new this.objectConstructors[poolName]();
            } catch (e) {
                console.error(`Error constructing new object for pool "${poolName}":`, e);
                return null;
            }
        }

        // Object is considered active as soon as it's retrieved.
        // Its own `init` method should set its game-specific `isActive` or similar flags.
        obj.isActiveInPool = true; // Internal flag for pool management
        pool.active.add(obj);
        return obj;
    }

    /**
     * Returns an object to its pool, marking it as inactive.
     * @param {object} obj - The object to return.
     * @param {string} poolName - The name of the pool the object belongs to.
     */
    returnObject(obj, poolName) {
        const pool = this.pools[poolName];
        if (!obj) {
            console.warn(`Attempted to return a null/undefined object to pool "${poolName}".`);
            return;
        }
        if (!pool) {
            console.warn(`Attempted to return object to non-existent pool "${poolName}".`, obj);
            return;
        }

        if (pool.active.has(obj)) {
            pool.active.delete(obj);
            obj.isActiveInPool = false; // Mark as inactive for the pool
            pool.inactive.push(obj);
        } else {
            // This can happen if an object is returned multiple times or was never properly obtained.
            // Or if it was obtained, but its init method failed and it wasn't used.
            // Check if it's already in inactive list to prevent duplicates.
            if (!pool.inactive.includes(obj)) {
                 // If it's not in active and not in inactive, it's an anomaly or new object not from pool.
                 // For safety, if it's of the correct type, we can add it to inactive.
                if (obj instanceof this.objectConstructors[poolName]) {
                    obj.isActiveInPool = false;
                    pool.inactive.push(obj);
                    // console.warn(`Object returned to pool "${poolName}" was not in active set, but added to inactive.`, obj);
                } else {
                    console.warn(`Object type mismatch or untracked object returned to pool "${poolName}".`, obj);
                }
            }
        }
    }

    /**
     * Resets all pools by moving all active objects to their respective inactive lists.
     */
    resetAllPools() {
        for (const poolName in this.pools) {
            const pool = this.pools[poolName];
            // Iterate over a copy of the set for modification
            const activeObjects = Array.from(pool.active);
            for (const obj of activeObjects) {
                // this.returnObject(obj, poolName); // Use the returnObject logic
                obj.isActiveInPool = false; // Ensure it's marked
                pool.inactive.push(obj);
            }
            pool.active.clear();
        }
        console.log("All object pools reset.");
    }

    /**
     * Gets all active objects from a specific pool. Useful for update/draw loops.
     * @param {string} poolName - The name of the pool.
     * @returns {Set<object>} A Set of active objects.
     */
    getActiveObjects(poolName) {
        const pool = this.pools[poolName];
        return pool ? pool.active : new Set(); // Return empty set if pool doesn't exist
    }
}
