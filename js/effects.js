/**
 * @fileoverview 特效管理器模块 - 负责管理游戏中的各种视觉特效
 * 
 * 核心特性：
 * - 粒子系统：爆炸、消散、拖尾效果
 * - 飘字系统：得分提示、连击提示、状态提示
 * - 闪光系统：冲击波、圆环、星星
 * - WebGL集成：高性能粒子渲染接口
 * - 批量绘制优化：按颜色分组减少Canvas状态切换
 * 
 * @author 游戏开发团队
 * @version 2.0.0
 */

/**
 * 特效管理类 - 负责管理游戏中的各种视觉特效
 * 
 * 管理的特效类型：
 * - particles: 粒子数组，用于爆炸、消散效果
 * - trails: 拖尾数组，用于加速效果
 * - floatingTexts: 飘字数组，用于得分、状态提示
 * - sparkles: 闪光数组，用于冲击波、圆环效果
 * 
 * @example
 * const effects = new EffectsManager();
 * effects.createExplosion(400, 300, '#ff6b6b', 15);
 * effects.createFloatingText(400, 300, '+10', '#ffd700');
 * effects.update();
 * effects.draw(ctx);
 */
class EffectsManager {
    constructor() {
        this.particles = [];      // 粒子数组（用于爆炸效果）
        this.trails = [];         // 拖尾数组
        this.floatingTexts = [];  // 飘字数组
        this.sparkles = [];       // 闪光数组
    }

