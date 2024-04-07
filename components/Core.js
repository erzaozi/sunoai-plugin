import axios from 'axios';
import fs from 'fs';
import path from 'path';
import Config from './Config.js';
import { pluginResources } from '../model/path.js';

const baseUrl = 'https://studio-api.suno.ai';
const maxRetryTimes = 5;

class SunoAI {
    constructor(cookie) {
        this.cookie = cookie;
        this.headers = {
            "Accept-Encoding": "gzip, deflate, br",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
            "Cookie": cookie
        };
        this.sid = null;
        this.retryTime = 0;

        // 创建一个带Cookie实例
        this.axiosInstance = axios.create({
            headers: this.headers
        });

        // 保持令牌更新
        this.authUpdateTime = null;
        this.axiosInstance.interceptors.request.use(async (config) => {
            if (this.retryTime > maxRetryTimes) {
                throw new Error('重试次数过多，已停止重试');
            }
            if (config.url.startsWith(baseUrl)) {
                if (!this.authUpdateTime || Date.now() - this.authUpdateTime > 45000) {
                    await this._renew();
                }
                config.headers = this.headers;
            }
            return config;
        });
        this.axiosInstance.interceptors.response.use(
            async (response) => {
                if (response.config.url.startsWith(baseUrl) && response.data?.detail === 'Unauthorized') {
                    this.retryTime += 1;
                    response = await this.axiosInstance.request(response.config);
                }
                else {
                    this.retryTime = 0;
                }
                return response;
            },
            async (error) => {
                if (error.config.url.startsWith(baseUrl) && error.response?.status === 401) {
                    this.retryTime += 1;
                    error.response = await this.axiosInstance.request(error.config);
                }
                else {
                    this.retryTime = 0;
                }
                return error.response;
            }
        );
    }

    // 初始化 SunoAI 实例，必须在使用其他方法之前调用
    async init() {
        try {
            const response = await this.axiosInstance.request({
                method: 'GET',
                url: 'https://clerk.suno.ai/v1/client',
                params: { _clerk_js_version: '4.70.5' },
                headers: {
                    Cookie: this.cookie
                }
            })
            const data = response.data;
            const r = data.response;
            let sid;
            if (r) {
                sid = r.last_active_session_id;
            }
            if (!sid) {
                throw new Error('无法获取会话ID');
            }
            this.sid = sid;
            await this._renew();
        }
        catch (e) {
            logger.error(e);
            throw e;
        }
    }

    // 对于每个会话，授权令牌的有效期为60秒
    async _renew() {
        try {
            const tokenResponse = await this.axiosInstance.request({
                method: 'POST',
                url: `https://clerk.suno.ai/v1/client/sessions/${this.sid}/tokens/api?_clerk_js_version=4.70.5`,
                headers: {
                    Cookie: this.cookie
                }
            })
            const tokenData = tokenResponse.data;
            const token = tokenData?.jwt;
            this.headers.Authorization = `Bearer ${token}`;
            this.authUpdateTime = Date.now();
        }
        catch (e) {
            logger.error(e);
            throw e;
        }
    }
    // 获取剩余的请求次数
    async getLimitLeft() {
        const response = await this.axiosInstance.request({
            method: 'GET',
            url: `${baseUrl}/api/billing/info/`
        })
        const data = response.data;
        return data;
    }

    // 获取请求 ID 列表
    async getRequestIds(payload) {
        if (!payload) {
            throw new Error('需要有效参数');
        }
        try {
            const response = await this.axiosInstance.post(`${baseUrl}/api/generate/v2/`, payload);
            if (response.status !== 200) {
                logger.error(response.statusText);
                throw new Error(`Error response ${response.status}`);
            }

            const responseBody = response.data;
            const songsMetaInfo = responseBody.clips;
            const requestIds = songsMetaInfo.map(info => info.id);
            logger.info(requestIds);

            return requestIds;
        } catch (e) {
            logger.error(e);
            throw e;
        }
    }

    // 获取指定歌曲的元数据
    async getMetadata(ids) {
        try {
            // 获取配置文件
            let config = await Config.getConfig()
            // 如果歌曲未生成，重试
            let retryTimes = 0;
            const maxRetryTimes = config.await_time || 20;

            let params = {};
            if (Array.isArray(ids) && ids.length > 0) {
                params.ids = ids.join(',');
            } else if (typeof ids === 'number') {
                params.page = ids;
            }

            while (true) {
                const response = await this.axiosInstance.request({
                    method: 'GET',
                    url: `${baseUrl}/api/feed/`,
                    params
                });

                let data = response?.data;

                if (typeof ids === 'number') {
                    return data;
                }

                if (data[0]?.audio_url && data[1]?.audio_url) {
                    if (!config.save_data.video || data[0]?.status === 'complete' && data[1]?.status === 'complete') {
                        return data;
                    }
                } else {
                    if (retryTimes > maxRetryTimes) {
                        throw new Error('生成歌曲失败');
                    }
                    else {
                        logger.info('还未生成好...');
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        retryTimes += 1;
                    }
                }
            }
        } catch (e) {
            logger.error(e);
        }
    }

