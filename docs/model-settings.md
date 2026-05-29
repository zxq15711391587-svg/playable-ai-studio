# 模型与服务设置方案

## 目标

平台所有 AI 阶段都不绑定单一厂商或单一模型。用户可以在设置中配置 API Key、Base URL 和各阶段使用的模型，并通过测试按钮验证模型是否可用。

## 基础配置

设置中心需要支持：

- API Key。
- Base URL。
- Organization / Project ID，可选。
- 超时时间。
- 最大重试次数。
- 代理配置，可选。

示例：

```json
{
  "baseUrl": "https://api.example.com/v1",
  "apiKey": "your-api-key",
  "timeoutMs": 120000,
  "maxRetries": 2
}
```

## 阶段模型选择

每个阶段可独立选择模型：

- AI 策划模型。
- AI 美术分析模型。
- 视频脚本模型。
- 视频生成模型。
- AI 研发模型。
- AI 测试模型。
- AI 编导模型。
- playable 制作模型。
- 编辑建议模型。
- QA 检查模型。

视频生成模型示例：

```json
{
  "provider": "kling",
  "model": "kling-3.0-omni-1080p-ref-audio",
  "duration": 15,
  "aspectRatio": "9:16",
  "resolution": "1080p",
  "useReferenceImage": true,
  "useReferenceVideo": true,
  "useAudio": true
}
```

## 模型能力标签

每个模型需要声明能力，避免阶段用错模型：

- 文本。
- 图片理解。
- 视频理解。
- 视频生成。
- 代码生成。
- 长上下文。
- JSON 输出。
- 音频支持。

## 测试按钮

设置页需要提供：

- 测试连接。
- 测试文本生成。
- 测试图片理解。
- 测试视频生成。
- 测试 JSON 输出。
- 测试代码生成。

测试结果展示：

- 是否成功。
- 响应耗时。
- 返回模型名。
- token 或费用信息，如果接口支持。
- 错误原因。
- 建议修复方式。

