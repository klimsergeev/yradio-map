/**
 * Модуль кэширования в sessionStorage
 */

const CACHE_PREFIX = 'ad-map-';
const CACHE_TTL = 30 * 60 * 1000; // 30 минут

/**
 * Получить данные из кэша
 * @param {string} key - Ключ кэша
 * @returns {*} Данные или null
 */
export function getCachedData(key) {
    try {
        const item = sessionStorage.getItem(CACHE_PREFIX + key);
        if (!item) return null;

        const { data, timestamp } = JSON.parse(item);

        // Проверка срока годности
        if (Date.now() - timestamp > CACHE_TTL) {
            sessionStorage.removeItem(CACHE_PREFIX + key);
            return null;
        }

        return data;
    } catch (e) {
        console.warn('Cache read error:', e);
        return null;
    }
}

/**
 * Сохранить данные в кэш
 * @param {string} key - Ключ кэша
 * @param {*} data - Данные для сохранения
 */
export function setCachedData(key, data) {
    try {
        const item = {
            data,
            timestamp: Date.now()
        };
        sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify(item));
    } catch (e) {
        // sessionStorage может быть недоступен или переполнен
        console.warn('Cache write error:', e);
    }
}

/**
 * Очистить весь кэш приложения
 */
export function clearCache() {
    try {
        Object.keys(sessionStorage)
            .filter(key => key.startsWith(CACHE_PREFIX))
            .forEach(key => sessionStorage.removeItem(key));
    } catch (e) {
        console.warn('Cache clear error:', e);
    }
}
