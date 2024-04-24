![sunoai-plugin](https://socialify.git.ci/erzaozi/sunoai-plugin/image?description=1&font=Raleway&forks=1&issues=1&language=1&name=1&owner=1&pattern=Circuit%20Board&pulls=1&stargazers=1&theme=Auto)

<img decoding="async" align=right src="resources/readme/girl.png" width="35%">

# SUNOAI-PLUGIN 🍮

- 一个适用于 [Yunzai 系列机器人框架](https://github.com/yhArcadia/Yunzai-Bot-plugins-index) 的 AI 音乐生成插件，让你在输入框中拥有便捷的 AI 音乐创作体验

- 使用强大的 [SUNOAI](https://suno.com) 音乐创作模型，支持多并发生成，能够**免费**体验！支持**付费**使用！交互式生成，支持多种语言，可生成超多种风格的高质量音乐。

- **使用中遇到问题请加 QQ 群咨询：[707331865](https://qm.qq.com/q/TXTIS9KhO2)**

> [!TIP]
> 在 AI 音乐合成超火的当下，我与 [CikeyQi](https://github.com/CikeyQi) 一拍即合决定开发这个插件，不仅仅是为了朋友们对 AI 音乐生成的喜爱，更是为了让更多人能够**创作**出**自己**的音乐，这个插件比你想得更有趣！

## 安装插件

#### 1. 克隆仓库

```
git clone https://github.com/erzaozi/sunoai-plugin.git ./plugins/sunoai-plugin
```

> [!NOTE]
> 如果你的网络环境较差，无法连接到 Github，可以使用 [GitHub Proxy](https://mirror.ghproxy.com/) 提供的文件代理加速下载服务
>
> ```
> git clone https://mirror.ghproxy.com/https://github.com/erzaozi/sunoai-plugin.git ./plugins/sunoai-plugin
> ```

#### 2. 安装依赖

```
pnpm install --filter=sunoai-plugin
```

## 插件配置

> [!WARNING]
> 非常不建议手动修改配置文件，本插件已兼容 [Guoba-plugin](https://github.com/guoba-yunzai/guoba-plugin) ，请使用锅巴插件对配置项进行修改

> [!TIP]
> 每个免费账号每天有 5 次生成次数，可以生成 10 首歌。可以先免费体验下，如果觉得好玩，~~在某些交易市场有 20 元一个月的共享账号~~（注册多个账号可以无限畅玩，插件已支持多账户自动无感切换）

<details> <summary>获取 Cookie</summary>

1. 打开 [SunoAI 官网](https://suno.com/) 并登录，F12 打开控制台，点击 `网络`
2. 请先刷新一遍网站，在筛选器中输入 `client?_clerk_js_version`，然后找到下面任意一个请求，复制 Cookie 即可

![1](https://github.com/erzaozi/sunoai-plugin/assets/61369914/78737289-c349-4553-8438-db5abb88aaf1)

</details>

## 功能列表

请使用 `#作曲` 开始生成你想要的歌曲

- [x] 随机生成
- [x] 纯音乐生成
- [x] 自定义歌词生成
- [x] 查看多账户余额
- [x] 账户无感切换
- [x] 获取历史生成记录

## 常见问题

1. 获取 session 会话失败
   - 检查你的 Cookie 是否正确或过期
   - ~~Sunoai 官网不稳定，间歇性出现该问题~~

## 支持与贡献

如果你喜欢这个项目，请不妨点个 Star🌟，这是对开发者最大的动力， 当然，你可以对我 [爱发电](https://afdian.net/a/sumoqi) 赞助，呜咪~❤️

有意见或者建议也欢迎提交 [Issues](https://github.com/erzaozi/sunoai-plugin/issues) 和 [Pull requests](https://github.com/erzaozi/sunoai-plugin/pulls)。

## 相关项目

- [suno-ai](https://github.com/hissincn/suno-ai)：Creat high quality songs from suno.ai by Javascript API.

## 许可证

本项目使用 [GNU AGPLv3](https://choosealicense.com/licenses/agpl-3.0/) 作为开源许可证。
