<p align="center">
   <a href="https://github.com/CodingLikeCoking/MRnObrainer/releases">
      <img src="https://github.com/user-attachments/assets/d3b1de26-c3c0-4c84-b9c4-b03213b97a30" alt="MRnObrainer logo" width="200">
   </a>
</p>

<p align="center">
   <a href="README.md">English</a> | <a href="README-zh_CN.md">简体中文</a> | <a href="README-ja.md">日本語</a>
</p>

# MRnObrainer

一个开源、以本地优先为核心的桌面运行时，用来保留屏幕与音频上下文、进行搜索，并把重复工作转成自动化候选。

> 迁移说明
> 仓库里的部分内部包名和路径仍然保留 `screenpipe`。公开产品描述、许可和 OSS 姿态以英文版 [README.md](README.md) 为准。

## 目前能做什么

- 在设备本地保存屏幕和音频上下文
- 通过时间线和搜索回看工作过程
- 识别重复流程并生成自动化候选
- 将任务路由到本地运行时、OpenClaw 或 MCP 连接器

## 快速开始

1. 从 [MRnObrainer Releases](https://github.com/CodingLikeCoking/MRnObrainer/releases) 下载最新构建。
2. 首次启动时授予屏幕录制、麦克风和辅助功能权限。
3. 按 `Cmd+Shift+O` 打开仪表盘和时间线。

如果你想从源码运行，请参考英文 README 中的构建步骤。

## 安全与隐私

- 默认姿态是本地优先。
- 如果你启用了云服务或 OAuth，任务上下文可能会离开本机。
- 不要在公开 issue 或 PR 中上传真实录屏、原始音频、密钥或个人数据。

## 参与贡献

- 变更规则: [docs/CHANGE_RULES.md](docs/CHANGE_RULES.md)
- 贡献指南: [CONTRIBUTING.md](CONTRIBUTING.md)
- 安全报告: [SECURITY.md](SECURITY.md)
- 行为准则: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

## 仓库入口

- [README.md](README.md): 正式产品说明和 OSS 姿态
- [docs/OSS_RELEASE_CHECKLIST.md](docs/OSS_RELEASE_CHECKLIST.md): 开源发布前检查
- [packages/agent/README.md](packages/agent/README.md): 代理集成
- [packages/sync/README.md](packages/sync/README.md): 摘要与同步

## 与 Screenpipe 的关系

MRnObrainer 建立在 Screenpipe 的采集和运行时基础之上。凡是需要说明技术来源或兼容性的地方，仓库里仍会出现 Screenpipe 名称；对外文档则统一以 MRnObrainer 为主。
