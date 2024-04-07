import Config from "./components/Config.js";
import lodash from "lodash";
import path from "path";
import { pluginRoot } from "./model/path.js";

export function supportGuoba() {
  return {
    pluginInfo: {
      name: 'sunoai-plugin',
      title: 'sunoai-plugin',
      author: ['@erzaozi', '@CikeyQi'],
      authorLink: ['https://github.com/erzaozi', 'https://github.com/CikeyQi'],
      link: 'https://github.com/erzaozi/sunoai-plugin',
      isV3: true,
      isV2: false,
      description: '基于Yunzai-Bot的AI音乐生成插件',
      // 显示图标，此为个性化配置
      // 图标可在 https://icon-sets.iconify.design 这里进行搜索
      icon: 'mdi:stove',
      // 图标颜色，例：#FF0000 或 rgb(255, 0, 0)
      iconColor: '#d19f56',
      // 如果想要显示成图片，也可以填写图标路径（绝对路径）
      iconPath: path.join(pluginRoot, 'resources/icon.png'),
    },
    configInfo: {
      schemas: [
        {
          component: "Divider",
          label: "🍪饼干池",
          componentProps: {
            orientation: "left",
            plain: true,
          },
        },
        {
          field: "cookie_pool",
          label: "Cookie池",
          bottomHelpMessage: "用于调用SunoAI的相关接口",
          component: "GTags",
          componentProps: {
            placeholder: '请输入您的SunoAI Cookie',
            allowAdd: true,
            allowDel: true,
            showPrompt: true,
            promptProps: {
              content: '请将你获取到的Cookie粘贴到这里',
              placeholder: '',
              okText: '添加',
              rules: [
                { required: true, message: 'Cookie不能为空' }
              ],
            },
            valueParser: ((value) => value.split(',') || []),
          },
        },
        {
          field: "use_cookie",
          label: "使用指定Cookie",
          bottomHelpMessage: "使用指定的Cookie来调用SunoAI",
          component: "InputNumber",
          componentProps: {
            min: 1,
            max: Config.getConfig().cookie_pool.length,
            step: 1,
          },
        },
        {
          component: "Divider",
          label: "💾存储",
          componentProps: {
            orientation: "left",
            plain: true,
          },
        },
        {
          field: "save_data.metadata",
          label: "保存元数据",
          bottomHelpMessage: "是否保存元数据",
          component: "Switch",
        },
        {
          field: "save_data.lyric",
          label: "保存歌词",
          bottomHelpMessage: "是否保存歌词",
          component: "Switch",
        },
        {
          field: "save_data.cover",
          label: "保存封面",
          bottomHelpMessage: "是否保存封面",
          component: "Switch",
        },
        {
          field: "save_data.audio",
          label: "保存音频",
          bottomHelpMessage: "是否保存音频(关闭后无法发送语音/文件)",
          component: "Switch",
        },
        {
          field: "save_data.video",
          label: "保存视频",
          bottomHelpMessage: "是否保存视频(关闭后无法发送视频)",
          component: "Switch",
        },
        {
          component: "Divider",
          label: "🎨其他",
          componentProps: {
            orientation: "left",
            plain: true,
          }
        },
        {
          field: "send_type",
          label: "发送方式",
          bottomHelpMessage: "选择发送方式",
          component: "Select",
          componentProps: {
            options: [
              { label: "发送语音", value: "record" },
              { label: "发送视频", value: "video" },
              { label: "发送文件", value: "file" },
            ],
          },
        },
        {
          field: "await_time",
          label: "等待生成次数",
          bottomHelpMessage: "等待一次为5秒，不要设置太小导致无法使用",
          component: "InputNumber",
          componentProps: {
            min: 20,
            max: 100,
            step: 1,
          },
        },
      ],
      getConfigData() {
        let config = Config.getConfig()
        return config
      },

      setConfigData(data, { Result }) {
        let config = {}
        for (let [keyPath, value] of Object.entries(data)) {
          lodash.set(config, keyPath, value)
        }
        config = lodash.merge({}, Config.getConfig(), config)
        config.cookie_pool = data['cookie_pool']
        config.use_cookie = data['use_cookie']
        Config.setConfig(config)
        return Result.ok({}, '保存成功~')
      },
    },
  }
}