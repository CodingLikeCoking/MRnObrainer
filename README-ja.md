<p align="center">
   <a href="https://github.com/CodingLikeCoking/MRnObrainer/releases">
      <img src="https://github.com/user-attachments/assets/d3b1de26-c3c0-4c84-b9c4-b03213b97a30" alt="MRnObrainer logo" width="200">
   </a>
</p>

<p align="center">
   <a href="README.md">English</a> | <a href="README-zh_CN.md">简体中文</a> | <a href="README-ja.md">日本語</a>
</p>

# MRnObrainer

画面上の作業をローカルで記録し、検索し、繰り返し作業を自動化候補として扱うためのオープンソースデスクトップ基盤です。

> 変更中の注意
> 内部パッケージ名や一部のパスには引き続き `screenpipe` が残っています。公開向けの製品名と OSS 方針は英語版の [README.md](README.md) を正本として扱ってください。

## 何ができるか

- 画面と音声のコンテキストをオンデバイスで保持
- タイムラインと検索で後から確認
- 繰り返し作業を自動化候補として扱う
- ローカル実行、OpenClaw、MCP 接続先へ処理を振り分ける

## クイックスタート

1. [MRnObrainer Releases](https://github.com/CodingLikeCoking/MRnObrainer/releases) から最新ビルドを取得します。
2. 初回起動時に画面収録、マイク、アクセシビリティ権限を確認します。
3. `Cmd+Shift+O` でダッシュボードとタイムラインを開きます。

ソースから動かす場合は英語版 README の build 手順を参照してください。

## セキュリティとプライバシー

- 既定ではローカルファーストです。
- クラウドや OAuth を使う構成では、タスク文脈が端末外に出る可能性があります。
- 公開 issue や PR に実際の録画、秘密情報、個人データを添付しないでください。

## 参加方法

- 変更ルール: [docs/CHANGE_RULES.md](docs/CHANGE_RULES.md)
- コントリビュート: [CONTRIBUTING.md](CONTRIBUTING.md)
- セキュリティ報告: [SECURITY.md](SECURITY.md)
- 行動規範: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

## リポジトリ内の主な入口

- [README.md](README.md): 正式な製品説明と OSS 方針
- [docs/OSS_RELEASE_CHECKLIST.md](docs/OSS_RELEASE_CHECKLIST.md): 公開前チェック
- [packages/agent/README.md](packages/agent/README.md): エージェント接続
- [packages/sync/README.md](packages/sync/README.md): 要約と同期

## Screenpipe との関係

MRnObrainer は Screenpipe のキャプチャ/ランタイム基盤の上に構築されています。系譜が重要な場所では Screenpipe 名を残しつつ、公開ドキュメントでは MRnObrainer を前面に出しています。
