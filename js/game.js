/**
 * @fileoverview 游戏主逻辑模块 - 贪吃蛇游戏的核心控制器
 * 
 * 核心职责：
 * - 游戏状态管理（菜单、进行中、暂停、结束）
 * - 游戏循环和渲染调度
 * - 用户输入处理（键盘、触摸、鼠标）
 * - 碰撞检测和游戏逻辑
 * - UI更新和事件协调
 * 
 * 架构设计：
 * - 使用 requestAnimationFrame 实现流畅的游戏循环
 * - 组件化设计：Snake、Food、EffectsManager、OffscreenRenderer、WebGLParticleRenderer、AudioManager
 * - 配置集中管理：Game.CONFIG 包含所有可调参数
 * - 状态机模式：Game.STATE 枚举管理游戏状态
 * 
 * 性能优化：
 * - 离屏渲染：背景和星星使用离屏Canvas预渲染
 * - WebGL粒子：死亡爆炸效果使用GPU加速
 * - 脏标记机制：只重绘变化的部分
 * - 对象池：粒子对象复用
 * 
 * 移动端适配：
 * - 横屏全屏模式
 * - 虚拟摇杆控制
 * - 触摸加速按钮
 * - 响应式布局
 * 
 * @author 游戏开发团队
 * @version 2.0.0
 */

/**
 * 游戏主类
 * 贪吃蛇游戏的核心控制器，协调所有子系统
 * @class
 */
class Game {
    /**
     * 游戏配置常量
     * 集中管理所有可配置参数，避免魔法数字
     * @static
     * @type {Object}
     * @property {number} GRID_SIZE - 网格大小（像素）
     * @property {number} SEGMENT_DISTANCE - 蛇身节点间距（像素）
     * @property {number} BASE_SPEED - 基础速度
     * @property {number} MOBILE_INITIAL_SPEED - 移动端初始速度
     * @property {number} BOOST_MULTIPLIER - 加速倍数
     * @property {number} MAX_SPEED - 最大速度
     * @property {Object} STEERING_WHEEL - 摇杆配置
     * @property {Object} BOOST_BUTTON - 加速按钮配置
     * @property {Object} UI_AREAS - UI区域配置（用于食物避让）
     * @property {Object} CANVAS_BUTTON - 画布内按钮配置
     * @property {Object} EFFECT_DURATION - 食物效果持续时间（毫秒）
     * @property {Object} EFFECT_MULTIPLIER - 食物效果倍数
     * @property {number} COMBO_TIME_WINDOW - 连击检测时间窗口（毫秒）
     * @property {number} SCORE_LEVEL_STEP - 每级所需分数
     * @property {number} SPEED_INCREMENT_PER_LEVEL - 每级速度增量
     * @property {Array<Object>} FOOD_TYPES - 8种食物类型配置
     * @property {Object} FOOD_SPAWN - 食物生成配置
     * @property {Object} SNAKE - 蛇身配置
     * @property {Object} ROTATE - 转圈模式配置
     * @property {Object} VIBRATION - 振动反馈配置
     * @property {Object} BACKGROUND - 背景效果配置
     * @property {Object} ANIMATION - 动画效果配置
     * @property {Object} AUDIO - 音效配置
     */
    static CONFIG = {
        // 网格与尺寸
        GRID_SIZE: 20,                    // 网格大小（像素）
        SEGMENT_DISTANCE: 8,              // 蛇身节点间距（像素）
        
        // 速度相关
        BASE_SPEED: 4,                    // 基础速度
        MOBILE_INITIAL_SPEED: 3,          // 移动端初始速度（较慢，提升操控性）
        BOOST_MULTIPLIER: 1.8,            // 加速倍数
        MAX_SPEED: 8,                     // 最大速度
        
        // 摇杆配置
        STEERING_WHEEL: {
            CENTER_X: 70,                 // 摇杆中心X（距左边缘）
            CENTER_Y_OFFSET: 70,          // 摇杆中心Y（距底边缘）
            RADIUS: 50,                   // 底座半径
            STICK_RADIUS: 22,             // 摇杆圆球半径
            MAX_STICK_DISTANCE: 28,       // 最大偏移距离
            TOUCH_TOLERANCE: 15           // 触摸检测容差（半径+容差=有效点击范围）
        },
        
        // 加速按钮配置
        BOOST_BUTTON: {
            CENTER_X_OFFSET: 70,          // 按钮中心X（距右边缘）
            CENTER_Y_OFFSET: 70,          // 按钮中心Y（距底边缘）
            RADIUS: 45,                   // 按钮半径
            TOUCH_TOLERANCE: 10           // 触摸检测容差
        },
        
        // UI区域配置（用于食物避让）
        UI_AREAS: {
            TOP_BAR_HEIGHT: 55,           // 顶部信息栏高度
            STEERING_WHEEL_SIZE: 130,     // 摇杆避让区域大小
            BOOST_BUTTON_SIZE: 120,       // 加速按钮避让区域大小
            BOTTOM_HINT_HEIGHT: 40,       // 底部提示文字高度
            BOTTOM_HINT_WIDTH: 240        // 底部提示文字宽度
        },
        
        // 画布内按钮配置（横屏模式）
        CANVAS_BUTTON: {
            X_OFFSET: 62,                 // 距右边缘距离
            Y: 12,                        // 距顶边缘距离
            WIDTH: 50,                    // 按钮宽度
            HEIGHT: 32,                   // 按钮高度
            CORNER_RADIUS: 16             // 圆角半径
        },
        
        // 食物效果持续时间（毫秒）
        EFFECT_DURATION: {
            SPEED: 5000,                  // 加速效果
            INVINCIBLE: 3000,             // 无敌效果
            SLOW: 5000,                   // 减速效果
            GHOST: 5000,                  // 穿墙效果
            DOUBLE: 5000                  // 双倍分数
        },
        
        // 食物效果倍数
        EFFECT_MULTIPLIER: {
            SPEED: 1.5,                   // 加速倍数
            SLOW: 0.5                     // 减速倍数
        },
        
        // 连击检测时间（毫秒）
        COMBO_TIME_WINDOW: 2000,
        
        // 分数相关
        SCORE_LEVEL_STEP: 100,            // 每多少分升一级
        SPEED_INCREMENT_PER_LEVEL: 0.3,   // 每级速度增量
        
        // 食物类型配置
        FOOD_TYPES: [
            { color: '#ff6b6b', score: 10, effect: 'normal', radius: 8, probability: 0.45, name: '普通' },
            { color: '#feca57', score: 20, effect: 'speed', radius: 10, probability: 0.15, name: '加速' },
            { color: '#54a0ff', score: 30, effect: 'invincible', radius: 10, probability: 0.12, name: '无敌' },
            { color: '#5f27cd', score: 50, effect: 'bonus', radius: 12, probability: 0.05, name: '奖励' },
            { color: '#48dbfb', score: 15, effect: 'slow', radius: 9, probability: 0.08, name: '减速' },
            { color: '#1dd1a1', score: 25, effect: 'shrink', radius: 9, probability: 0.07, name: '缩小' },
            { color: '#ff9ff3', score: 35, effect: 'ghost', radius: 10, probability: 0.05, name: '穿墙' },
            { color: '#f368e0', score: 40, effect: 'double', radius: 11, probability: 0.03, name: '双倍' }
        ],
        
        // 食物生成配置
        FOOD_SPAWN: {
            MIN_COUNT: 2,                 // 最小食物数量
            MAX_COUNT: 3,                 // 最大食物数量
            MIN_DISTANCE_TO_SNAKE: 30,    // 与蛇身最小距离
            MIN_DISTANCE_TO_FOOD: 50,     // 食物间最小距离
            SAFE_MARGIN: 30,              // 边缘安全距离
            SAFE_DISTANCE_TO_HEAD: 80     // 与蛇头前方的安全距离（避免突然死亡）
        },
        
        // 蛇身长度限制
        SNAKE: {
            MAX_LENGTH: 50,               // 最大蛇身长度（节数）
            INITIAL_LENGTH: 5             // 初始长度
        },
        
        // 转圈模式配置
        ROTATE: {
            RADIUS: 15,                   // 转圈半径（像素）
            SPEED: 0.08                   // 基础旋转速度（弧度/帧）
        },
        
        // 振动反馈配置
        VIBRATION: {
            EAT_FOOD: 30,                 // 吃到食物振动时长
            EAT_BONUS: 50,                // 吃到奖励食物振动时长
            BOOST_PRESS: 20,              // 按下加速按钮振动
            GAME_OVER: [100, 50, 100],    // 游戏结束振动模式
            WALL_HIT: 80,                 // 撞墙振动（穿墙/无敌模式下）
            LEVEL_UP: 40                  // 升级振动
        },
        
        // 背景效果配置
        BACKGROUND: {
            STAR_COUNT: 150,              // 星星数量（增加）
            STAR_SPEED: 0.2,              // 星星移动速度（减慢，更自然）
            PARTICLE_COUNT: 50,           // 背景粒子数量（增加）
            COLOR_SHIFT_SPEED: 0.0003     // 背景色渐变速度（减慢）
        },
        
        // 动画效果配置
        ANIMATION: {
            SCORE_BOUNCE_DURATION: 600,   // 分数弹跳动画时长
            SCORE_BOUNCE_HEIGHT: 15,      // 分数弹跳高度
            EFFECT_PULSE_SPEED: 0.003,    // 效果指示器脉冲速度
            SNAKE_WAVE_AMPLITUDE: 2,      // 蛇身波浪幅度
            SNAKE_WAVE_FREQUENCY: 0.15,   // 蛇身波浪频率
            TRAIL_LENGTH: 8               // 拖尾长度
        },
        
        // 全屏配置
        FULLSCREEN: {
            ENABLED: true,                // 是否启用全屏功能
            AUTO_ENTER_ON_LANDSCAPE: true, // 横屏时自动进入全屏
            LOCK_ORIENTATION: true        // 是否锁定横屏方向
        },
        
        // 音效配置
        AUDIO: {
            ENABLED: true,                // 默认开启音效
            VOLUME: 0.3                   // 默认音量 0-1
        }
    };
    
    /**
     * 游戏状态枚举
     * 统一管理游戏状态
     * @static
     * @enum {string}
     * @property {string} MENU - 主菜单/等待开始
     * @property {string} PLAYING - 游戏进行中
     * @property {string} PAUSED - 暂停状态
     * @property {string} GAME_OVER - 游戏结束
     */
    static STATE = {
        MENU: 'MENU',           // 主菜单/等待开始
        PLAYING: 'PLAYING',     // 游戏进行中
        PAUSED: 'PAUSED',       // 暂停
        GAME_OVER: 'GAME_OVER'  // 游戏结束
    };

