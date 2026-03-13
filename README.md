# 🐍 贪吃蛇游戏

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](./)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./)

一个基于 HTML5 Canvas 的现代化贪吃蛇游戏，支持鼠标/触摸控制，具有平滑的动画效果、丰富的视觉特效和多种食物类型。采用面向对象架构，性能优化到位，支持 WebGL GPU 加速粒子渲染。


## ✨ 特性

- 🎮 **流畅的控制体验** - 使用线性插值平滑转向算法，支持预测性边界检测和速度自适应转向
- 🖱️ **多种控制方式** - 支持鼠标移动、触摸屏操作和虚拟摇杆
- 📱 **移动端适配** - 响应式布局，支持手机/平板横屏全屏游玩，虚拟摇杆+加速按钮
- 🎨 **精美的视觉效果** - 渐变色彩、发光效果、波浪动画、粒子特效、星空背景
- 🔊 **丰富的音效** - Web Audio API 生成，无需外部音频文件
- 🍎 **多种食物类型** - 8种不同效果的食物（加速、无敌、减速、缩小、穿墙、双倍分数等）
- ⏱️ **食物过期机制** - 食物会在15秒后消失，最后5秒闪烁警告，增加游戏紧迫感
- 🏆 **本地记分系统** - 自动保存最高分，支持连击奖励
- ⚡ **渐进难度** - 随着得分增加，蛇的速度会逐渐提升
- 🎵 **音效开关** - 可随时开启/关闭游戏音效
- 💥 **死亡动画** - 连锁爆炸效果，WebGL GPU 加速粒子渲染
- 🔄 **自动转圈模式** - 松开摇杆时蛇自动转圈，方便单手操作

## 🚀 快速开始

### 本地运行

1. 克隆或下载本项目
2. 直接用浏览器打开 `index.html` 文件
3. 点击"开始游戏"按钮即可游玩

### 本地服务器方式（推荐）

使用 Python 启动本地服务器：

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

然后在浏览器中访问：`http://localhost:8000`

## 🎮 游戏操作

### 桌面端

| 操作 | 说明 |
|:---|:---|
| 鼠标移动 | 控制蛇的游动方向 |
| 空格键 | 暂停/继续游戏 |
| 开始按钮 | 开始新游戏 |
| 音效按钮 | 开启/关闭音效 |

### 移动端（横屏模式）

| 操作 | 说明 |
|:---|:---|
| 虚拟摇杆 | 左下角控制蛇的游动方向，支持自动转圈模式 |
| 加速按钮 | 右下角按住加速移动（1.8倍速） |
| 点击屏幕 | 开始/暂停游戏 |
| 音效按钮 | 右上角开启/关闭音效 |

### 移动端布局

```
┌─────────────────────────────────────────┐
│ 🐍 贪吃蛇    得分:100  最高:500    🔊  │
│                                         │
│              游戏区域                    │
│           (星空背景+粒子)                │
│                                         │
│      ○  ← 虚拟摇杆控制方向              │
│                                         │
│   左下角: ◎ 摇杆    右下角: ⚡ 加速     │
└─────────────────────────────────────────┘
```

## 🍎 食物类型

| 食物 | 颜色 | 效果 | 分值 | 持续时间 |
|:---|:---|:---|:---|:---|
| 普通 | 🔴 红色 | 无特殊效果 | 10 | - |
| 加速 | 🟡 黄色 | 移动速度提升50% | 20 | 5秒 |
| 无敌 | 🔵 蓝色 | 无敌状态（可穿墙） | 30 | 3秒 |
| 奖励 | 🟣 紫色 | 高分奖励 | 50 | - |
| 减速 | 🩵 青色 | 移动速度降低50% | 15 | 5秒 |
| 缩小 | 🟢 绿色 | 缩短蛇身30% | 25 | - |
| 穿墙 | 🩷 粉色 | 可穿过边界 | 35 | 5秒 |
| 双倍 | 💗 亮粉 | 双倍分数 | 40 | 5秒 |

### 食物过期机制

- 食物生成后存活 **15秒**
- 最后 **5秒** 开始闪烁警告
- 过期后会显示"过期"文字并生成新食物

## 📁 项目结构

