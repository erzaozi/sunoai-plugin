import plugin from '../../../lib/plugins/plugin.js'
import SunoAI from '../components/Core.js'
import sendFile from '../components/SendFile.js';
import cookieManager from '../components/Cookie.js';

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
                    reg: '^(\/|#)(suno(ai)?)?取消作曲$',
                    /** 执行方法 */
                    fnc: 'cancel'
                },
                {
                    /** 命令正则匹配 */
                    reg: '',
                    /** 执行方法 */
                    fnc: 'input',
                    /** 输出日志 */
                    log: false
                }
            ]
        })
    }

    async generatesongs(e) {
        try {
            let cookie = cookieManager.currentCookie

            await e.reply('请选择适合您的作曲方式：\n\n1.自动生成模式，简单一句话生成\n2.自定义模式，需要提供完整信息\n\n请直接回复序号即可', true)

            userConfig[e.user_id] = {
                cookie: cookie,
                step: 'select_method'
            }

            await setupTimeout(e)

            return true
        } catch (err) {
            if (err.message === '当前已没有可用cookie') {
                e.reply(err.message)
            } else {
                logger.error(`获取cookie失败: ${err}`);
                e.reply('获取cookie失败，检查控制台报错');
            }
        }
    }

    async cancel(e) {
        if (userConfig[e.user_id]) {
            delete userConfig[e.user_id];
            clearTimeout(userTimer[e.user_id]);
        }
        await e.reply('已取消作曲', true);
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
                if (!['1', '2'].includes(e.msg)) {
                    await e.reply('选择正确的作曲方式', true);
                    return true;
                }

                let payload = {};

                switch (e.msg) {
                    case '1':
                        // 自动生成模式，简单一句话生成
                        payload = { gpt_description_prompt: "", mv: "chirp-v3-0", prompt: "", make_instrumental: false };
                        // 修改配置
                        userConfig[e.user_id].payload = payload;
                        userConfig[e.user_id].step = 'custom_mode_false';
                        await e.reply('请选择适合您的作曲类型：\n\n1.带歌词歌曲\n2.纯音乐（无歌词）\n\n请直接回复序号即可', true);
                        break;

                    case '2':
                        // 自定义模式，需要提供完整信息
                        payload = { prompt: "", tags: "", mv: "chirp-v3-0", title: "", make_instrumental: false };
                        // 修改配置
                        userConfig[e.user_id].payload = payload;
                        userConfig[e.user_id].step = 'custom_mode_true';
                        await e.reply('请选择适合您的作曲类型：\n\n1.带歌词歌曲\n2.纯音乐（无歌词）\n\n请直接回复序号即可', true);
                        break;
                }

                await setupTimeout(e)

                break;
            case 'custom_mode_false':
                // 判断是否为正确的选择
                if (!['1', '2'].includes(e.msg)) {
                    await e.reply('选择正确的作曲类型', true);
                    return true;
                }

                switch (e.msg) {
                    case '1':
                        // 带歌词歌曲
                        userConfig[e.user_id].payload.make_instrumental = false;
                        userConfig[e.user_id].step = 'input_description';
                        await e.reply('请输入您的歌曲说明：\n\n描述您想要的音乐风格和主题（例如，“关于假期的原声流行音乐”）。使用流派和氛围，而不是特定的艺术家和歌曲。', true);
                        break;

                    case '2':
                        // 纯音乐（无歌词）
                        userConfig[e.user_id].payload.make_instrumental = true;
                        userConfig[e.user_id].step = 'input_description';
                        await e.reply('请输入您的歌曲说明：\n\n描述您想要的音乐风格和主题（例如，“关于假期的原声流行音乐”）。使用流派和氛围，而不是特定的艺术家和歌曲。', true);
                        break;
                }

                await setupTimeout(e)

                break;
            case 'input_description':
                // 输入描述
                userConfig[e.user_id].payload.gpt_description_prompt = e.msg;

                // 开始生成
                await e.reply('正在生成歌曲，请稍候...', true)

                logger.info(userConfig[e.user_id].payload)

                await generateMusic(e, userConfig[e.user_id].payload, userConfig[e.user_id].cookie);

                return true
            case 'custom_mode_true':
                // 判断是否为正确的选择
                if (!['1', '2'].includes(e.msg)) {
                    await e.reply('选择正确的作曲类型', true);
                    return true;
                }

                switch (e.msg) {
                    case '1':
                        // 带歌词歌曲
                        userConfig[e.user_id].payload.make_instrumental = false;
                        userConfig[e.user_id].step = 'input_title';
                        await e.reply('请输入您的歌曲标题：', true);
                        break;

                    case '2':
                        // 纯音乐（无歌词）
                        userConfig[e.user_id].payload.make_instrumental = true;
                        userConfig[e.user_id].step = 'input_title';
                        await e.reply('请输入您的歌曲标题：', true);
                        break;
                }

                await setupTimeout(e)
                break;
            case 'input_title':
                // 输入标题
                userConfig[e.user_id].payload.title = e.msg;
                userConfig[e.user_id].step = 'input_tags';
                await e.reply('请输入您的音乐风格：', true);
                await setupTimeout(e)
                break;
            case 'input_tags':
                // 输入音乐风格
                userConfig[e.user_id].payload.tags = e.msg;
                // 判断是否为纯音乐
                if (userConfig[e.user_id].payload.make_instrumental) {

                    // 开始生成
                    await e.reply('正在生成歌曲，请稍候...', true)

                    logger.info(userConfig[e.user_id].payload)

                    await generateMusic(e, userConfig[e.user_id].payload, userConfig[e.user_id].cookie);

                    return true
                }

                userConfig[e.user_id].step = 'input_prompt';
                await e.reply('请输入您的歌词内容：', true);
                await setupTimeout(e)
                break;
            case 'input_prompt':
                if (e.msg.startsWith('生成：')) {
                    try {
                        let prompt = e.msg.substring(3)
                        const suno = new SunoAI(userConfig[e.user_id].cookie)
                        await suno.init();
                        userConfig[e.user_id].payload.prompt = (await suno.generateLyrics(prompt)).text
                    } catch (error) {
                        logger.error(error)
                    }
                } else {
                    userConfig[e.user_id].payload.prompt = e.msg
                }

                // 开始生成
                await e.reply('正在生成歌曲，请稍候...', true)

                logger.info(userConfig[e.user_id].payload)

                await generateMusic(e, userConfig[e.user_id].payload, userConfig[e.user_id].cookie);

                return true
            default:
                break;
        }
        return false
    }
}


async function generateMusic(e, payload, cookie) {
    try {
        delete userConfig[e.user_id];
        clearTimeout(userTimer[e.user_id]);
        const suno = new SunoAI(cookie)
        await suno.init();
        const songInfo = await suno.generateSongs(payload)

        await e.reply('生成歌曲成功，正在下载...', true)

        const filePath = await suno.saveSongs(songInfo);

        await sendFile(e, filePath)
    } catch (error) {
        logger.error(error)
        await e.reply('生成失败，请检查控制台输出再试')
    }
}

async function setupTimeout(e) {
    clearTimeout(userTimer[e.user_id]);
    userTimer[e.user_id] = setTimeout(() => {
        delete userConfig[e.user_id];
        delete userTimer[e.user_id];
        e.reply('您未继续操作，SunoAI作曲已退出', true);
        return true;
    }, 60000);
}