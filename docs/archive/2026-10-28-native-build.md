> 存档：原生构建评估。原页面 https://claude.ai/artifact/6BPaZcKyCPoFduY9EQdgiA（旧账号停用后可能打不开，以本文件为准）。
> 现状：结论：12/1 前不做原生构建，继续 Expo Go。

# Jump Attack 原生构建评估

## 结论

12 月 1 日前不做原生构建，继续用 Expo Go。原生构建要付费的苹果开发者账号，你的 Intel Mac 也装不了新版 Xcode，只能走云端构建；而离目标日只剩约 5 周，现在换架构的风险比收益大。

目标日之后先看第 2 条真机验证的数字：录像分析太慢、慢动作 HEVC 读不出来，或者确实需要边拍边出数，才值得做。下面的「决策关卡」写了具体触发条件。

## Expo Go 现在卡在哪

Expo Go 只能跑 Expo 自带的模块，所以录像分析都放在 WebView 里逐帧读。下面前三条都还没在你的 iPhone 上量过，是第 2 条要回答的问题。

| 限制 | 现在怎么绕 | 真机验证 |
| --- | --- | --- |
| 录像分析速度：WebView 逐帧解码，240 fps 一秒就是 240 帧 | 框出片段只分析起跳前后（#21、#23） | 没有：分析一段要多久还不知道 |
| 慢动作 HEVC 视频 WebView 能不能逐帧读、帧时间准不准 | 依赖 iOS WebView 自己解码 | 没有 |
| 骨架识别只能在 WebView 里跑 MediaPipe，首次要下模型 | 骨架识别线程的 G0 关卡 | 没有 |
| 不能边拍边出数：相机帧处理要原生模块 | 用系统相机慢动作拍，再从相册导入（测试日可一次多选） | 不用验，是 Expo Go 本身的限制 |
| 苹果健康不能直接读：HealthKit 要原生模块 | 「快捷指令」导入或手填 | 已在用 |

## 开发版构建能换来什么

最值钱的是原生解码慢动作：它直接关系到「离扣篮线差多少」量得准不准。其余几项主要是省事，不改变诊断。

| 原生能力 | 服务哪一问 | 换来什么 |
| --- | --- | --- |
| 原生解码视频（AVFoundation） | 差多少 | HEVC 慢动作逐帧读得稳、帧时间准；分析更快，一次测试能分析更多跳 |
| 原生姿态识别（苹果 Vision 框架） | 差在哪块 | 骨架分析起跳技术不用联网下模型，速度更快 |
| 相机帧处理（边拍边分析） | 今天练什么 | 训练中每跳马上出数，不用拍完再导入 |
| 直接读苹果健康（HealthKit） | 今天练什么 | HRV、睡眠自动进恢复状态，不用每天跑快捷指令 |

## 成本和前提

硬门槛是苹果开发者账号：每年 99 美元，没有它就装不到真机上。你之前说上架再考虑，所以这一步留给你定。

- **开发者账号**：99 美元/年（[Apple](https://developer.apple.com/programs/enroll/)）。内部分发（ad hoc）和 TestFlight 都要付费账号（[Expo](https://docs.expo.dev/build/internal-distribution/)）。
- **装到队友手机**：ad hoc 要每台 iPhone 的 UDID，每年最多 100 台，禁用的也算数；加一台就要重新打包（[Expo](https://docs.expo.dev/build/internal-distribution/)）。队内推广更适合 TestFlight。
- **在哪里打包**：你的 Intel Mac 装不了新版 Xcode，只能用 EAS Build 在云端打包，免费额度有限，具体按到时的价格页。
- **更新方式**：只改 JS 的版本仍可以用 EAS Update 推到手机；动了原生模块就要重新打包、重新安装。
- **兼容现有版本**：原生模块要做成可选加载，Expo Go 版和网页版照常能用，沿用 `capture/__tests__/expoGo.test.ts` 那种测试守住。

## 决策关卡

第 2 条真机验证量出下面任何一条，就值得开开发者账号做原生版；一条都没触发，就继续用 Expo Go。触发线是我定的默认值。

| 真机上量什么 | 触发线 | 触发了做什么 |
| --- | --- | --- |
| 分析一段 5 秒、240 fps 慢动作要多久 | 超过 60 秒 | 原生解码 |
| HEVC 慢动作自动标帧和手标差多少 | 差超过 1 帧的超过 10%，或读不出帧 | 原生解码 |
| 骨架识别每帧耗时 | 超过 100 ms，或模型下载不了 | 原生姿态识别 |

触发之后分三步走，每一步都要先证明比 Expo Go 版好：

1. 用 EAS Build 打一个开发版，只装你自己的 iPhone，只把触发的那一项换成原生。
2. 拿第 2 条那批视频，和 Expo Go 版比耗时和误差；不更快也不更准就停。
3. 确实更好，再用 TestFlight 发给队友。Expo Go 版和网页版继续保留。

## 来源

- [Apple Developer Program 入会](https://developer.apple.com/programs/enroll/)：99 美元/年
- [Expo 文档：Internal distribution](https://docs.expo.dev/build/internal-distribution/)：ad hoc 要付费账号、每年 100 台
