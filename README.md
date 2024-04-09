<div align="center">

# SUNOAI-PLUGIN

</div>

<span id="header"></span>

<p align="center">
  <img src="https://img.shields.io/badge/Nodejs-18.x+-6BA552.svg" alt="Nodejs">
  <img src="https://img.shields.io/badge/Yunzai_Bot-v3-red.svg" alt="NoneBot">
  <br>
  </a>
    <a href="https://qm.qq.com/q/RnQteOmD84">
    <img src="https://img.shields.io/badge/QQ%E7%BE%A4-%E7%8C%AB%E5%A8%98%E4%B9%90%E5%9B%AD-pink?style=flat-square" alt="QQ Chat Group">
  </a>
</p>

## 简介

SunoAI-Plugin 是一款在 QQ 内快速调用 [SunoAI](https://www.suno.ai/) 最新 [SunoAI V3] 模型进行多参数便捷 AI 作曲的 [Yunzai-Bot](https://github.com/Le-niao/Yunzai-Bot) 插件，如果你喜欢这个项目，请不妨点个 Star🌟，这是对开发者最大的动力

## 安装

- 克隆本仓库至 plugins 目录
```
git clone https://github.com/erzaozi/sunoai-plugin.git ./plugins/sunoai-plugin
```

- 安装依赖
```
pnpm install --filter=sunoai-plugin
```

## 获取 Cookie

每个免费账号每天有5次生成次数，可以生成10首歌。可以先免费体验下，如果觉得好玩，在某些交易市场有20元一个月的共享账号

 1. 打开 [SunoAI官网](https://app.suno.ai) 并登录，F12 打开控制台，点击 `网络`
 2. 刷新一遍网站，在筛选器中输入 `client`，然后找到下面任意一个请求，复制Cookie即可
    
    ![1](https://github.com/erzaozi/sunoai-plugin/assets/61369914/78737289-c349-4553-8438-db5abb88aaf1)

## 配置文件

非常不建议手动修改配置文件，本插件已兼容 [Guoba-plugin](https://github.com/guoba-yunzai/guoba-plugin) ，请使用锅巴插件对配置项进行修改

```yaml
# 支持配置多个Cookie
cookie_pool:
  - please_paste_your_cookie_1_here
  - please_paste_your_cookie_2_here
# 使用的Cookie，从1开始
use_cookie: 1
# 保存文件到本地
save_data:
  metadata: true
  lyric: true
  cover: true
  audio: true
  video: false
# 发送类型，record为语音，video为视频，file为mp3文件
send_type: 'record'
# 等待次数，一次为5秒，请不要调过低导致任务失败
await_time: 60
```

## 功能详解

**如果使用过程中出现问题可以加群 `551081559` 反馈问题**

| 命令 | 功能 | 说明 |
| :---: | :---: | :---: |
| #suno作曲 | 生成歌曲 | 请按照接下来的提示操作 |
| #取消作曲 | 取消生成歌曲 | 立即停止作曲操作 |
| #全部歌曲 | 获取生成好的音乐列表 | 可以用 `#获取全部歌曲第x页` 翻页 |
| #查看歌曲 | 发送上一次生成好的音乐文件 | 可以用 `#查看歌曲+序号` 获取历史歌曲 |
| #账号状态 | 查询所有Cookie状态 | —— |

## 效果展示
<details>
<summary>放个《我会自己上厕所》镇楼</summary>

https://github.com/erzaozi/sunoai-plugin/assets/61369914/491df3f9-4158-4f25-8a82-7141a93e6cfd

</details>

## 声明

此项目仅用于学习交流，请勿用于非法用途

## 致谢
[SunoAI](https://www.suno.ai/)：Suno is building a future where anyone can make great music.\
[suno-ai](https://github.com/hissincn/suno-ai)：Creat high quality songs from suno.ai by Javascript API.

