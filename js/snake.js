/**
 * @fileoverview 蛇类模块 - 负责蛇的移动、绘制和碰撞检测
 * 
 * 核心特性：
 * - 线性插值平滑转向算法，实现丝滑的转向体验
 * - 预测性边界检测，提前感知边界并调整角度
 * - 速度自适应转向，速度越快转向越稳定
 * - 对象池模式优化性能，避免频繁创建/销毁对象
 * - 跨边界丝滑绘制，穿墙时无闪烁断裂
 * 
 * @author 游戏开发团队
 * @version 2.0.0
 */

/**
 * 数学工具函数集合
 * 提供角度处理、距离计算、插值等常用数学运算
 */
const MathUtils = {
    /**
     * 规范化角度到 [-π, π] 范围
     * @param {number} angle - 输入角度（弧度）
     * @returns {number} - 规范化后的角度
     */
    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        return angle;
    },

    /**
     * 计算两点间距离
     * @param {number} x1 - 点1 X坐标
     * @param {number} y1 - 点1 Y坐标
     * @param {number} x2 - 点2 X坐标
     * @param {number} y2 - 点2 Y坐标
     * @returns {number} - 距离
     */
    distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },

    /**
     * 线性插值
     * @param {number} start - 起始值
     * @param {number} end - 结束值
     * @param {number} t - 插值因子 (0-1)
     * @returns {number} - 插值结果
     */
    lerp(start, end, t) {
        return start + (end - start) * t;
    },

    /**
     * 钳制数值到指定范围
     * @param {number} value - 输入值
     * @param {number} min - 最小值
     * @param {number} max - 最大值
     * @returns {number} - 钳制后的值
     */
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
};

/**
 * 蛇类配置常量
 * 集中管理所有与蛇相关的配置参数，便于调整和优化
 * @constant {Object}
 */
const SNAKE_CONFIG = {
    // 初始位置（相对于画布中心）
    INITIAL_POSITION: {
        CENTER_X: 200,
        CENTER_Y: 200
    },
    
    // 初始速度
    INITIAL_SPEED: 3,
    
    // 节点间距
    SEGMENT_DISTANCE: 8,
    
    // 初始长度（节点数）
    INITIAL_LENGTH: 5,
    
    // 对象池最大容量
    MAX_POOL_SIZE: 200,
    
    // 预测边界检测配置
    BOUNDARY_PREDICTION: {
        MIN_FRAMES: 10,           // 最小预测帧数
        FRAME_SPEED_MULTIPLIER: 2, // 预测帧数 = 速度 * 此系数
        SAFE_MARGIN_BASE: 20,     // 基础安全边距
        SAFE_MARGIN_SPEED: 3,     // 速度对安全边距的影响系数
        MAX_ADJUSTMENT: 0.8,      // 最大调整角度（弧度）
        ADJUSTMENT_RATE: 0.5      // 调整速率
    },
    
    // 平滑转向配置
    STEERING: {
        // 摇杆控制模式
        JOYSTICK: {
            DISTANCE_THRESHOLD: 100,  // 摇杆控制距离阈值
            SMALL_ANGLE: { threshold: 0.3, smoothFactor: 0.12, maxTurn: 0.08 },
            MEDIUM_ANGLE: { threshold: 0.8, smoothFactor: 0.18, maxTurn: 0.12 },
            LARGE_ANGLE: { threshold: 1.5, smoothFactor: 0.22, maxTurn: 0.18 },
            MAX_ANGLE: { smoothFactor: 0.25, maxTurn: 0.22 }
        },
        // 触摸/鼠标跟随模式
        FOLLOW: {
            SMALL_ANGLE: { threshold: 0.3, smoothFactor: 0.15, maxTurn: 0.15 },
            MEDIUM_ANGLE: { threshold: 1.0, smoothFactor: 0.08, maxTurn: 0.12 },
            LARGE_ANGLE: { smoothFactor: 0.04, maxTurn: 0.1 },
            DISTANCE_FACTOR_BASE: 0.5,
            DISTANCE_FACTOR_RANGE: 0.5
        },
        // 距离阈值（小于此距离保持当前方向）
        MIN_DISTANCE: 5
    },
    
    // 速度自适应配置
    SPEED_ADAPTIVE: {
        BASE_MULTIPLIER: 1,
        SPEED_FACTOR: 0.5  // 速度每增加1倍，转向能力降低此比例
    }
};

