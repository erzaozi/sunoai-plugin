import Config from '../components/Config.js'
import fs from 'fs'

async function sendFile(e, filePath) {
    const send_type = await Config.getConfig().send_type;

    const songNames = Object.keys(filePath);

    for (const songName of songNames) {
        await e.reply(`正在发送第${songNames.indexOf(songName) + 1}首歌曲，歌曲名称：《${songName}》`);

        const checkFileExists = (path) => {
            if (!fs.existsSync(path)) {
                e.reply('文件不存在，请检查配置项是否开启保存对应的功能', true);
                return false;
            }
            return true;
        };

        try {
            switch (send_type) {
                case 'record':
                    if (checkFileExists(filePath[songName].mp3Path)) {
                        await e.reply(segment.record(filePath[songName].mp3Path));
                    }
                    break;
                case 'video':
                    if (checkFileExists(filePath[songName].mp4Path)) {
                        await e.reply(segment.video(filePath[songName].mp4Path));
                    }
                    break;
                case 'file':
                    if (checkFileExists(filePath[songName].mp3Path)) {
                        const uploadMethod = e.isGroup ? e.group.sendFile || e.group.fs.upload : e.friend.sendFile;
                        const upload = await uploadMethod(filePath[songName].mp3Path);
                        const fileUrlMethod = e.isGroup ? e.group.getFileUrl : e.friend.getFileUrl;
                        const fileUrl = await fileUrlMethod(upload);
                        await e.reply(fileUrl || JSON.stringify(upload));
                    }
                    break;
                default:
                    break;
            }
        } catch (err) {
            logger.error(err);
            await e.reply('发送文件失败，请检查控制台输出再试');
        }
    }

    return true;
}

export default sendFile;