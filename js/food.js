/**
 * 食物类 - 负责食物的生成、绘制和位置管理
 * 食物会随机出现在画布上，带有发光效果
 */
class Food {
    /**
     * 构造函数
     * @param {number} canvasWidth - 画布宽度
     * @param {number} canvasHeight - 画布高度
     */
    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;    // 画布宽度
        this.canvasHeight = canvasHeight;  // 画布高度
        this.position = {x: 0, y: 0};      // 食物位置坐标
        // 食物颜色数组，随机选择
        this.colors = ['#ff6b6b', '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd'];
        this.colorIndex = 0;  // 当前颜色索引
        // 初始化时生成第一个食物位置
        this.spawn();
    }

    /**
     * 生成新的食物位置
     * 随机在画布上生成位置，确保不与蛇身重叠
     * @param {Array} snakeBody - 蛇身节点数组，用于碰撞检测
     */
    spawn(snakeBody = []) {
        let validPosition = false;
        
        // 循环直到找到有效位置
        while (!validPosition) {
            // 在画布内随机生成位置（留30像素边距）
            this.position.x = 30 + Math.random() * (this.canvasWidth - 60);
            this.position.y = 30 + Math.random() * (this.canvasHeight - 60);
            
            // 确保食物不在蛇身上
            validPosition = true;
            for (let segment of snakeBody) {
                // 计算食物与蛇身节点的距离
                const dist = Math.sqrt(
                    Math.pow(this.position.x - segment.x, 2) + 
                    Math.pow(this.position.y - segment.y, 2)
                );
                // 如果距离小于30像素，位置无效，重新生成
                if (dist < 30) {
                    validPosition = false;
                    break;
                }
            }
        }
        
        // 随机选择一种颜色
        this.colorIndex = Math.floor(Math.random() * this.colors.length);
    }

    /**
     * 绘制食物
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D渲染上下文
     */
    draw(ctx) {
        // ===== 发光效果 =====
        ctx.shadowBlur = 20;  // 模糊半径
        ctx.shadowColor = this.colors[this.colorIndex];  // 发光颜色与食物颜色一致
        
        // ===== 绘制圆形食物（外圈）=====
        ctx.fillStyle = this.colors[this.colorIndex];
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, 8, 0, Math.PI * 2);  // 半径8像素
        ctx.fill();
        
        // ===== 绘制内圈（半透明白色）=====
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, 5, 0, Math.PI * 2);  // 半径5像素
        ctx.fill();
        
        // ===== 绘制高光点 =====
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        ctx.arc(this.position.x - 2, this.position.y - 2, 2, 0, Math.PI * 2);  // 左上角高光
        ctx.fill();
        
        // 重置阴影效果，避免影响其他绘制
        ctx.shadowBlur = 0;
    }

    /**
     * 获取食物位置
     * @returns {Object} - 位置对象 {x, y}
     */
    getPosition() {
        return this.position;
    }
}