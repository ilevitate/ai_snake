# HTML内容提取工具 - 使用说明

## 概述

这个工具用于在浏览器控制台中提取网页内容，支持多网页内容追加到同一个txt文件。

**提取规则：**
- 以 `<h2>` 标签开头
- 以 `id="console"` 结尾
- 自动去除所有HTML标签

---

## 使用方法

### 第一步：加载工具

1. 打开任意网页（第一个要提取的网页）
2. 按 `F12` 打开开发者工具
3. 切换到 **Console（控制台）** 标签
4. 复制 [extract_html_console.js](file://D:\Item\Lingma\snake\extract_html_console.js) 文件中的全部代码
5. 粘贴到控制台，按 **回车** 执行

你会看到绿色提示："HTML内容提取工具已加载"

---

### 第二步：提取第一个网页

在控制台输入：
```javascript
extractAndDownload(false)
```

或简写：
```javascript
download(false)
```

**作用：** 创建新的txt文件，保存第一个网页提取的内容

---

### 第三步：提取后续网页（追加模式）

1. 切换到第二个要提取的网页
2. 再次按 `F12` 打开控制台
3. 再次粘贴并执行 [extract_html_console.js](file://D:\Item\Lingma\snake\extract_html_console.js) 代码
4. 输入：

```javascript
extractAndDownload(true)
```

或简写：
```javascript
download()  // 默认就是追加模式
```

**作用：** 将新提取的内容追加到之前下载的txt文件中

---

### 重复第三步

对每个新网页重复上述操作，所有内容都会追加到同一个txt文件。

---

## 完整示例流程

假设你要提取 网页A、网页B、网页C 的内容：

| 步骤 | 操作 | 控制台输入 |
|:---|:---|:---|
| 1 | 打开网页A，F12打开控制台 | |
| 2 | 粘贴执行JS代码 | （粘贴 extract_html_console.js 代码） |
| 3 | 提取并创建文件 | `extractAndDownload(false)` |
| 4 | 打开网页B，F12打开控制台 | |
| 5 | 粘贴执行JS代码 | （粘贴 extract_html_console.js 代码） |
| 6 | 提取并追加 | `extractAndDownload(true)` |
| 7 | 打开网页C，F12打开控制台 | |
| 8 | 粘贴执行JS代码 | （粘贴 extract_html_console.js 代码） |
| 9 | 提取并追加 | `extractAndDownload(true)` |

最终你会得到一个 `extracted_content.txt` 文件，包含三个网页的所有提取内容。

---

## 其他常用命令

### 仅预览，不下载
```javascript
extract()
```
在控制台显示提取的内容，但不下载文件

### 查看统计信息
```javascript
showStats()
```
显示已提取多少条内容

### 清空已存储的内容
```javascript
clearStorage()
```
重新开始，清空之前累积的所有内容

---

## 注意事项

1. **每次打开新网页都需要重新加载脚本**
   - 控制台代码不会跨页面保留
   - 每个新网页都要重新粘贴执行JS代码

2. **追加模式依赖全局变量**
   - 如果关闭了浏览器，之前累积的内容会丢失
   - 建议一次性完成所有网页的提取

3. **文件下载位置**
   - 文件会下载到浏览器的默认下载目录
   - 文件名默认为 `extracted_content.txt`

4. **如果提取不到内容**
   - 检查网页源代码中是否真的有 `<h2>...id="console"` 这样的结构
   - 使用 `extract()` 命令预览，看是否能找到匹配项

---

## 快速参考卡片

```javascript
// 第一个网页
extractAndDownload(false)

// 后续网页
extractAndDownload(true)

// 或更简单的写法
extract()        // 先预览
download()       // 再下载（自动追加）
```
