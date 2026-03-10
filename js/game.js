/**
 * 游戏主类 - 负责游戏逻辑、事件处理和渲染循环
 * 协调蛇、食物和UI的交互
 */
class Game {
    /**
     * 构造函数 - 初始化游戏状态和对象
     */
    constructor() {
        // 获取Canvas元素和2D渲染上下文（兼容Edge）
        this.canvas = document.getElementById('gameCanvas');
        // 使用标准API获取context，如果不支持2d则尝试experimental-webgl回退
        this.ctx = this.canvas.getContext('2d') || this.canvas.getContext('experimental-webgl');
        
        // 检查Canvas支持
        if (!this.ctx) {
            alert('您的浏览器不支持Canvas，请使用现代浏览器（Chrome、Edge、Firefox等）');
            return;
        }
        
        // 游戏配置参数
        this.gridSize = 20;  // 网格大小（像素）
        
        // 创建游戏对象
        this.snake = new Snake(this.gridSize);                    // 蛇对象
        this.food = new Food(this.canvas.width, this.canvas.height);  // 食物对象
        
        // 游戏状态变量
        this.score = 0;        // 当前得分
        this.highScore = this.getLocalStorage('snakeHighScore') || 0;  // 最高分（从本地存储读取）
        this.gameLoop = null;  // 游戏循环ID（用于requestAnimationFrame）
        this.isRunning = false;  // 游戏是否正在运行
        this.isPaused = false;   // 游戏是否暂停
        
        // 初始化游戏
        this.init();
    }

