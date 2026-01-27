# 实时任务进度追踪功能

## 新增功能

系统现在支持实时显示工作流执行进度，包括：

1. **进度百分比** - 显示整体完成度
2. **当前模块** - 显示正在处理的模块
3. **当前步骤** - 显示具体操作
4. **已完成模块列表** - 显示已经完成的模块
5. **详细信息** - 显示后台正在处理的内容

## 实现方式

### 后端 (API)

1. **进度存储**:
   - `controller/state_store.py` - 添加了进度缓存和文件存储
   - 内存缓存 + JSON文件双重存储

2. **进度追踪**:
   - `controller/workflow_controller.py` - 在每个模块运行前后更新进度
   - 记录：状态、当前模块、完成进度、详细信息

3. **API端点**:
   - `POST /api/events/{event_id}/workflow/run` - 启动工作流（后台线程）
   - `GET /api/events/{event_id}/progress` - 查询实时进度

### 前端 (React)

1. **进度组件**:
   - `frontend/src/components/WorkflowProgress.jsx` - 进度可视化组件
   - 显示进度条、状态图标、详细信息

2. **自动轮询**:
   - `frontend/src/pages/EventDetail.jsx` - 添加轮询逻辑
   - 工作流运行时每秒查询一次进度
   - 完成或失败时自动停止轮询

## 使用方法

### 启动服务

```bash
# 后端
python api_server.py

# 前端（新终端）
cd frontend
npm run dev
```

### 测试进度显示

1. 打开浏览器访问 http://localhost:3000
2. 选择或创建一个事件
3. 上传视频
4. 点击 "Run Workflow"
5. 观察实时进度显示：
   - 进度条实时更新
   - 当前模块名称
   - 已完成模块列表
   - 详细处理信息

## 进度数据结构

```json
{
  "status": "running",           // running | completed | failed
  "current_module": "subtitles", // 当前模块
  "current_step": "Running subtitles",
  "completed_modules": ["thumbnail_compose"],
  "total_modules": 3,
  "progress_percent": 33,        // 0-100
  "details": "Processing module 2 of 3: subtitles",
  "updated_at": "2026-01-27T..."
}
```

## 进度状态

- **pending**: 未开始
- **running**: 正在运行（显示进度条和当前步骤）
- **completed**: 已完成（显示绿色成功标记）
- **failed**: 失败（显示错误信息）

## UI效果

### Running状态
- 蓝色边框和背景
- 旋转的加载图标
- 动态进度条
- 当前模块高亮
- 已完成模块列表（绿色标签）

### Completed状态
- 绿色边框和背景
- 勾选图标
- 100%进度

### Failed状态
- 红色边框和背景
- 错误图标
- 错误详细信息

## 性能优化

- **内存缓存**: 进度数据优先从内存读取
- **智能轮询**: 只在运行时轮询，完成后自动停止
- **后台运行**: 工作流在独立线程运行，不阻塞API请求

## 扩展性

将来可以添加：
- [ ] WebSocket实时推送（替代轮询）
- [ ] 模块内部进度（如字幕生成进度 20/100 segments）
- [ ] 预计剩余时间
- [ ] 暂停/恢复功能
- [ ] 多事件并行处理

## 测试场景

```bash
# 1. 测试字幕生成进度
# 创建事件 → 上传视频 → 启用 subtitles 模块 → 运行工作流
# 观察：进度从 0% → 100%，显示 "Running subtitles"

# 2. 测试多模块进度
# 启用 thumbnail + subtitles + ai_content
# 观察：依次显示每个模块名称，已完成列表逐步增加

# 3. 测试错误处理
# 不上传视频，直接运行工作流
# 观察：显示失败状态和错误信息
```

## 故障排除

### 进度不更新
- 确认后端服务器正在运行
- 检查浏览器控制台是否有API错误
- 确认轮询已启动（检查Network标签）

### 进度显示不准确
- 检查后端日志查看实际执行情况
- 查看 `events/{event_id}/logs/progress.json`

### 轮询停不下来
- 刷新页面重置状态
- 检查进度状态是否正确返回 "completed" 或 "failed"

---

**现在工作流执行过程完全透明可见！** 🎉
