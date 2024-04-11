import SunoAI from "./Core.js";
import Config from "./Config.js";
import fs from 'fs'
import { pluginRoot } from '../model/path.js'

class CookieManager {
    constructor() {
        this.availableCookies = null;
        this.unavailableCookies = null;
        this.init();
        fs.watch(`${pluginRoot}/config/config/config.yaml`, async (eventType, filename) => {
            if (eventType === 'change') {
                logger.info('[sunoai-plugin]修改配置文件')
                const { cookie_pool: cookies } = Config.getConfig();
                let newCookies = cookies.filter(cookie => !this.availableCookies.includes(cookie) && !this.unavailableCookies.includes(cookie))
                const { availableCookies, unavailableCookies } = await this.checkAvailableCookies(newCookies)
                this.availableCookies = [...this.availableCookies, ...availableCookies]
                this.unavailableCookies = [...this.unavailableCookies, ...unavailableCookies]
            }
        })
    }

    async init() {
        const { cookie_pool: cookies, use_cookie: preferredIndex } = await Config.getConfig();

        // 优先使用指定序号
        if (preferredIndex > 0 && preferredIndex < cookies.length) {
            [cookies[0], cookies[preferredIndex - 1]] = [cookies[preferredIndex - 1], cookies[0]];
        }

        // 过滤出可用cookie
        const { availableCookies, unavailableCookies } = await this.checkAvailableCookies(cookies)
        this.availableCookies = availableCookies
        this.unavailableCookies = unavailableCookies
    }

    get currentCookie() {
        if (this.availableCookies[0]) return this.availableCookies[0];
        else throw new Error('当前已没有可用cookie')
    }

    moveFirstCookie() {
        if (this.availableCookies.length > 0) {
            const cookie = this.availableCookies.shift()
            this.unavailableCookies.push(cookie)
        }
    }

    async checkAvailableCookies(cookies) {
        let [availableCookies, unavailableCookies] = [[], []]
        const results = await Promise.all(cookies.map(async (cookie, index) => {
            try {
                const suno = new SunoAI(cookie);
                await suno.init();
                return suno.getLimitLeft();
            } catch (error) {
                logger.error(`第 ${index + 1} 个Cookie获取状态失败，请检查Cookie是否有效`);
                return null;
            }
        }));

        results.forEach((result, index) => {
            if (result) {
                const { monthly_usage: usage, monthly_limit: limit } = result;
                if (limit - usage >= 10) {
                    availableCookies.push(cookies[index]);
                } else {
                    unavailableCookies.push(cookies[index]);
                }
            } else {
                unavailableCookies.push(cookies[index]);
            }
        });
        return { availableCookies, unavailableCookies }
    }
}

let cookieManager = new CookieManager()

// 每天自动刷新
function dailyRefresh() {
    const now = new Date();
    const night = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1, // 明天
        0, 0, 0 // 时间00:00:00
    );

    const msToMidnight = night.getTime() - now.getTime();
    setTimeout(() => {
        logger.info('[sunoai-plugin]每日自动刷新cookie')
        cookieManager.init()
        dailyRefresh();
    }, msToMidnight);
}

dailyRefresh();

export default cookieManager