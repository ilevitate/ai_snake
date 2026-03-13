/**
 * @fileoverview 离屏渲染管理器模块 - 性能优化核心组件
 * 
 * 核心特性：
 * - 多层离屏Canvas架构，分离不同更新频率的渲染层级
 * - 静态背景层：渐变背景，一次性渲染
 * - 星星层：使用 requestAnimationFrame 实现 30fps 流畅闪烁动画
 * - 动态层：用于组合绘制和临时渲染
 * - 对象池模式管理粒子对象，避免频繁创建/销毁
 * - 批量绘制优化，按颜色分组减少状态切换
 * 
 * 性能优化策略：
 * 1. 静态背景（渐变）- 一次性渲染，不再更新
 * 2. 半静态元素（星星）- 预渲染到独立图层，30fps 动画
 * 3. 动态元素（粒子）- 使用对象池管理，批量绘制
 * 4. 脏标记机制 - 只重绘变化的图层
 * 
 * 架构设计：
 * - backgroundCanvas: 静态渐变背景层
 * - starsCanvas: 星星闪烁动画层（RAF驱动）
 * - offscreenCanvas: 动态组合层
 * 
 * @author 游戏开发团队
 * @version 2.0.0
 */

/**
 * 离屏渲染管理器类
 * 使用多层离屏Canvas实现高性能渲染
 * @class
 */
class OffscreenRenderer {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        
        // 创建多层离屏Canvas用于不同渲染层级
        // 背景层 - 静态渐变背景
        this.backgroundCanvas = document.createElement('canvas');
        this.backgroundCanvas.width = width;
        this.backgroundCanvas.height = height;
        this.backgroundCtx = this.backgroundCanvas.getContext('2d');
        
        // 星星层 - 半静态星星（位置固定，只有闪烁变化）
        this.starsCanvas = document.createElement('canvas');
        this.starsCanvas.width = width;
        this.starsCanvas.height = height;
        this.starsCtx = this.starsCanvas.getContext('2d');
        
        // 动态层 - 用于组合绘制
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = width;
        this.offscreenCanvas.height = height;
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');
        
        // 缓存状态
        this.backgroundDirty = true;
        this.starsDirty = true;
        this.gridDirty = true;
        
        // 缓存的星星数据（避免每帧重新计算位置）
        this.cachedStars = null;
        
        // 缓存的渲染函数
        this.cachedRenderers = new Map();
        
