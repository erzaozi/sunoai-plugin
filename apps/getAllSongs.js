import plugin from '../../../lib/plugins/plugin.js'
import SunoAI from '../components/Core.js'
import Config from '../components/Config.js'
import puppeteer from "../../../lib/puppeteer/puppeteer.js";
import { pluginResources } from '../model/path.js';
import axios from 'axios';
import sendFile from '../components/SendFile.js';

export class AllSongs extends plugin {
    constructor() {
        super({
            /** 功能名称 */
            name: 'SUNOAI-全部歌曲',
            /** 功能描述 */
            dsc: 'sunoai-全部歌曲',
            event: 'message',
            /** 优先级，数字越小等级越高 */
            priority: 1009,
            rule: [
                {
                    /** 命令正则匹配 */
                    reg: '^(\/|#)(suno(ai)?)?全部歌曲(第[0-9]+页)?$',
                    /** 执行方法 */
                    fnc: 'allsongs'
                },
                {
                    reg: '^(\/|#)(suno(ai)?)?查看歌曲(.*)$',
                    fnc: 'getsong'
                }
            ]
        })
    }

    get proxy() {
        const proxyConfig = Config.getConfig().proxy
        return proxyConfig.enable ? {
            protocol: "http",
            host: proxyConfig.host,
            port: proxyConfig.port
        } : null
    }

    async allsongs(e) {
        try {
            const { cookie_pool: cookieList, use_cookie: useCookie } = await Config.getConfig();

            if (cookieList.length === 0) {
                await e.reply('请先在配置文件中添加你的Cookie');
                return true;
            }

            if (!cookieList[useCookie - 1]) {
                await e.reply(`未能获取到你配置的第${useCookie}个Cookie`);
                return true;
            }

            await e.reply('正在获取歌曲中，请稍后...');

            const suno = new SunoAI(cookieList[useCookie - 1])
            await suno.init();

            let [, index] = e.msg.match(/第([0-9]+)页$/) || [, 1]
            index = Number(index)

            logger.info('获取第' + index + '页歌曲')

            const data = await suno.getAllSongs(index - 1)

            const allSongsList = await Promise.all(
                data.map(async (song, index) => {
                    const cover_base64 = await axios.get(song.image_url, {
                        responseType: 'arraybuffer',
                        proxy: this.proxy
                    })
                        .then(res => Buffer.from(res.data, 'binary').toString('base64'));
                    return { key: song.title || '无题', value: cover_base64 };
                })
            );

            const base64 = await puppeteer.screenshot("sunoai-plugin", {
                saveId: "AllSongs",
                tplFile: `${pluginResources}/listTemp/listTemp.html`,
                lable: '当前为第' + index + '页',
                sidebar: `共检索到${data.length}首歌曲`,
                pluginResources,
                header: 'SunoAI 全部歌曲',
                List: allSongsList,
                tab1: "歌曲名称",
                tab2: "封面",
                notice: '使用[#全部歌曲第x页]来查看对应页，使用[#查看歌曲+序号]查看歌曲详情',
                index: (index - 1) * 20,
            });

            e.reply(base64);
        } catch (err) {
            logger.error(`获取歌曲失败: ${err}`);
            e.reply('获取歌曲失败，检查控制台报错');
        }
        return true;
    }

    async getsong(e) {
        try {
            const { cookie_pool: cookieList, use_cookie: useCookie } = await Config.getConfig();

            if (cookieList.length === 0) {
                await e.reply('请先在配置文件中添加你的Cookie');
                return true;
            }

            if (!cookieList[useCookie - 1]) {
                await e.reply(`未能获取到你配置的第${useCookie}个Cookie`);
                return true;
            }

            let [, index] = e.msg.match(/查看歌曲(.*)$/) || [, 1]

            if (!/^\d+$/.test(index)) return e.reply('请输入正确的序号'), true;

            logger.info('获取第' + index + '首歌曲');
            index = index - 1

            const suno = new SunoAI(cookieList[useCookie - 1])
            await suno.init();

            const page = Math.floor(index / 20)
            const indexInPage = index % 20

            const data = await suno.getAllSongs(page)

            const songInfo = data[indexInPage]
            if (!songInfo) return e.reply('未找到相应的歌曲信息'), true;

            await e.reply('正在获取歌曲《' + songInfo.title + '》，请稍后...');

            const filePath = await suno.saveSongs([songInfo])
            await sendFile(e, filePath)
            logger.info('歌曲已发送')

            return true;
        } catch (err) {
            logger.error(err);
            e.reply('获取歌曲失败，检查控制台报错');
        }
    }
}