```
snake/
├── index.html              # 游戏入口页面
├── css/
│   └── style.css           # 样式文件
├── js/
│   ├── snake.js            # 蛇类（移动、绘制、碰撞检测）
│   ├── food.js             # 食物类（生成、绘制、类型管理、过期机制）
│   ├── effects.js          # 特效管理器（粒子、飘字、爆炸效果）
│   ├── audio.js            # 音效管理器（Web Audio API）
│   ├── offscreenRenderer.js # 离屏渲染器（性能优化、星星动画）
│   ├── webglParticles.js   # WebGL粒子渲染器（高性能粒子系统）
│   └── game.js             # 游戏主逻辑
└── README.md               # 本文件
```

## 🛠️ 技术栈

- **HTML5 Canvas** - 游戏渲染
- **Vanilla JavaScript (ES6+)** - 游戏逻辑（无框架依赖）
- **CSS3** - 界面样式和动画
- **Web Audio API** - 音效生成
- **WebGL** - 高性能粒子渲染（可选，自动降级）

## 🎯 游戏机制

### 核心算法

**线性插值平滑转向**：蛇的转向使用分级响应策略，根据角度差大小动态调整转向速度

```javascript
// 角度分级响应
小角度 (<0.3rad):  平滑系数 0.12, 最大转向 0.08
中等角度 (<0.8rad): 平滑系数 0.18, 最大转向 0.12
较大角度 (<1.5rad): 平滑系数 0.22, 最大转向 0.18
大角度 (≥1.5rad):   平滑系数 0.25, 最大转向 0.22
```

**预测性边界检测**：根据当前速度预测未来位置，提前调整角度避免撞墙

**速度自适应转向**：速度越快，最大转向角度越小，保持稳定性

**跨边界丝滑绘制**：穿墙时蛇身从另一侧平滑出现，无闪烁断裂

**自动转圈模式**：松开摇杆时蛇自动转圈，固定半径 80px，速度 0.08 rad/帧，方便单手操作

### 难度递增

- 初始速度：4 像素/帧
- 每得 100 分速度增加 0.3
- 最高速度：8 像素/帧
- 最大蛇身长度：50 节

### 计分规则

- 不同食物有不同分值（10-50分）
- 连击奖励：2秒内连续吃到食物触发连击
- 双倍分数食物可叠加
- 最高分自动保存到浏览器本地存储

## ⚡ 性能优化

### 已实现的优化

| 优化项 | 实现方式 | 效果 |
|:---|:---|:---|
| 离屏渲染 | 预渲染静态背景和星星层 | 减少每帧绘制开销 |
| 对象池 | 复用蛇身节点和粒子对象 | 减少GC频率 |
| 批量绘制 | 按颜色分组绘制粒子 | 减少Canvas状态切换 |
| WebGL粒子 | GPU加速渲染大量粒子 | 比Canvas 2D快10倍 |
| RAF优化 | requestAnimationFrame控制星星闪烁 | 流畅且节能 |
| 跨边界绘制 | 智能检测和双重视图 | 丝滑穿墙体验 |
| 脏标记机制 | 只重绘变化的部分 | 避免不必要的渲染 |
| 摇杆平滑插值 | 0.3系数插值 | 视觉平滑无抖动 |

### WebGL粒子系统

- 支持最多 **2000** 个粒子同时渲染
- 自动检测兼容性，不支持时静默降级到 Canvas 2D
- 使用顶点缓冲区批量上传数据
- 片段着色器实现圆形粒子边缘平滑
- 完整的生命周期管理（创建、更新、销毁）

### 对象池设计

```javascript
// 蛇身节点对象池
this.nodePool = [];
this.maxPoolSize = 200;

// 粒子对象池
this.particlePool = [];
this.maxPoolSize = 100;
```

## 🌐 浏览器兼容性

| 浏览器 | 版本要求 | 支持情况 |
|:---|:---|:---|
| Chrome | 60+ | ✅ 完美支持 |
| Edge | 79+ | ✅ 完美支持 |
| Firefox | 60+ | ✅ 完美支持 |
| Safari | 12+ | ✅ 支持 |
| 手机浏览器 | iOS 12+ / Android 8+ | ✅ 支持触摸操作 |

### WebGL支持检测

游戏会自动检测WebGL支持情况：
- ✅ 支持：启用GPU加速粒子渲染
- ❌ 不支持：自动降级到Canvas 2D渲染

在浏览器控制台运行以下代码查看兼容性报告：
```javascript
WebGLParticleRenderer.runCompatibilityTest();
```

## 📱 移动端建议

