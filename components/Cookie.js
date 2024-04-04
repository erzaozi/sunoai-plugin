import axios from 'axios'
import { HttpsProxyAgent } from 'https-proxy-agent';
import Config from './Config.js'
import Log from '../utils/logs.js';

const common_headers = {
    "authority": "clerk.suno.ai",
    "Origin": "https://app.suno.ai",
    "Referer": "https://app.suno.ai/",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
    "Content-Type": "text/plain;charset=UTF-8",
}

// 维护cookie
class sunoCookie {
    constructor() {
        this.cookies = ''
        this.session_id = ''
        this.token = ''
        this.start()
    }
    start() {
        const config = Config.getConfig()
        this.cookies = config.cookie
        this.session_id = config.__sess
        this.keepAlive()
    }
    async keepAlive() {
        while (true) {
            try {
                this.updata_token()
            } catch (err) {
                Log.e(err)
            } finally {
                await this.sleep(10)
            }
        }
    }
    async updata_token() {
        let agent = null
        // 获取代理
        if (Config.getConfig().proxy.enable) {
            let proxy = 'http://' + Config.getConfig().proxy.host + ':' + Config.getConfig().proxy.port
            agent = new HttpsProxyAgent(proxy)
        }
        // 设置headers
        common_headers['Cookie'] = this.cookies
        try {
            const response = await axios.post(`https://clerk.suno.ai/v1/client/sessions/${this.session_id}/tokens?_clerk_js_version=4.70.5`, {}, {
                headers: common_headers,
                withCredentials: true,
                httpsAgent: agent
            })
            // 设置token
            this.token = response.data.jwt
            // 获取请求头set-cookie字段
            let set_cookie = response.headers['set-cookie'] || ['']
            // set_cookie是字符串数组
            this.setCookie(set_cookie)
        } catch (err) {
            Log.e(`[sunoai-plugin]token刷新失败:${err}`)
        }
    }
    // 存储新cookie
    setCookie(set_cookie) {
        const newCookieObject = this.cookieStr2Object(set_cookie.join(';'))
        const oldCookieObject = this.cookieStr2Object(this.cookies)
        // 合并新旧cookies
        const mergedCookieObject = { ...oldCookieObject, ...newCookieObject }
        // 将cookies转成字符串
        const cookies = this.cookieObject2Str(mergedCookieObject)
        // 当前实例刷新cookie
        this.cookies = cookies
        // 新cookie保存到config中
        const config = Config.getConfig()
        config.cookie = cookies
        Config.setConfig(config)
    }
    // 将Cookie字符串转换成键值对
    cookieStr2Object(cookieStr) {
        const konwnAttibutes = ['path', 'Path', 'domain', 'Domain', 'max-Age', 'Max-Age', 'secure', 'Secure', 'sameSite', 'SameSite', 'expires', 'Expires', 'httpOnly', 'HttpOnly']
        let cookies = {}
        // 过滤set-cookie中非cookie的属性
        cookieStr.split(';').forEach(item => {
            const pair = item.trim().split('=')
            if (!konwnAttibutes.includes(pair[0])) cookies[pair[0]] = pair[1]
        })
        return cookies
    }
    // 将Cookie键值对转换成字符串
    cookieObject2Str(cookieObject) {
        const cookies = Object.entries(cookieObject).map(([key, value]) => `${key}=${value}`).join(';')
        return cookies
    }
    // 睡眠 单位秒
    sleep(s) {
        return new Promise(resolve => setTimeout(resolve, s * 1000))
    }
}

export default new sunoCookie()