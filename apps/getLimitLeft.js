import plugin from '../../../lib/plugins/plugin.js'
import Init from '../model/init.js'
import SunoAI from '../components/Core.js'
import Config from '../components/Config.js'

export class LimitLeft extends plugin {
    constructor() {
        super({
            /** 功能名称 */
            name: 'SUNOAI-查询余额',
            /** 功能描述 */
            dsc: 'sunoai-查询余额',
            event: 'message',
            /** 优先级，数字越小等级越高 */
            priority: 1009,
            rule: [
                {
                    /** 命令正则匹配 */
                    reg: '^(\/|#)(suno(ai)?)?账号状态$',
                    /** 执行方法 */
                    fnc: 'limitleft'
                }
            ]
        })
    }

    async limitleft(e) {
        const { cookie_pool: cookieList } = await Config.getConfig();

        if (cookieList.length === 0) {
            await e.reply('请先在配置文件中添加你的Cookie');
            return true
        }

        let msg = `已配置${cookieList.length}个Cookie\n`;
        await e.reply('正在查询中，预计10s，请稍后...');

        let promises = cookieList.map(async (cookie, index) => {
            try {
                const suno = new SunoAI(cookie);
                await suno.init();
                return await suno.getLimitLeft();
            } catch (error) {
                return `第 ${index + 1} 个Cookie获取状态失败，请检查Cookie是否有效`;
            }
        });

        let results = await Promise.all(promises);

        msg += results.map((result, index) => {
            if (typeof result === 'string') {
                return result;
            } else {
                let { is_active, plan, renews_on, monthly_usage, monthly_limit, total_credits_left } = result;
                return `┌ 订阅状态：${is_active ? '已订阅' : '未订阅'}\n` +
                    `├ 订阅挡位：${plan ? plan.name : '试用版'}\n` +
                    `├ 到期时间：${renews_on ? new Date(renews_on).toLocaleString() : '无'}\n` +
                    `├ 点数使用：${monthly_usage}` + ' / ' + `${monthly_limit}\n` +
                    `└ 剩余次数：${total_credits_left}（${total_credits_left / 10}次）\n`;
            }
        }).join('\n');

        await e.reply(msg);
        return true
    }
}
