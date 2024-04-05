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
            console.error(e);
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
            console.error(e);
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
                console.error(response.statusText);
                throw new Error(`Error response ${response.status}`);
            }

            const responseBody = response.data;
            const songsMetaInfo = responseBody.clips;
            const requestIds = songsMetaInfo.map(info => info.id);
            console.log(requestIds);

            return requestIds;
        } catch (e) {
            console.error(e);
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
            if (ids && ids.length > 0) {
                params.ids = ids.join(',');
            }

            while (true) {
                const response = await this.axiosInstance.request({
                    method: 'GET',
                    url: `${baseUrl}/api/feed/`,
                    params
                });

                let data = response?.data;

                if (data[0]?.audio_url && data[1]?.audio_url) {
                    if (config.save_data.video) {
                        if (data[0]?.video_url && data[1]?.video_url) {
                            return data;
                        }
                    } else {
                        return data;
                    }
                }
                else {
                    if (retryTimes > maxRetryTimes) {
                        throw new Error('生成歌曲失败');
                    }
                    else {
                        console.log('正在重试...');
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        retryTimes += 1;
                    }
                }
            }
        } catch (e) {
            console.error(e);
        }
    }

    // 生成歌曲
    async generateSongs(payload) {
        try {
            const requestIds = await this.getRequestIds(payload);
            const songsInfo = await this.getMetadata(requestIds);
            return songsInfo;
        } catch (e) {
            console.error(e);
            throw e;
        }
    }

    // 将生成的歌曲保存到指定目录
    async saveSongs(songsInfo) {
        try {
            // 获取配置文件
            let config = await Config.getConfig().save_data

            let outputDir = pluginResources + '/output'

            for (let i = 0; i < songsInfo.length; i++) {
                let songInfo = songsInfo[i];
                let title = songInfo.title;
                let lyric = songInfo.metadata.prompt.replace(/\[.*?\]/g, '');
                let audio_url = songInfo.audio_url;
                let video_url = songInfo.video_url;
                let image_large_url = songInfo.image_large_url;
                let fileName = `${title.replace(/ /g, '_')}_${i}`;

                console.log(`保存 ${fileName}`);

                const jsonPath = path.join(outputDir, `${fileName}.json`);
                const mp3Path = path.join(outputDir, `${fileName}.mp3`);
                const mp4Path = path.join(outputDir, `${fileName}.mp4`);
                const lrcPath = path.join(outputDir, `${fileName}.lrc`);
                const imagePath = path.join(outputDir, `${fileName}.png`);

                if (config.metadata) {
                    // 保存信息
                    fs.writeFileSync(jsonPath, JSON.stringify(songInfo, null, 2), 'utf-8');
                    console.log("信息已下载");
                }

                if (config.lyrics) {
                    // 保存歌词
                    // 等待处理！！！！！
                    fs.writeFileSync(lrcPath, `${title}\n\n${lyric}`, 'utf-8');
                    console.log("歌词已下载");
                }

                if (config.cover) {
                    // 保存封面
                    const imageResponse = await axios.get(image_large_url, { responseType: 'stream' });
                    if (imageResponse.status !== 200) {
                        throw new Error('无法下载封面');
                    }
                    const imageFileStream = fs.createWriteStream(imagePath);
                    imageResponse.data.pipe(imageFileStream);
                    await new Promise((resolve, reject) => {
                        imageFileStream.on('finish', resolve);
                        imageFileStream.on('error', reject);
                    });
                    console.log("封面已下载");
                }

                if (config.audio) {
                    // 保存歌曲
                    console.log("歌曲下载中...");
                    const response = await axios.get(audio_url, { responseType: 'stream' });
                    if (response.status !== 200) {
                        throw new Error('无法下载歌曲');
                    }
                    const fileStream = fs.createWriteStream(mp3Path);
                    response.data.pipe(fileStream);
                    await new Promise((resolve, reject) => {
                        fileStream.on('finish', resolve);
                        fileStream.on('error', reject);
                    });
                    console.log("歌曲已下载");
                }

                if (config.video) {
                    // 保存视频
                    console.log("视频下载中...");
                    const response = await axios.get(video_url, { responseType: 'stream' });
                    if (response.status !== 200) {
                        throw new Error('无法下载视频');
                    }
                    const fileStream = fs.createWriteStream(mp4Path);
                    response.data.pipe(fileStream);
                    await new Promise((resolve, reject) => {
                        fileStream.on('finish', resolve);
                        fileStream.on('error', reject);
                    })
                    console.log("视频已下载");
                }
            }
        } catch (e) {
            console.error(e);
            throw e;
        }
    }

    // 获取所有生成的歌曲元数据
    async getAllSongs() {
        try {
            const data = await this.getMetadata();
            return data;
        } catch (e) {
            console.error(e);
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
                    // console.log('重试中...');
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            }
        } catch (e) {
            console.error(e);
            throw e;
        }
    }
}

export default SunoAI;