        // 对象池 - 复用粒子对象
        this.particlePool = [];
        this.maxPoolSize = 100;
    }
    
    /**
     * 设置画布尺寸
     * 更新所有离屏Canvas的尺寸并重置缓存
     * @param {number} width - 新宽度（像素）
     * @param {number} height - 新高度（像素）
     */
    setSize(width, height) {
        this.width = width;
        this.height = height;
        this.backgroundCanvas.width = width;
        this.backgroundCanvas.height = height;
        this.starsCanvas.width = width;
        this.starsCanvas.height = height;
        this.offscreenCanvas.width = width;
        this.offscreenCanvas.height = height;
        this.cachedStars = null; // 清空星星缓存，需要重新生成
        this.markDirty();
    }
    
    /**
     * 标记图层需要重绘（脏标记机制）
     * 避免不必要的重绘，提升性能
     * @param {string} [layer='all'] - 指定图层，可选值：
     *   - 'background': 背景层
     *   - 'stars': 星星层
     *   - 'grid': 网格层
     *   - 'all': 所有图层（默认）
     */
    markDirty(layer = 'all') {
        if (layer === 'all' || layer === 'background') this.backgroundDirty = true;
        if (layer === 'all' || layer === 'stars') this.starsDirty = true;
        if (layer === 'all' || layer === 'grid') this.gridDirty = true;
    }
    
    /**
     * 预渲染静态背景（渐变）
     * 创建从 #1a1a2e 到 #16213e 的线性渐变
     * 只在背景脏标记为 true 时执行
     */
    renderStaticBackground() {
        if (!this.backgroundDirty) return;
        
        const ctx = this.backgroundCtx;
        
        // 创建深色渐变背景
        const gradient = ctx.createLinearGradient(0, 0, this.width, this.height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);
        
        this.backgroundDirty = false;
    }
    
    /**
     * 生成星星数据（只生成一次，缓存位置信息）
     * 使用伪随机噪声函数生成固定位置，确保每次生成结果一致
     * @param {number} count - 星星数量
     * @returns {Array<Object>} 星星数据数组，每个元素包含：
     *   - baseX, baseY: 基础位置
     *   - size: 星星大小
     *   - twinkleSpeed: 闪烁速度
     *   - twinklePhase: 闪烁相位
     *   - colorType: 颜色类型
     *   - driftSpeedX: 漂移速度
     *   - hasGlow: 是否有光芒效果
     */
    generateStarsData(count) {
        if (this.cachedStars) return this.cachedStars;
        
        const stars = [];
        const starSeed = 12345;
        
        for (let i = 0; i < count; i++) {
            // 使用噪声函数生成固定位置
            const seed1 = Math.sin(i * 12.9898 + starSeed) * 43758.5453;
            const seed2 = Math.cos(i * 78.233 + starSeed) * 23421.631;
            const baseX = (seed1 - Math.floor(seed1)) * this.width;
            const baseY = (seed2 - Math.floor(seed2)) * this.height;
            
            // 星星属性
            const sizeRandom = Math.sin(i * 3.14) * 0.5 + 0.5;
            const size = 0.3 + sizeRandom * 1.5;
            const twinkleSpeed = 0.002 + (i % 5) * 0.001;
            const twinklePhase = i * 0.5;
            const colorType = i % 7;
            
            stars.push({
                baseX, baseY, size, twinkleSpeed, twinklePhase, colorType,
                driftSpeedX: 0.5 + (i % 5) * 0.1,
                hasGlow: size > 1.2
            });
        }
        
        this.cachedStars = stars;
        return stars;
    }
    
    /**
     * 初始化星星动画系统
     * 使用 requestAnimationFrame 实现流畅的闪烁动画
     * 帧率限制为 30fps，平衡性能和视觉效果
     * @param {number} [starCount=150] - 星星数量
     */
    initStarsAnimation(starCount = 150) {
        // 生成星星数据
        this.generateStarsData(starCount);
        
        // 动画状态
        this.starsAnimationId = null;
        this.starsLastFrameTime = 0;
        this.starsFrameInterval = 1000 / 30; // 30fps，平衡性能和流畅度
        
        // 启动动画循环
        this.startStarsAnimation();
    }
    
    /**
     * 启动星星动画循环
     * 使用 requestAnimationFrame 驱动动画
     * 自动检测是否已在运行，避免重复启动
     */
    startStarsAnimation() {
        if (this.starsAnimationId) return;
        
        const animate = (currentTime) => {
            // 控制帧率
            const deltaTime = currentTime - this.starsLastFrameTime;
            if (deltaTime >= this.starsFrameInterval) {
                this.starsLastFrameTime = currentTime - (deltaTime % this.starsFrameInterval);
                this.renderStarsAnimated(currentTime);
            }
            
            this.starsAnimationId = requestAnimationFrame(animate);
        };
        
        this.starsAnimationId = requestAnimationFrame(animate);
    }
    
    /**
     * 停止星星动画
     * 取消 requestAnimationFrame 循环
     * 在页面不可见或游戏暂停时调用以节省资源
     */
    stopStarsAnimation() {
        if (this.starsAnimationId) {
            cancelAnimationFrame(this.starsAnimationId);
            this.starsAnimationId = null;
        }
    }
    
    /**
     * 渲染动态星星（使用 requestAnimationFrame）
     * 实现星星的自然闪烁效果，使用正弦波计算透明度
     * 采用批量绘制优化，按颜色分组减少状态切换
     * @param {number} currentTime - 当前时间戳（来自 requestAnimationFrame）
     */
    renderStarsAnimated(currentTime) {
        if (!this.cachedStars) return;
        
        const ctx = this.starsCtx;
        ctx.clearRect(0, 0, this.width, this.height);
        
        const stars = this.cachedStars;
        const time = currentTime * 0.001;
        
        // 批量绘制优化 - 按颜色分组
        const colorGroups = new Map();
        
        for (const star of stars) {
            // 计算闪烁 - 使用正弦波创造自然闪烁效果
            const twinkle = Math.sin(time * star.twinkleSpeed * 1000 + star.twinklePhase) * 0.5 + 0.5;
            
            // 计算颜色键
            let alpha = 0.2 + twinkle * 0.6;
            let colorKey;
            if (star.colorType < 4) {
                colorKey = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
            } else if (star.colorType < 6) {
                colorKey = `rgba(200, 220, 255, ${(alpha * 0.8).toFixed(3)})`;
            } else {
                colorKey = `rgba(255, 250, 220, ${(alpha * 0.8).toFixed(3)})`;
            }
            
            if (!colorGroups.has(colorKey)) {
                colorGroups.set(colorKey, []);
            }
            colorGroups.get(colorKey).push({ star, twinkle });
        }
        
        // 批量绘制星星
        for (const [color, items] of colorGroups) {
            ctx.fillStyle = color;
            ctx.beginPath();
            for (const { star } of items) {
                ctx.moveTo(star.baseX + star.size, star.baseY);
                ctx.arc(star.baseX, star.baseY, star.size, 0, Math.PI * 2);
            }
            ctx.fill();
        }
        
        // 单独绘制大星星的光芒（需要单独处理透明度）
        for (const star of stars) {
            if (star.hasGlow) {
                const twinkle = Math.sin(time * star.twinkleSpeed * 1000 + star.twinklePhase) * 0.5 + 0.5;
                ctx.strokeStyle = `rgba(255, 255, 255, ${(twinkle * 0.3).toFixed(3)})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(star.baseX - star.size * 3, star.baseY);
                ctx.lineTo(star.baseX + star.size * 3, star.baseY);
                ctx.moveTo(star.baseX, star.baseY - star.size * 3);
                ctx.lineTo(star.baseX, star.baseY + star.size * 3);
                ctx.stroke();
            }
        }
    }
    
    /**
     * 预渲染星星（基础形状，不含动态效果）- 已废弃
     * @deprecated 已废弃，使用 {@link initStarsAnimation} 和 {@link renderStarsAnimated} 替代
     * @param {number} [starCount=150] - 星星数量
     */
    renderStarsLayer(starCount = 150) {
        // 如果动画未启动，初始化它
        if (!this.starsAnimationId) {
            this.initStarsAnimation(starCount);
        }
    }
    
    /**
     * 绘制动态背景（组合静态背景+星星层）
     * 将预渲染的背景和星星层绘制到目标上下文
     * 支持背景滚动效果（使用 pattern 实现无缝滚动）
     * @param {CanvasRenderingContext2D} ctx - 目标渲染上下文
     * @param {number} [backgroundOffset=0] - 背景滚动偏移量（像素）
     */
    drawDynamicBackground(ctx, backgroundOffset = 0) {
        // 绘制静态背景
        if (this.backgroundDirty) {
            this.renderStaticBackground();
        }
        ctx.drawImage(this.backgroundCanvas, 0, 0);
        
        // 绘制星星层（带滚动效果）
        if (this.starsDirty) {
            this.renderStarsLayer();
        }
        
        // 使用 pattern 实现无缝滚动
        ctx.save();
        ctx.translate(-backgroundOffset % this.width, 0);
        ctx.drawImage(this.starsCanvas, 0, 0);
        ctx.drawImage(this.starsCanvas, this.width, 0);
        ctx.restore();
    }
    
    /**
     * 预渲染网格（可选，用于调试或特定视觉效果）
     * 绘制指定大小的网格线
     * @param {number} gridSize - 网格单元大小（像素）
     * @param {string} [color='rgba(255,255,255,0.03)'] - 网格线颜色
     */
    renderGrid(gridSize, color = 'rgba(255,255,255,0.03)') {
        if (!this.gridDirty) return;
        
        const ctx = this.offscreenCtx;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        
        // 绘制垂直线
        for (let x = 0; x <= this.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.height);
            ctx.stroke();
        }
        
        // 绘制水平线
        for (let y = 0; y <= this.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y);
            ctx.stroke();
        }
        
        this.gridDirty = false;
    }
    
    /**
     * 获取离屏Canvas（用于绘制到主Canvas）
     * @returns {HTMLCanvasElement} 离屏Canvas元素
     */
    getCanvas() {
        return this.offscreenCanvas;
    }
    
    /**
     * 绘制到目标上下文
     * 将整个离屏Canvas绘制到指定位置
     * @param {CanvasRenderingContext2D} ctx - 目标渲染上下文
     * @param {number} [x=0] - 目标X坐标
     * @param {number} [y=0] - 目标Y坐标
     */
    drawTo(ctx, x = 0, y = 0) {
        ctx.drawImage(this.offscreenCanvas, x, y);
    }
    
    /**
     * 从对象池获取粒子对象
     * 如果池中有可用对象则复用，否则创建新对象
     * @returns {Object} 粒子对象，包含 x, y, vx, vy, life, decay, color, size 属性
     */
    getParticleFromPool() {
        if (this.particlePool.length > 0) {
            return this.particlePool.pop();
        }
        return {
            x: 0, y: 0,
            vx: 0, vy: 0,
            life: 0, decay: 0,
            color: '', size: 0
        };
    }
    
    /**
     * 归还粒子对象到对象池
     * 重置粒子状态后归还，避免内存分配开销
     * @param {Object} particle - 要归还的粒子对象
     */
    returnParticleToPool(particle) {
        if (this.particlePool.length < this.maxPoolSize) {
            // 重置粒子状态
            particle.x = 0;
            particle.y = 0;
            particle.vx = 0;
            particle.vy = 0;
            particle.life = 0;
            particle.decay = 0;
            particle.color = '';
            particle.size = 0;
            this.particlePool.push(particle);
        }
    }
    
    /**
     * 批量绘制优化 - 减少状态切换
     * 按颜色分组绘制调用，大幅减少 Canvas 状态切换次数
     * @param {CanvasRenderingContext2D} ctx - 渲染上下文
     * @param {Array<Object>} drawCalls - 绘制调用数组，每个元素包含：
     *   - type: 'circle' | 'rect'
     *   - color: 颜色字符串
     *   - x, y: 位置
     *   - radius: 圆形半径（type='circle'时）
     *   - width, height: 矩形尺寸（type='rect'时）
     */
    batchDraw(ctx, drawCalls) {
        // 按颜色分组绘制调用
        const colorGroups = new Map();
        
        for (const call of drawCalls) {
            if (!colorGroups.has(call.color)) {
                colorGroups.set(call.color, []);
            }
            colorGroups.get(call.color).push(call);
        }
        
        // 按颜色批量绘制
        for (const [color, calls] of colorGroups) {
            ctx.fillStyle = color;
            ctx.beginPath();
            for (const call of calls) {
                if (call.type === 'circle') {
                    ctx.moveTo(call.x + call.radius, call.y);
                    ctx.arc(call.x, call.y, call.radius, 0, Math.PI * 2);
                } else if (call.type === 'rect') {
                    ctx.rect(call.x, call.y, call.width, call.height);
                }
            }
            ctx.fill();
        }
    }
    
    /**
     * 批量绘制圆形（优化版本）
     * 按颜色分组批量绘制，减少状态切换
     * @param {CanvasRenderingContext2D} ctx - 渲染上下文
     * @param {Array<Object>} circles - 圆形数组，每个元素包含：
     *   - x, y: 圆心位置
     *   - radius: 圆半径
     *   - color: 填充颜色
     */
    batchDrawCircles(ctx, circles) {
        // 按颜色分组
        const colorGroups = new Map();
        for (const circle of circles) {
            if (!colorGroups.has(circle.color)) {
                colorGroups.set(circle.color, []);
            }
            colorGroups.get(circle.color).push(circle);
        }
        
        // 按颜色批量绘制，减少状态切换
        for (const [color, items] of colorGroups) {
            ctx.fillStyle = color;
            ctx.beginPath();
            for (const item of items) {
                ctx.moveTo(item.x + item.radius, item.y);
                ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
            }
            ctx.fill();
        }
    }
    
    /**
     * 清理资源
     * 释放所有离屏Canvas和缓存数据
     * 在游戏销毁或页面卸载时调用
     */
    dispose() {
        this.backgroundCanvas = null;
        this.backgroundCtx = null;
        this.starsCanvas = null;
        this.starsCtx = null;
        this.offscreenCanvas = null;
        this.offscreenCtx = null;
        this.cachedRenderers.clear();
        this.cachedStars = null;
        this.particlePool = [];
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OffscreenRenderer;
}
