# 华尔街之狼 · 股票战报

网站：https://arreylalala.github.io/four-friends-stock-league/

## 每日更新

只修改仓库根目录 `scoreboard.json`，提交到 `main` 后自动测试、构建、发布。金额单位为元，缺失金额用 `null`，当天四人金额齐全才结算。日期不可重复，收益率单位为百分数。

`public/scoreboard.json` 为构建时生成的文件，请勿手工编辑。不要再上传 `site.zip`；该旧包仅用于回退参考。

## 本地开发

需要 Node.js 24 和 pnpm 11.19.0。

```sh
pnpm install --frozen-lockfile
pnpm dev
```

每次启动开发服务会同步根目录数据；服务运行期间修改根数据后，运行 `node scripts/prepare-data.mjs` 并刷新页面。

## 验证与发布

```sh
git pull --ff-only
pnpm check
git add <本次修改的文件>
git commit -m "Describe the change"
git push origin main
```

`pnpm check` 执行测试、生产构建、静态资源路径和数据一致性检查。Pull request 和迁移分支只构建验证，只有 main 部署。失败时不会替换当前网站。生产资源必须使用 `/four-friends-stock-league/` 子路径。

连胜徽章在两处均使用当前累计连胜，至少 2 场显示为 `2连胜`，不得改为历史最长连胜。

## 回退

通过 Git revert 撤销问题提交并推送，让流程重新发布。迁移前版本 `c095513` 使用旧的 ZIP 发布流程；只有同时恢复旧工作流和所需发布包才会重新启用该流程。不要恢复旧战报数据。
