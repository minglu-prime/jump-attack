---
name: "jump-attack-real-device-validation"
description: "Jump Attack 项目里，把一项测量从「只有合成视频」升级成「真机验证过」：出拍摄清单、跑仓库里的真实视频验证脚本、写对比报告、改 validation.ts。"
---

# 真机验证一项测量（Jump Attack）

> `validation.ts`、PR 模板的「验证状态」和 CLAUDE.md 规则 6–8 随 PR #64 进 main；#64 合并前，先按本文流程写报告，登记那一步等 #64 合并后再做。

用在：新测量或识别/误差/阈值改动要合并前，或用户拍了一轮验证视频回来时。目标是把 `mobile/src/domain/validation.ts` 里某项从 `synthetic` 改成 `real`，并留下证据。

## 先定合格线（CLAUDE.md 规则 7）

动手前在 PR 或报告开头写下这次的合格线，例如：
- 摸高：和墙上读数的平均偏差 ≤ 1 cm，95% 一致性界限在 ±3 cm 内。
- CMJ/SJ 跳高：和 Arcus 或 My Jump 平均偏差 ≤ 1.5 cm，界限在 ±3 cm 内。
- 跳深 RSI：和 Arcus 平均偏差 ≤ 0.1，触地时间偏差 ≤ 10 ms。
这些是建议值，属于阈值，按规则 2 和 8 先用作默认，攒到一张决策卡让用户确认。达到合格线就停，不再一项项往上加修正。

## 拍摄（搭在用户本来就要做的测试上）

按已有清单拍：`docs/archive/2026-10-28-validation-day-checklist.md`。不要另约时间，挑用户本来就要测摸高或 CMJ 的那天，只多拍 20 分钟。视频用「照片 → 导出未修改的原始文件」放到 `D:\claude\validation\`，读数按拍摄顺序写进同一个文件夹的 `读数.txt`，一行一条，例如 `摸高 3 墙 317`、`CMJ 5 Arcus 52.3`、`深蹲 115kg 第2次 0.61`。

视频不进仓库（隐私）。

## 跑脚本（都在仓库里，不要另写）

1. 把 `读数.txt` 转成脚本要的 CSV（格式见各脚本文件头）：
   - 跳跃：`tools/jump-analysis-validation/validate.js --real <dir>`，需要 `clips.csv`，可选 `marks.csv`、`arcus.csv`。
   - VBT：`tools/vbt-validation/evaluate_real.py <dir>`，需要 `sets.csv`、`reference.csv`。
2. 摸高的墙上读数和 App 记录比：从 App 备份页导出备份，按拍摄顺序配对，用 `mobile/src/domain/agreement.ts` 的 `blandAltman` 算偏差和界限。
3. iPhone 慢动作是 HEVC，脚本会先转 H.264；用户 Windows 电脑 D 盘空间紧，先确认够 2–3 GB。

## 写报告，改登记

1. 报告放 `docs/validation/<日期>-<指标>.md`：合格线、样本数、偏差和 95% 界限、过没过线、发现的固定偏差（例如起跳总晚 1 帧，要不要校正等用户确认）。保持精简，表格为主。
2. 过线的指标：在 `validation.ts` 把对应条目改成 `{ evidence: 'real', basis: '…', report: 'docs/validation/….md' }`。注册表测试会检查报告文件存在。
3. 没过线的保持 `synthetic`，诊断里继续显示「还没真机验证」。在报告里写清差在哪，下一步先修测量，不加新功能。
4. PR 的「验证状态」勾「真机验证过」，附报告链接。完成标准照旧：`npm test && npm run typecheck && npm run lint` 全过并贴结果。

## 不要做的

- 不要把合成视频的结果当成「准」的证据，它只证明没变差。
- 不要为了过线去改已有测试的期望值或基线。
- 不要把用户的视频、读数原文或备份文件提交进仓库。