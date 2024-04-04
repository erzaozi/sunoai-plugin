import axios from 'axios'
import { HttpsProxyAgent } from 'https-proxy-agent';
import Cookie from './Cookie.js'
import Config from './Config.js'
import Log from '../utils/logs.js';

// 请求头
const common_headers = {
    "Origin": "https://app.suno.ai",
    "Referer": "https://app.suno.ai/",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
    "Content-Type": "application/json; charset=utf-8",
}

// 默认参数
const param = {
    // 歌词
    "prompt": "[Verse]\nWake up in the morning, feeling brand new\nGonna shake off the worries, leave 'em in the rearview\nStep outside, feeling the warmth on my face\nThere's something 'bout the sunshine that puts me in my place\n\n[Verse 2]\nWalking down the street, got a spring in my step\nThe rhythm in my heart, it just won't forget\nEverywhere I go, people smiling at me\nThey can feel the joy, it's contagious, can't you see?\n\n[Chorus]\nI got sunshine in my pocket, happiness in my soul\nA skip in my stride, and I'm ready to go\nNothing gonna bring me down, gonna keep on shining bright\nI got sunshine in my pocket, this world feels so right",
    // 曲风
    "tags": "heartfelt anime",
    // 模型
    "mv": "chirp-v3-0",
    // 标题
    "title": "Sunshine in your Pocket",
    "continue_clip_id": null,
    "continue_at": null,
}

async function sunoFetch(url, method = 'post', data = null) {
    try {
        const headers = { ...common_headers, Authorization: `Bearer ${Cookie.token}` }
        let agent = null
        // 获取代理
        if (Config.getConfig().proxy.enable) {
            let proxy = 'http://' + Config.getConfig().proxy.host + ':' + Config.getConfig().proxy.port
            agent = new HttpsProxyAgent(proxy)
        }
        return await axios({ url: url, method: method, headers: headers, data: data }) 
    } catch (err) {
        Log.e(err)
        return null
    }
}

async function getFeed(data) {
    const url = `${Config.getConfig().base_url}/api/feed/`
    return await sunoFetch(url, 'get', data)
}

async function generateMusic(data) {
    const url = `${Config.getConfig().base_url}/api/generate/v2/`
    return await sunoFetch(url, 'post', data)
}

async function generateLyrics(prompt) {
    const url = `${Config.getConfig().base_url}/api/generate/lyrics/`
    const data = {
        prompt: prompt
    }
    return await sunoFetch(url, 'post', data)
}

async function getLyrics(lid) {
    const url = `${Config.getConfig().base_url}/api/generate/lyrics/${lid}`
    return await sunoFetch(url, 'get', data)
}

export { getFeed, generateMusic, generateLyrics, getLyrics }