/**
 * 蛇类 - 负责蛇的移动、绘制和碰撞检测
 * 
 * 核心算法：
 * 1. 线性插值平滑转向 - 根据角度差分级响应，实现丝滑转向
 * 2. 预测性边界检测 - 提前感知边界，避免突然撞墙
 * 3. 速度自适应 - 速度越快，最大转向角度越小
 * 4. 对象池优化 - 复用蛇身节点对象，减少GC
 * 
 * @example
 * const snake = new Snake(20);
 * snake.setTarget(400, 300);
 * snake.update();
 * snake.draw(ctx);
 */
class Snake {
    /**
     * 创建蛇实例
     * @param {number} gridSize - 蛇身每个节点的大小（像素）
     */
    constructor(gridSize) {
        this.gridSize = gridSize;
        
        // 对象池 - 用于复用蛇身节点对象，避免频繁创建/销毁
        this.nodePool = [];
        this.maxPoolSize = SNAKE_CONFIG.MAX_POOL_SIZE;  // 对象池最大容量
        
        this.reset();
        // 鼠标/触摸目标位置
        this.targetX = 0;
        this.targetY = 0;
    }
    
    /**
     * 从对象池获取节点对象
     * @returns {Object} - 节点对象 {x, y}
     */
    getNodeFromPool() {
        if (this.nodePool.length > 0) {
            const node = this.nodePool.pop();
            node.x = 0;
            node.y = 0;
            return node;
        }
        return { x: 0, y: 0 };
    }
    
    /**
     * 回收节点到对象池
     * @param {Object} node - 要回收的节点对象
     */
    recycleNodeToPool(node) {
        if (this.nodePool.length < this.maxPoolSize) {
            this.nodePool.push(node);
        }
    }

    /**
     * 重置蛇的状态
     * 初始化蛇身位置、方向、速度等属性
     * 回收旧节点到对象池，从对象池获取新节点
     */
    reset() {
        // 回收旧节点到对象池
        if (this.body) {
            for (const node of this.body) {
                this.recycleNodeToPool(node);
            }
        }
        
        // 初始位置在画布中央，蛇身由多个节点组成
        // 从对象池获取节点，避免创建新对象
        this.body = [
            this.getNodeFromPool(),  // 蛇头
            this.getNodeFromPool(),  // 第一节身体
            this.getNodeFromPool(),  // 第二节身体
            this.getNodeFromPool(),  // 第三节身体
            this.getNodeFromPool()   // 第四节身体
        ];
        
        // 设置初始位置（使用 segmentDistance 作为间距，保持一致性）
        const initX = SNAKE_CONFIG.INITIAL_POSITION.CENTER_X;
        const initY = SNAKE_CONFIG.INITIAL_POSITION.CENTER_Y;
        this.body[0].x = initX; this.body[0].y = initY;
        for (let i = 1; i < SNAKE_CONFIG.INITIAL_LENGTH; i++) {
            this.body[i].x = initX - this.segmentDistance * i;
            this.body[i].y = initY;
        }
        
        this.grow = false;             // 是否正在生长
        this.speed = SNAKE_CONFIG.INITIAL_SPEED;  // 初始速度，游戏开始后会由 Game 类设置为 baseSpeed
        this.angle = 0;                // 当前朝向角度（弧度）
        this.segmentDistance = SNAKE_CONFIG.SEGMENT_DISTANCE;  // 节点间距
        
        // 自动旋转模式（松开摇杆时转圈）
        this.autoRotate = false;       // 是否自动旋转
        this.rotateDirection = 1;      // 旋转方向：1为顺时针，-1为逆时针
        this.rotateSpeed = Game.CONFIG.ROTATE.SPEED;  // 旋转速度（弧度/帧）
        this.rotateRadius = Game.CONFIG.ROTATE.RADIUS; // 固定转圈半径（像素）
        this.rotateCenter = null;      // 转圈圆心 {x, y}，在开启转圈时设置
        
        // 画布边界（用于预测性边界检测）
        this.canvasWidth = 0;
        this.canvasHeight = 0;
    }
    
