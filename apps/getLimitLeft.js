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

        await Promise.all(cookieList.map(async (cookie) => {
            const suno = new SunoAI(cookie);
            await suno.init();

            const { is_active, plan, renews_on, monthly_usage, monthly_limit, total_credits_left } = await suno.getLimitLeft();

            msg += '\n';
            msg += `┌ 订阅状态：${is_active ? '已订阅' : '未订阅'}\n`;
            msg += `├ 订阅挡位：${plan ? plan.name : '试用版'}\n`;
            msg += `├ 到期时间：${renews_on ? new Date(renews_on).toLocaleString() : '无'}\n`;
            msg += `├ 点数使用：${monthly_usage}` + ' / ' + `${monthly_limit}\n`;
            msg += `└ 剩余次数：${total_credits_left}（${total_credits_left / 10}次）\n`
        }));

        await e.reply(msg);
        return true
    }
}