    /**
     * 构造函数 - 初始化游戏状态和对象
     * 创建所有游戏组件并绑定初始事件
     * @constructor
     */
    constructor() {
        // 获取Canvas元素和2D渲染上下文
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 检查Canvas支持
        if (!this.ctx) {
            alert('您的浏览器不支持Canvas，请使用现代浏览器（Chrome、Edge、Firefox、Safari等）');
            return;
        }
        
        // 游戏配置参数
        this.gridSize = Game.CONFIG.GRID_SIZE;  // 网格大小（像素）
        
        // 创建游戏对象
        this.snake = new Snake(this.gridSize);                    // 蛇对象
        this.snake.setCanvasSize(this.canvas.width, this.canvas.height); // 设置画布尺寸用于预测性边界检测
        this.food = new Food(
            this.canvas.width, 
            this.canvas.height, 
            Game.CONFIG.UI_AREAS,           // UI避让配置
            Game.CONFIG.FOOD_TYPES,         // 食物类型配置
            Game.CONFIG.FOOD_SPAWN          // 食物生成配置
        );  // 食物对象
        this.effects = new EffectsManager();                      // 特效管理器
        this.offscreenRenderer = new OffscreenRenderer(this.canvas.width, this.canvas.height);  // 离屏渲染器
        this.webglParticles = new WebGLParticleRenderer(this.canvas);  // WebGL粒子渲染器
        this.audio = new AudioManager();                          // 音效管理器
        this.audio.setEnabled(Game.CONFIG.AUDIO.ENABLED);         // 设置默认音效状态
        this.audio.setVolume(Game.CONFIG.AUDIO.VOLUME);           // 设置默认音量
        
        // 检测是否为横屏模式
        this.isLandscapeMode = () => {
            const isLandscape = window.innerWidth > window.innerHeight;
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            return isLandscape && isMobile;
        };
        
        // 初始化方向盘（游戏机摇杆样式）
        this.initSteeringWheel = () => {
            const cfg = Game.CONFIG.STEERING_WHEEL;
            return {
                active: false,
                centerX: cfg.CENTER_X,
                centerY: this.canvas.height - cfg.CENTER_Y_OFFSET,
                radius: cfg.RADIUS,           // 底座半径
                stickRadius: cfg.STICK_RADIUS, // 摇杆圆球半径
                touchId: null,
                currentAngle: 0,              // 当前角度
                stickDistance: 0,             // 摇杆偏移距离
                maxStickDistance: cfg.MAX_STICK_DISTANCE  // 最大偏移距离
            };
        };
        
        // 初始化加速按钮
        this.initBoostButton = () => {
            const cfg = Game.CONFIG.BOOST_BUTTON;
            return {
                active: false,
                centerX: this.canvas.width - cfg.CENTER_X_OFFSET,
                centerY: this.canvas.height - cfg.CENTER_Y_OFFSET,
                radius: cfg.RADIUS,           // 按钮半径
                touchId: null
            };
        };
        
        // 方向盘状态
        this.steeringWheel = this.initSteeringWheel();
        
        // 加速按钮状态
        this.boostButton = this.initBoostButton();
        this.isBoosting = false;  // 是否正在加速
        this.boostMultiplier = Game.CONFIG.BOOST_MULTIPLIER;  // 加速倍数
        
        // 画布按钮触摸标记，防止重复触发
        this.canvasButtonTouched = false;
        
        // 连击计数
        this.comboCount = 0;
        this.lastEatTime = 0;
        
        // 游戏状态变量
        this.score = 0;        // 当前得分
        this.highScore = this.loadHighScore();  // 最高分（从本地存储读取）
        this.gameLoop = null;  // 游戏循环ID（用于requestAnimationFrame）
        this.state = Game.STATE.MENU;  // 当前游戏状态（使用统一状态管理）
        
        // 动画效果状态
        this.scoreAnimation = {    // 分数动画状态
            active: false,
            startTime: 0,
            baseScore: 0
        };
        this.backgroundOffset = 0; // 背景滚动偏移
        this.wavePhase = 0;        // 蛇身波浪相位
        this.isDeathAnimating = false; // 死亡动画是否正在播放
        
        // 绑定resize事件处理函数（保存引用以便后续移除）
        this.boundResizeHandler = this.handleResize.bind(this);
        window.addEventListener('resize', this.boundResizeHandler);
        
        // 食物效果状态
        this.activeEffects = {   // 当前激活的食物效果
            speed: false,        // 加速效果
            invincible: false,   // 无敌效果
            slow: false,         // 减速效果
            ghost: false,        // 穿墙效果
            double: false        // 双倍分数效果
        };
        this.effectTimers = {    // 效果定时器
            speed: null,
            invincible: null,
            slow: null,
            ghost: null,
            double: null
        };
        this.baseSpeed = Game.CONFIG.BASE_SPEED;  // 基础速度
        this.particles = [];     // 粒子数组
        
        // 初始化游戏
        this.init();
    }
    
    /**
     * 处理窗口大小变化
     * 横屏模式下更新画布和控制元素位置
     */
    handleResize() {
        const isLandscape = window.innerWidth > window.innerHeight;
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isLandscape && isMobile && this.state === Game.STATE.PLAYING) {
            // 横屏模式下更新画布尺寸为全屏
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.food.canvasWidth = window.innerWidth;
            this.food.canvasHeight = window.innerHeight;
            
            // 更新蛇的画布尺寸（用于预测性边界检测）
            this.snake.setCanvasSize(window.innerWidth, window.innerHeight);
            
            // 更新离屏渲染器尺寸
            this.offscreenRenderer.setSize(window.innerWidth, window.innerHeight);
        }
        
