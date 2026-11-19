# 交接：接着做 Jump Attack

写于 2026-11-19，基于 `main` 36de6ed。给换账号后的 Claude 或新加入的人看：先读根目录 `CLAUDE.md`（规则），再读这份（现状和背景），需要细节时翻 [`archive/`](archive/)。

## 现在在哪

- 目标：2026-12-01 前无对抗扣进一个干脆的篮。助跑摸高约 318 cm，扣篮线 320（305 + 15），差约 2 cm，已经接近摸高读数本身的误差。
- 功能基本齐全，最大的问题是**所有测量只在合成视频上验证过**，真机对比一次都没做（`D:\claude\validation\读数.txt` 还是空模板）。复盘结论见 [`archive/2026-11-17-retro.md`](archive/2026-11-17-retro.md)。
- 用户 2026-11-17 选了复盘的方案 B：12/1 前只修 bug，先把验证闭环搭起来。

## 下一步（按顺序）

1. **真机验证日**：按 [`archive/2026-10-28-validation-day-checklist.md`](archive/2026-10-28-validation-day-checklist.md) 拍，挑用户本来就要测的那天多拍 20 分钟。流程写在 Skill [`.claude/skills/jump-attack-real-device-validation`](../.claude/skills/jump-attack-real-device-validation/SKILL.md) 里。真实扣篮成败（App 里的「扣篮尝试」）是最高标准答案。
2. **PR #64**（草稿，方案 B 落地）：等用户看。合并后才有 `domain/validation.ts`、PR 模板「验证状态」和 CLAUDE.md 规则 6–8。
3. **PR #59**（草稿，同步和云端备份的修复）：合并前用户要在 Supabase 做几步一次性操作，步骤在 PR 描述「需要你做的事」里，之后真机试备份页和换账号弹窗。
4. 体验改进清单剩下的 20 条（[`archive/2026-11-04-e2e-review.md`](archive/2026-11-04-e2e-review.md) 里没标「已做」的）：等用户挑编号，12/1 前只做属于 bug 的。
5. 其他开着的 PR（#66、#62、#43）是 Dependabot 升级，不急。

## 用户定过、代码里看不出来的事

- **只在 Expo Go 里跑**（SDK 58，跟用户手机上的 Expo Go 版本走），不依赖原生模块。不要主动推 Apple 开发者账号、TestFlight 或上架。用户的 Mac 是 Intel 芯片，装不了新版 Xcode。
- **GitHub 只用仓库所有者账号**（原 Sam18069272581，2026-11 改名，旧地址自动跳转）。开 PR 不设别的账号做负责人或审阅人。
- **很多阈值是「先合并再真机测」**：#13（VBT）、#21（自动标帧）、#23（跳跃分析）等用的是报告默认值，没真机确认。改它们照 CLAUDE.md 规则 2，先说理由等用户确认。
- 用户明确确认过的阈值：起跳技术拒绝规则 15° / 22.5° / 0.35–1.35 m；站立摸高 150–300 cm、过筐余量 0–50 cm、训练组重量 0–500 kg、RPE 1–10；膝盖没有基线时次晨疼痛 > 5 判红、只看 7 天；CMJ 准备度基线只用同来源；目标日 2026-12-01（在「我的」里填，不写死在代码里）。
- 素材视频只能在 `D:\claude` 里移动，不能挪到 C 盘。
- 用户用中文交流，不熟悉终端；给命令时连 `cd` 的完整路径一起给。

## 仓库外的东西

