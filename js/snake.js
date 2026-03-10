/**
 * 蛇类 - 负责蛇的移动、绘制和碰撞检测
 * 使用高斯曲线算法实现平滑转向
 */
class Snake {
    /**
     * 构造函数
     * @param {number} gridSize - 蛇身每个节点的大小（像素）
     */
    constructor(gridSize) {
        this.gridSize = gridSize;
        this.reset();
        // 鼠标/触摸目标位置
        this.targetX = 0;
        this.targetY = 0;
    }

    /**
     * 重置蛇的状态
     * 初始化蛇身位置、方向、速度等属性
     */
    reset() {
        // 初始位置在画布中央，蛇身由多个节点组成
        this.body = [
            {x: 200, y: 200},  // 蛇头
            {x: 190, y: 200},  // 第一节身体
            {x: 180, y: 200},  // 第二节身体
            {x: 170, y: 200},  // 第三节身体
            {x: 160, y: 200}   // 第四节身体
        ];
        this.direction = 'right';      // 当前移动方向
        this.nextDirection = 'right';  // 下一帧的移动方向
        this.grow = false;             // 是否正在生长
        this.speed = 4;                // 移动速度（像素/帧）
        this.angle = 0;                // 当前朝向角度（弧度）
        // 高斯曲线相关参数（预留）
        this.controlPoints = [];       // 控制点数组
        this.curveProgress = 0;        // 曲线进度
        this.segmentDistance = 8;      // 节点间距
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
     * 高斯函数（正态分布）- 用于计算平滑权重
     * 公式：f(x) = e^(-x²/(2σ²))
     * @param {number} x - 输入值
     * @param {number} sigma - 标准差，控制曲线的宽窄，默认值为1
     * @returns {number} - 高斯权重值（0-1之间）
     */
    gaussian(x, sigma = 1) {
        return Math.exp(-(x * x) / (2 * sigma * sigma));
    }

    /**
     * 计算高斯平滑后的角度
     * 使用高斯函数对转向进行平滑处理，使小角度转向更灵敏，大角度转向更平滑
     * @returns {number} - 平滑后的角度（弧度）
     */
    calculateGaussianAngle() {
        const head = this.body[0];
        // 计算蛇头到目标位置的向量
        const dx = this.targetX - head.x;
        const dy = this.targetY - head.y;
        // 计算目标角度
        const targetAngle = Math.atan2(dy, dx);
        
        // 计算当前角度与目标角度的差值
        let angleDiff = targetAngle - this.angle;
        // 将角度差规范化到 [-π, π] 范围内
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        // 高斯平滑系数计算：
        // 1. 归一化角度差到 [0, 1]
        // 2. 使用高斯函数计算权重
        // 3. 根据权重调整平滑因子（0.05 - 0.20）
        const normalizedDiff = Math.abs(angleDiff) / Math.PI;
        const gaussianWeight = this.gaussian(normalizedDiff, 0.5);
        const smoothFactor = 0.05 + 0.15 * gaussianWeight;
        
        return this.angle + angleDiff * smoothFactor;
    }

    /**
     * 更新蛇的位置
     * 每帧调用，计算新的头部位置并更新蛇身
     */
    update() {
        const head = this.body[0];
        
        // 使用高斯平滑计算新的朝向角度
        this.angle = this.calculateGaussianAngle();
        
        // 根据角度和速度计算新头部位置
        const newHead = {
            x: head.x + Math.cos(this.angle) * this.speed,
            y: head.y + Math.sin(this.angle) * this.speed
        };
        
        // 将新头部添加到蛇身数组开头
        this.body.unshift(newHead);
        
        // 如果不在生长状态，移除尾部；否则保持尾部（生长）
        if (!this.grow) {
            this.body.pop();
        } else {
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
     */
    draw(ctx) {
        const headRadius = this.gridSize / 2;
        
        // 从尾部开始绘制，确保头部在最上层
        for (let i = this.body.length - 1; i >= 0; i--) {
            const segment = this.body[i];
            
            if (i === 0) {
                // ===== 绘制蛇头 =====
                // 创建径向渐变，增加立体感
                const gradient = ctx.createRadialGradient(
                    segment.x - 3, segment.y - 3, 0,           // 内圆（高光中心）
                    segment.x, segment.y, headRadius            // 外圆
                );
                gradient.addColorStop(0, '#7ee8e0');  // 高光色
                gradient.addColorStop(1, '#4ecdc4');  // 主体色
                
                ctx.fillStyle = gradient;
                // 添加发光效果
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#4ecdc4';
                
                // 绘制圆形蛇头
                ctx.beginPath();
                ctx.arc(segment.x, segment.y, headRadius, 0, Math.PI * 2);
                ctx.fill();
                
                // ===== 绘制蛇眼 =====
                ctx.shadowBlur = 0;  // 关闭阴影
                ctx.fillStyle = 'white';
                
                // 眼睛位置偏移量
                const eyeOffset = 5;
                // 根据朝向角度计算两只眼睛的角度
                const eyeAngle1 = this.angle - 0.4;  // 左眼
                const eyeAngle2 = this.angle + 0.4;  // 右眼
                
                // 计算眼睛坐标
                const eye1X = segment.x + Math.cos(eyeAngle1) * eyeOffset;
                const eye1Y = segment.y + Math.sin(eyeAngle1) * eyeOffset;
                const eye2X = segment.x + Math.cos(eyeAngle2) * eyeOffset;
                const eye2Y = segment.y + Math.sin(eyeAngle2) * eyeOffset;
                
                // 绘制眼白
                ctx.beginPath();
                ctx.arc(eye1X, eye1Y, 4, 0, Math.PI * 2);
                ctx.arc(eye2X, eye2Y, 4, 0, Math.PI * 2);
                ctx.fill();
                
                // 绘制眼珠（瞳孔）
                ctx.fillStyle = 'black';
                const pupilOffset = 2;  // 眼珠朝向偏移
                ctx.beginPath();
                ctx.arc(eye1X + Math.cos(this.angle) * pupilOffset, eye1Y + Math.sin(this.angle) * pupilOffset, 2, 0, Math.PI * 2);
                ctx.arc(eye2X + Math.cos(this.angle) * pupilOffset, eye2Y + Math.sin(this.angle) * pupilOffset, 2, 0, Math.PI * 2);
                ctx.fill();
                
                // ===== 绘制舌头 =====
                ctx.strokeStyle = '#ff6b6b';  // 粉红色
                ctx.lineWidth = 2;
                ctx.beginPath();
                // 舌头起点（嘴部）
                const tongueStartX = segment.x + Math.cos(this.angle) * headRadius;
                const tongueStartY = segment.y + Math.sin(this.angle) * headRadius;
                // 舌头终点
                const tongueEndX = segment.x + Math.cos(this.angle) * (headRadius + 8);
                const tongueEndY = segment.y + Math.sin(this.angle) * (headRadius + 8);
                ctx.moveTo(tongueStartX, tongueStartY);
                ctx.lineTo(tongueEndX, tongueEndY);
                ctx.stroke();
                
            } else {
                // ===== 绘制蛇身节点 =====
                // 根据节点索引计算颜色，越往后颜色越深
                const greenValue = Math.max(60, 180 - i * 3);
                const blueValue = Math.max(120, 196 - i * 2);
                
                // 创建径向渐变
                const gradient = ctx.createRadialGradient(
                    segment.x - 2, segment.y - 2, 0,
                    segment.x, segment.y, headRadius - 2
                );
                gradient.addColorStop(0, `rgb(100, ${greenValue + 20}, ${blueValue + 20})`);  // 高光
                gradient.addColorStop(1, `rgb(78, ${greenValue}, ${blueValue})`);             // 主体
                
                ctx.fillStyle = gradient;
                ctx.shadowBlur = 0;
                
                // 绘制圆形身体节点
                ctx.beginPath();
                ctx.arc(segment.x, segment.y, headRadius - 2, 0, Math.PI * 2);
                ctx.fill();
                
                // 绘制身体连接线，让蛇身看起来更连贯
                if (i < this.body.length - 1) {
                    const nextSegment = this.body[i + 1];
                    ctx.strokeStyle = `rgb(78, ${greenValue}, ${blueValue})`;
                    ctx.lineWidth = (headRadius - 2) * 2;
                    ctx.lineCap = 'round';  // 圆角线端
                    ctx.beginPath();
                    ctx.moveTo(segment.x, segment.y);
                    ctx.lineTo(nextSegment.x, nextSegment.y);
                    ctx.stroke();
                }
                
                // 绘制高光点，增加立体感
                ctx.fillStyle = 'rgba(255,255,255,0.2)';
                ctx.beginPath();
                ctx.arc(segment.x - 3, segment.y - 3, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // 重置阴影效果
        ctx.shadowBlur = 0;
    }
}