    /**
     * 兼容Edge的localStorage读取
     * @param {string} key - 存储键名
     * @returns {string|null} - 存储的值
     */
    getLocalStorage(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            // Edge某些模式下可能限制localStorage
            console.warn('localStorage不可用，最高分将不会被保存');
            return null;
        }
    }

    /**
     * 兼容Edge的localStorage写入
     * @param {string} key - 存储键名
     * @param {string} value - 存储的值
     */
    setLocalStorage(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.warn('localStorage写入失败');
        }
    }

    /**
     * 兼容Edge的requestAnimationFrame
     * @param {Function} callback - 回调函数
     * @returns {number} - 动画帧ID
     */
    requestAnimFrame(callback) {
        const raf = window.requestAnimationFrame ||
                    window.webkitRequestAnimationFrame ||
                    window.mozRequestAnimationFrame ||
                    window.oRequestAnimationFrame ||
                    window.msRequestAnimationFrame ||
                    function(cb) {
                        return window.setTimeout(cb, 1000 / 60);
                    };
        return raf(callback);
    }

    /**
     * 兼容Edge的cancelAnimationFrame
     * @param {number} id - 动画帧ID
     */
    cancelAnimFrame(id) {
        return (window.cancelAnimationFrame ||
                window.webkitCancelAnimationFrame ||
                window.mozCancelAnimationFrame ||
                window.oCancelAnimationFrame ||
                window.msCancelAnimationFrame ||
                window.clearTimeout)(id);
    }

    /**
     * 初始化游戏 - 绑定事件监听器和初始渲染
     */
    init() {
        // 更新最高分显示
        document.getElementById('highScore').textContent = this.highScore;
        
        // ===== 绑定按钮事件 =====
        document.getElementById('startBtn').addEventListener('click', () => this.start());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('restartBtn').addEventListener('click', () => this.restart());
        
        // ===== 绑定鼠标/触摸控制事件 =====
        // 鼠标移动事件（桌面端）
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        // 触摸移动事件（移动端）
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), {passive: false});
        // 触摸开始事件（移动端，用于开始游戏）
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), {passive: false});
        
        // ===== 绑定键盘控制事件 =====
        // 保留空格键暂停功能
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
        
        // ===== 检测并适配移动端 =====
        this.detectMobile();
        
        // 初始绘制
        this.draw();
    }

    /**
     * 检测是否为移动设备并适配UI
     */
    detectMobile() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            // 更新控制提示文字
            const hint = document.getElementById('controlHint');
            const text = document.getElementById('controlText');
            if (hint) hint.textContent = '👆 触摸屏幕控制蛇的方向';
            if (text) text.textContent = '触摸屏幕控制蛇移动方向';
            
            // 移动端优化：降低蛇的初始速度，提升操控性
            this.snake.speed = 3;
            
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
     * @param {TouchEvent} e - 触摸事件对象
     */
    handleTouchStart(e) {
        // 阻止默认行为
        e.preventDefault();
        
        // 记录触摸起始位置
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
        
        // 如果游戏未运行，开始游戏
        if (!this.isRunning) {
            this.start();
        }
        
        // 立即处理触摸位置
        this.handleTouchMove(e);
    }

    /**
     * 处理鼠标移动事件
     * @param {MouseEvent} e - 鼠标事件对象
     */
    handleMouseMove(e) {
        // 只有在游戏运行且未暂停时才响应
        if (!this.isRunning || this.isPaused) return;
        
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
     * @param {TouchEvent} e - 触摸事件对象
     */
    handleTouchMove(e) {
        // 阻止默认行为（防止页面滚动）
        e.preventDefault();
        
        // 获取Canvas相对于视口的位置
        const rect = this.canvas.getBoundingClientRect();
        // 获取第一个触摸点
        const touch = e.touches[0];
        
        // 计算触摸点在Canvas内的坐标（考虑Canvas缩放）
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        const x = (touch.clientX - rect.left) * scaleX;
        const y = (touch.clientY - rect.top) * scaleY;
        
        // 设置蛇的目标位置
        this.snake.setTarget(x, y);
    }

    /**
     * 处理键盘按键事件
     * @param {KeyboardEvent} e - 键盘事件对象
     */
    handleKeydown(e) {
        // 空格键暂停/继续
        if (e.key === ' ' && this.isRunning) {
            e.preventDefault();  // 阻止默认行为（页面滚动）
            this.togglePause();
        }
    }

    /**
     * 开始游戏
     */
    start() {
        // 如果游戏已在运行，直接返回
        if (this.isRunning) return;
        
        // 设置游戏状态
        this.isRunning = true;
        this.isPaused = false;
        
        // 更新UI
        document.getElementById('startBtn').textContent = '游戏中...';
        document.getElementById('startBtn').disabled = true;
        
        // 设置初始目标位置（右侧）
        this.snake.setTarget(this.canvas.width, this.snake.body[0].y);
        
        // 启动游戏循环
        this.gameLoop = this.requestAnimFrame(() => this.loop());
    }

    /**
     * 切换暂停/继续状态
     */
    togglePause() {
        // 如果游戏未运行，直接返回
        if (!this.isRunning) return;
        
        // 切换暂停状态
        this.isPaused = !this.isPaused;
        // 更新按钮文字
        document.getElementById('pauseBtn').textContent = this.isPaused ? '继续' : '暂停';
        
        // 如果继续游戏，重新启动游戏循环
        if (!this.isPaused) {
            this.gameLoop = this.requestAnimFrame(() => this.loop());
        }
    }

    /**
     * 游戏主循环
     * 使用requestAnimationFrame实现平滑动画
     */
    loop() {
        // 如果游戏未运行或已暂停，停止循环
        if (!this.isRunning || this.isPaused) return;
        
        // 更新游戏逻辑
        this.update();
        // 渲染画面
        this.draw();
        
        // 请求下一帧
        this.gameLoop = this.requestAnimFrame(() => this.loop());
    }

    /**
     * 更新游戏逻辑
     * 处理蛇的移动、碰撞检测和得分计算
     */
    update() {
        // 更新蛇的位置
        this.snake.update();
        
        // ===== 碰撞检测 =====
        // 检测是否撞墙或撞到自己
        if (this.snake.checkWallCollision(this.canvas.width, this.canvas.height) || 
            this.snake.checkSelfCollision()) {
            this.gameOver();
            return;
        }
        
        // ===== 食物检测 =====
        const foodPos = this.food.getPosition();
        
        // 检测是否吃到食物
        if (this.snake.checkFoodCollision(foodPos)) {
            // 蛇生长
            this.snake.growUp();
            // 增加得分
            this.score += 10;
            document.getElementById('score').textContent = this.score;
            
            // 每得100分（吃10个食物）增加速度，最高速度为10
            if (this.score % 100 === 0 && this.snake.speed < 10) {
                this.snake.speed += 0.5;
            }
            
            // 生成新食物
            this.food.spawn(this.snake.body);
        }
    }

    /**
     * 绘制游戏画面
     */
    draw() {
        // ===== 绘制背景 =====
        // 创建深色渐变背景
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        gradient.addColorStop(0, '#1a1a2e');  // 起始颜色（深蓝紫色）
        gradient.addColorStop(1, '#16213e');  // 结束颜色（深蓝）
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // ===== 绘制游戏对象 =====
        this.food.draw(this.ctx);   // 绘制食物
        this.snake.draw(this.ctx);  // 绘制蛇
        
        // ===== 绘制暂停界面 =====
        if (this.isPaused) {
            // 半透明遮罩
            this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            // 暂停文字
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 40px Microsoft YaHei';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('暂 停', this.canvas.width/2, this.canvas.height/2);
        }
    }

    /**
     * 游戏结束处理
     */
    gameOver() {
        // 停止游戏运行状态
        this.isRunning = false;
        // 取消动画帧请求（兼容Edge）
        this.cancelAnimFrame(this.gameLoop);
        
        // ===== 更新最高分 =====
        if (this.score > this.highScore) {
            this.highScore = this.score;
            // 保存到本地存储（兼容Edge）
            this.setLocalStorage('snakeHighScore', this.highScore);
            document.getElementById('highScore').textContent = this.highScore;
        }
        
        // 显示游戏结束界面
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOver').classList.remove('hidden');
    }

    /**
     * 重新开始游戏
     */
    restart() {
        // 隐藏游戏结束界面
        document.getElementById('gameOver').classList.add('hidden');
        
        // 重置UI
        document.getElementById('startBtn').textContent = '开始游戏';
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').textContent = '暂停';
        document.getElementById('score').textContent = '0';
        
        // 重置游戏状态
        this.score = 0;
        this.snake.reset();
        this.food.spawn();
        
        // 重新绘制
        this.draw();
    }
}

// ===== 游戏入口 =====
// 页面加载完成后启动游戏
window.onload = () => {
    new Game();
};