    // 生成歌曲
    async generateSongs(payload) {
        try {
            const requestIds = await this.getRequestIds(payload);
            const songsInfo = await this.getMetadata(requestIds);
            return songsInfo;
        } catch (e) {
            logger.error(e);
            throw e;
        }
    }

    // 保存歌曲
    async saveSongs(songsInfo) {
        try {
            // 获取配置文件
            let config = await Config.getConfig().save_data

            let outputDir = pluginResources + '/output'

            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            let filePath = {}

            // 创建所有的下载任务
            let downloadTasks = [];

            for (let i = 0; i < songsInfo.length; i++) {
                let songInfo = songsInfo[i];
                let title = songInfo.title;
                let lyric = songInfo.metadata.prompt.replace(/\[.*?\]/g, '');
                let audio_url = songInfo.audio_url;
                let video_url = songInfo.video_url;
                let image_large_url = songInfo.image_large_url;
                let fileName = `${title.replace(/ /g, '_')}_${i}`;

                const jsonPath = path.join(outputDir, `${fileName}.json`);
                const mp3Path = path.join(outputDir, `${fileName}.mp3`);
                const mp4Path = path.join(outputDir, `${fileName}.mp4`);
                const lrcPath = path.join(outputDir, `${fileName}.lrc`);
                const imagePath = path.join(outputDir, `${fileName}.png`);

                filePath[fileName] = {
                    jsonPath,
                    mp3Path,
                    mp4Path,
                    lrcPath,
                    imagePath
                }

                if (config.metadata) {
                    fs.writeFileSync(jsonPath, JSON.stringify(songInfo, null, 2), 'utf-8');
                    logger.info("信息已下载");
                }

                if (config.lyrics) {
                    fs.writeFileSync(lrcPath, `${title}\n\n${lyric}`, 'utf-8');
                    logger.info("歌词已下载");
                }

                if (config.cover) {
                    downloadTasks.push(this.downloadFile(image_large_url, imagePath));
                }

                if (config.audio) {
                    downloadTasks.push(this.downloadFile(audio_url, mp3Path));
                }

                if (config.video) {
                    downloadTasks.push(this.downloadFile(video_url, mp4Path));
                }
            }

            await Promise.all(downloadTasks);

            return filePath;
        } catch (e) {
            logger.error(e);
            throw e;
        }
    }

    async downloadFile(url, filePath) {
        try {
            const response = await axios.get(url, { responseType: 'stream' });
            
            if (response.status === 200) {
                const fileStream = fs.createWriteStream(filePath);
                response.data.pipe(fileStream);
                return new Promise((resolve, reject) => {
                    fileStream.on('finish', resolve);
                    fileStream.on('error', reject);
                });
            } else if (response.status === 403) {
                logger.info('文件还未生成好，正在重试...');
                return new Promise(resolve => setTimeout(resolve, 5000)).then(() => this.downloadFile(url, filePath));
            } else {
                throw new Error(`无法下载文件: ${url}`);
            }
        } catch (error) {
            if (error.response && error.response.status === 403) {
                logger.info('文件还未生成好，正在重试...');
                return new Promise(resolve => setTimeout(resolve, 5000)).then(() => this.downloadFile(url, filePath));
            } else {
                throw error;
            }
        }
    }

    // 获取指定页数的请求ID
    async getAllSongs(index) {
        try {
            const data = await this.getMetadata(index);
            return data;
        } catch (e) {
            logger.error(e);
            throw e;
        }
    }

    // 生成歌词
    async generateLyrics(prompt) {
        try {
            const requestId = await this.axiosInstance.request({
                method: 'POST',
                url: `${baseUrl}/api/generate/lyrics/`,
                data: { prompt }
            })
            let id = requestId?.data?.id;
            while (true) {
                const response = await this.axiosInstance.request({
                    method: 'GET',
                    url: `${baseUrl}/api/generate/lyrics/${id}`,
                })
                let data = response?.data;
                if (data?.status === 'complete') {
                    return data;
                }
                else {
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            }
        } catch (e) {
            logger.error(e);
            throw e;
        }
    }
}

export default SunoAI;