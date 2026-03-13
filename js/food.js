/**
 * @fileoverview 食物类模块 - 负责食物的生成、绘制和位置管理
 * 
 * 核心特性：
 * - 8种食物类型，每种有不同的效果和分值
 * - 食物过期机制，15秒后自动消失
 * - 智能位置生成，避让UI区域和蛇身
 * - 倒计时视觉反馈，最后5秒闪烁警告
 * 
 * @author 游戏开发团队
 * @version 2.0.0
 */

/**
 * 食物类 - 负责食物的生成、绘制和位置管理
 * 
 * 功能说明：
 * - 支持8种食物类型：普通、加速、无敌、奖励、减速、缩小、穿墙、双倍
 * - 食物过期机制：生成后15秒自动消失，最后5秒闪烁警告
 * - 智能生成算法：避让UI区域、蛇身和其他食物
 * - 安全区域检测：避免在蛇头前方生成造成突然死亡
 * 
 * @example
 * const food = new Food(800, 450, uiConfig, foodTypes, spawnConfig);
 * food.spawn(snakeBody, isLandscape, snakeHead);
 * food.draw(ctx);
 */
class Food {
    /**
     * 默认UI区域配置
     * 与 Game.CONFIG.UI_AREAS 保持一致
     */
    static DEFAULT_UI_CONFIG = {
        TOP_BAR_HEIGHT: 55,           // 顶部信息栏高度
        STEERING_WHEEL_SIZE: 130,     // 摇杆避让区域大小
        BOOST_BUTTON_SIZE: 120,       // 加速按钮避让区域大小
        BOTTOM_HINT_HEIGHT: 40,       // 底部提示文字高度
        BOTTOM_HINT_WIDTH: 240        // 底部提示文字宽度
    };

    /**
     * 默认食物类型配置
     * 与 Game.CONFIG.FOOD_TYPES 保持一致
     */
    static DEFAULT_FOOD_TYPES = [
        { color: '#ff6b6b', score: 10, effect: 'normal', radius: 8, probability: 0.45, name: '普通' },
        { color: '#feca57', score: 20, effect: 'speed', radius: 10, probability: 0.15, name: '加速' },
        { color: '#54a0ff', score: 30, effect: 'invincible', radius: 10, probability: 0.12, name: '无敌' },
        { color: '#5f27cd', score: 50, effect: 'bonus', radius: 12, probability: 0.05, name: '奖励' },
        { color: '#48dbfb', score: 15, effect: 'slow', radius: 9, probability: 0.08, name: '减速' },
        { color: '#1dd1a1', score: 25, effect: 'shrink', radius: 9, probability: 0.07, name: '缩小' },
        { color: '#ff9ff3', score: 35, effect: 'ghost', radius: 10, probability: 0.05, name: '穿墙' },
        { color: '#f368e0', score: 40, effect: 'double', radius: 11, probability: 0.03, name: '双倍' }
    ];

    /**
     * 默认食物生成配置
     * 与 Game.CONFIG.FOOD_SPAWN 保持一致
     */
    static DEFAULT_SPAWN_CONFIG = {
        MIN_COUNT: 2,                 // 最小食物数量
        MAX_COUNT: 3,                 // 最大食物数量
        MIN_DISTANCE_TO_SNAKE: 30,    // 与蛇身最小距离
        MIN_DISTANCE_TO_FOOD: 50,     // 食物间最小距离
        SAFE_MARGIN: 30,              // 边缘安全距离
        LIFE_TIME: 15000,             // 食物存活时间（毫秒）
        WARNING_TIME: 5000            // 食物警告时间（毫秒，开始闪烁）
    };

    /**
     * 构造函数
     * @param {number} canvasWidth - 画布宽度
     * @param {number} canvasHeight - 画布高度
     * @param {Object} uiConfig - UI区域配置（可选，用于食物避让）
     * @param {Array} foodTypes - 食物类型配置（可选）
     * @param {Object} spawnConfig - 食物生成配置（可选）
     */
    constructor(canvasWidth, canvasHeight, uiConfig = null, foodTypes = null, spawnConfig = null) {
        this.canvasWidth = canvasWidth;    // 画布宽度
        this.canvasHeight = canvasHeight;  // 画布高度
        this.uiConfig = uiConfig || Food.DEFAULT_UI_CONFIG;  // UI区域配置
        this.foodTypes = foodTypes || Food.DEFAULT_FOOD_TYPES;  // 食物类型配置
        this.spawnConfig = spawnConfig || Food.DEFAULT_SPAWN_CONFIG;  // 食物生成配置

        // 食物数组
        this.foods = [];        // 食物数组，每个元素包含 position 和 type

        // 初始化时生成食物
        this.initFoods();
    }