| 东西 | 在哪 | 备注 |
|---|---|---|
| 云端备份 | Supabase 免费版，法兰克福，地址和公开 key 在 `mobile/src/sync/config.ts` | 表结构 `mobile/supabase/backups.sql`。数据库密码 App 用不到 |
| Expo Go 云端版 | EAS Update，owner `sam-lis-team`，见 `mobile/app.json` | `.github/workflows/eas-update.yml` 用仓库 secret `EXPO_TOKEN` 发布 |
| 网页版 | https://sam18069272581.github.io/jump-attack/ ，落地页在 `/intro/`（源码 `site/`） | `.github/workflows/web.yml` |
| 用户的 Windows | `D:\claude`：`CLAUDE.md` 副本、`validation\`（验证视频和读数）、`jump-attack\raw material\`（44 段素材，按「日期_动作_序号_原编号」命名） | `D:\claude\jump-attack` 是 10 月底的旧 clone，没有 `site/`、`tools/`，接手时重新 clone |
| 交接副本 | `D:\claude\jump-attack-handoff\`（只在用户电脑上） | 旧账号的项目记忆、共享文件夹里的工具脚本、宣传片源文件，还有不进公开仓库的安全测试清单 |

用户在 Mac 上测试的方式：下载 `main` 的 zip，解压后进 `mobile/` 跑 `npm install`、`npm start`，手机扫码。重新下载前先 `cd ~` 再删旧文件夹。

## 环境里的坑

- **Expo Go 的数据按启动电脑分开**：没登录 Expo 账号时，Mac 和 Windows 各启动一次就是两份数据，看起来像丢了。靠「我的 → 数据备份与同步」。
- 校园网 eduroam 隔离设备，Expo Go 加载不出来：用 iPhone 热点或 `npm start -- --tunnel`。
- 网页版的数据库（OPFS）同一浏览器只能一个标签页打开，报 `unable to open database file` 时关掉其它标签页或退出浏览器。
- 云端容器的代理挡 `*.supabase.co`、`api.expo.dev` 和 `github.io`：`npx expo install` 会失败，按 `expo` 包里 `bundledNativeModules.json` 的版本手动 `npm install`；Supabase 和网页版只能让用户在真机上试。容器也删不了远程分支，要用户在 GitHub 上删。
- Claude GitHub App 没装在这个仓库上，收不到 PR 事件，CI 结果要自己去查。
- 准确度 CI（`accuracy.yml`）变红时先看是不是真变差；有意换数才用 `node tools/accuracy-regression/run.js <项> --update` 更新基线，并在 PR 里说明。

## 旧链接对照

旧账号停用后，下面这些 claude.ai 页面可能打不开，以仓库里的文件为准。

| 内容 | 旧链接 ID | 现在看 |
|---|---|---|
| 系统设计 | e1b76539… | [`system-design.md`](system-design.md) |
| UI 设计稿 | TdA5bEMuYhctBQhrrQeKv9 | [`design/`](../design/) |
| VBT 与力-速度曲线方案 | 50e6aa5f… | [`archive/2026-10-20-vbt-fvp.md`](archive/2026-10-20-vbt-fvp.md) |
| 扣篮导向方案 | UJFWkuiY7Rm5oKGZ8aSP8G | [`archive/2026-10-22-dunk-plan.md`](archive/2026-10-22-dunk-plan.md) |
| 优化清单 | KqDghBx36SiZ4Zu9bo9g5k | [`archive/2026-10-28-optimization-list.md`](archive/2026-10-28-optimization-list.md) |
| 短板清单 | CvutWXiVrQdm9CNFSDL7Gy | [`archive/2026-10-28-benchmark.md`](archive/2026-10-28-benchmark.md) |
| 短板清单要确认的规则 | PRqJhC4cYHMEr7QJiB9HzU | [`archive/2026-10-28-benchmark-rules.md`](archive/2026-10-28-benchmark-rules.md) |
| 原生构建评估 | 6BPaZcKyCPoFduY9EQdgiA | [`archive/2026-10-28-native-build.md`](archive/2026-10-28-native-build.md) |
| 跳跃视频分析误差报告 | Mv4krc7F4yvEVUEL3ud3zd | [`archive/2026-10-28-jump-analysis-errors.md`](archive/2026-10-28-jump-analysis-errors.md) |
| VBT 测速误差报告 | DeqKoPTtaJqnYcCJTsWeNq | [`archive/2026-10-28-vbt-errors.md`](archive/2026-10-28-vbt-errors.md) |
| 起跳骨架分析方案 | 9udwCWq3pQMwYkyyVnyPq7 | [`archive/2026-10-28-pose-technique-plan.md`](archive/2026-10-28-pose-technique-plan.md) |
| 真机验证日拍摄清单 | 5NpdStjbnLwVvhPjhNUxbc | [`archive/2026-10-28-validation-day-checklist.md`](archive/2026-10-28-validation-day-checklist.md) |
| 体验改进清单 | 3h99vqZABoJvaLc88WhMpD | [`archive/2026-11-04-e2e-review.md`](archive/2026-11-04-e2e-review.md) |
| 项目复盘 | DbWCANjS8Cw1eXU4SnYb3g | [`archive/2026-11-17-retro.md`](archive/2026-11-17-retro.md) |
| 视觉方向、导出样式 | 4p5uiVV7nt5MxfvDwKos3A、Y9TbVXaLjNj9mpwTHfSgB7 | 已定稿进代码：浅色纸感、球场蓝 #2340C8 + 篮筐橙；导出用全屏版式 |
| 落地页、宣传片分镜 | 6coSRb3PRHztY6G8RKqYSP、1uARCyH9X3sZgXq7hWiz53 | `site/`；分镜源文件在交接副本里 |
| 安全测试清单 | （不公开） | 只在交接副本里；没修完的部分对应 PR #59 |