    /**
     * 设置画布尺寸（用于预测性边界检测）
     * @param {number} width - 画布宽度
     * @param {number} height - 画布高度
     */
    setCanvasSize(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
    }

    /**
     * 设置目标位置（鼠标/触摸位置）
     * @param {number} x - 目标X坐标
     * @param {number} y - 目标Y坐标
     */
    setTarget(x, y) {
        this.targetX = x;
        this.targetY = y;
    }

    /**
     * 预测边界检测 - 提前感知边界并调整角度
     * 根据当前速度和方向，预测未来位置，避免撞墙
     * @param {number} currentAngle - 当前角度
     * @returns {number} - 调整后的角度
     */
    predictBoundaryAdjustment(currentAngle) {
        if (this.canvasWidth === 0 || this.canvasHeight === 0) {
            return currentAngle;
        }
        
        const head = this.body[0];
        const radius = this.gridSize / 2;
        
        // 预测未来位置
        const cfg = SNAKE_CONFIG.BOUNDARY_PREDICTION;
        const predictFrames = Math.max(cfg.MIN_FRAMES, Math.floor(this.speed * cfg.FRAME_SPEED_MULTIPLIER));
        const predictDistance = this.speed * predictFrames;
        const futureX = head.x + Math.cos(currentAngle) * predictDistance;
        const futureY = head.y + Math.sin(currentAngle) * predictDistance;
        
        // 安全边界距离
        const safeMargin = radius + cfg.SAFE_MARGIN_BASE + (this.speed * cfg.SAFE_MARGIN_SPEED);
        
        let adjustment = 0;
        
        // 检测左右边界
        if (futureX < safeMargin) {
            // 接近左边界，向右转
            const urgency = 1 - (futureX / safeMargin);
            adjustment += urgency * cfg.ADJUSTMENT_RATE;
        } else if (futureX > this.canvasWidth - safeMargin) {
            // 接近右边界，向左转
            const urgency = 1 - ((this.canvasWidth - futureX) / safeMargin);
            adjustment -= urgency * cfg.ADJUSTMENT_RATE;
        }
        
        // 检测上下边界
        if (futureY < safeMargin) {
            // 接近上边界，向下转
            const urgency = 1 - (futureY / safeMargin);
            adjustment += urgency * cfg.ADJUSTMENT_RATE;
        } else if (futureY > this.canvasHeight - safeMargin) {
            // 接近下边界，向上转
            const urgency = 1 - ((this.canvasHeight - futureY) / safeMargin);
            adjustment -= urgency * cfg.ADJUSTMENT_RATE;
        }
        
        // 限制最大调整角度
        adjustment = MathUtils.clamp(adjustment, -cfg.MAX_ADJUSTMENT, cfg.MAX_ADJUSTMENT);
        
        return currentAngle + adjustment;
    }
    
    /**
     * 获取速度自适应的最大转向角度
     * 速度越快，转向越慢，保持稳定性
     * @returns {number} - 最大转向角度（弧度）
     */
    getSpeedAdaptiveMaxTurn() {
        const baseSpeed = Game.CONFIG.BASE_SPEED;
        const speedRatio = this.speed / baseSpeed;
        const cfg = SNAKE_CONFIG.SPEED_ADAPTIVE;
        
        // 速度越快，最大转向越小
        const adaptiveFactor = cfg.BASE_MULTIPLIER / (1 + (speedRatio - 1) * cfg.SPEED_FACTOR);
        
        return adaptiveFactor;
    }

