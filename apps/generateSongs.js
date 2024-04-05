import plugin from '../../../lib/plugins/plugin.js'
import SunoAI from '../components/Core.js'
import Config from '../components/Config.js'
import { pluginResources } from '../model/path.js';

// 存储用户配置进度
let userConfig = {};

// 存储用户计时器
let userTimer = {};

export class GenerateSongs extends plugin {
    constructor() {
        super({
            /** 功能名称 */
            name: 'SUNOAI-生成歌曲',
            /** 功能描述 */
            dsc: 'sunoai-生成歌曲',
            event: 'message',
            /** 优先级，数字越小等级越高 */
            priority: 1009,
            rule: [
                {
                    /** 命令正则匹配 */
                    reg: '^(\/|#)(suno(ai)?)?作曲$',
                    /** 执行方法 */
                    fnc: 'generatesongs'
                },
                {
                    /** 命令正则匹配 */
                    reg: '',
                    /** 执行方法 */
                    fnc: 'input'
                }
            ]
        })
    }

    async generatesongs(e) {
        const { cookie_pool: cookieList, use_cookie: useCookie } = await Config.getConfig();

        if (cookieList.length === 0) {
            await e.reply('请先在配置文件中添加你的Cookie');
            return;
        }

        if (!cookieList[useCookie]) {
            await e.reply(`未能获取到你配置的第${useCookie + 1}个Cookie`);
            return;
        }

        await e.reply('您正在使用SunoAI进行AI作曲，请选择适合您的作曲方式：\n\n1.使用 GPT 生成歌词并生成带歌词的歌曲\n2.生成纯音乐(无歌词)歌曲\n3.使用自定义歌词生成歌曲\n\n请直接回复序号即可', true)

        userConfig[e.user_id] = {
            cookie: cookieList[useCookie],
            step: 'select_method'
        }

        userTimer[e.user_id] = setTimeout(() => {
            delete userConfig[e.user_id];
            delete userTimer[e.user_id];
            e.reply('您未继续操作，SunoAI作曲已退出', true);
            return true
        }, 60000);

        return true
    }

    async input(e) {
        if (!userConfig[e.user_id]) {
            return false
        }

        const { step } = userConfig[e.user_id];

        switch (step) {
            case 'select_method':
                // 判断是否为正确的选择
                if (!['1', '2', '3'].includes(e.msg)) {
                    await e.reply('选择正确的作曲方式', true);
                    return true;
                }

                let payload = {};

                switch (e.msg) {
                    case '1':
                        // 使用 GPT 生成歌词并生成带歌词的歌曲
                        payload = { gpt_description_prompt: "", mv: "chirp-v3-0", prompt: "", make_instrumental: false };
                        // 修改配置
                        userConfig[e.user_id].payload = payload;
                        userConfig[e.user_id].step = 'input_prompt';
                        await e.reply('请描述你想生成的歌曲的提示词，如：一首关于永远陪伴在你身边的蓝调歌曲', true);
                        break;

                    case '2':
                        // 生成纯音乐(无歌词)歌曲
                        payload = { gpt_description_prompt: "", mv: "chirp-v3-0", prompt: "", make_instrumental: true };
                        // 修改配置
                        userConfig[e.user_id].payload = payload;
                        userConfig[e.user_id].step = 'input_prompt';
                        await e.reply('请描述你想生成的歌曲的提示词，如：一首关于跳舞的放克风格纯音乐', true);
                        break;

                    case '3':
                        // 使用自定义歌词生成歌曲
                        payload = { prompt: "", tags: "", mv: "chirp-v3-0", title: "", make_instrumental: false, continue_clip_id: null, continue_at: null };
                        // 修改配置
                        userConfig[e.user_id].payload = payload;
                        userConfig[e.user_id].step = 'input_title';
                        await e.reply('请输入歌曲标题，如：我会自己上厕所', true);
                        break;
                }

                clearTimeout(userTimer[e.user_id]);
                userTimer[e.user_id] = setTimeout(() => {
                    delete userConfig[e.user_id];
                    delete userTimer[e.user_id];
                    e.reply('您未继续操作，SunoAI作曲已退出', true);
                    return true
                }, 60000);

                break;
            case 'input_prompt':
                // 输入提示词
                userConfig[e.user_id].payload.gpt_description_prompt = e.msg;

                // 生成歌曲
                const suno = new SunoAI(userConfig[e.user_id].cookie);
                await suno.init();

                const songInfo = await suno.generateSongs(userConfig[e.user_id].payload);

                logger.info(songInfo)
            
                break;
            case 'input_title':
                // 输入歌曲标题
                userConfig[e.user_id].payload.title = e.msg;

                await e.reply('请输入歌曲标签，如：#流行 #治愈', true);

                userConfig[e.user_id].step = 'input_tags';

                userTimer[e.user_id] = setTimeout(() => {
                    delete userConfig[e.user_id];
                    delete userTimer[e.user_id];
                    e.reply('您未继续操作，SunoAI作曲已退出', true);
                }, 60000);
                
                break;
            case 'input_tags':
                // 输入歌曲标签
                userConfig[e.user_id].payload.tags = e.msg;
                
                // 生成歌曲
                const suno2 = new SunoAI(userConfig[e.user_id].cookie);
                await suno2.init();

                const songInfo2 = await suno2.generateSongs(userConfig[e.user_id].payload);


                break;
        }
        return false
    }
}
