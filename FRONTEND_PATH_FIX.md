# 前端路径配置修复说明

## 问题描述
在"Configure Custom Path - whisper.cpp"对话框中点击"Browse..."按钮选择文件后，路径没有被正确填充到"Executable Path"输入框中。

## 问题原因
由于浏览器安全限制，Web应用无法通过文件选择器（`<input type="file">`）获取文件的真实文件系统路径。这是所有现代浏览器的安全特性。

## 解决方案

### 已实施的修改：

1. **移除了文件浏览器功能**
   - 删除了 `<input type="file">` 和相关的 `handleFileSelect` 逻辑
   - 移除了 `useRef` 的使用

2. **添加了帮助按钮**
   - 将"Browse..."按钮改为"Help"按钮
   - 点击显示如何在不同操作系统上找到文件路径的说明

3. **增强了用户体验**
   - 示例路径现在可以点击直接使用
   - 提供了针对macOS、Linux和Windows的详细指导
   - 更新了whisper.cpp的示例路径（whisper-cli而不是main）

### 使用方法：

#### 方法1: 使用示例路径
1. 打开配置对话框
2. 查看"Example paths"部分
3. 点击任何一个示例路径，它会自动填充到输入框
4. 修改为你的实际路径

#### 方法2: 手动输入路径

**macOS/Linux用户：**
```bash
# 在终端中运行以下命令找到whisper-cli路径
which whisper-cli

# 或者如果是手动编译的
ls ~/whisper.cpp/build/bin/whisper-cli
```

**Windows用户：**
1. 在文件资源管理器中找到whisper-cli.exe
2. 按住Shift键，右键点击文件
3. 选择"复制为路径"
4. 粘贴到输入框中

#### 方法3: 使用Help按钮
点击输入框旁边的"Help"按钮，查看详细的查找路径说明。

## 技术细节

### 修改的文件：
- `frontend/src/pages/Dependencies.jsx`

### 主要变更：
```javascript
// 之前 - 尝试使用文件选择器（无法工作）
const handleFileSelect = async (e) => {
  const file = e.target.files?.[0]
  // 浏览器无法获取真实路径
}

// 之后 - 提供帮助和示例
const handleBrowseHelp = () => {
  setShowBrowseHelp(true)  // 显示帮助信息
}
```

### 示例路径更新：
```javascript
'whisper.cpp': [
  '/usr/local/bin/whisper-cli',              // Homebrew安装路径
  '/opt/homebrew/bin/whisper-cli',           // Apple Silicon Homebrew
  '~/whisper.cpp/build/bin/whisper-cli',     // 手动编译相对路径
  '/Users/username/whisper.cpp/build/bin/whisper-cli',  // 手动编译绝对路径
  'C:\\whisper.cpp\\build\\bin\\Release\\whisper-cli.exe'  // Windows
]
```

## 测试验证

启动前端测试：
```bash
cd frontend
npm run dev
```

访问 http://localhost:3000，进入Dependencies页面，测试：
1. ✅ 点击"Path"按钮打开配置对话框
2. ✅ 点击示例路径能正确填充到输入框
3. ✅ 点击"Help"按钮显示帮助信息
4. ✅ 手动输入路径并保存能正确配置

## 备注

如果将来需要真正的文件浏览功能，可以考虑以下方案：

1. **使用Electron**：如果将应用打包为桌面应用，可以使用Electron的dialog API
2. **后端API**：添加一个后端接口来浏览文件系统
3. **原生应用**：使用Tauri等框架构建原生应用

对于现有的Web应用架构，当前的解决方案（手动输入+帮助提示）是最合适的。