    /**
     * 计算平滑后的角度 - 摇杆控制优化版
     * 使用更平滑的插值算法，让转向更加丝滑
     * 支持预测性边界检测和速度自适应转向
     * @returns {number} - 平滑后的角度（弧度）
     */
    calculateSmoothAngle() {
        const head = this.body[0];
        // 计算蛇头到目标位置的向量
        const dx = this.targetX - head.x;
        const dy = this.targetY - head.y;

        // 如果距离太近，保持当前方向
        const dist = MathUtils.distance(head.x, head.y, this.targetX, this.targetY);
        if (dist < SNAKE_CONFIG.STEERING.MIN_DISTANCE) return this.angle;

        // 计算目标角度
        const targetAngle = Math.atan2(dy, dx);

        // 计算当前角度与目标角度的差值（使用工具函数规范化）
        let angleDiff = MathUtils.normalizeAngle(targetAngle - this.angle);

        const absDiff = Math.abs(angleDiff);

        // 判断是否为摇杆直接控制模式
        const joyCfg = SNAKE_CONFIG.STEERING.JOYSTICK;
        const followCfg = SNAKE_CONFIG.STEERING.FOLLOW;
        const isJoystickControl = dist > joyCfg.DISTANCE_THRESHOLD;

        let smoothFactor;
        let maxTurn;

        if (isJoystickControl) {
            // 摇杆控制模式
            if (absDiff < joyCfg.SMALL_ANGLE.threshold) {
                smoothFactor = joyCfg.SMALL_ANGLE.smoothFactor;
                maxTurn = joyCfg.SMALL_ANGLE.maxTurn;
            } else if (absDiff < joyCfg.MEDIUM_ANGLE.threshold) {
                smoothFactor = joyCfg.MEDIUM_ANGLE.smoothFactor;
                maxTurn = joyCfg.MEDIUM_ANGLE.maxTurn;
            } else if (absDiff < joyCfg.LARGE_ANGLE.threshold) {
                smoothFactor = joyCfg.LARGE_ANGLE.smoothFactor;
                maxTurn = joyCfg.LARGE_ANGLE.maxTurn;
            } else {
                smoothFactor = joyCfg.MAX_ANGLE.smoothFactor;
                maxTurn = joyCfg.MAX_ANGLE.maxTurn;
            }
        } else {
            // 触摸/鼠标跟随模式
            const distFactor = Math.min(dist / joyCfg.DISTANCE_THRESHOLD, 1);

            if (absDiff < followCfg.SMALL_ANGLE.threshold) {
                smoothFactor = followCfg.SMALL_ANGLE.smoothFactor;
                maxTurn = followCfg.SMALL_ANGLE.maxTurn;
            } else if (absDiff < followCfg.MEDIUM_ANGLE.threshold) {
                smoothFactor = followCfg.MEDIUM_ANGLE.smoothFactor;
                maxTurn = followCfg.MEDIUM_ANGLE.maxTurn;
            } else {
                smoothFactor = followCfg.LARGE_ANGLE.smoothFactor;
                maxTurn = followCfg.LARGE_ANGLE.maxTurn;
            }

            smoothFactor *= (followCfg.DISTANCE_FACTOR_BASE + followCfg.DISTANCE_FACTOR_RANGE * distFactor);
        }

        // 应用速度自适应转向系数
        const speedAdaptiveFactor = this.getSpeedAdaptiveMaxTurn();
        maxTurn *= speedAdaptiveFactor;

        // 使用缓动函数让转向更丝滑
        let turnAmount = MathUtils.clamp(angleDiff * smoothFactor, -maxTurn, maxTurn);
        
        // 计算新角度
        let newAngle = this.angle + turnAmount;
        
        // 应用预测性边界检测调整
        newAngle = this.predictBoundaryAdjustment(newAngle);
        
        return newAngle;
    }

