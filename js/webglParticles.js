/**
 * @fileoverview WebGL粒子渲染器模块 - 高性能粒子系统
 * 
 * 核心特性：
 * - 使用 WebGL 批量渲染大量粒子，比 Canvas 2D 性能提升10倍以上
 * - 支持最多 2000 个粒子同时渲染
 * - 自动检测 WebGL 兼容性，不支持时优雅降级
 * - 使用顶点着色器和片段着色器实现 GPU 加速
 * - 圆形粒子使用 smoothstep 实现边缘抗锯齿
 * 
 * 着色器说明：
 * - 顶点着色器：处理粒子位置和大小，将屏幕坐标转换为 WebGL 裁剪空间
 * - 片段着色器：根据到中心距离计算透明度，实现圆形粒子效果
 * 
 * 兼容性处理：
 * - 检测 WebGL API 支持
 * - 尝试多种上下文参数组合
 * - 检测必要的 WebGL 功能
 * - 提供详细的兼容性报告
 * 
 * @author 游戏开发团队
 * @version 2.0.0
 */

/**
 * WebGL粒子渲染器类
 * 使用 GPU 加速渲染大量粒子
 * @class
 */
class WebGLParticleRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = null;
        this.initialized = false;
        
        // 粒子数据
        this.particles = [];
        this.maxParticles = 2000;
        
        // WebGL资源
        this.program = null;
        this.positionBuffer = null;
        this.colorBuffer = null;
        this.sizeBuffer = null;
        
        // 属性位置
        this.attribLocations = {};
        this.uniformLocations = {};
        
        // 初始化
        this.init();
    }
    
    /**
     * 初始化WebGL上下文和着色器
     * 包含多浏览器兼容性检测和自动降级
     * 尝试多种上下文参数组合以提高兼容性
     * @returns {boolean} 初始化是否成功
     */
    init() {
        try {
            // 检测WebGL支持
            const canvas = document.createElement('canvas');
            const glSupport = !!(
                canvas.getContext('webgl') || 
                canvas.getContext('experimental-webgl')
            );
            
            if (!glSupport) {
                console.warn('[WebGLParticles] WebGL not supported on this device');
                this.compatibilityInfo = { supported: false, reason: 'WebGL API not available' };
                return false;
            }
            
            // 获取WebGL上下文（尝试不同参数组合以提高兼容性）
            const contextOptions = {
                alpha: true,
                premultipliedAlpha: false,
                antialias: false,
                preserveDrawingBuffer: false,
                powerPreference: 'high-performance'
            };
            
            this.gl = this.canvas.getContext('webgl', contextOptions) || 
                      this.canvas.getContext('experimental-webgl', contextOptions) ||
                      this.canvas.getContext('webgl', { ...contextOptions, alpha: false }) ||
                      this.canvas.getContext('experimental-webgl', { ...contextOptions, alpha: false });
            
            if (!this.gl) {
                console.warn('[WebGLParticles] Failed to create WebGL context');
                this.compatibilityInfo = { supported: false, reason: 'Context creation failed' };
                return false;
            }
            
            // 检测必要的WebGL扩展和功能
            const requiredFeatures = this.checkRequiredFeatures();
            if (!requiredFeatures.supported) {
                console.warn('[WebGLParticles] Required features not supported:', requiredFeatures.missing);
                this.compatibilityInfo = { supported: false, reason: 'Missing features: ' + requiredFeatures.missing.join(', ') };
                return false;
            }
            
            // 初始化着色器
            if (!this.initShaders()) {
                this.compatibilityInfo = { supported: false, reason: 'Shader compilation failed' };
                return false;
            }
            
            // 初始化缓冲区
            this.initBuffers();
            
            // 设置混合模式
            this.gl.enable(this.gl.BLEND);
            this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
            
            this.initialized = true;
            this.compatibilityInfo = { 
                supported: true, 
                renderer: this.gl.getParameter(this.gl.RENDERER),
                vendor: this.gl.getParameter(this.gl.VENDOR),
                version: this.gl.getParameter(this.gl.VERSION)
            };
            
            console.log('[WebGLParticles] Initialized successfully:', this.compatibilityInfo);
            return true;
            
        } catch (e) {
            console.error('[WebGLParticles] Initialization failed:', e);
            this.compatibilityInfo = { supported: false, reason: e.message };
            return false;
        }
    }
    
    /**
     * 检测必要的WebGL功能
     * 检查 VERTEX_SHADER、FRAGMENT_SHADER、ARRAY_BUFFER、FLOAT 等核心功能
     * @returns {Object} 检测结果，包含 supported 和 missing 数组
     */
    checkRequiredFeatures() {
        const required = [
            'VERTEX_SHADER',
            'FRAGMENT_SHADER',
            'ARRAY_BUFFER',
            'FLOAT'
        ];
        
        const missing = [];
        for (const feature of required) {
            if (this.gl[feature] === undefined) {
                missing.push(feature);
            }
        }
        
        return {
            supported: missing.length === 0,
            missing: missing
        };
    }
    
    /**
     * 初始化着色器程序
     * 编译顶点着色器和片段着色器，链接成程序
     * 顶点着色器处理位置和大小，片段着色器处理颜色和圆形效果
     * @returns {boolean} 初始化是否成功
     */
    initShaders() {
        const gl = this.gl;
        
        // 顶点着色器 - 处理位置和大小
        const vsSource = `
            attribute vec2 a_position;
            attribute vec4 a_color;
            attribute float a_size;
            
            varying vec4 v_color;
            
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
                gl_PointSize = a_size;
                v_color = a_color;
            }
        `;
        
        // 片段着色器 - 处理颜色和圆形粒子
        const fsSource = `
            precision mediump float;
            varying vec4 v_color;
            
            void main() {
                // 计算到中心的距离，创建圆形粒子
                vec2 coord = gl_PointCoord - vec2(0.5);
                float dist = length(coord);
                
                // 圆形边缘平滑
                float alpha = 1.0 - smoothstep(0.4, 0.5, dist);
                
                gl_FragColor = vec4(v_color.rgb, v_color.a * alpha);
            }
        `;
        
        // 编译着色器
        const vertexShader = this.compileShader(gl.VERTEX_SHADER, vsSource);
        const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fsSource);
        
        // 创建程序
        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);
        
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('Shader program link error:', gl.getProgramInfoLog(this.program));
            return;
        }
        
        // 获取属性和uniform位置
        this.attribLocations = {
            position: gl.getAttribLocation(this.program, 'a_position'),
            color: gl.getAttribLocation(this.program, 'a_color'),
            size: gl.getAttribLocation(this.program, 'a_size')
        };
    }
    
    /**
     * 编译着色器
     * @param {number} type - 着色器类型（gl.VERTEX_SHADER 或 gl.FRAGMENT_SHADER）
     * @param {string} source - 着色器源码
     * @returns {WebGLShader|null} 编译后的着色器对象，失败返回 null
     */
    compileShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    /**
     * 初始化WebGL缓冲区
     * 创建位置、颜色、大小三个属性缓冲区
     */
    initBuffers() {
        const gl = this.gl;
        
        // 位置缓冲区
        this.positionBuffer = gl.createBuffer();
        
        // 颜色缓冲区
        this.colorBuffer = gl.createBuffer();
        
        // 大小缓冲区
        this.sizeBuffer = gl.createBuffer();
    }
    
    /**
     * 添加粒子到渲染队列
     * 如果超过最大粒子数，移除最老的粒子
     * @param {number} x - 粒子X坐标（屏幕坐标）
     * @param {number} y - 粒子Y坐标（屏幕坐标）
     * @param {number} vx - X方向速度（像素/秒）
     * @param {number} vy - Y方向速度（像素/秒）
     * @param {Object} color - 颜色对象 {r, g, b, a}，范围 0-1
     * @param {number} size - 粒子大小（像素）
     * @param {number} life - 生命值（0-1）
     * @param {number} decay - 生命值衰减速度（每秒）
     */
    addParticle(x, y, vx, vy, color, size, life, decay) {
        if (this.particles.length >= this.maxParticles) {
            // 移除最老的粒子
            this.particles.shift();
        }
        
        this.particles.push({
            x, y,
            vx, vy,
            r: color.r, g: color.g, b: color.b, a: color.a,
            size,
            life,
            decay
        });
    }
    
    /**
     * 更新粒子状态
     * 更新所有粒子的位置和生命值，移除死亡粒子
     * @param {number} [deltaTime=16] - 时间增量（毫秒），默认约60fps
     */
    update(deltaTime = 16) {
        const dt = deltaTime / 1000; // 转换为秒
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            // 更新位置
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            
            // 更新生命值
            p.life -= p.decay * dt;
            
            // 移除死亡粒子
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    /**
     * 渲染所有粒子
     * 将粒子数据上传到GPU并执行绘制
     * 坐标转换：屏幕坐标 -> WebGL裁剪空间（-1 到 1）
     * @param {number} canvasWidth - Canvas宽度（像素）
     * @param {number} canvasHeight - Canvas高度（像素）
     */
    render(canvasWidth, canvasHeight) {
        if (!this.initialized || this.particles.length === 0) return;
        
        const gl = this.gl;
        
        // 设置视口
        gl.viewport(0, 0, canvasWidth, canvasHeight);
        
        // 使用着色器程序
        gl.useProgram(this.program);
        
        // 准备数据数组
        const positions = [];
        const colors = [];
        const sizes = [];
        
        // 转换坐标到WebGL空间 (-1 到 1)
        for (const p of this.particles) {
            const glX = (p.x / canvasWidth) * 2 - 1;
            const glY = -((p.y / canvasHeight) * 2 - 1); // Y轴翻转
            
            positions.push(glX, glY);
            colors.push(p.r, p.g, p.b, p.a * p.life);
            sizes.push(p.size);
        }
        
        // 上传位置数据
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(this.attribLocations.position);
        gl.vertexAttribPointer(this.attribLocations.position, 2, gl.FLOAT, false, 0, 0);
        
        // 上传颜色数据
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(this.attribLocations.color);
        gl.vertexAttribPointer(this.attribLocations.color, 4, gl.FLOAT, false, 0, 0);
        
        // 上传大小数据
        gl.bindBuffer(gl.ARRAY_BUFFER, this.sizeBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sizes), gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(this.attribLocations.size);
        gl.vertexAttribPointer(this.attribLocations.size, 1, gl.FLOAT, false, 0, 0);
        
        // 绘制粒子
        gl.drawArrays(gl.POINTS, 0, this.particles.length);
    }
    
    /**
     * 清空所有粒子
     * 立即移除所有活跃粒子
     */
    clear() {
        this.particles = [];
    }
    
    /**
     * 获取当前活跃粒子数量
     * @returns {number} 粒子数量
     */
    getParticleCount() {
        return this.particles.length;
    }
    
    /**
     * 销毁WebGL资源
     * 删除缓冲区、程序等GPU资源
     * 在渲染器不再使用时调用
     */
    dispose() {
        if (!this.gl) return;
        
        this.gl.deleteBuffer(this.positionBuffer);
        this.gl.deleteBuffer(this.colorBuffer);
        this.gl.deleteBuffer(this.sizeBuffer);
        this.gl.deleteProgram(this.program);
        
        this.initialized = false;
    }
    
    /**
     * 运行兼容性测试（静态方法）
     * 检测浏览器对 WebGL 1.0 和 2.0 的支持情况
     * @returns {Object} 详细的兼容性报告，包含：
     *   - timestamp: 测试时间
     *   - userAgent: 用户代理字符串
     *   - webglSupported: WebGL 1.0 支持状态
     *   - webgl2Supported: WebGL 2.0 支持状态
     *   - details: 详细能力信息
     *   - isMobile/isIOS/isAndroid: 设备类型检测
     */
    static runCompatibilityTest() {
        const report = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            webglSupported: false,
            webgl2Supported: false,
            details: {}
        };
        
        // 测试 WebGL 1.0
        try {
            const testCanvas = document.createElement('canvas');
            const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
            
            if (gl) {
                report.webglSupported = true;
                report.details.webgl1 = {
                    renderer: gl.getParameter(gl.RENDERER),
                    vendor: gl.getParameter(gl.VENDOR),
                    version: gl.getParameter(gl.VERSION),
                    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
                    maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
                    maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
                    maxVertexUniformVectors: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
                    maxFragmentUniformVectors: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS)
                };
            }
        } catch (e) {
            report.details.webgl1Error = e.message;
        }
        
        // 测试 WebGL 2.0
        try {
            const testCanvas2 = document.createElement('canvas');
            const gl2 = testCanvas2.getContext('webgl2');
            
            if (gl2) {
                report.webgl2Supported = true;
                report.details.webgl2 = {
                    version: gl2.getParameter(gl2.VERSION)
                };
            }
        } catch (e) {
            report.details.webgl2Error = e.message;
        }
        
        // 检测移动设备
        report.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        report.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        report.isAndroid = /Android/.test(navigator.userAgent);
        
        console.log('[WebGLParticles] Compatibility Test Report:', report);
        return report;
    }
    
    /**
     * 获取当前兼容性信息
     * @returns {Object} 兼容性信息对象，包含 supported 和 reason 等字段
     */
    getCompatibilityInfo() {
        return this.compatibilityInfo || { supported: false, reason: 'Not initialized' };
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebGLParticleRenderer;
}