    /**
     * 初始化食物
     */
    initFoods(isLandscape = false) {
        this.foods = [];
        // 初始生成最小数量的食物，传入isLandscape以避让UI区域
        for (let i = 0; i < this.spawnConfig.MIN_COUNT; i++) {
            this.spawnSingle([], isLandscape);
        }
    }

    /**
     * 生成单个食物
     * @param {Array} snakeBody - 蛇身节点数组
     * @param {boolean} isLandscape - 是否为横屏模式
     * @param {Object} snakeHead - 蛇头信息 {x, y, angle}
     * @returns {Object|null} - 生成的食物对象或null（如果已达上限）
     */
    spawnSingle(snakeBody = [], isLandscape = false, snakeHead = null) {
        if (this.foods.length >= this.spawnConfig.MAX_COUNT) {
            return null;
        }

        const position = this.generateValidPosition(snakeBody, isLandscape, snakeHead);
        const type = this.selectRandomType();

        const now = Date.now();
        const food = {
            position: position,
            type: type,
            id: now + Math.random(),  // 唯一标识
            spawnTime: now,           // 生成时间
            lifeTime: this.spawnConfig.LIFE_TIME || 15000,  // 存活时间
            warningTime: this.spawnConfig.WARNING_TIME || 5000  // 警告时间
        };

        this.foods.push(food);
        return food;
    }

    /**
     * 生成有效位置
     * @param {Array} snakeBody - 蛇身节点数组
     * @param {boolean} isLandscape - 是否为横屏模式
     * @param {Object} snakeHead - 蛇头信息 {x, y, angle} 用于计算前方安全区域
     * @returns {Object} - 位置对象 {x, y}
     */
    generateValidPosition(snakeBody = [], isLandscape = false, snakeHead = null) {
        let validPosition = false;
        let position = { x: 0, y: 0 };

        // 使用UI配置定义避让区域（横屏模式下避开顶部、摇杆、加速按钮、提示文字）
        const uiCfg = this.uiConfig;
        const uiAreas = isLandscape ? [
            { x: 0, y: 0, w: this.canvasWidth, h: uiCfg.TOP_BAR_HEIGHT },  // 顶部信息栏
            { x: 0, y: this.canvasHeight - uiCfg.STEERING_WHEEL_SIZE, w: uiCfg.STEERING_WHEEL_SIZE, h: uiCfg.STEERING_WHEEL_SIZE },  // 左下角摇杆
            { x: this.canvasWidth - uiCfg.BOOST_BUTTON_SIZE, y: this.canvasHeight - uiCfg.BOOST_BUTTON_SIZE, w: uiCfg.BOOST_BUTTON_SIZE, h: uiCfg.BOOST_BUTTON_SIZE },  // 右下角加速按钮
            { x: this.canvasWidth / 2 - uiCfg.BOTTOM_HINT_WIDTH / 2, y: this.canvasHeight - uiCfg.BOTTOM_HINT_HEIGHT, w: uiCfg.BOTTOM_HINT_WIDTH, h: uiCfg.BOTTOM_HINT_HEIGHT }  // 底部中间提示文字
        ] : [];

        // 循环直到找到有效位置
        const cfg = this.spawnConfig;
        let attempts = 0;
        const maxAttempts = 100; // 防止无限循环
        
        while (!validPosition && attempts < maxAttempts) {
            attempts++;
            position.x = cfg.SAFE_MARGIN + Math.random() * (this.canvasWidth - cfg.SAFE_MARGIN * 2);
            position.y = cfg.SAFE_MARGIN + Math.random() * (this.canvasHeight - cfg.SAFE_MARGIN * 2);

            validPosition = true;

            // 检查是否在UI区域内
            for (const area of uiAreas) {
                if (position.x >= area.x && position.x <= area.x + area.w &&
                    position.y >= area.y && position.y <= area.y + area.h) {
                    validPosition = false;
                    break;
                }
            }

            if (!validPosition) continue;

            // 确保不与蛇身重叠
            for (let segment of snakeBody) {
                const dist = Math.sqrt(
                    Math.pow(position.x - segment.x, 2) +
                    Math.pow(position.y - segment.y, 2)
                );
                if (dist < cfg.MIN_DISTANCE_TO_SNAKE) {
                    validPosition = false;
                    break;
                }
            }

            if (!validPosition) continue;

            // 确保不与其他食物重叠
            for (let food of this.foods) {
                const dist = Math.sqrt(
                    Math.pow(position.x - food.position.x, 2) +
                    Math.pow(position.y - food.position.y, 2)
                );
                if (dist < cfg.MIN_DISTANCE_TO_FOOD) {
                    validPosition = false;
                    break;
                }
            }

            if (!validPosition) continue;

            // 检查是否在蛇头前方安全区域内（避免突然死亡）
            if (snakeHead && cfg.SAFE_DISTANCE_TO_HEAD) {
                const headX = snakeHead.x;
                const headY = snakeHead.y;
                const angle = snakeHead.angle || 0;
                
                // 计算蛇头前方区域（扇形区域）
                const safeDist = cfg.SAFE_DISTANCE_TO_HEAD;
                const dx = position.x - headX;
                const dy = position.y - headY;
                const distToHead = Math.sqrt(dx * dx + dy * dy);
                
                // 如果食物在蛇头附近，检查是否在前方
                if (distToHead < safeDist) {
                    const foodAngle = Math.atan2(dy, dx);
                    let angleDiff = foodAngle - angle;
                    // 规范化角度差到 [-π, π]
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                    
                    // 如果食物在蛇头前方60度范围内，且距离较近，则无效
                    if (Math.abs(angleDiff) < Math.PI / 3) {
                        validPosition = false;
                    }
                }
            }
        }

        return position;
    }