    /**
     * 更新蛇的位置
     * 每帧调用，计算新的头部位置并更新蛇身
     * 支持三种模式：
     * 1. 正常模式：根据目标位置平滑转向移动
     * 2. 转圈模式：松开摇杆时在固定小圆上转圈
     * 使用对象池管理节点，避免频繁创建对象
     * 身体节点跟随头部，保持固定间距
     */
    update() {
        const head = this.body[0];
        
        // 自动旋转模式（松开摇杆时转圈）
        if (this.autoRotate) {
            // 如果还没有设置圆心，在第一次进入转圈模式时设置
            if (!this.rotateCenter) {
                // 圆心位于蛇头前方偏左/右（根据旋转方向）
                // 这样蛇头会在圆的边缘，朝向切线方向
                const centerOffsetAngle = this.angle + (Math.PI / 2) * this.rotateDirection;
                this.rotateCenter = {
                    x: head.x + Math.cos(centerOffsetAngle) * this.rotateRadius,
                    y: head.y + Math.sin(centerOffsetAngle) * this.rotateRadius
                };
            }
            
            // 计算当前蛇头相对于圆心的角度
            const dx = head.x - this.rotateCenter.x;
            const dy = head.y - this.rotateCenter.y;
            const currentAngleOnCircle = Math.atan2(dy, dx);
            
            // 计算角速度（加速时转圈更快，但半径不变）
            // 角速度 = 线速度 / 半径
            const angularVelocity = this.speed / this.rotateRadius;
            
            // 更新圆上的角度
            const newAngleOnCircle = currentAngleOnCircle + angularVelocity * this.rotateDirection;
            
            // 计算新的头部位置（在固定圆周上）
            head.x = this.rotateCenter.x + Math.cos(newAngleOnCircle) * this.rotateRadius;
            head.y = this.rotateCenter.y + Math.sin(newAngleOnCircle) * this.rotateRadius;
            
            // 更新蛇头朝向（沿切线方向）
            this.angle = newAngleOnCircle + (Math.PI / 2) * this.rotateDirection;
            
            // 保持角度在 [0, 2π] 范围内
            while (this.angle > Math.PI * 2) this.angle -= Math.PI * 2;
            while (this.angle < 0) this.angle += Math.PI * 2;
        } else {
            // 退出转圈模式时清除圆心
            this.rotateCenter = null;
            
            // 正常模式：使用改进的平滑算法计算新的朝向角度
            this.angle = this.calculateSmoothAngle();
            
            // 计算速度向量（使用当前角度）
            const vx = Math.cos(this.angle) * this.speed;
            const vy = Math.sin(this.angle) * this.speed;
            
            // 移动头部
            head.x += vx;
            head.y += vy;
        }
        
        // 更新身体节点 - 每个节点跟随前一个节点，保持固定间距
        for (let i = 1; i < this.body.length; i++) {
            const current = this.body[i];
            const target = this.body[i - 1];
            
            // 计算当前节点到目标节点的向量
            const dx = target.x - current.x;
            const dy = target.y - current.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // 如果距离大于目标间距，移动当前节点向目标靠近
            if (dist > this.segmentDistance) {
                const ratio = (dist - this.segmentDistance) / dist;
                current.x += dx * ratio;
                current.y += dy * ratio;
            }
        }
        
        // 如果处于生长状态，在尾部添加新节点
        if (this.grow) {
            const tail = this.body[this.body.length - 1];
            const newSegment = this.getNodeFromPool();
            // 新节点放在尾部后方，保持间距
            if (this.body.length > 1) {
                const prevTail = this.body[this.body.length - 2];
                const dx = tail.x - prevTail.x;
                const dy = tail.y - prevTail.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    newSegment.x = tail.x + (dx / dist) * this.segmentDistance;
                    newSegment.y = tail.y + (dy / dist) * this.segmentDistance;
                } else {
                    newSegment.x = tail.x;
                    newSegment.y = tail.y;
                }
            } else {
                newSegment.x = tail.x;
                newSegment.y = tail.y;
            }
            this.body.push(newSegment);
            this.grow = false;
        }
    }

    /**
     * 触发蛇生长
     * 在吃到食物时调用，下一帧会添加新节点
     */
    growUp() {
        this.grow = true;
    }

    /**
     * 检测蛇头是否与自身碰撞
     * 从第5个节点开始检测（前面的节点不可能与头部碰撞）
     * @returns {boolean} - 是否发生碰撞
     */
    checkSelfCollision() {
        const head = this.body[0];
        const headRadius = this.gridSize / 2;
        
        // 遍历蛇身节点，检测与头部的距离
        for (let i = 5; i < this.body.length; i++) {
            const segment = this.body[i];
            // 计算欧几里得距离
            const dist = Math.sqrt(
                Math.pow(head.x - segment.x, 2) + 
                Math.pow(head.y - segment.y, 2)
            );
            // 如果距离小于头部半径，判定为碰撞
            if (dist < headRadius) {
                return true;
            }
        }
        return false;
    }

    /**
     * 检测蛇头是否撞墙
     * @param {number} canvasWidth - 画布宽度
     * @param {number} canvasHeight - 画布高度
     * @returns {boolean} - 是否撞墙
     */
    checkWallCollision(canvasWidth, canvasHeight) {
        const head = this.body[0];
        const radius = this.gridSize / 2;
        // 检测是否超出画布边界（考虑头部半径）
        return head.x < radius || head.x >= canvasWidth - radius ||
               head.y < radius || head.y >= canvasHeight - radius;
    }

    /**
     * 检测蛇头是否吃到食物
     * @param {Object} foodPos - 食物位置对象 {x, y}
     * @returns {boolean} - 是否吃到食物
     */
    checkFoodCollision(foodPos) {
        const head = this.body[0];
        // 计算蛇头与食物的欧几里得距离
        const dist = Math.sqrt(
            Math.pow(head.x - foodPos.x, 2) + 
            Math.pow(head.y - foodPos.y, 2)
        );
        // 距离小于头部半径加食物半径时判定为吃到
        return dist < (this.gridSize / 2 + 8);
    }

    /**
     * 绘制蛇
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D渲染上下文
     * @param {boolean} isInvincible - 是否无敌状态（金色外观）
     * @param {number} wavePhase - 波浪动画相位，>0时启用身体波浪效果
     * @param {number} canvasWidth - 画布宽度（用于跨边界绘制）
     * @param {number} canvasHeight - 画布高度（用于跨边界绘制）
     * @description 
     * 绘制顺序：从尾部到头部，确保头部在最上层
     * 蛇头：径向渐变+发光效果+眼睛+舌头
     * 蛇身：渐变色节点+连接线+高光点
     * 支持跨边界丝滑绘制（穿墙模式）
     */
    draw(ctx, isInvincible = false, wavePhase = 0, canvasWidth = 0, canvasHeight = 0) {
        const headRadius = this.gridSize / 2;
        const waveAmplitude = 2;   // 波浪幅度
        const waveFrequency = 0.15; // 波浪频率
        
        // 预计算所有节点的绘制位置（包含波浪偏移）
        const drawPositions = [];
        for (let i = 0; i < this.body.length; i++) {
            const segment = this.body[i];
            let drawX = segment.x;
            let drawY = segment.y;
            
            // 计算波浪偏移（身体节点才有波浪效果，头部除外）
            if (i > 0 && wavePhase > 0) {
                const wave = Math.sin(wavePhase + i * waveFrequency) * waveAmplitude;
                // 垂直于移动方向的波浪
                drawX += Math.cos(this.angle + Math.PI / 2) * wave;
                drawY += Math.sin(this.angle + Math.PI / 2) * wave;
            }
            
            drawPositions.push({ x: drawX, y: drawY });
        }
        
        // 检测是否需要跨边界绘制（穿墙时蛇身跨越画布边界）
        const needsWrapDraw = canvasWidth > 0 && canvasHeight > 0 && this._checkWrapNeeded(drawPositions, canvasWidth, canvasHeight);
        
        // 如果需要跨边界绘制，计算偏移量
        let wrapOffsetX = 0, wrapOffsetY = 0;
        if (needsWrapDraw) {
            const headPos = drawPositions[0];
            // 根据蛇头位置决定偏移方向
            if (headPos.x < 0) wrapOffsetX = canvasWidth;
            else if (headPos.x > canvasWidth) wrapOffsetX = -canvasWidth;
            if (headPos.y < 0) wrapOffsetY = canvasHeight;
            else if (headPos.y > canvasHeight) wrapOffsetY = -canvasHeight;
        }
        
        // 绘制函数（支持偏移绘制）
        const drawSnake = (offsetX = 0, offsetY = 0, skipHead = false) => {
            // 从尾部开始绘制，确保头部在最上层
            for (let i = this.body.length - 1; i >= 0; i--) {
                // 如果需要跳过头部（在偏移绘制时）
                if (skipHead && i === 0) continue;
                
                const segment = this.body[i];
                const drawPos = {
                    x: drawPositions[i].x + offsetX,
                    y: drawPositions[i].y + offsetY
                };
                
                // 检查节点是否在可视区域内（优化性能）
                const margin = headRadius * 2;
                if (drawPos.x < -margin || drawPos.x > canvasWidth + margin ||
                    drawPos.y < -margin || drawPos.y > canvasHeight + margin) {
                    continue; // 跳过不可见的节点
                }
                
                if (i === 0) {
                    // ===== 绘制蛇头 =====
                    this._drawHead(ctx, drawPos, headRadius, isInvincible);
                } else {
                    // ===== 绘制蛇身节点 =====
                    this._drawBodySegment(ctx, drawPos, drawPositions, i, headRadius, isInvincible, offsetX, offsetY);
                }
            }
        };
        
        // 主绘制
        drawSnake(0, 0);
        
        // 如果需要跨边界绘制，在另一侧也绘制蛇身
        if (needsWrapDraw) {
            drawSnake(wrapOffsetX, wrapOffsetY, true); // 跳过头部，只绘制身体
        }
        
        // 重置阴影效果
        ctx.shadowBlur = 0;
    }
    
    /**
     * 检查是否需要跨边界绘制
     * @private
     */
    _checkWrapNeeded(positions, canvasWidth, canvasHeight) {
        const head = positions[0];
        const margin = this.gridSize * 2;
        
        // 检查蛇头是否在边界附近
        const headNearLeft = head.x < margin;
        const headNearRight = head.x > canvasWidth - margin;
        const headNearTop = head.y < margin;
        const headNearBottom = head.y > canvasHeight - margin;
        
        // 如果蛇头在边界附近，检查是否有身体节点在另一侧
        if (headNearLeft || headNearRight || headNearTop || headNearBottom) {
            for (let i = 1; i < positions.length; i++) {
                const body = positions[i];
                // 检查身体节点是否在另一侧
                if (headNearLeft && body.x > canvasWidth - margin) return true;
                if (headNearRight && body.x < margin) return true;
                if (headNearTop && body.y > canvasHeight - margin) return true;
                if (headNearBottom && body.y < margin) return true;
            }
        }
        return false;
    }
    
    /**
     * 绘制蛇头
     * @private
     */
    _drawHead(ctx, drawPos, headRadius, isInvincible) {
        // 无敌状态下改变颜色为金色
        const headColor = isInvincible ? '#feca57' : '#4ecdc4';
        const highlightColor = isInvincible ? '#ffeebb' : '#7ee8e0';
        
        // 创建径向渐变，增加立体感
        const gradient = ctx.createRadialGradient(
            drawPos.x - 3, drawPos.y - 3, 0,
            drawPos.x, drawPos.y, headRadius
        );
        gradient.addColorStop(0, highlightColor);
        gradient.addColorStop(1, headColor);
        
        ctx.fillStyle = gradient;
        ctx.shadowBlur = isInvincible ? 25 : 15;
        ctx.shadowColor = headColor;
        
        ctx.beginPath();
        ctx.arc(drawPos.x, drawPos.y, headRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制蛇眼
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'white';
        
        const eyeOffset = 5;
        const eyeAngle1 = this.angle - 0.4;
        const eyeAngle2 = this.angle + 0.4;
        
        const eye1X = drawPos.x + Math.cos(eyeAngle1) * eyeOffset;
        const eye1Y = drawPos.y + Math.sin(eyeAngle1) * eyeOffset;
        const eye2X = drawPos.x + Math.cos(eyeAngle2) * eyeOffset;
        const eye2Y = drawPos.y + Math.sin(eyeAngle2) * eyeOffset;
        
        ctx.beginPath();
        ctx.arc(eye1X, eye1Y, 4, 0, Math.PI * 2);
        ctx.arc(eye2X, eye2Y, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制眼珠
        ctx.fillStyle = isInvincible ? '#f59e0b' : 'black';
        const pupilOffset = 2;
        ctx.beginPath();
        ctx.arc(eye1X + Math.cos(this.angle) * pupilOffset, eye1Y + Math.sin(this.angle) * pupilOffset, 2, 0, Math.PI * 2);
        ctx.arc(eye2X + Math.cos(this.angle) * pupilOffset, eye2Y + Math.sin(this.angle) * pupilOffset, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制舌头
        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const tongueStartX = drawPos.x + Math.cos(this.angle) * headRadius;
        const tongueStartY = drawPos.y + Math.sin(this.angle) * headRadius;
        const tongueEndX = drawPos.x + Math.cos(this.angle) * (headRadius + 8);
        const tongueEndY = drawPos.y + Math.sin(this.angle) * (headRadius + 8);
        ctx.moveTo(tongueStartX, tongueStartY);
        ctx.lineTo(tongueEndX, tongueEndY);
        ctx.stroke();
    }
    
    /**
     * 绘制蛇身节点
     * @private
     */
    _drawBodySegment(ctx, drawPos, drawPositions, i, headRadius, isInvincible, offsetX, offsetY) {
        // 无敌状态下身体也带金色
        const bodyColorBase = isInvincible ? { r: 254, g: 202, b: 87 } : { r: 78, g: 200, b: 180 };
        const colorVariation = isInvincible ? 0.7 : 1;
        
        const greenValue = Math.max(60, Math.floor(bodyColorBase.g * colorVariation) - i * 3);
        const blueValue = Math.max(120, Math.floor(bodyColorBase.b * colorVariation) - i * 2);
        const redValue = Math.max(60, Math.floor(bodyColorBase.r * colorVariation));
        
        const gradient = ctx.createRadialGradient(
            drawPos.x - 2, drawPos.y - 2, 0,
            drawPos.x, drawPos.y, headRadius - 2
        );
        gradient.addColorStop(0, `rgb(${redValue + 20}, ${greenValue + 20}, ${blueValue + 20})`);
        gradient.addColorStop(1, `rgb(${redValue}, ${greenValue}, ${blueValue})`);
        
        ctx.fillStyle = gradient;
        ctx.shadowBlur = 0;
        
        ctx.beginPath();
        ctx.arc(drawPos.x, drawPos.y, headRadius - 2, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制身体连接线
        if (i < this.body.length - 1) {
            const nextPos = {
                x: drawPositions[i + 1].x + offsetX,
                y: drawPositions[i + 1].y + offsetY
            };
            
            // 检查连接线是否需要绘制（避免跨整个画布的连线）
            const dx = nextPos.x - drawPos.x;
            const dy = nextPos.y - drawPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // 只在节点距离合理时绘制连接线（避免穿墙时的跨画布连线）
            if (dist < headRadius * 4) {
                ctx.strokeStyle = `rgb(${redValue}, ${greenValue}, ${blueValue})`;
                ctx.lineWidth = (headRadius - 2) * 2;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(drawPos.x, drawPos.y);
                ctx.lineTo(nextPos.x, nextPos.y);
                ctx.stroke();
            }
        }
        
        // 绘制高光点
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.arc(drawPos.x - 3, drawPos.y - 3, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}