    /**
     * 创建爆炸粒子效果
     * @param {number} x - 爆炸中心X坐标
     * @param {number} y - 爆炸中心Y坐标
     * @param {string} color - 粒子颜色
     * @param {number} count - 粒子数量
     */
    createExplosion(x, y, color, count = 12) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
            const speed = 2 + Math.random() * 4;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                decay: 0.02 + Math.random() * 0.02,
                color: color,
                size: 3 + Math.random() * 4,
                type: 'explosion'
            });
        }
    }

    /**
     * 创建食物过期消失特效
     * @param {number} x - 食物X坐标
     * @param {number} y - 食物Y坐标
     * @param {string} color - 食物颜色
     */
    createFoodExpireEffect(x, y, color) {
        // 创建收缩消失的圆环
        this.sparkles.push({
            x: x,
            y: y,
            radius: 25,
            maxRadius: 5,
            life: 0.8,
            decay: 0.04,
            color: color,
            type: 'shrinkRing'
        });
        
        // 创建消散粒子
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            const speed = 1 + Math.random() * 2;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.6,
                decay: 0.025,
                color: color,
                size: 2 + Math.random() * 3,
                type: 'expire'
            });
        }
        
        // 创建"过期"文字提示
        this.floatingTexts.push({
            x: x,
            y: y - 20,
            text: '过期',
            color: '#ff6b6b',
            life: 0.8,
            decay: 0.02,
            vy: -0.8,
            scale: 0.8
        });
    }

    /**
     * 创建食物生成动画效果
     * @param {number} x - 食物X坐标
     * @param {number} y - 食物Y坐标
     * @param {string} color - 食物颜色
     */
    createFoodSpawn(x, y, color) {
        // 创建扩散的圆环
        this.sparkles.push({
            x: x,
            y: y,
            radius: 5,
            maxRadius: 25,
            life: 1.0,
            decay: 0.03,
            color: color,
            type: 'ring'
        });
        
        // 创建闪烁的星星
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 * i) / 6;
            const dist = 15 + Math.random() * 10;
            this.sparkles.push({
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                size: 2 + Math.random() * 3,
                life: 1.0,
                decay: 0.04,
                color: 'rgba(255, 255, 255, 0.8)',
                type: 'star'
            });
        }
    }

    /**
     * 创建得分飘字效果
     * @param {number} x - 起始X坐标
     * @param {number} y - 起始Y坐标
     * @param {string} text - 显示文字
     * @param {string} color - 文字颜色
     */
    createFloatingText(x, y, text, color = '#ffd700') {
        this.floatingTexts.push({
            x: x,
            y: y,
            text: text,
            color: color,
            life: 1.0,
            decay: 0.015,
            vy: -1.5,  // 向上飘动
            scale: 1.0
        });
    }

    /**
     * 创建连击提示
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @param {number} combo - 连击数
     */
    createComboText(x, y, combo) {
        const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3'];
        const color = colors[Math.min(combo - 2, colors.length - 1)];
        this.floatingTexts.push({
            x: x,
            y: y,
            text: `${combo} 连击!`,
            color: color,
            life: 1.2,
            decay: 0.012,
            vy: -2,
            scale: 1.2 + combo * 0.1,
            isCombo: true
        });
    }

    /**
     * 创建蛇死亡爆炸效果
     * @param {Array} snakeBody - 蛇身节点数组
     */
    createDeathExplosion(snakeBody) {
        if (!snakeBody || snakeBody.length === 0) return;
        
        // 在蛇的每个节点位置创建爆炸
        snakeBody.forEach((segment, index) => {
            // 延迟创建爆炸，形成连锁反应效果
            setTimeout(() => {
                // 根据节点位置计算颜色（头部亮，尾部暗）
                const brightness = 1 - (index / snakeBody.length) * 0.5;
                const r = Math.floor(78 * brightness);
                const g = Math.floor(200 * brightness);
                const b = Math.floor(180 * brightness);
                const color = `rgb(${r}, ${g}, ${b})`;
                
                // 创建该节点的爆炸粒子
                const particleCount = 8 + Math.random() * 6;
                for (let i = 0; i < particleCount; i++) {
                    const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.8;
                    const speed = 3 + Math.random() * 5;
                    const size = 4 + Math.random() * 5;
                    
                    this.particles.push({
                        x: segment.x,
                        y: segment.y,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        life: 1.0 + Math.random() * 0.5,
                        decay: 0.015 + Math.random() * 0.015,
                        color: color,
                        size: size,
                        type: 'death',
                        gravity: 0.1  // 死亡粒子有重力效果
                    });
                }
                
                // 创建闪光效果（只在头部和关键节点）
                if (index % 3 === 0 || index === 0) {
                    this.sparkles.push({
                        x: segment.x,
                        y: segment.y,
                        radius: 10,
                        maxRadius: 40 + Math.random() * 20,
                        life: 1.0,
                        decay: 0.04,
                        color: index === 0 ? '#ff6b6b' : '#4ecdc4',
                        type: 'shockwave'
                    });
                }
            }, index * 30); // 每个节点延迟30ms
        });
        
        // 创建中心大爆炸（蛇头位置）
        const head = snakeBody[0];
        for (let i = 0; i < 30; i++) {
            const angle = (Math.PI * 2 * i) / 30;
            const speed = 5 + Math.random() * 8;
            this.particles.push({
                x: head.x,
                y: head.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.5,
                decay: 0.012,
                color: '#ff6b6b',
                size: 5 + Math.random() * 6,
                type: 'death',
                gravity: 0.15
            });
        }
        
        // 创建死亡文字
        this.createFloatingText(head.x, head.y - 50, 'GAME OVER', '#ff6b6b');
    }

    /**
     * 添加拖尾点（用于加速效果）
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @param {string} color - 拖尾颜色
     */
    addTrailPoint(x, y, color) {
        this.trails.push({
            x: x,
            y: y,
            color: color,
            life: 0.6,
            decay: 0.05,
            size: 8
        });
    }

    /**
     * 更新所有特效
     */
    update() {
        // 更新粒子
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            
            // 死亡粒子添加重力效果
            if (p.type === 'death' && p.gravity) {
                p.vy += p.gravity;
                p.vx *= 0.98; // 空气阻力
            }
            
            p.life -= p.decay;
            p.size *= 0.98;
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // 更新拖尾
        for (let i = this.trails.length - 1; i >= 0; i--) {
            const t = this.trails[i];
            t.life -= t.decay;
            t.size *= 0.95;
            
            if (t.life <= 0) {
                this.trails.splice(i, 1);
            }
        }

        // 更新飘字
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y += ft.vy;
            ft.life -= ft.decay;
            
            if (ft.life <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }

        // 更新闪光
        for (let i = this.sparkles.length - 1; i >= 0; i--) {
            const s = this.sparkles[i];
            s.life -= s.decay;
            
            if (s.type === 'ring') {
                s.radius += 1;
            } else if (s.type === 'shockwave') {
                // 冲击波快速扩散
                s.radius += 3;
            } else if (s.type === 'shrinkRing') {
                // 收缩圆环
                s.radius -= 1.5;
            }
            
            if (s.life <= 0) {
                this.sparkles.splice(i, 1);
            }
        }
    }

    /**
     * 绘制所有特效
     * @param {CanvasRenderingContext2D} ctx - Canvas上下文
     * @description 
     * 使用批量绘制优化减少Canvas状态切换：
     * 1. 按类型分组绘制拖尾、粒子、闪光
     * 2. 相同颜色的粒子合并绘制
     */
    draw(ctx) {
        // 批量绘制拖尾（在蛇身下面）
        if (this.trails.length > 0) {
            ctx.save();
            for (const t of this.trails) {
                ctx.globalAlpha = t.life * 0.5;
                ctx.fillStyle = t.color;
                ctx.beginPath();
                ctx.arc(t.x, t.y, t.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // 批量绘制粒子（按颜色分组减少状态切换）
        if (this.particles.length > 0) {
            const colorGroups = new Map();
            for (const p of this.particles) {
                if (!colorGroups.has(p.color)) {
                    colorGroups.set(p.color, []);
                }
                colorGroups.get(p.color).push(p);
            }
            
            for (const [color, particles] of colorGroups) {
                ctx.save();
                ctx.fillStyle = color;
                for (const p of particles) {
                    ctx.globalAlpha = p.life;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }
        }

        // 绘制闪光
        for (const s of this.sparkles) {
            ctx.save();
            ctx.globalAlpha = s.life;
            
            if (s.type === 'ring') {
                ctx.strokeStyle = s.color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
                ctx.stroke();
            } else if (s.type === 'star') {
                ctx.fillStyle = s.color;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                ctx.fill();
            } else if (s.type === 'shockwave') {
                // 绘制冲击波效果
                ctx.strokeStyle = s.color;
                ctx.lineWidth = 3;
                ctx.shadowColor = s.color;
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
                ctx.stroke();
            } else if (s.type === 'shrinkRing') {
                // 绘制收缩圆环（食物过期效果）
                ctx.strokeStyle = s.color;
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.arc(s.x, s.y, Math.max(0, s.radius), 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }
            
            ctx.restore();
        }

        // 绘制飘字
        for (const ft of this.floatingTexts) {
            ctx.save();
            ctx.globalAlpha = ft.life;
            ctx.fillStyle = ft.color;
            ctx.font = `bold ${16 * ft.scale}px Microsoft YaHei`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // 添加发光效果
            ctx.shadowColor = ft.color;
            ctx.shadowBlur = 10;
            
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        }
    }

    /**
     * 创建WebGL粒子爆炸效果（高性能版本）
     * @param {WebGLParticleRenderer} webglRenderer - WebGL渲染器实例
     * @param {number} x - 爆炸中心X坐标
     * @param {number} y - 爆炸中心Y坐标
     * @param {string} color - 粒子颜色（十六进制）
     * @param {number} count - 粒子数量
     */
    createWebGLExplosion(webglRenderer, x, y, color, count = 30) {
        if (!webglRenderer || !webglRenderer.initialized) return;
        
        // 解析颜色
        const r = parseInt(color.slice(1, 3), 16) / 255;
        const g = parseInt(color.slice(3, 5), 16) / 255;
        const b = parseInt(color.slice(5, 7), 16) / 255;
        
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
            const speed = 50 + Math.random() * 100;
            const size = 4 + Math.random() * 8;
            
            webglRenderer.addParticle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                { r, g, b, a: 1.0 },
                size,
                1.0,
                0.5 + Math.random() * 0.5
            );
        }
    }

    /**
     * 清空所有特效
     */
    clear() {
        this.particles = [];
        this.trails = [];
        this.floatingTexts = [];
        this.sparkles = [];
    }
}