    /**
     * 随机选择食物类型
     * @returns {Object} - 食物类型对象
     */
    selectRandomType() {
        const rand = Math.random();
        let cumulativeProbability = 0;
        for (const type of this.foodTypes) {
            cumulativeProbability += type.probability;
            if (rand <= cumulativeProbability) {
                return type;
            }
        }
        return this.foodTypes[0];
    }

    /**
     * 生成新的食物（吃掉一个后补充）
     * @param {Array} snakeBody - 蛇身节点数组
     * @param {boolean} isLandscape - 是否为横屏模式
     * @param {Object} snakeHead - 蛇头信息 {x, y, angle}
     */
    spawn(snakeBody = [], isLandscape = false, snakeHead = null) {
        // 补充食物，保持在配置的最小和最大数量之间
        const cfg = this.spawnConfig;
        const targetCount = cfg.MIN_COUNT + Math.floor(Math.random() * (cfg.MAX_COUNT - cfg.MIN_COUNT + 1));
        while (this.foods.length < targetCount) {
            this.spawnSingle(snakeBody, isLandscape, snakeHead);
        }
    }
    
    /**
     * 获取所有食物
     * @returns {Array} - 食物数组
     */
    getFoods() {
        return this.foods;
    }

    /**
     * 更新食物状态（处理过期）
     * @param {number} deltaTime - 时间增量（毫秒）
     * @returns {Array} - 过期的食物数组
     */
    update(deltaTime = 16) {
        const expiredFoods = [];
        const now = Date.now();
        
        for (let i = this.foods.length - 1; i >= 0; i--) {
            const food = this.foods[i];
            const elapsed = now - food.spawnTime;
            
            // 检查是否过期
            if (elapsed >= food.lifeTime) {
                expiredFoods.push(food);
                this.foods.splice(i, 1);
            }
        }
        
        return expiredFoods;
    }

    /**
     * 获取食物的剩余生命比例
     * @param {Object} food - 食物对象
     * @returns {number} - 剩余生命比例 (0-1)
     */
    getLifeRatio(food) {
        const elapsed = Date.now() - food.spawnTime;
        return Math.max(0, 1 - elapsed / food.lifeTime);
    }

    /**
     * 检查食物是否处于警告状态（即将过期）
     * @param {Object} food - 食物对象
     * @returns {boolean} - 是否处于警告状态
     */
    isWarning(food) {
        const elapsed = Date.now() - food.spawnTime;
        return elapsed >= (food.lifeTime - food.warningTime);
    }

    /**
     * 检查并获取被吃掉的食物
     * @param {Object} headPos - 蛇头位置 {x, y}
     * @param {number} eatRadius - 吃食物的有效半径
     * @returns {Object|null} - 被吃掉的食物对象或null
     */
    checkAndGetEatenFood(headPos, eatRadius = 15) {
        for (let i = 0; i < this.foods.length; i++) {
            const food = this.foods[i];
            const dist = Math.sqrt(
                Math.pow(headPos.x - food.position.x, 2) +
                Math.pow(headPos.y - food.position.y, 2)
            );
            if (dist < eatRadius + food.type.radius) {
                // 移除被吃掉的食物
                const eatenFood = this.foods.splice(i, 1)[0];
                return eatenFood;
            }
        }
        return null;
    }

    /**
     * 绘制所有食物
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D渲染上下文
     */
    draw(ctx) {
        for (const food of this.foods) {
            this.drawSingleFood(ctx, food);
        }
    }

