# Wuli布雷克 物理模拟实验室 — 部署指南

本指南教你将本地 HTML 页面部署到你的域名，并启用**留言**功能。

---

## 准备工作清单

| 序号 | 项目 | 需要做的 |
|------|------|----------|
| 1 | GitHub 账号 | [注册](https://github.com/signup)（免费） |
| 2 | 域名 | 你已经购买好了 |
| 3 | 15 分钟时间 | 😄 |

---

## 第一步：创建 GitHub 仓库

1. 登录 [GitHub](https://github.com)
2. 点击右上角 **+** → **New repository**
3. 仓库名填 `physics-simulations`（或你喜欢的名字）
4. 选择 **Public**（公开）
5. **不要**勾选 "Add a README file"（我们已有文件）
6. 点击 **Create repository**

---

## 第二步：推送本地代码到 GitHub

打开终端（本目录），依次执行：

```bash
# 1. 添加所有文件
git add .

# 2. 创建第一次提交
git commit -m "初始提交：物理模拟实验室"

# 3. 关联远程仓库（替换为你的用户名和仓库名）
git remote add origin https://github.com/你的用户名/physics-simulations.git

# 4. 推送
git branch -M main
git push -u origin main
```

---

## 第三步：绑定域名 + 部署

### 选项 A：**GitHub Pages**（推荐，最稳定）

1. 在仓库页面点击 **Settings** → 左侧 **Pages**
2. **Source** 选择 `Deploy from a branch`
3. **Branch** 选择 `main`，文件夹选 `/ (root)`
4. 点击 **Save**
5. 在 **Custom domain** 输入你的域名，点击 **Save**
6. 去你的域名 DNS 管理后台，添加记录：

```
类型:    CNAME
名称:    www（或 @）
内容:    你的用户名.github.io
```

> DNS 生效需要几分钟到几小时不等。

### 选项 B：**Cloudflare Pages**（速度更快，免费 CDN）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 左侧菜单 → **Workers & Pages** → **Create** → **Pages**
3. 连接你的 GitHub 账号，选择 `physics-simulations` 仓库
4. 构建设置留空（没有构建步骤），直接点 **Save and Deploy**
5. 部署完成后 → **Custom domains** → 添加你的域名
6. Cloudflare 会指导你修改 DNS（通常是把域名 NS 记录指向 Cloudflare）

---

## 第四步：启用留言功能（Giscus）

1. 确保你的 GitHub 仓库已启用 **Discussions**：
   - 仓库 **Settings** → 勾选 **Discussions**
2. 访问 **[giscus.app](https://giscus.app)**
3. 在输入框填入 `你的用户名/physics-simulations`
4. 按页面引导配置：
   - **Page ↔ Discussion 映射**：选 `pathname`
   - **Discussion 分类**：选 `Announcements`（或新建一个）
   - **主题**：选 `light`
5. 页面底部会生成一段 `<script>` 代码
6. 复制其中的 4 个值，替换 `index.html` 中注释块下方的对应字段：
   ```html
   data-repo="你的用户名/仓库名"
   data-repo-id="MDEwOlJlcG9zaXRvcnk..."    ← 替换
   data-category="Announcements"
   data-category-id="DIC_kwDO..."           ← 替换
   ```
7. **删除** `<!-- ╔═══════...` 到 `...═══════╝ -->` 之间的注释块
8. 提交并推送：
   ```bash
   git add index.html
   git commit -m "启用 Giscus 留言"
   git push
   ```

部署完成后，网站每个页面底部会自动出现留言区，访客用 GitHub 账号即可留言。

---

## 第五步：验证

1. 在浏览器访问你的域名
2. 确认首页能正常显示所有物理模拟卡片
3. 点击几个模拟页面确认能正常打开
4. 滚动到底部确认留言区已显示
5. 尝试用 GitHub 账号发一条测试留言

---

## 后续维护

```bash
# 每次修改文件后
git add .
git commit -m "描述你改了什么"
git push
# GitHub Pages / Cloudflare 会自动更新（通常 1-2 分钟）
```

---

## 常见问题

**Q: 不想有留言功能可以吗？**
A: 删除 index.html 中 `<section>` 到 `</section>` 的留言区块即可。

**Q: 留言区不显示？**
A: 检查 Giscus 的 4 个配置值是否正确；确认仓库已启用 Discussions。

**Q: 域名访问显示 404？**
A: 检查 DNS 记录是否已生效（用 `nslookup 你的域名` 查看），GitHub Pages 的 Custom domain 是否正确设置。

**Q: 想给每个模拟页面也加留言？**
A: 把 index.html 中留言区的 `<section>...</section>` 整段复制到其他 HTML 文件的 `</main>` 和 `<footer>` 之间即可。
