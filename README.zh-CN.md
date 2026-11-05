# DeepSeek Harness 的 OpenUI Studio 插件

[English](./README.md) | 简体中文

OpenUI Studio 在普通 DeepSeek Harness（DSH）对话中增加按需使用的 `/openui`
指令。插件使用当前选中的模型生成 OpenUI Lang，按 OpenUI 官方聊天组件库校验，
再用官方 Renderer 将结果显示在原对话中。对话、思考过程、历史记录、工具记录和输入框
仍由 DSH 管理。

## 快速开始

1. 安装 DSH，并在 **设置 → 模型** 中选好默认模型。
2. 克隆仓库，使用 Node.js 20 或更新版本构建本地插件包：

   ```sh
   git clone https://github.com/zouyao-andy/dsh-openui-studio.git
   cd dsh-openui-studio
   npm ci
   npm run build
   ```

3. 通过 DSH 的 `plugin_manager` 将本目录安装为本地插件包；如果桌面配置已经链接
   到本目录，可跳过安装。构建或更新插件后，完全退出并重新打开 DSH。
4. 在标准模式或 PTC 模式的对话中输入，例如：

   ```text
   /openui 解释 KV Cache 的显存开销，并用图表和算例展示
   ```

只有明确使用 `/openui` 的这一轮才会启用 OpenUI 生成；普通消息继续走 DSH
原有流程。指令支持附件，也支持只附附件、不输入问题的用法。

Agent 会结合当前对话中的相关信息调用 `openui_generate`。有效结果作为 DSH
工具结果保存，并显示在聊天正文。如果第一次生成未通过 OpenUI 校验，插件会尝试
修复一次；仍然失败时由 DSH 展示工具错误，不保存不完整的界面。重新打开历史对话
只渲染已保存的结果，不会再次调用模型。

点击 OpenUI 回答中的交互选项，会把建议问题填入 DSH 输入框并将焦点移过去；
**不会自动发送消息**。

## 绘制动画与重播

新生成的回答由结构、内容、组件三个光标协同绘制。标题和大纲标签逐字出现；长正文
按内容块在进入视口时显现。表格依次显现表头和行；尺寸合适且没有横向溢出时，
光标会调整真实表格宽度。图表按类型绘制坐标轴和数据标记；适合的小图还会进行一次
短距离尺寸调整。ImageText 的图片容器会真实改变尺寸，让相邻文字重新排版。

历史回答会立即完整显示。点击 **OpenUI Studio** 旁的**重播**图标，可在不调用
模型的情况下重新播放绘制动画。启用跟随滚动时，视口会随着当前绘制位置向下移动。
用户点击、滚轮滚动或按键后，动画立即结束并完整显示内容。系统设置了减少动态
效果，或新回答在 DSH 后台完成时，会跳过自动播放。

动画作用于已经渲染的 OpenUI DOM，不修改 OpenUI Lang 结果，也不增加聊天记录。

## 渲染配置

编辑 [`render.js`](./render.js) 可以调整渲染层。点击 **OpenUI Studio** 旁的
配置图标可在 DSH 中打开它，也可以直接编辑文件。文件默认导出一个 JavaScript
对象：

| 参数 | 默认值 | 作用 |
| --- | --- | --- |
| `showEditButton` | `true` | 显示打开 `render.js` 的配置图标。 |
| `toolbar` | `['replay']` | 排列或隐藏 `replay`、`debug`、`download-log` 按钮。 |
| `animation.autoPlay` | `true` | 新回答自动播放；关闭后仍可手动重播。 |
| `animation.followScroll` | `true` | 随绘制位置滚动；关闭时只给初始视口内的内容播放动画。 |
| `css` | 插件内置样式 | 覆盖 OpenUI 回答区域的 CSS。 |

`css` 中提供 `--openui-studio-font`、`--openui-studio-body-size`、
`--openui-studio-body-leading`、`--openui-studio-heading-size` 等字体变量。
新增 CSS 选择器应限定在 `.openui-answer` 或 `.openui-native` 下，避免影响
DSH 自身界面。这些设置只改变渲染和按钮，不改变大模型提示词或已保存的回答。
修改 `render.js` 后需完全退出并重新打开 DSH；无需重新构建插件或调用模型。
配置无效时会回退到插件内置默认值，并在回答标题旁显示错误。

模型调用参数维护在 [`cordis.patch.yml`](./cordis.patch.yml)：`provider`、
`model`、`maxTokens`、`temperature` 和 `maxQuestionChars`。`provider: null`
与 `model: null` 表示使用 DSH 当前选中的默认模型。没有可用模型时，插件会明确
报错。修改插件配置后需重启 DSH。

## 动画调试

1. 在 `render.js` 中设置 `toolbar: ['replay', 'debug', 'download-log']`，然后
   重启 DSH。
2. 点击 **OpenUI Studio** 旁的虫形图标，重播并记录内容块、光标、动画、滚动
   和结束事件。
3. 播放结束后点击下载图标，保存 JSON 日志。

日志只包含时间与几何信息，不包含回答正文；不需要打开开发者工具控制台。
默认工具栏只显示重播按钮，调试和下载按钮默认隐藏。

## 开发与验证

```sh
npm test
npm run test:render
npm run build
```

`src/host/index.js` 负责指令、受控工具、模型调用和 OpenUI 校验；
`src/client/chat-answer.js` 把已保存结果放进 DSH 回答区；
`src/client/native-answer.js` 使用官方 Renderer 和样式。
`src/client/drawing-reveal.js` 统一调度绘制、滚动、光标和清理；
`src/client/drawing/` 为各内容类型提供独立策略。
`scripts/gen.mjs` 生成官方 OpenUI 提示词和 Schema，`scripts/build.mjs`
生成 Host 的 `index.js` 与 Client 的 `client.js`。修改插件源码后需要重新构建，
并重启 DSH。

插件不会另建对话数据库、侧边栏、输入框或 DSH 模式。这个基于官方 Renderer
的版本不兼容早期自定义 `Stack` 回答。

## 社区与许可证

可以通过 [`dsh-plugin`](https://github.com/topics/dsh-plugin) 主题发现其他 DSH
插件。DSH 的反馈和问题请到
[DeepSeek Harness Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions)
提交，也可以加入 [DSH Discord 社区](https://discord.gg/4MrtZUhpxg)。
本插件采用 [MIT License](./LICENSE)。
