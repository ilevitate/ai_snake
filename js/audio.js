/**
 * @fileoverview 音效管理器模块 - 负责游戏中的所有音效播放
 * 
 * 核心特性：
 * - 使用 Web Audio API 动态生成音效，无需外部音频文件
 * - 支持多种音效类型：普通食物、奖励食物、游戏结束、加速、穿墙、按钮点击
 * - 自动处理浏览器自动播放策略（音频上下文恢复）
 * - 音量控制和音效开关功能
 * 
 * 音效类型说明：
 * - eatFood: 清脆的"叮"声，使用正弦波频率渐变
 * - eatBonus: C大调和弦，多振荡器同时播放
 * - gameOver: 下降音阶，使用锯齿波营造紧张感
 * - speedUp: 频率线性上升的方波音效
 * - ghost: 频率下降的幽灵音效
 * - buttonClick: 短促的点击反馈音
 * 
 * @author 游戏开发团队
 * @version 2.0.0
 */

/**
 * 音效管理器类
 * 使用 Web Audio API 生成程序化音效
 * @class
 */
class AudioManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.volume = 0.3; // 默认音量 30%
        
        // 尝试初始化音频上下文
        this.init();
    }

    /**
     * 初始化音频上下文
     * 检测浏览器对 Web Audio API 的支持并创建音频上下文
     * 处理不同浏览器前缀（webkitAudioContext）
     * @returns {boolean} 初始化是否成功
     */
    init() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        } catch (e) {
            // Web Audio API 不支持，音效将被禁用
            this.enabled = false;
        }
    }

    /**
     * 恢复音频上下文
     * 解决浏览器自动播放策略限制（用户交互后才能播放音频）
     * 在每次播放音效前调用，确保音频上下文处于运行状态
     * @returns {Promise<void>|undefined}
     */
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    /**
     * 播放吃到普通食物的音效
     * 生成清脆的"叮"声效果
     * 使用正弦波从 A5 (880Hz) 快速上升到 A6 (1760Hz)
     * 音量快速衰减营造清脆感
     */
    playEatFood() {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        // 清脆的"叮"声
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, this.ctx.currentTime); // A5
        osc.frequency.exponentialRampToValueAtTime(1760, this.ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 0.15);
    }

    /**
     * 播放吃到奖励食物的音效
     * 播放 C 大调和弦（C-E-G）营造愉悦感
     * 使用三角波，三个音符依次播放产生琶音效果
     * 每个音符间隔 50ms，总时长约 450ms
     */
    playEatBonus() {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        // 播放和弦
        const frequencies = [523.25, 659.25, 783.99]; // C大调和弦
        
        frequencies.forEach((freq, index) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + index * 0.05);

            gain.gain.setValueAtTime(0, this.ctx.currentTime + index * 0.05);
            gain.gain.linearRampToValueAtTime(this.volume * 0.8, this.ctx.currentTime + index * 0.05 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + index * 0.05 + 0.3);

            osc.start(this.ctx.currentTime + index * 0.05);
            osc.stop(this.ctx.currentTime + index * 0.05 + 0.3);
        });
    }

    /**
     * 播放游戏结束音效
     * 播放下降的五个音阶（A4-G4-F#4-F4-E4）
     * 使用锯齿波营造紧张、失落的氛围
     * 每个音符间隔 150ms，模拟经典游戏结束音效
     */
    playGameOver() {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        const frequencies = [440, 415, 392, 370, 349]; // 下降音阶
        
        frequencies.forEach((freq, index) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + index * 0.15);

            gain.gain.setValueAtTime(0, this.ctx.currentTime + index * 0.15);
            gain.gain.linearRampToValueAtTime(this.volume, this.ctx.currentTime + index * 0.15 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + index * 0.15 + 0.2);

            osc.start(this.ctx.currentTime + index * 0.15);
            osc.stop(this.ctx.currentTime + index * 0.15 + 0.2);
        });
    }

    /**
     * 播放加速音效
     * 频率从 A3 (220Hz) 快速上升到 A5 (880Hz)
     * 使用方波产生机械感，模拟引擎加速声
     * 持续时间 200ms
     */
    playSpeedUp() {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'square';
        osc.frequency.setValueAtTime(220, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(880, this.ctx.currentTime + 0.2);

        gain.gain.setValueAtTime(this.volume * 0.5, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 0.2);
    }

    /**
     * 播放穿墙音效
     * 频率从 A4 (440Hz) 下降到 A3 (220Hz)
     * 使用正弦波产生幽灵般的空灵效果
     * 持续时间 300ms，配合穿墙视觉效果
     */
    playGhost() {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(220, this.ctx.currentTime + 0.3);

        gain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 0.3);
    }

    /**
     * 播放按钮点击音效
     * 短促的点击反馈音，频率从 600Hz 下降到 300Hz
     * 持续时间 100ms，提供触觉般的反馈感
     */
    playButtonClick() {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(this.volume * 0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 0.1);
    }

    /**
     * 设置音量
     * @param {number} vol - 音量值，范围 0-1
     * @description 自动限制在有效范围内
     */
    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
    }

    /**
     * 启用/禁用音效
     * @param {boolean} enabled - true 启用音效，false 禁用
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * 切换音效开关状态
     * @returns {boolean} 切换后的状态，true 为启用，false 为禁用
     */
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioManager;
}
