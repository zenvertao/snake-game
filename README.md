# Snake Classic

<div align="center">
  <p>一个桌面与移动端友好的经典贪吃蛇网页游戏</p>
  <p><a href="https://zenvertao.github.io/snake-game/">🎮 在线演示</a></p>
  <p><a href="README.en.md">English</a> | 中文</p>
</div>

## ✨ 主要特点
- 霓虹 / 复古主题随时切换
- PC 键盘操作，移动端方向按钮 + 触控手势
- 本地 Top 10 排行榜（姓名与分数），上榜后内联输入昵称
- 专为贪吃蛇设计的音效：开始、转向、吃到、死亡
- 移动端适配：防双击缩放、底部方向按钮自适应布局

## 🎮 操作说明
- 桌面（PC）
  - 方向：↑ ↓ ← → 或 WASD
  - 开始：回车
  - 暂停：ESC
- 移动（Mobile）
  - 方向：底部方向按钮或画布短滑
  - 开始：点击“开始游戏”

## 🚀 使用指南
### 直接运行
下载项目文件，直接打开 `index.html` 即可开始游戏。

### 本地服务器
```bash
python3 -m http.server 8080
# 或
npx http-server -p 8080
```

## 📁 项目结构
```
.
├─ index.html                # 外联 CSS/JS 的单页
├─ assets/
│  ├─ css/styles.css         # 样式（主题、移动端方向按钮、覆盖层等）
│  └─ js/
│     ├─ main.js             # 游戏循环、输入、覆盖层、主题、音频解锁
│     ├─ core/
│     │  ├─ snake.js         # 网格、移动、吃到与碰撞
│     │  ├─ draw.js          # 画布渲染（蛇头弹性放大、吃到发光/尾迹爆发）
│     │  └─ audio.js         # 音频引擎（贪吃蛇专属音效）
│     └─ ui/
│        └─ leaderboard.js   # 排行榜逻辑与渲染（Top 10，高亮当前）
```

## 🏆 排行榜
- 仅插入正分数；保持 Top 10（分数降序，分数相同时按长度/时间）
- 上榜时在结束界面提示并内联输入昵称，随后展示榜单并高亮当前记录

## 🔧 兼容性
- 现代浏览器均支持（Chrome、Safari/iOS、Firefox、Edge、Android WebView）。
- 建议通过本地服务器打开（部分浏览器在 file:// 下可能不加载模块）。

---

<div align="center">
  <p>Made with ❤️ by Zenver Tao</p>
  <p><a href="LICENSE">开源许可：MIT License</a></p>
</div>
