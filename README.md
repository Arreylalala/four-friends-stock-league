# 华尔街之狼股票战绩榜（GitHub Pages 版）

这是一个完全静态的网站，不需要服务器、数据库或管理员账号。朋友打开网页即可查看；你每天只需在 GitHub 上修改一份数据文件。

## 每天更新战报

1. 在仓库中打开根目录的 `scoreboard.json`。
2. 点击右上角铅笔图标（Edit this file）。
3. 在 `days` 数组中加入当天记录。
4. 点击 **Commit changes** 保存。
5. 等待约 1–3 分钟，网页会自动更新。

金额单位是“元”。例如当天伦赚 1,820 元、镭亏 640 元：

```json
{
  "returnsEnabled": false,
  "returnsStartDate": null,
  "days": [
    {
      "date": "2026-08-31",
      "amounts": {
        "lun": 1820,
        "lei": -640,
        "jian": 960,
        "chao": 310
      }
    }
  ]
}
```

四个人的固定代号：

- `lun`：伦
- `lei`：镭
- `jian`：健
- `chao`：超

## 启用收益率

把 `returnsEnabled` 改为 `true`，并填写首次统计收益率的日期。收益率直接填写百分数，例如 `1.25` 表示 `1.25%`，`-0.8` 表示 `-0.8%`：

```json
{
  "returnsEnabled": true,
  "returnsStartDate": "2026-09-01",
  "days": [
    {
      "date": "2026-09-01",
      "amounts": {
        "lun": 1000,
        "lei": -200,
        "jian": 600,
        "chao": 300
      },
      "returns": {
        "lun": 1.25,
        "lei": -0.3,
        "jian": 0.8,
        "chao": 0.4
      }
    }
  ]
}
```

同一天不要重复添加。日期格式必须是 `年-月-日`，四个人的金额必须全部填写。

## 本地运行

需要 Node.js 22 和 pnpm：

```bash
pnpm install
pnpm dev
```

正式构建运行 `pnpm build`，静态网页会输出到 `out` 目录。

## 访问说明

GitHub Pages 不要求购买域名或备案。它在中国大陆通常可以访问，但网络质量受当地运营商影响，无法保证所有地区和所有时段都稳定。
