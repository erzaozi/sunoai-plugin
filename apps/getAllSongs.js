import plugin from '../../../lib/plugins/plugin.js'
import SunoAI from '../components/Core.js'
import Config from '../components/Config.js'
import puppeteer from "../../../lib/puppeteer/puppeteer.js";
import { pluginResources } from '../model/path.js';
import axios from 'axios';

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
                }
            ]
        })
    }

    async allsongs(e) {
        try {
            const { cookie_pool: cookieList, use_cookie: useCookie } = await Config.getConfig();

            if (cookieList.length === 0) {
                await e.reply('请先在配置文件中添加你的Cookie');
                return;
            }

            if (!cookieList[useCookie]) {
                await e.reply(`未能获取到你配置的第${useCookie + 1}个Cookie`);
                return;
            }

            await e.reply('正在获取歌曲中，请稍后...');

            const suno = new SunoAI(cookieList[useCookie])
            await suno.init();

            let [, index] = e.msg.match(/第([0-9]+)页$/) || [, 1]
            index = Number(index)

            const data = await suno.getAllSongs(index);

            const allSongsList = await Promise.all(
                data.map(async (song, index) => {
                    const cover_base64 = await axios.get(song.image_url, {
                        responseType: 'arraybuffer'
                    })
                        .then(res => Buffer.from(res.data, 'binary').toString('base64'));
                    return { key: song.title || '无题', value: cover_base64 };
                })
            );

            const base64 = await puppeteer.screenshot("sunoai-plugin", {
                saveId: "AllSongs",
                tplFile: `${pluginResources}/listTemp/listTemp.html`,
                lable: '',
                sidebar: `共检索到${data.length}首歌曲`,
                pluginResources,
                header: `SunoAI 全部歌曲第${index}页`,
                List: allSongsList,
                tab1: "歌曲名称",
                tab2: "封面",
                notice: '使用/suno全部歌曲第x页来查看指定页',
            });

            e.reply(base64);

        } catch (err) {
            console.error(`获取歌曲失败: ${err}`);
        }
    }
}
