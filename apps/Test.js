import plugin from '../../../lib/plugins/plugin.js'
import { getFeed, generateMusic } from '../components/Core.js'
import Log from '../utils/logs.js'

export class test extends plugin {
    constructor() {
        super({
            /** 功能名称 */
            name: 'sunoai-测试',
            /** 功能描述 */
            dsc: 'sunoai-测试',
            event: 'message',
            /** 优先级，数字越小等级越高 */
            priority: 1009,
            rule: [
                {
                    /** 命令正则匹配 */
                    reg: '^(/|#)sunoai测试$',
                    /** 执行方法 */
                    fnc: 'test'
                }
            ]
        })
    }

    async test(e) {
        const param = {
            // 歌词
            "prompt": "[Verse]\n今天开始我要自己上厕所\n爸爸妈妈你们不要小看我\n宝宝巴士教我上厕所秘诀\n我等不及啦我要上厕所\n\n[Verse 2]\n上厕所时不能吃东西\n上厕所时，节约用纸\n上厕所时，不能玩玩具\n上完厕所 冲水哟\n\n[Chorus]\n今天开始我要自己上厕所\n爸爸妈妈你们不要小看我\n宝宝巴士教我上厕所秘诀\n我等不及啦我要上厕所",
            // 曲风
            "tags": "aggressive hip hop",
            // 模型
            "mv": "chirp-v3-0",
            // 标题
            "title": "I will go to the WC by myself from now on",
            "continue_clip_id": null,
            "continue_at": null,
        }
        const response = await generateMusic(param)
        e.reply('你的任务已提交')
        await this.sleep(20)
        let clips = response?.data?.clips?.map(clip => clip.id) || []
        let results = []
        let retry = 0
        while (clips.length > 0 && retry < 30) {
            try {
                const response = await getFeed({ ids: clips.join('%') })
                if (response.status == 200) {
                    const completed = response.data.filter(task => task.status === 'complete' && clips.includes(task.id))
                    completed?.forEach(task => {
                        let index = clips.indexOf(task.id)
                        clips.splice(index, 1)
                        results.push({ id: task.id, video_url: task.video_url, audio_url: task.audio_url, metadata: task.metadata })
                    })
                }
            } catch (err) {
                Log.e(err)
            } finally {
                retry++
                await this.sleep(5)
            }
        }
        logger.debug(results)
        e.reply(`您的生成结果是${results.map(result=>result.audio_url).join('\n')}`)
    }
    sleep(s) {
        return new Promise(resolve => setTimeout(resolve, s * 1000))
    }
}