        // 更新控制元素位置
        const swCfg = Game.CONFIG.STEERING_WHEEL;
        const bbCfg = Game.CONFIG.BOOST_BUTTON;
        this.steeringWheel.centerX = swCfg.CENTER_X;
        this.steeringWheel.centerY = window.innerHeight - swCfg.CENTER_Y_OFFSET;
        this.boostButton.centerX = window.innerWidth - bbCfg.CENTER_X_OFFSET;
        this.boostButton.centerY = window.innerHeight - bbCfg.CENTER_Y_OFFSET;
    }
    
    /**
     * 清理资源（游戏销毁时调用）
     * 移除事件监听器、取消动画帧、清理定时器
     */
    dispose() {
        // 移除事件监听器
        window.removeEventListener('resize', this.boundResizeHandler);
        document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
        
        // 取消游戏循环
        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
        }
        
        // 清除所有定时器
        for (const key in this.effectTimers) {
            if (this.effectTimers[key]) {
                clearTimeout(this.effectTimers[key]);
            }
        }
        
        // 清理离屏渲染器
        this.offscreenRenderer.dispose();
    }

    // ========== 全屏和横屏锁定功能 ==========
    
    /**
     * 进入全屏模式
     * 尝试将游戏容器切换到全屏显示
     * @returns {Promise<boolean>} 是否成功进入全屏
     */
    async enterFullscreen() {
        const container = document.querySelector('.game-container');
        if (!container) return false;
        
        try {
            // 尝试各种全屏API前缀
            const requestFullscreen = container.requestFullscreen || 
                                     container.webkitRequestFullscreen || 
                                     container.mozRequestFullScreen || 
                                     container.msRequestFullscreen;
            
            if (requestFullscreen) {
                await requestFullscreen.call(container);
                return true;
            }
        } catch (e) {
            console.warn('[Game] 进入全屏失败:', e);
        }
        return false;
    }
    
    /**
     * 退出全屏模式
     * @returns {Promise<boolean>} 是否成功退出全屏
     */
    async exitFullscreen() {
        try {
            const exitFullscreen = document.exitFullscreen || 
                                  document.webkitExitFullscreen || 
                                  document.mozCancelFullScreen || 
                                  document.msExitFullscreen;
            
            if (exitFullscreen && this.isFullscreen()) {
                await exitFullscreen.call(document);
                return true;
            }
        } catch (e) {
            console.warn('[Game] 退出全屏失败:', e);
        }
        return false;
    }
    
    /**
     * 检查当前是否处于全屏状态
     * @returns {boolean} 是否全屏
     */
    isFullscreen() {
        return !!(document.fullscreenElement || 
                  document.webkitFullscreenElement || 
                  document.mozFullScreenElement || 
                  document.msFullscreenElement);
    }
    
    /**
     * 锁定屏幕方向为横屏
     * 使用 Screen Orientation API
     * @returns {boolean} 是否成功锁定
     */
    lockLandscape() {
        const cfg = Game.CONFIG.FULLSCREEN;
        if (!cfg.LOCK_ORIENTATION) return false;
        
        try {
            const screen = window.screen;
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('landscape').catch(e => {
                    console.warn('[Game] 锁定横屏失败:', e);
                });
                return true;
            } else if (screen.lockOrientation) {
                screen.lockOrientation('landscape');
                return true;
            } else if (screen.mozLockOrientation) {
                screen.mozLockOrientation('landscape');
                return true;
            }
        } catch (e) {
            console.warn('[Game] 屏幕方向锁定不支持:', e);
        }
        return false;
    }
    
    /**
     * 解锁屏幕方向
     */
    unlockOrientation() {
        try {
            const screen = window.screen;
            if (screen.orientation && screen.orientation.unlock) {
                screen.orientation.unlock();
            } else if (screen.unlockOrientation) {
                screen.unlockOrientation();
            } else if (screen.mozUnlockOrientation) {
                screen.mozUnlockOrientation();
            }
        } catch (e) {
            console.warn('[Game] 解锁屏幕方向失败:', e);
        }
    }
    
    /**
     * 切换全屏状态
     * 根据当前状态进入或退出全屏
     */
    async toggleFullscreen() {
        if (this.isFullscreen()) {
            await this.exitFullscreen();
            this.unlockOrientation();
        } else {
            const success = await this.enterFullscreen();
            if (success) {
                this.lockLandscape();
            }
        }
    }
    
    /**
     * 检测是否为微信内置浏览器
     * @returns {boolean} 是否在微信中
     */
    isWechat() {
        return /MicroMessenger/i.test(navigator.userAgent);
    }
    
    /**
     * 检测是否为iOS设备
     * @returns {boolean} 是否为iOS
     */
    isIOS() {
        return /iPad|iPhone|iPod/i.test(navigator.userAgent) && !window.MSStream;
    }

    /**
     * 从本地存储加载最高分
     * @returns {number} 最高分，读取失败返回 0
     */
    loadHighScore() {
        try {
            const saved = localStorage.getItem('snakeHighScore');
            return saved ? parseInt(saved, 10) : 0;
        } catch (e) {
            console.warn('[Game] Failed to load high score:', e);
            return 0;
        }
    }

    /**
     * 保存最高分到本地存储
     * @param {number} score - 要保存的分数
     */
    saveHighScore(score) {
        try {
            localStorage.setItem('snakeHighScore', score.toString());
        } catch (e) {
            console.warn('[Game] Failed to save high score:', e);
        }
    }

    /**
     * 振动反馈（如果设备支持）
     * @param {number|Array} pattern - 振动时长（毫秒）或振动模式数组
     */
    vibrate(pattern = 50) {
        if (navigator.vibrate) {
            navigator.vibrate(pattern);
        }
    }
    
    /**
     * 触发分数弹跳动画
     * 更新分数显示并添加CSS动画类
     * @param {number} points - 增加的分数
     */
    triggerScoreAnimation(points) {
        const scoreElement = document.getElementById('score');
        if (!scoreElement) return;
        
        // 更新分数显示
        scoreElement.textContent = this.score;
        
        // 设置动画状态
        this.scoreAnimation = {
            active: true,
            startTime: Date.now(),
            points: points
        };
        
        // 添加CSS动画类
        scoreElement.classList.add('score-bounce');
        
        // 动画结束后移除类
        setTimeout(() => {
            scoreElement.classList.remove('score-bounce');
            this.scoreAnimation.active = false;
        }, Game.CONFIG.ANIMATION.SCORE_BOUNCE_DURATION);
    }
    
    /**
     * 场景化振动反馈
     * 根据游戏场景触发不同的振动模式
     * @param {string} scene - 振动场景，可选值：
     *   - 'eatFood': 吃到普通食物（30ms）
     *   - 'eatBonus': 吃到奖励食物（50ms）
     *   - 'boostPress': 按下加速按钮（20ms）
     *   - 'gameOver': 游戏结束（100,50,100ms）
     *   - 'wallHit': 撞墙（80ms）
     *   - 'levelUp': 升级（40ms）
     */
    vibrateScene(scene) {
        const cfg = Game.CONFIG.VIBRATION;
        switch(scene) {
            case 'eatFood':
                this.vibrate(cfg.EAT_FOOD);
                break;
            case 'eatBonus':
                this.vibrate(cfg.EAT_BONUS);
                break;
            case 'boostPress':
                this.vibrate(cfg.BOOST_PRESS);
                break;
            case 'gameOver':
                this.vibrate(cfg.GAME_OVER);
                break;
            case 'wallHit':
                this.vibrate(cfg.WALL_HIT);
                break;
            case 'levelUp':
                this.vibrate(cfg.LEVEL_UP);
                break;
            default:
                this.vibrate(50);
        }
    }

    /**
     * 初始化游戏 - 绑定事件监听器和初始渲染
     * 设置画布尺寸、绑定UI事件、初始化控制组件
     */
    init() {
        // 检测是否为横屏模式并预先设置画布尺寸（避免开始游戏时闪烁）
        const isLandscape = window.innerWidth > window.innerHeight;
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isLandscape && isMobile) {
            // 横屏模式下预先设置画布为全屏尺寸
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.food.canvasWidth = window.innerWidth;
            this.food.canvasHeight = window.innerHeight;
            this.offscreenRenderer.setSize(window.innerWidth, window.innerHeight);
            
            // 预先设置控制元素位置
            const swCfg = Game.CONFIG.STEERING_WHEEL;
            const bbCfg = Game.CONFIG.BOOST_BUTTON;
            this.steeringWheel.centerX = swCfg.CENTER_X;
            this.steeringWheel.centerY = window.innerHeight - swCfg.CENTER_Y_OFFSET;
            this.boostButton.centerX = window.innerWidth - bbCfg.CENTER_X_OFFSET;
            this.boostButton.centerY = window.innerHeight - bbCfg.CENTER_Y_OFFSET;
        }
        
        // 更新最高分显示
        document.getElementById('highScore').textContent = this.highScore;
        
        // ===== 绑定按钮事件 =====
        // 游戏主按钮：未开始时开始游戏，游戏中时暂停/继续
        document.getElementById('gameBtn').addEventListener('click', () => this.handleGameButton());
        document.getElementById('restartBtn').addEventListener('click', () => this.restart());
        
        // 音效开关按钮
        const muteBtn = document.getElementById('muteBtn');
        if (muteBtn) {
            muteBtn.addEventListener('click', () => {
                const isEnabled = this.audio.toggle();
                muteBtn.textContent = isEnabled ? '🔊' : '🔇';
                muteBtn.classList.toggle('muted', !isEnabled);
            });
        }
        
        // ===== 绑定鼠标/触摸控制事件 =====
        // 鼠标移动事件（桌面端）
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        // 触摸移动事件（移动端）
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), {passive: false});
        // 触摸开始事件（移动端，用于开始游戏）
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), {passive: false});
        
        // 画布点击事件（横屏模式下点击按钮）
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('touchend', (e) => this.handleCanvasTouch(e), {passive: false});
        
        // ===== 绑定键盘控制事件 =====
        // 保留空格键暂停功能
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
        
        // ===== 绑定页面可见性变化事件（后台暂停）=====
        this.boundVisibilityHandler = this.handleVisibilityChange.bind(this);
        document.addEventListener('visibilitychange', this.boundVisibilityHandler);
        
        // ===== 检测并适配移动端 =====
        this.detectMobile();
        
        // 初始绘制
        this.draw();
    }
    
    /**
     * 处理页面可见性变化（后台暂停功能）
     * 页面切换到后台时自动暂停游戏
     */
    handleVisibilityChange() {
        if (document.hidden && this.state === Game.STATE.PLAYING) {
            // 页面进入后台，自动暂停
            this.pauseTime = Date.now();
            this.setState(Game.STATE.PAUSED);
        } else if (!document.hidden && this.state === Game.STATE.PAUSED && this.pauseTime) {
            // 页面回到前台，保持暂停状态，让用户手动继续
        }
    }
    
    /**
     * 设置游戏状态（统一状态管理）
     * @param {string} newState - 新状态，使用 Game.STATE 枚举值
     */
    setState(newState) {
        const oldState = this.state;
        this.state = newState;
        
        // 触发状态变化事件
        this.onStateChange(oldState, newState);
    }
    
    /**
     * 状态变化回调
     * 可在此添加状态变化的通用处理（如统计、UI更新等）
     * @param {string} oldState - 旧状态
     * @param {string} newState - 新状态
     */
    onStateChange(oldState, newState) {
        // 可以在这里添加状态变化的通用处理
        // 例如：发送统计事件、更新UI等
    }

    /**
     * 检测是否为移动设备并适配UI
     * 移动端优化：降低初始速度、禁用双击缩放
     */
    detectMobile() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            // 移动端优化：降低蛇的初始速度，提升操控性
            this.snake.speed = Game.CONFIG.MOBILE_INITIAL_SPEED;
            
            // 禁用双击缩放
            document.addEventListener('touchstart', function(e) {
                if (e.touches.length > 1) {
                    e.preventDefault();
                }
            }, {passive: false});
            
            let lastTouchEnd = 0;
            document.addEventListener('touchend', function(e) {
                const now = Date.now();
                if (now - lastTouchEnd <= 300) {
                    e.preventDefault();
                }
                lastTouchEnd = now;
            }, {passive: false});
        }
    }

    /**
     * 处理触摸开始事件（移动端）
     * 处理虚拟摇杆、加速按钮、画布按钮的触摸
     * @param {TouchEvent} e - 触摸事件对象
     */
    handleTouchStart(e) {
        // 阻止默认行为
        e.preventDefault();
        
        // 如果死亡动画正在播放，忽略所有触摸事件
        if (this.isDeathAnimating) {
            return;
        }
        
        // 检测是否为横屏模式
        const isLandscape = window.innerWidth > window.innerHeight;
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // 横屏模式下处理虚拟摇杆和按钮
        if (isLandscape && isMobile) {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            
            for (let i = 0; i < e.touches.length; i++) {
                const touch = e.touches[i];
                const x = (touch.clientX - rect.left) * scaleX;
                const y = (touch.clientY - rect.top) * scaleY;
                
                // 检查是否点击音效开关按钮（在开始按钮左侧）
                const btnCfg = Game.CONFIG.CANVAS_BUTTON;
                const audioX = this.canvas.width - btnCfg.X_OFFSET - 40;
                const audioY = btnCfg.Y;
                const audioSize = 32;
                
                if (x >= audioX && x <= audioX + audioSize && y >= audioY && y <= audioY + audioSize) {
                    // 点击了音效按钮，切换音效状态
                    const isEnabled = this.audio.toggle();
                    if (isEnabled) {
                        this.audio.playButtonClick();
                    }
                    return;
                }
                
                // 检查是否点击开始/结束按钮
                const btnX = this.canvas.width - btnCfg.X_OFFSET;
                const btnY = btnCfg.Y;
                const btnW = btnCfg.WIDTH;
                const btnH = btnCfg.HEIGHT;
                
                if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
                    // 点击了按钮，标记按钮被触摸，防止重复触发
                    this.canvasButtonTouched = true;
                    this.handleGameButton();
                    return;
                }
                
                // 检查是否点击方向盘区域
                const wheel = this.steeringWheel;
                const wheelDist = Math.sqrt(Math.pow(x - wheel.centerX, 2) + Math.pow(y - wheel.centerY, 2));
                const swCfg = Game.CONFIG.STEERING_WHEEL;
                
                if (wheelDist <= wheel.radius + swCfg.TOUCH_TOLERANCE) {
                    // 激活方向盘
                    wheel.active = true;
                    wheel.touchId = touch.identifier;
                    this.updateSteeringWheel(x, y);
                    
                    // 如果游戏未运行且不在死亡动画中，开始游戏
                    if (this.state !== Game.STATE.PLAYING && !this.isDeathAnimating) {
                        this.start();
                    }
                    return;
                }
                
                // 检查是否点击加速按钮区域
                const boost = this.boostButton;
                const boostDist = Math.sqrt(Math.pow(x - boost.centerX, 2) + Math.pow(y - boost.centerY, 2));
                const bbCfg = Game.CONFIG.BOOST_BUTTON;
                
                if (boostDist <= boost.radius + bbCfg.TOUCH_TOLERANCE) {
                    // 激活加速按钮
                    boost.active = true;
                    boost.touchId = touch.identifier;
                    this.isBoosting = true;
                    this.snake.speed = this.baseSpeed * this.boostMultiplier;
                    
                    // 振动反馈
                    this.vibrate(20);
                    
                    // 如果游戏未运行且不在死亡动画中，开始游戏
                    if (this.state !== Game.STATE.PLAYING && !this.isDeathAnimating) {
                        this.start();
                    }
                    return;
                }
            }
        }
        
        // 记录触摸起始位置（用于滑动控制）
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
        
        // 非横屏模式下，点击屏幕开始游戏
        if (this.state !== Game.STATE.PLAYING && !(isLandscape && isMobile) && !this.isDeathAnimating) {
            this.start();
            // 立即处理触摸位置
            this.handleTouchMove(e);
        }
    }
    
    /**
     * 更新方向盘角度 - 优化版，更丝滑的控制
     * 使用角度差平滑过渡，避免方向突变
     * @param {number} x - 触摸X坐标
     * @param {number} y - 触摸Y坐标
     */
    updateSteeringWheel(x, y) {
        const wheel = this.steeringWheel;
        const dx = x - wheel.centerX;
        const dy = y - wheel.centerY;

        // 计算手指距离中心的距离
        const distance = Math.sqrt(dx * dx + dy * dy);
        wheel.stickDistance = Math.min(distance, wheel.radius);

        // 计算手指相对于方向盘中心的角度
        const angle = Math.atan2(dy, dx);
        
        // 使用平滑过渡更新角度，避免突变
        let angleDiff = angle - wheel.currentAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        // 角度平滑系数 - 让摇杆转动更丝滑
        wheel.currentAngle += angleDiff * 0.3;

        // 根据方向盘角度直接设置蛇的目标方向
        if (this.state === Game.STATE.PLAYING) {
            // 使用较远的距离表示这是直接方向控制（非跟随模式）
            const targetDist = 300;
            this.snake.setTarget(
                this.snake.body[0].x + Math.cos(wheel.currentAngle) * targetDist,
                this.snake.body[0].y + Math.sin(wheel.currentAngle) * targetDist
            );
        }
    }
    
    /**
     * 处理画布点击事件（横屏模式按钮）
     * @param {MouseEvent} e - 鼠标事件对象
     */
    handleCanvasClick(e) {
        this.checkUIButtonClick(e.clientX, e.clientY);
    }
    
    /**
     * 处理画布触摸结束事件
     * 释放方向盘和加速按钮，恢复速度
     * @param {TouchEvent} e - 触摸事件对象
     */
    handleCanvasTouch(e) {
        e.preventDefault();
        
        // 检测是否为横屏模式
        const isLandscape = window.innerWidth > window.innerHeight;
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // 重置按钮触摸标记
        this.canvasButtonTouched = false;
        
        // 处理方向盘释放
        if (isLandscape && isMobile && this.steeringWheel.active) {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this.steeringWheel.touchId) {
                    // 释放方向盘（保持当前角度，不重置）
                    this.steeringWheel.active = false;
                    this.steeringWheel.touchId = null;
                    this.steeringWheel.stickDistance = 0;
                    // 蛇会自动停止移动，因为 update() 会检查摇杆状态
                    return;
                }
            }
        }
        
        // 处理加速按钮释放
        if (isLandscape && isMobile && this.boostButton.active) {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this.boostButton.touchId) {
                    // 释放加速按钮
                    this.boostButton.active = false;
                    this.boostButton.touchId = null;
                    this.isBoosting = false;
                    this.restoreSpeed();  // 使用安全恢复速度方法
                    return;
                }
            }
        }
    }
    
    /**
     * 检查是否点击了UI按钮
     * 处理音效按钮和开始/暂停按钮的点击
     * @param {number} clientX - 点击的屏幕X坐标
     * @param {number} clientY - 点击的屏幕Y坐标
     */
    checkUIButtonClick(clientX, clientY) {
        // 检测是否为横屏模式
        const isLandscape = window.innerWidth > window.innerHeight;
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (!isLandscape || !isMobile) return;
        
        // 如果按钮已经被触摸处理过，不再响应点击
        if (this.canvasButtonTouched) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;
        
        // 检查是否点击音效开关按钮（在开始按钮左侧）
        const btnCfg = Game.CONFIG.CANVAS_BUTTON;
        const audioX = this.canvas.width - btnCfg.X_OFFSET - 40;
        const audioY = btnCfg.Y;
        const audioSize = 32;
        
        if (x >= audioX && x <= audioX + audioSize && y >= audioY && y <= audioY + audioSize) {
            // 点击了音效按钮，切换音效状态
            const isEnabled = this.audio.toggle();
            // 播放按钮点击音效（如果开启）
            if (isEnabled) {
                this.audio.playButtonClick();
            }
            return;
        }
        
        // 检查是否点击开始/结束按钮
        const btnX = this.canvas.width - btnCfg.X_OFFSET;
        const btnY = btnCfg.Y;
        const btnW = btnCfg.WIDTH;
        const btnH = btnCfg.HEIGHT;
        
        if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
            // 点击了按钮，执行相应操作
            this.handleGameButton();
        }
    }

    /**
     * 处理鼠标移动事件（桌面端）
     * 鼠标位置控制蛇的移动方向
     * @param {MouseEvent} e - 鼠标事件对象
     */
    handleMouseMove(e) {
        // 只有在游戏运行且未暂停时才响应
        if (this.state !== Game.STATE.PLAYING) return;
        
        // 获取Canvas相对于视口的位置
        const rect = this.canvas.getBoundingClientRect();
        // 计算鼠标在Canvas内的坐标
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // 设置蛇的目标位置
        this.snake.setTarget(x, y);
    }

    /**
     * 处理触摸移动事件（移动设备支持）
     * 横屏模式下处理方向盘和加速按钮，非横屏模式使用滑动控制
     * @param {TouchEvent} e - 触摸事件对象
     */
    handleTouchMove(e) {
        // 阻止默认行为（防止页面滚动）
        e.preventDefault();
        
        // 检测是否为横屏模式
        const isLandscape = window.innerWidth > window.innerHeight;
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // 横屏模式下处理方向盘和加速按钮
        if (isLandscape && isMobile) {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            
            // 处理方向盘触摸点
            if (this.steeringWheel.active) {
                for (let i = 0; i < e.touches.length; i++) {
                    const touch = e.touches[i];
                    if (touch.identifier === this.steeringWheel.touchId) {
                        const x = (touch.clientX - rect.left) * scaleX;
                        const y = (touch.clientY - rect.top) * scaleY;
                        this.updateSteeringWheel(x, y);
                        break;
                    }
                }
            }
            
            // 处理加速按钮触摸点（检查是否移出按钮区域）
            if (this.boostButton.active) {
                let boostStillActive = false;
                for (let i = 0; i < e.touches.length; i++) {
                    const touch = e.touches[i];
                    if (touch.identifier === this.boostButton.touchId) {
                        const x = (touch.clientX - rect.left) * scaleX;
                        const y = (touch.clientY - rect.top) * scaleY;
                        const dist = Math.sqrt(Math.pow(x - this.boostButton.centerX, 2) + Math.pow(y - this.boostButton.centerY, 2));
                        const bbCfg = Game.CONFIG.BOOST_BUTTON;
                        if (dist <= this.boostButton.radius + bbCfg.TOUCH_TOLERANCE) {
                            boostStillActive = true;
                        }
                        break;
                    }
                }
                // 如果手指移出按钮区域，取消加速
                if (!boostStillActive) {
                    this.boostButton.active = false;
                    this.boostButton.touchId = null;
                    this.isBoosting = false;
                    this.restoreSpeed();  // 使用安全恢复速度方法
                }
            }
            
            return;
        }
        
        // 非横屏模式或摇杆未激活，使用触摸滑动控制
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        const x = (touch.clientX - rect.left) * scaleX;
        const y = (touch.clientY - rect.top) * scaleY;
        
        // 设置蛇的目标位置
        this.snake.setTarget(x, y);
    }

    /**
     * 处理键盘按键事件
     * 空格键暂停/继续游戏
     * @param {KeyboardEvent} e - 键盘事件对象
     */
    handleKeydown(e) {
        // 空格键暂停/继续
        if (e.key === ' ' && this.state === Game.STATE.PLAYING) {
            e.preventDefault();  // 阻止默认行为（页面滚动）
            this.togglePause();
        }
    }

    /**
     * 处理游戏主按钮点击
     * 根据游戏状态自动切换：开始/结束
     */
    handleGameButton() {
        // 播放按钮音效
        this.audio.playButtonClick();
        
        if (this.state !== Game.STATE.PLAYING) {
            // 游戏未开始，开始游戏
            this.start();
        } else {
            // 游戏进行中，结束游戏
            this.gameOver();
        }
    }
    
    /**
     * 更新游戏按钮状态
     * 根据游戏状态更新按钮文字
     */
    updateGameButton() {
        const btn = document.getElementById('gameBtn');
        
        if (this.state !== Game.STATE.PLAYING) {
            btn.textContent = '开始游戏';
            btn.disabled = false;
        } else {
            // 游戏进行中显示结束按钮
            btn.textContent = '结束游戏';
            btn.disabled = false;
        }
    }
    
    /**
     * 开始游戏
     * 初始化游戏状态、重置蛇位置、生成食物、启动游戏循环
     * 横屏模式下自动进入全屏以获得最佳游戏体验
     */
    start() {
        // 如果游戏已在运行，直接返回
        if (this.state === Game.STATE.PLAYING) return;
        
        // 检测是否为横屏模式
        const isLandscape = window.innerWidth > window.innerHeight;
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // ========== 全屏模式处理 ==========
        // 横屏移动设备自动进入全屏，获得最佳游戏体验
        if (isLandscape && isMobile && Game.CONFIG.FULLSCREEN.AUTO_ENTER_ON_LANDSCAPE) {
            // 尝试进入全屏并锁定横屏方向
            this.enterFullscreen().then(success => {
                if (success) {
                    console.log('[Game] 已进入全屏模式');
                    this.lockLandscape();
                } else if (this.isWechat()) {
                    // 微信内置浏览器可能不支持全屏API，提示用户
                    console.log('[Game] 微信内置浏览器，尝试备用方案');
                    // 微信下使用CSS模拟全屏效果
                    document.body.classList.add('wechat-fullscreen');
                }
            });
            
            // 更新画布尺寸为全屏
            if (this.canvas.width !== window.innerWidth || this.canvas.height !== window.innerHeight) {
                this.canvas.width = window.innerWidth;
                this.canvas.height = window.innerHeight;
                this.food.canvasWidth = window.innerWidth;
                this.food.canvasHeight = window.innerHeight;
                this.offscreenRenderer.setSize(window.innerWidth, window.innerHeight);
                
                // 更新控制元素位置
                const swCfg = Game.CONFIG.STEERING_WHEEL;
                const bbCfg = Game.CONFIG.BOOST_BUTTON;
                this.steeringWheel.centerX = swCfg.CENTER_X;
                this.steeringWheel.centerY = window.innerHeight - swCfg.CENTER_Y_OFFSET;
                this.boostButton.centerX = window.innerWidth - bbCfg.CENTER_X_OFFSET;
                this.boostButton.centerY = window.innerHeight - bbCfg.CENTER_Y_OFFSET;
            }
        }
        
        // 设置游戏状态
        this.setState(Game.STATE.PLAYING);
        
        // 记录游戏开始时间
        this.gameStartTime = Date.now();
        this.maxCombo = 0;
        
        // 更新按钮状态
        this.updateGameButton();
        
        // 重置蛇到画布中央
        this.snake.reset();
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // 重新设置蛇身所有节点的位置（以画布中央为基准）
        // 使用 segmentDistance (8像素) 作为节点间距，与蛇移动时的间距保持一致
        for (let i = 0; i < this.snake.body.length; i++) {
            this.snake.body[i].x = centerX - i * this.snake.segmentDistance;
            this.snake.body[i].y = centerY;
        }
        
        // 设置初始目标位置（右侧）
        this.snake.setTarget(this.canvas.width, centerY);

        // 初始化食物（传入横屏模式参数以避让UI区域）
        this.food.reset(this.isLandscapeMode());

        // 启动游戏循环
        this.gameLoop = requestAnimationFrame(() => this.loop());
    }

    /**
     * 切换暂停/继续状态
     * 空格键触发，暂停时停止游戏循环
     */
    togglePause() {
        // 如果游戏未运行，直接返回
        if (this.state !== Game.STATE.PLAYING && this.state !== Game.STATE.PAUSED) return;
        
        // 切换暂停状态
        const newState = this.state === Game.STATE.PAUSED ? Game.STATE.PLAYING : Game.STATE.PAUSED;
        this.setState(newState);
        
        // 更新按钮状态
        this.updateGameButton();
        
        // 如果继续游戏，重新启动游戏循环
        if (this.state === Game.STATE.PLAYING) {
            this.gameLoop = requestAnimationFrame(() => this.loop());
        }
    }

    /**
     * 游戏主循环
     * 使用 requestAnimationFrame 实现平滑动画
     * 每帧执行：更新逻辑 -> 渲染画面
     */
    loop() {
        // 如果游戏未运行或已暂停，停止循环
        if (this.state !== Game.STATE.PLAYING) return;
        
        // 更新游戏逻辑
        this.update();
        // 渲染画面
        this.draw();
        
        // 请求下一帧
        this.gameLoop = requestAnimationFrame(() => this.loop());
    }

    /**
     * 更新游戏逻辑
     * 处理蛇的移动、碰撞检测、食物检测和得分计算
     * 
     * 主要流程：
     * 1. 检测横屏模式下的转圈/正常模式切换
     * 2. 更新蛇的位置（正常移动或转圈）
     * 3. 碰撞检测（撞墙死亡，穿墙/无敌/转圈模式可穿墙）
     * 4. 食物检测和效果应用
     * 5. 粒子、特效更新
     * 6. 连击检测和速度调整
     */
    update() {
        // 检测是否为横屏模式
        const isLandscape = window.innerWidth > window.innerHeight;
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // 横屏模式下，松开摇杆后蛇会转圈
        if (isLandscape && isMobile && !this.steeringWheel.active) {
            // 松开摇杆，蛇在当前位置转圈（自动旋转）
            this.snake.autoRotate = true;
        } else {
            this.snake.autoRotate = false;
        }
        
        // 更新蛇的位置
        this.snake.update();
        
        // ===== 碰撞检测 =====
        // 检测是否撞墙或撞到自己（无敌模式下无视所有碰撞，穿墙模式下只无视墙壁碰撞）
        const hitWall = this.snake.checkWallCollision(this.canvas.width, this.canvas.height);
        const hitSelf = this.snake.checkSelfCollision();
        
        // 处理穿墙效果（无敌模式或穿墙模式）
        const head = this.snake.body[0];
        const radius = this.gridSize / 2;
        
        // 处理穿墙效果（无敌模式或穿墙模式）
        // 注意：转圈模式下蛇在固定小圆上移动，不会撞墙，所以不需要处理
        if (this.activeEffects.invincible || this.activeEffects.ghost) {
            // 流畅的穿墙：在边界外一定范围内就进行位置映射，避免卡顿感
            const wrapMargin = radius * 2; // 穿墙边距
            let wrapX = 0; // X方向包裹偏移量
            let wrapY = 0; // Y方向包裹偏移量
            
            // 水平方向穿墙
            if (head.x < -wrapMargin) {
                wrapX = this.canvas.width + wrapMargin * 2;
            } else if (head.x > this.canvas.width + wrapMargin) {
                wrapX = -(this.canvas.width + wrapMargin * 2);
            }
            
            // 垂直方向穿墙
            if (head.y < -wrapMargin) {
                wrapY = this.canvas.height + wrapMargin * 2;
            } else if (head.y > this.canvas.height + wrapMargin) {
                wrapY = -(this.canvas.height + wrapMargin * 2);
            }
            
            // 应用包裹偏移到蛇头和所有身体节点
            if (wrapX !== 0 || wrapY !== 0) {
                for (let i = 0; i < this.snake.body.length; i++) {
                    this.snake.body[i].x += wrapX;
                    this.snake.body[i].y += wrapY;
                }
            }
        } else if (hitWall) {
            // 只检测撞墙，撞到自己不会死亡
            this.gameOver();
            return;
        }
        // 注意：hitSelf（撞到自己）不再触发游戏结束
        
        // ===== 食物检测 =====
        // 检查是否吃到任意食物
        const eatenFood = this.food.checkAndGetEatenFood(this.snake.body[0], this.gridSize / 2);

        if (eatenFood) {
            const foodType = eatenFood.type;
            const foodPos = eatenFood.position;

            // 蛇生长（如果未达到最大长度限制）
            if (this.snake.body.length < Game.CONFIG.SNAKE.MAX_LENGTH) {
                this.snake.growUp();
            } else {
                // 达到最大长度，显示提示
                this.effects.createFloatingText(
                    this.snake.body[0].x,
                    this.snake.body[0].y - 60,
                    'MAX!',
                    '#ffd700'
                );
            }
            // 增加得分（双倍分数效果）
            let points = foodType.score;
            if (this.activeEffects.double) {
                points *= 2;
            }
            this.score += points;
            
            // 触发分数弹跳动画
            this.triggerScoreAnimation(points);
            
            // 振动反馈（根据食物类型）
            if (foodType.effect === 'bonus') {
                this.vibrateScene('eatBonus');
                this.audio.playEatBonus();
            } else {
                this.vibrateScene('eatFood');
                this.audio.playEatFood();
            }

            // 创建爆炸特效
            this.effects.createExplosion(foodPos.x, foodPos.y, foodType.color, 15);
            
            // 创建得分飘字
            this.effects.createFloatingText(foodPos.x, foodPos.y - 20, `+${foodType.score}`, '#ffd700');

            // 连击检测
            const currentTime = Date.now();
            if (currentTime - this.lastEatTime < Game.CONFIG.COMBO_TIME_WINDOW) {
                this.comboCount++;
                if (this.comboCount >= 2) {
                    this.effects.createComboText(this.canvas.width / 2, this.canvas.height / 3, this.comboCount);
                }
            } else {
                this.comboCount = 1;
            }
            this.lastEatTime = currentTime;

            // 应用食物效果
            this.applyFoodEffect(foodType.effect);

            // 每得100分增加速度
            const cfg = Game.CONFIG;
            if (this.score % cfg.SCORE_LEVEL_STEP === 0) {
                const level = Math.floor(this.score / cfg.SCORE_LEVEL_STEP) + 1;
                this.baseSpeed = Math.min(3 + Math.pow(level, 0.5) * cfg.SPEED_INCREMENT_PER_LEVEL, cfg.MAX_SPEED);
                // 应用当前速度状态（加速效果或手动加速）
                if (this.activeEffects.speed) {
                    this.snake.speed = this.baseSpeed * cfg.EFFECT_MULTIPLIER.SPEED;
                } else if (this.isBoosting) {
                    this.snake.speed = this.baseSpeed * this.boostMultiplier;
                } else {
                    this.snake.speed = this.baseSpeed;
                }
            }

            // 补充新食物（带生成特效，传递蛇头信息以避免在前方生成）
            const head = this.snake.body[0];
            this.food.spawn(this.snake.body, this.isLandscapeMode(), {
                x: head.x,
                y: head.y,
                angle: this.snake.angle
            });
            // 为新食物添加生成特效
            const newFoods = this.food.getFoods();
            if (newFoods.length > 0) {
                const latestFood = newFoods[newFoods.length - 1];
                this.effects.createFoodSpawn(latestFood.position.x, latestFood.position.y, latestFood.type.color);
            }
        }
        
        // 更新粒子
        this.updateParticles();
        
        // 更新WebGL粒子
        if (this.webglParticles && this.webglParticles.initialized) {
            this.webglParticles.update(16);
        }
        
        // 更新特效
        this.effects.update();
        
        // 更新食物（处理过期）
        const expiredFoods = this.food.update();
        // 为过期食物创建消失特效
        for (const food of expiredFoods) {
            this.effects.createFoodExpireEffect(food.position.x, food.position.y, food.type.color);
        }
        // 补充过期食物
        if (expiredFoods.length > 0) {
            const head = this.snake.body[0];
            this.food.spawn(this.snake.body, this.isLandscapeMode(), {
                x: head.x,
                y: head.y,
                angle: this.snake.angle
            });
        }
        
        // 添加拖尾效果（当加速时）
        if (this.isBoosting || this.activeEffects.speed) {
            const head = this.snake.body[0];
            this.effects.addTrailPoint(head.x, head.y, '#4ecdc4');
        }
    }
    
    /**
     * 恢复蛇的速度（考虑各种速度效果的状态）
     * 用于效果结束时安全地恢复速度，避免效果冲突
     * 优先级：加速效果 > 减速效果 > 手动加速 > 基础速度
     */
    restoreSpeed() {
        const cfg = Game.CONFIG;
        if (this.activeEffects.speed) {
            this.snake.speed = this.baseSpeed * cfg.EFFECT_MULTIPLIER.SPEED;
        } else if (this.activeEffects.slow) {
            this.snake.speed = this.baseSpeed * cfg.EFFECT_MULTIPLIER.SLOW;
        } else if (this.isBoosting) {
            this.snake.speed = this.baseSpeed * this.boostMultiplier;
        } else {
            this.snake.speed = this.baseSpeed;
        }
    }

    /**
     * 应用食物效果
     * 根据效果类型应用不同的游戏效果
     * @param {string} effect - 效果类型，可选值：
     *   - 'speed': 加速效果
     *   - 'invincible': 无敌效果
     *   - 'bonus': 奖励效果（额外加分）
     *   - 'slow': 减速效果
     *   - 'shrink': 缩小效果（缩短蛇身）
     *   - 'ghost': 穿墙模式
     *   - 'double': 双倍分数
     */
    applyFoodEffect(effect) {
        const cfg = Game.CONFIG;
        switch(effect) {
            case 'speed':
                // 加速效果
                this.activeEffects.speed = true;
                this.snake.speed = this.baseSpeed * cfg.EFFECT_MULTIPLIER.SPEED;
                // 播放加速音效
                this.audio.playSpeedUp();
                // 创建加速提示
                this.effects.createFloatingText(
                    this.snake.body[0].x,
                    this.snake.body[0].y - 40,
                    '⚡ 加速!',
                    '#feca57'
                );
                if (this.effectTimers.speed) clearTimeout(this.effectTimers.speed);
                this.effectTimers.speed = setTimeout(() => {
                    this.activeEffects.speed = false;
                    this.restoreSpeed();  // 使用安全恢复速度方法
                }, cfg.EFFECT_DURATION.SPEED);
                break;
                
            case 'invincible':
                // 无敌效果
                this.activeEffects.invincible = true;
                if (this.effectTimers.invincible) clearTimeout(this.effectTimers.invincible);
                this.effectTimers.invincible = setTimeout(() => {
                    this.activeEffects.invincible = false;
                }, cfg.EFFECT_DURATION.INVINCIBLE);
                break;
                
            case 'bonus':
                // bonus食物额外加分已在得分中体现
                break;
                
            case 'slow':
                // 减速效果
                this.activeEffects.slow = true;
                this.snake.speed = this.baseSpeed * cfg.EFFECT_MULTIPLIER.SLOW;
                // 创建减速提示
                this.effects.createFloatingText(
                    this.snake.body[0].x,
                    this.snake.body[0].y - 40,
                    '🐢 减速!',
                    '#48dbfb'
                );
                if (this.effectTimers.slow) clearTimeout(this.effectTimers.slow);
                this.effectTimers.slow = setTimeout(() => {
                    this.activeEffects.slow = false;
                    this.restoreSpeed();  // 使用安全恢复速度方法
                }, cfg.EFFECT_DURATION.SLOW);
                break;
                
            case 'shrink':
                // 缩小效果：蛇身缩短30%，并将节点回收到对象池
                const shrinkAmount = Math.floor(this.snake.body.length * 0.3);
                if (this.snake.body.length > 5) {
                    for (let i = 0; i < shrinkAmount && this.snake.body.length > 5; i++) {
                        const removedNode = this.snake.body.pop();
                        this.snake.recycleNodeToPool(removedNode);
                    }
                    // 创建缩小提示
                    this.effects.createFloatingText(
                        this.snake.body[0].x, 
                        this.snake.body[0].y - 40, 
                        '📉 缩小!', 
                        '#1dd1a1'
                    );
                }
                break;
                
            case 'ghost':
                // 穿墙模式
                this.activeEffects.ghost = true;
                // 播放穿墙音效
                this.audio.playGhost();
                // 创建穿墙提示
                this.effects.createFloatingText(
                    this.snake.body[0].x, 
                    this.snake.body[0].y - 40, 
                    '👻 穿墙!', 
                    '#ff9ff3'
                );
                if (this.effectTimers.ghost) clearTimeout(this.effectTimers.ghost);
                this.effectTimers.ghost = setTimeout(() => {
                    this.activeEffects.ghost = false;
                }, cfg.EFFECT_DURATION.GHOST);
                break;
                
            case 'double':
                // 双倍分数
                this.activeEffects.double = true;
                // 创建双倍提示
                this.effects.createFloatingText(
                    this.snake.body[0].x, 
                    this.snake.body[0].y - 40, 
                    '✨ 双倍!', 
                    '#f368e0'
                );
                if (this.effectTimers.double) clearTimeout(this.effectTimers.double);
                this.effectTimers.double = setTimeout(() => {
                    this.activeEffects.double = false;
                }, cfg.EFFECT_DURATION.DOUBLE);
                break;
        }
    }

    /**
     * 创建粒子效果
     * 在指定位置创建12个向四周扩散的粒子
     * @param {number} x - 粒子中心X坐标
     * @param {number} y - 粒子中心Y坐标
     * @param {string} color - 粒子颜色
     */
    createParticles(x, y, color) {
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 * i) / 12;
            const speed = 2 + Math.random() * 3;
            // 使用对象池获取粒子
            const particle = this.offscreenRenderer.getParticleFromPool();
            particle.x = x;
            particle.y = y;
            particle.vx = Math.cos(angle) * speed;
            particle.vy = Math.sin(angle) * speed;
            particle.life = 1.0;
            particle.decay = 0.02 + Math.random() * 0.02;
            particle.color = color;
            particle.size = 3 + Math.random() * 3;
            this.particles.push(particle);
        }
    }
    
    /**
     * 更新粒子状态
     * 更新所有粒子的位置、生命值和大小
     * 死亡粒子归还到对象池
     */
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;
            p.size *= 0.98;
            
            if (p.life <= 0) {
                // 归还粒子到对象池
                const removedParticle = this.particles.splice(i, 1)[0];
                this.offscreenRenderer.returnParticleToPool(removedParticle);
            }
        }
    }
    
    /**
     * 绘制Canvas 2D粒子
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D渲染上下文
     */
    drawParticles(ctx) {
        for (const p of this.particles) {
            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
    
    /**
     * 绘制游戏画面
     * 按顺序绘制所有游戏元素
     * 
     * 绘制顺序：
     * 1. 动态背景（星空+粒子）
     * 2. 游戏对象（特效->食物->蛇->粒子）
     * 3. 横屏模式UI（摇杆、按钮、分数）
     * 4. 暂停界面（如需要）
     */
    draw() {
        // ===== 绘制动态背景 =====
        this.drawDynamicBackground();
        
        // ===== 绘制游戏对象（仅在游戏开始后才绘制）=====
        if (this.state === Game.STATE.PLAYING) {
            // 绘制拖尾效果（在蛇身下面）
            this.effects.draw(this.ctx);
            
            this.food.draw(this.ctx);   // 绘制食物
            // 绘制蛇（传入无敌状态、波浪相位和画布尺寸，实现波浪动画和跨边界丝滑绘制）
            this.snake.draw(this.ctx, this.activeEffects.invincible, this.wavePhase, this.canvas.width, this.canvas.height);
            this.drawParticles(this.ctx);  // 绘制Canvas 2D粒子效果
            
            // 绘制WebGL粒子效果（如果可用）
            if (this.webglParticles && this.webglParticles.initialized) {
                this.webglParticles.render(this.canvas.width, this.canvas.height);
            }
        }
        
        // ===== 绘制效果指示器（非横屏模式也需要）=====
        if (this.state === Game.STATE.PLAYING) {
            this.drawActiveEffects();
        }
        
        // ===== 横屏模式下在画布内绘制其他UI =====
        this.drawCanvasUI();
        
        // ===== 绘制暂停界面 =====
        if (this.state === Game.STATE.PAUSED) {
            // 半透明遮罩
            this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            // 暂停文字
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 40px Microsoft YaHei';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('暂 停', this.canvas.width/2, this.canvas.height/2);
        }
        
        // 更新动画相位
        this.wavePhase += 0.1;
        this.backgroundOffset += Game.CONFIG.BACKGROUND.STAR_SPEED;
    }
    
    /**
     * 绘制动态背景（星空+粒子效果）
     * 使用离屏渲染器优化性能
     */
    drawDynamicBackground() {
        // 使用离屏渲染器绘制背景和星星
        this.offscreenRenderer.drawDynamicBackground(this.ctx, this.backgroundOffset);
        
        // 绘制动态背景粒子（仍需每帧更新）
        this.drawBackgroundParticles();
    }
    
    /**
     * 绘制背景粒子（流动效果）
     * 使用噪声模拟自然流动路径
     * 粒子具有大小和透明度的脉冲变化
     */
    drawBackgroundParticles() {
        const cfg = Game.CONFIG.BACKGROUND;
        const time = Date.now() * 0.0005; // 减慢时间流速
        
        this.ctx.save();
        for (let i = 0; i < cfg.PARTICLE_COUNT; i++) {
            // 为每个粒子生成唯一的随机种子
            const seed = i * 123.456;
            
            // 基础位置 - 随机分布在画布上
            const baseX = (Math.sin(seed) * 43758.5453 % 1 + 1) % 1 * this.canvas.width;
            const baseY = (Math.cos(seed * 1.5) * 23421.631 % 1 + 1) % 1 * this.canvas.height;
            
            // 流动路径 - 使用噪声模拟自然流动
            const flowScale = 0.0005;
            const flowX = Math.sin(baseY * flowScale + time + i) * 30;
            const flowY = Math.cos(baseX * flowScale + time * 0.7 + i * 0.5) * 20;
            
            const x = baseX + flowX;
            const y = baseY + flowY;
            
            // 粒子大小随时间变化
            const sizePulse = Math.sin(time * 2 + i * 0.3) * 0.5 + 1;
            const size = (0.5 + (i % 4) * 0.3) * sizePulse;
            
            // 粒子透明度随时间变化
            const alphaBase = 0.05 + (i % 5) * 0.02;
            const alphaPulse = Math.sin(time * 0.5 + i) * 0.03;
            const alpha = Math.max(0, alphaBase + alphaPulse);
            
            // 粒子颜色 - 蓝紫色调变化
            const hue = 220 + (i % 40);
            this.ctx.fillStyle = `rgba(${100 + (i % 50)}, ${150 + (i % 80)}, 255, ${alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 添加微弱的发光效果
            if (i % 3 === 0) {
                this.ctx.fillStyle = `rgba(150, 180, 255, ${alpha * 0.3})`;
                this.ctx.beginPath();
                this.ctx.arc(x, y, size * 2, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        this.ctx.restore();
    }
    
    /**
     * 在画布内绘制UI（得分和按钮）- 横屏模式使用
     * 绘制左上角分数面板、右上角按钮、左下角摇杆、右下角加速按钮
     */
    drawCanvasUI() {
        // 检测是否为横屏模式
        const isLandscape = window.innerWidth > window.innerHeight;
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (!isLandscape || !isMobile) return;
        
        this.ctx.save();
        
        // 定义圆角矩形绘制函数
        const drawRoundRect = (x, y, w, h, r) => {
            this.ctx.beginPath();
            this.ctx.moveTo(x + r, y);
            this.ctx.lineTo(x + w - r, y);
            this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
            this.ctx.lineTo(x + w, y + h - r);
            this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            this.ctx.lineTo(x + r, y + h);
            this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
            this.ctx.lineTo(x, y + r);
            this.ctx.quadraticCurveTo(x, y, x + r, y);
            this.ctx.closePath();
        };
        
        // ===== 左上角：标题 + 得分 =====
        const uiX = 12;
        const uiY = 12;
        const uiW = 200;
        const uiH = 32;
        
        // 背景 - 半透明深色
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        drawRoundRect(uiX, uiY, uiW, uiH, 16);
        this.ctx.fill();
        
        // 边框
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;
        drawRoundRect(uiX, uiY, uiW, uiH, 16);
        this.ctx.stroke();
        
        // 标题
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 13px Microsoft YaHei';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('🐍 贪吃蛇', uiX + 10, uiY + uiH/2);
        
        // 得分和最高分 - 同一排
        this.ctx.font = '11px Microsoft YaHei';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.fillText('得分:', uiX + 82, uiY + uiH/2);
        this.ctx.fillText('最高:', uiX + 132, uiY + uiH/2);
        
        // 分数 - 金色
        this.ctx.fillStyle = '#ffd700';
        this.ctx.font = 'bold 12px Microsoft YaHei';
        this.ctx.fillText(this.score, uiX + 112, uiY + uiH/2);
        this.ctx.fillText(this.highScore, uiX + 162, uiY + uiH/2);
        
        // ===== 右上角：音效开关 + 开始/结束按钮 =====
        const btnCfg = Game.CONFIG.CANVAS_BUTTON;
        
        // 音效开关按钮（在开始按钮左侧）
        // 使用 🔊（开启）或 🔇（静音）
        const audioIcon = this.audio.enabled ? '🔊' : '🔇';
        const audioX = this.canvas.width - btnCfg.X_OFFSET - 40;
        const audioY = btnCfg.Y;
        const audioSize = 32;
        
        // 音效按钮背景
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        this.ctx.beginPath();
        this.ctx.roundRect(audioX, audioY, audioSize, audioSize, 10);
        this.ctx.fill();
        
        // 音效按钮边框
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.roundRect(audioX, audioY, audioSize, audioSize, 10);
        this.ctx.stroke();
        
        // 音效图标
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(audioIcon, audioX + audioSize/2, audioY + audioSize/2 + 1);
        
        // 开始/结束按钮
        const btnText = this.state !== Game.STATE.PLAYING ? '开始' : '结束';
        const btnX = this.canvas.width - btnCfg.X_OFFSET;
        const btnY = btnCfg.Y;
        const btnW = btnCfg.WIDTH;
        const btnH = btnCfg.HEIGHT;
        
        // 按钮阴影
        this.ctx.shadowColor = 'rgba(99, 102, 241, 0.5)';
        this.ctx.shadowBlur = 12;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 3;
        
        // 按钮背景 - 紫粉渐变
        const btnGradient = this.ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY + btnH);
        btnGradient.addColorStop(0, '#818cf8');
        btnGradient.addColorStop(0.5, '#c084fc');
        btnGradient.addColorStop(1, '#f472b6');
        this.ctx.fillStyle = btnGradient;
        drawRoundRect(btnX, btnY, btnW, btnH, btnCfg.CORNER_RADIUS);
        this.ctx.fill();
        
        // 重置阴影
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetY = 0;
        
        // 按钮内发光边框
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 1.5;
        drawRoundRect(btnX, btnY, btnW, btnH, btnCfg.CORNER_RADIUS);
        this.ctx.stroke();
        
        // 按钮文字
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 12px Microsoft YaHei';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(btnText, btnX + btnW/2, btnY + btnH/2 + 1);
        
        // ===== 左下角：方向盘 =====
        this.drawSteeringWheel();
        
        // ===== 右下角：加速按钮 =====
        this.drawBoostButton();
        
        // ===== 底部中间：操作提示文字 =====
        if (this.state === Game.STATE.PLAYING) {
            this.drawControlHint();
        }
        
        this.ctx.restore();
    }
    
    /**
     * 绘制激活的食物效果指示器（带脉冲动画）
     * 在屏幕顶部显示当前激活的效果
     */
    drawActiveEffects() {
        const effects = [];
        
        // 收集激活的效果
        if (this.activeEffects.speed) effects.push({ name: '加速', color: '#feca57' });
        if (this.activeEffects.invincible) effects.push({ name: '无敌', color: '#54a0ff' });
        if (this.activeEffects.slow) effects.push({ name: '减速', color: '#48dbfb' });
        if (this.activeEffects.ghost) effects.push({ name: '穿墙', color: '#ff9ff3' });
        if (this.activeEffects.double) effects.push({ name: '双倍', color: '#f368e0' });
        
        if (effects.length === 0) return;
        
        // 顶部中间位置，与底部操作提示对应
        const centerX = this.canvas.width / 2;
        const y = 25; // 距离顶部25px
        
        this.ctx.save();
        
        // 计算总宽度
        const itemWidth = 40; // 每个效果的宽度（缩小）
        const itemGap = 8;    // 效果之间的间距（缩小）
        const totalWidth = effects.length * itemWidth + (effects.length - 1) * itemGap;
        const startX = centerX - totalWidth / 2;
        
        // 脉冲动画参数
        const pulseSpeed = Game.CONFIG.ANIMATION.EFFECT_PULSE_SPEED;
        const pulse = Math.sin(Date.now() * pulseSpeed) * 0.3 + 0.7; // 0.4 ~ 1.0
        
        effects.forEach((effect, index) => {
            const x = startX + index * (itemWidth + itemGap);
            
            // 绘制发光背景（带脉冲效果）
            this.ctx.shadowColor = effect.color;
            this.ctx.shadowBlur = 8 * pulse;
            
            // 绘制圆角背景（带脉冲透明度）
            this.ctx.fillStyle = `rgba(0, 0, 0, ${0.4 * pulse})`;
            this.ctx.beginPath();
            this.ctx.roundRect(x, y - 10, itemWidth, 20, 10);
            this.ctx.fill();
            
            this.ctx.shadowBlur = 0;
            
            // 绘制边框（带脉冲宽度）
            this.ctx.strokeStyle = effect.color;
            this.ctx.lineWidth = 1.5 * pulse;
            this.ctx.beginPath();
            this.ctx.roundRect(x, y - 10, itemWidth, 20, 10);
            this.ctx.stroke();
            
            // 绘制文字（带脉冲发光）
            this.ctx.fillStyle = effect.color;
            this.ctx.font = 'bold 10px Microsoft YaHei';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(effect.name, x + itemWidth / 2, y);
        });
        
        this.ctx.restore();
    }
    
    /**
     * 绘制操作提示文字 - 位于摇杆和加速按钮中间
     * 显示游戏操作说明
     */
    drawControlHint() {
        const hintY = this.canvas.height - 25;
        const centerX = this.canvas.width / 2;
        
        this.ctx.save();
        
        // 提示文字
        const hintText = '按住摇杆移动 · 长按加速';
        const letterSpacing = 2; // 字间距
        
        // 计算带字间距的文字总宽度
        this.ctx.font = '12px Microsoft YaHei';
        let totalWidth = 0;
        for (let i = 0; i < hintText.length; i++) {
            const charWidth = this.ctx.measureText(hintText[i]).width;
            totalWidth += charWidth + (i < hintText.length - 1 ? letterSpacing : 0);
        }
        
        const paddingX = 20;
        const bgW = totalWidth + paddingX * 2;
        const bgH = 26;
        const bgX = centerX - bgW / 2;
        const bgY = hintY - bgH / 2;
        
        // 背景
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        this.ctx.beginPath();
        this.ctx.roundRect(bgX, bgY, bgW, bgH, 13);
        this.ctx.fill();
        
        // 文字 - 手动绘制实现字间距
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        this.ctx.font = '12px Microsoft YaHei';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';
        
        let currentX = centerX - totalWidth / 2;
        for (let i = 0; i < hintText.length; i++) {
            const char = hintText[i];
            this.ctx.fillText(char, currentX, hintY);
            currentX += this.ctx.measureText(char).width + letterSpacing;
        }
        
        this.ctx.restore();
    }
    
    /**
     * 绘制方向盘 - 游戏机摇杆样式
     * 大圆球摇杆设计，带立体感和发光效果
     * 激活时显示蓝紫渐变，未激活时显示银灰渐变
     */
    drawSteeringWheel() {
        const wheel = this.steeringWheel;
        const cx = wheel.centerX;
        const cy = wheel.centerY;
        const r = wheel.radius;
        const angle = wheel.currentAngle;

        this.ctx.save();

        // ===== 底座外发光（激活时）=====
        if (wheel.active) {
            this.ctx.shadowColor = 'rgba(99, 102, 241, 0.5)';
            this.ctx.shadowBlur = 30;
            this.ctx.shadowOffsetX = 0;
            this.ctx.shadowOffsetY = 0;
        }

        // ===== 底座背景 - 外围透明渐变阴影 =====
        const baseGradient = this.ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r);
        baseGradient.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
        baseGradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.2)');
        baseGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        this.ctx.beginPath();
        this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
        this.ctx.fillStyle = baseGradient;
        this.ctx.fill();

        // 重置阴影
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;

        // ===== 外圈圆环 - 渐变描边 =====
        const ringGradient = this.ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
        if (wheel.active) {
            ringGradient.addColorStop(0, '#60a5fa');
            ringGradient.addColorStop(0.3, '#818cf8');
            ringGradient.addColorStop(0.6, '#c084fc');
            ringGradient.addColorStop(1, '#f472b6');
        } else {
            ringGradient.addColorStop(0, 'rgba(255,255,255,0.4)');
            ringGradient.addColorStop(0.5, 'rgba(255,255,255,0.2)');
            ringGradient.addColorStop(1, 'rgba(255,255,255,0.1)');
        }

        this.ctx.beginPath();
        this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
        this.ctx.strokeStyle = ringGradient;
        this.ctx.lineWidth = wheel.active ? 4 : 3;
        this.ctx.stroke();

        // ===== 内圈装饰环 =====
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, r * 0.75, 0, Math.PI * 2);
        this.ctx.strokeStyle = wheel.active 
            ? 'rgba(129, 140, 248, 0.3)' 
            : 'rgba(255,255,255,0.15)';
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();

        // ===== 摇杆位置（跟随手指方向偏移）=====
        const stickMaxOffset = r * 0.4;
        // 计算手指实际偏移距离
        const fingerDist = Math.min(this.steeringWheel.stickDistance || 0, stickMaxOffset);
        // 摇杆球位置 - 使用平滑插值
        const targetStickX = cx + Math.cos(angle) * fingerDist;
        const targetStickY = cy + Math.sin(angle) * fingerDist;
        // 存储当前摇杆位置用于平滑过渡
        if (!this.steeringWheel.stickX) {
            this.steeringWheel.stickX = targetStickX;
            this.steeringWheel.stickY = targetStickY;
        } else {
            // 平滑插值
            this.steeringWheel.stickX += (targetStickX - this.steeringWheel.stickX) * 0.3;
            this.steeringWheel.stickY += (targetStickY - this.steeringWheel.stickY) * 0.3;
        }
        const stickX = this.steeringWheel.stickX;
        const stickY = this.steeringWheel.stickY;
        const stickRadius = 22; // 摇杆圆球大小

        // ===== 摇杆阴影（立体感）=====
        this.ctx.beginPath();
        this.ctx.arc(stickX + 3, stickY + 4, stickRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        this.ctx.fill();

        // ===== 摇杆主体 - 大圆球 =====
        // 摇杆外发光（激活时）
        if (wheel.active) {
            this.ctx.shadowColor = 'rgba(129, 140, 248, 0.8)';
            this.ctx.shadowBlur = 20;
            this.ctx.shadowOffsetX = 0;
            this.ctx.shadowOffsetY = 0;
        }

        // 摇杆渐变填充 - 立体感
        const stickGradient = this.ctx.createRadialGradient(
            stickX - stickRadius * 0.3, 
            stickY - stickRadius * 0.3, 
            0,
            stickX, 
            stickY, 
            stickRadius
        );
        
        if (wheel.active) {
            // 激活时：蓝紫渐变
            stickGradient.addColorStop(0, '#a5b4fc');
            stickGradient.addColorStop(0.3, '#818cf8');
            stickGradient.addColorStop(0.7, '#6366f1');
            stickGradient.addColorStop(1, '#4f46e5');
        } else {
            // 未激活时：银灰渐变
            stickGradient.addColorStop(0, 'rgba(255,255,255,0.95)');
            stickGradient.addColorStop(0.3, 'rgba(255,255,255,0.8)');
            stickGradient.addColorStop(0.7, 'rgba(200,200,220,0.6)');
            stickGradient.addColorStop(1, 'rgba(150,150,170,0.5)');
        }

        this.ctx.beginPath();
        this.ctx.arc(stickX, stickY, stickRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = stickGradient;
        this.ctx.fill();

        // 重置阴影
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;

        // 摇杆描边
        this.ctx.strokeStyle = wheel.active 
            ? 'rgba(255,255,255,0.6)' 
            : 'rgba(255,255,255,0.4)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // ===== 摇杆高光 =====
        // 主高光
        this.ctx.beginPath();
        this.ctx.arc(stickX - stickRadius * 0.35, stickY - stickRadius * 0.35, stickRadius * 0.25, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255,255,255,0.6)';
        this.ctx.fill();

        // 次高光
        this.ctx.beginPath();
        this.ctx.arc(stickX - stickRadius * 0.2, stickY - stickRadius * 0.5, stickRadius * 0.12, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255,255,255,0.4)';
        this.ctx.fill();

        // ===== 中心固定点（底座中心）=====
        // 中心光晕
        const centerGlow = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, 15);
        if (wheel.active) {
            centerGlow.addColorStop(0, 'rgba(129, 140, 248, 0.6)');
            centerGlow.addColorStop(1, 'rgba(129, 140, 248, 0)');
        } else {
            centerGlow.addColorStop(0, 'rgba(255,255,255,0.3)');
            centerGlow.addColorStop(1, 'rgba(255,255,255,0)');
        }

        this.ctx.beginPath();
        this.ctx.arc(cx, cy, 15, 0, Math.PI * 2);
        this.ctx.fillStyle = centerGlow;
        this.ctx.fill();

        // 中心小圆点
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        this.ctx.fillStyle = wheel.active 
            ? 'rgba(129, 140, 248, 0.8)' 
            : 'rgba(255,255,255,0.5)';
        this.ctx.fill();

        this.ctx.restore();
    }

    /**
     * 绘制加速按钮 - 右下角半透明圆形按钮
     * 按下时放大并显示发光效果
     */
    drawBoostButton() {
        const boost = this.boostButton;
        const cx = boost.centerX;
        const cy = boost.centerY;
        const r = boost.radius;

        this.ctx.save();

        // ===== 外发光效果（激活时）=====
        if (boost.active) {
            this.ctx.shadowColor = 'rgba(245, 158, 11, 0.6)';
            this.ctx.shadowBlur = 25;
            this.ctx.shadowOffsetX = 0;
            this.ctx.shadowOffsetY = 0;
        }

        // ===== 底座背景 - 外围透明渐变阴影 =====
        const baseGradient = this.ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r);
        baseGradient.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
        baseGradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.2)');
        baseGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        this.ctx.beginPath();
        this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
        this.ctx.fillStyle = baseGradient;
        this.ctx.fill();

        // 重置阴影
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;

        // ===== 外圈圆环 - 渐变描边 =====
        const ringGradient = this.ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
        if (boost.active) {
            // 激活时：橙黄渐变
            ringGradient.addColorStop(0, '#fbbf24');
            ringGradient.addColorStop(0.5, '#f59e0b');
            ringGradient.addColorStop(1, '#d97706');
        } else {
            // 未激活时：银白渐变
            ringGradient.addColorStop(0, 'rgba(255,255,255,0.4)');
            ringGradient.addColorStop(0.5, 'rgba(255,255,255,0.2)');
            ringGradient.addColorStop(1, 'rgba(255,255,255,0.1)');
        }

        this.ctx.beginPath();
        this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
        this.ctx.strokeStyle = ringGradient;
        this.ctx.lineWidth = boost.active ? 4 : 3;
        this.ctx.stroke();

        // ===== 内部填充区域 =====
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2);
        const fillGradient = this.ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, 0, cx, cy, r * 0.8);
        if (boost.active) {
            fillGradient.addColorStop(0, 'rgba(251, 191, 36, 0.9)');
            fillGradient.addColorStop(0.6, 'rgba(245, 158, 11, 0.8)');
            fillGradient.addColorStop(1, 'rgba(217, 119, 6, 0.7)');
        } else {
            fillGradient.addColorStop(0, 'rgba(255,255,255,0.25)');
            fillGradient.addColorStop(0.6, 'rgba(255,255,255,0.15)');
            fillGradient.addColorStop(1, 'rgba(255,255,255,0.05)');
        }
        this.ctx.fillStyle = fillGradient;
        this.ctx.fill();

        // ===== 绘制闪电图标 =====
        this.ctx.save();
        this.ctx.translate(cx, cy);
        
        // 闪电外发光（激活时）
        if (boost.active) {
            this.ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
            this.ctx.shadowBlur = 15;
        }

        // 闪电颜色
        this.ctx.fillStyle = boost.active ? '#fff' : 'rgba(255,255,255,0.9)';
        this.ctx.strokeStyle = boost.active ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.6)';
        this.ctx.lineWidth = 2;
        this.ctx.lineJoin = 'round';

        // 绘制闪电形状
        const boltSize = 16;
        this.ctx.beginPath();
        this.ctx.moveTo(boltSize * 0.3, -boltSize * 0.8);
        this.ctx.lineTo(-boltSize * 0.2, -boltSize * 0.1);
        this.ctx.lineTo(boltSize * 0.1, -boltSize * 0.1);
        this.ctx.lineTo(-boltSize * 0.1, boltSize * 0.8);
        this.ctx.lineTo(boltSize * 0.4, boltSize * 0.1);
        this.ctx.lineTo(boltSize * 0.1, boltSize * 0.1);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        // 重置阴影
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;

        this.ctx.restore();

        // ===== 按钮文字 "加速" =====
        this.ctx.fillStyle = boost.active ? '#fff' : 'rgba(255,255,255,0.8)';
        this.ctx.font = 'bold 11px Microsoft YaHei';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('加速', cx, cy + r * 0.55);

        this.ctx.restore();
    }

    /**
     * 游戏结束处理
     * 停止游戏循环、播放死亡动画、显示游戏结束界面
     */
    gameOver() {
        // 停止游戏运行状态
        this.setState(Game.STATE.GAME_OVER);
        // 标记死亡动画正在播放
        this.isDeathAnimating = true;
        // 取消动画帧请求
        cancelAnimationFrame(this.gameLoop);
        
        // 振动反馈（长振动）
        this.vibrate([100, 50, 100]);
        
        // 播放游戏结束音效
        this.audio.playGameOver();
        
        // ===== 创建死亡爆炸效果 =====
        this.effects.createDeathExplosion(this.snake.body);
        
        // 播放死亡动画（延迟显示游戏结束界面）
        this.playDeathAnimation();
    }
    
    /**
     * 播放死亡动画
     * 持续更新特效直到所有粒子消失
     * 使用 requestAnimationFrame 驱动动画
     */
    playDeathAnimation() {
        // 持续更新特效直到动画完成
        const animate = () => {
            // 更新特效（包括粒子和闪光）
            this.effects.update();
            
            // 清空画布并重新绘制背景
            this.offscreenRenderer.drawDynamicBackground(this.ctx, this.backgroundOffset);
            
            // 绘制死亡特效（粒子、闪光、飘字）
            this.effects.draw(this.ctx);
            
            // 绘制WebGL粒子效果（如果可用）
            if (this.webglParticles && this.webglParticles.initialized) {
                this.webglParticles.render(this.canvas.width, this.canvas.height);
            }
            
            // 绘制UI
            this.drawCanvasUI();
            
            // 如果还有特效粒子或闪光，继续动画
            const hasParticles = this.effects.particles.length > 0;
            const hasSparkles = this.effects.sparkles.length > 0;
            const hasTexts = this.effects.floatingTexts.length > 0;
            const hasWebGL = this.webglParticles && this.webglParticles.getParticleCount() > 0;
            
            if (hasParticles || hasSparkles || hasTexts || hasWebGL) {
                requestAnimationFrame(animate);
            } else {
                // 动画完成，清除标记并显示游戏结束界面
                this.isDeathAnimating = false;
                this.showGameOverScreen();
            }
        };
        
        animate();
    }
    
    /**
     * 显示游戏结束界面
     * 更新最高分并显示游戏统计
     */
    showGameOverScreen() {
        // ===== 更新最高分 =====
        if (this.score > this.highScore) {
            this.highScore = this.score;
            // 保存到本地存储（兼容Edge）
            this.saveHighScore(this.highScore);
            document.getElementById('highScore').textContent = this.highScore;
        }
        
        // 显示游戏结束界面
        this.updateGameOverUI();
        document.getElementById('gameOver').classList.remove('hidden');
    }
    
    /**
     * 更新游戏结束界面UI
     * 计算并显示游戏统计（得分、存活时间、最高连击）
     */
    updateGameOverUI() {
        // 计算游戏统计
        const survivalTime = Math.floor((Date.now() - this.gameStartTime) / 1000);
        const minutes = Math.floor(survivalTime / 60);
        const seconds = survivalTime % 60;
        
        // 更新结束界面内容
        const gameOverDiv = document.getElementById('gameOver');
        gameOverDiv.innerHTML = `
            <h2>游戏结束!</h2>
            <div class="game-stats">
                <p>最终得分: <span class="highlight">${this.score}</span></p>
                <p>存活时间: <span>${minutes}分${seconds}秒</span></p>
                <p>最高连击: <span>${this.maxCombo}</span></p>
                ${this.score >= this.highScore && this.score > 0 ? '<p class="new-record">🏆 新纪录!</p>' : ''}
            </div>
            <div class="game-over-buttons">
                <button id="restartBtn" type="button">再来一局</button>
            </div>
        `;
        
        // 重新绑定按钮事件
        document.getElementById('restartBtn').addEventListener('click', () => this.restart());
    }

    /**
     * 重新开始游戏
     * 重置所有游戏状态、清除特效、重新开始
     */
    restart() {
        // 隐藏游戏结束界面
        document.getElementById('gameOver').classList.add('hidden');

        // 重置UI
        this.updateGameButton();
        document.getElementById('score').textContent = '0';

        // 重置游戏状态
        this.score = 0;
        this.snake.reset();
        this.food.reset(this.isLandscapeMode());

        // 重置特效
        this.effects.clear();

        // 清除所有效果定时器
        for (const key in this.effectTimers) {
            if (this.effectTimers[key]) {
                clearTimeout(this.effectTimers[key]);
                this.effectTimers[key] = null;
            }
        }

        // 重置所有效果状态
        this.activeEffects.speed = false;
        this.activeEffects.invincible = false;
        this.activeEffects.slow = false;
        this.activeEffects.ghost = false;
        this.activeEffects.double = false;

        // 重置离屏渲染器
        this.offscreenRenderer.markDirty();
        
        // 清空WebGL粒子
        if (this.webglParticles) {
            this.webglParticles.clear();
        }

        // 重置统计
        this.comboCount = 0;
        this.maxCombo = 0;
        this.lastEatTime = 0;
        this.gameStartTime = Date.now();

        // 重置加速状态
        this.isBoosting = false;
        this.boostButton.active = false;
        this.boostButton.touchId = null;

        // 重置速度
        this.baseSpeed = Game.CONFIG.BASE_SPEED;
        this.snake.speed = this.baseSpeed;

        // 重新绘制
        this.draw();
    }
}

// ===== 游戏入口 =====
/**
 * 页面加载完成后启动游戏
 * 创建 Game 实例并初始化
 */
window.onload = () => {
    new Game();
};