    /**
     * 绘制单个食物
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D渲染上下文
     * @param {Object} food - 食物对象
     */
    drawSingleFood(ctx, food) {
        const type = food.type;
        const radius = type.radius;
        const x = food.position.x;
        const y = food.position.y;
        
        // 计算生命比例和警告状态
        const lifeRatio = this.getLifeRatio(food);
        const isWarning = this.isWarning(food);
        
        // 警告状态下的闪烁效果
        let alpha = 1;
        let blinkScale = 1;
        if (isWarning) {
            const blinkSpeed = 0.008;
            const blink = Math.sin(Date.now() * blinkSpeed) * 0.5 + 0.5;
            alpha = 0.4 + blink * 0.6;
            blinkScale = 0.9 + blink * 0.1;
        }

        // ===== 发光效果 =====
        ctx.shadowBlur = (type.effect === 'bonus' ? 30 : 20) * lifeRatio;
        ctx.shadowColor = type.color;

        // ===== 绘制圆形食物（外圈）=====
        ctx.globalAlpha = alpha;
        ctx.fillStyle = type.color;
        ctx.beginPath();
        ctx.arc(x, y, radius * blinkScale, 0, Math.PI * 2);
        ctx.fill();

        // ===== 绘制内圈（半透明白色）=====
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.7, 0, Math.PI * 2);
        ctx.fill();

        // ===== 特殊效果绘制（在内圈之上）=====
        if (type.effect === 'bonus') {
            // bonus食物绘制星形效果
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
                const sx = x + Math.cos(angle) * (radius * 0.5);
                const sy = y + Math.sin(angle) * (radius * 0.5);
                if (i === 0) ctx.moveTo(sx, sy);
                else ctx.lineTo(sx, sy);
            }
            ctx.closePath();
            ctx.fill();
        } else if (type.effect === 'speed') {
            // 加速食物绘制闪电符号
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.beginPath();
            ctx.moveTo(x - 2, y - 5);
            ctx.lineTo(x + 3, y);
            ctx.lineTo(x, y);
            ctx.lineTo(x + 2, y + 5);
            ctx.lineTo(x - 3, y);
            ctx.lineTo(x, y);
            ctx.closePath();
            ctx.fill();
        } else if (type.effect === 'invincible') {
            // 无敌食物绘制盾牌符号
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.beginPath();
            ctx.arc(x, y, radius * 0.35, 0, Math.PI * 2);
            ctx.fill();
        } else if (type.effect === 'slow') {
            // 减速食物绘制蜗牛符号（螺旋）
            ctx.strokeStyle = 'rgba(255,255,255,0.9)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            for (let i = 0; i < 15; i++) {
                const angle = i * 0.5;
                const r = radius * 0.1 + i * 0.25;
                const sx = x + Math.cos(angle) * r;
                const sy = y + Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(sx, sy);
                else ctx.lineTo(sx, sy);
            }
            ctx.stroke();
        } else if (type.effect === 'shrink') {
            // 缩小食物绘制收缩箭头
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.beginPath();
            ctx.moveTo(x, y + radius * 0.4);
            ctx.lineTo(x - radius * 0.25, y);
            ctx.lineTo(x - radius * 0.08, y);
            ctx.lineTo(x - radius * 0.08, y - radius * 0.4);
            ctx.lineTo(x + radius * 0.08, y - radius * 0.4);
            ctx.lineTo(x + radius * 0.08, y);
            ctx.lineTo(x + radius * 0.25, y);
            ctx.closePath();
            ctx.fill();
        } else if (type.effect === 'ghost') {
            // 穿墙食物绘制幽灵符号
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.beginPath();
            ctx.arc(x, y - radius * 0.15, radius * 0.3, Math.PI, 0);
            ctx.lineTo(x + radius * 0.3, y + radius * 0.25);
            ctx.lineTo(x + radius * 0.1, y + radius * 0.1);
            ctx.lineTo(x, y + radius * 0.25);
            ctx.lineTo(x - radius * 0.1, y + radius * 0.1);
            ctx.lineTo(x - radius * 0.3, y + radius * 0.25);
            ctx.closePath();
            ctx.fill();
        } else if (type.effect === 'double') {
            // 双倍分数绘制"x2"符号
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.font = `bold ${radius * 0.8}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('x2', x, y);
        } else if (type.effect === 'normal') {
            // 普通食物绘制小圆点
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.beginPath();
            ctx.arc(x, y, radius * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }

        // ===== 绘制高光点 =====
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(x - radius * 0.25, y - radius * 0.25, radius * 0.2, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制倒计时圆环（警告状态时）
        if (isWarning && lifeRatio > 0) {
            ctx.save();
            ctx.strokeStyle = `rgba(255, 100, 100, ${0.6 + Math.sin(Date.now() * 0.01) * 0.4})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, radius + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * lifeRatio);
            ctx.stroke();
            ctx.restore();
        }
        
        // 恢复全局透明度
        ctx.globalAlpha = 1;

        // 重置阴影效果
        ctx.shadowBlur = 0;
    }

    /**
     * 重置食物
     * @param {boolean} isLandscape - 是否为横屏模式
     */
    reset(isLandscape = false) {
        this.initFoods(isLandscape);
    }
}