- 建议使用横屏模式游玩，获得更好的视野和操作体验
- 横屏模式下虚拟摇杆位于左下角，加速按钮位于右下角
- 微信内置浏览器可能存在限制，建议使用独立浏览器
- 支持振动反馈（需要设备支持）

## 📝 自定义配置

### 修改画布尺寸

编辑 `index.html`：

```html
<canvas id="gameCanvas" width="800" height="450"></canvas>
```

### 修改游戏配置

编辑 `js/game.js` 中的 `Game.CONFIG`：

```javascript
static CONFIG = {
    BASE_SPEED: 4,              // 基础速度
    MAX_SPEED: 8,               // 最大速度
    BOOST_MULTIPLIER: 1.8,      // 加速倍数
    
    // 食物配置
    FOOD_SPAWN: {
        MIN_COUNT: 2,           // 最小食物数量
        MAX_COUNT: 3,           // 最大食物数量
        LIFE_TIME: 15000,       // 食物存活时间（毫秒）
        WARNING_TIME: 5000,     // 警告时间（毫秒）
    },
    
    // 更多配置...
}
```

### 修改食物类型

编辑 `js/food.js` 中的 `DEFAULT_FOOD_TYPES`：

```javascript
static DEFAULT_FOOD_TYPES = [
    { color: '#ff6b6b', score: 10, effect: 'normal', radius: 8, probability: 0.45, name: '普通' },
    { color: '#feca57', score: 20, effect: 'speed', radius: 10, probability: 0.15, name: '加速' },
    { color: '#54a0ff', score: 30, effect: 'invincible', radius: 10, probability: 0.12, name: '无敌' },
    { color: '#5f27cd', score: 50, effect: 'bonus', radius: 12, probability: 0.05, name: '奖励' },
    { color: '#48dbfb', score: 15, effect: 'slow', radius: 9, probability: 0.08, name: '减速' },
    { color: '#1dd1a1', score: 25, effect: 'shrink', radius: 9, probability: 0.07, name: '缩小' },
    { color: '#ff9ff3', score: 35, effect: 'ghost', radius: 10, probability: 0.05, name: '穿墙' },
    { color: '#f368e0', score: 40, effect: 'double', radius: 11, probability: 0.03, name: '双倍' }
]
```

## 🔧 开发调试

### 浏览器控制台命令

```javascript
// 测试WebGL兼容性
WebGLParticleRenderer.runCompatibilityTest();

// 查看游戏状态
game.state;           // 当前状态: MENU/PLAYING/PAUSED/GAME_OVER
game.score;           // 当前分数
game.highScore;       // 最高分
game.baseSpeed;       // 当前基础速度

// 查看WebGL粒子状态
game.webglParticles.initialized;        // 是否初始化
game.webglParticles.getCompatibilityInfo();  // 兼容性信息
game.webglParticles.getParticleCount(); // 当前粒子数

// 手动触发特效
game.effects.createExplosion(400, 225, '#ff6b6b', 20);
game.effects.createFloatingText(400, 225, '测试文字', '#ffd700');
game.effects.createDeathExplosion(headX, headY);

// 修改游戏状态
game.togglePause();   // 暂停/继续
game.restart();       // 重新开始
game.setState(Game.STATE.PLAYING);
```

## 📝 更新日志

### v2.0.0 (当前版本)
- ✅ **自动转圈模式**：松开摇杆时蛇自动转圈，方便单手操作
- ✅ **虚拟摇杆优化**：平滑插值、立体阴影、激活发光效果
- ✅ **加速按钮**：右下角独立加速按钮，按住1.8倍速
- ✅ **Canvas内UI**：横屏模式下所有UI绘制在画布内
- ✅ **代码架构优化**：
  - 蛇类提取私有绘制方法（_drawHead, _drawBodySegment）
  - 游戏主类优化状态管理和事件处理
  - 完善 JSDoc 注释

### v1.x 历史版本
- ✅ WebGL粒子系统（GPU加速）
- ✅ 离屏渲染优化
- ✅ 对象池设计
- ✅ 8种食物类型
- ✅ 食物过期机制
- ✅ 多种控制方式

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 代码规范

- 使用 JSDoc 注释函数和类
- 配置集中管理，避免魔法数字
- 使用对象池优化性能
- 保持代码整洁，定期清理废弃代码
- 遵循 ES6+ 语法规范

## 📄 许可证

MIT License

---

**Enjoy the game! 🎮**
