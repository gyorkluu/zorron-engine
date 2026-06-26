/**
 * Bilingual (zh-CN / en-US) translation dictionary for Zorron Editor.
 *
 * Chinese is the default locale. All UI chrome strings are defined here;
 * project content data (node labels, dialogue, etc.) remains user-authored.
 */

export type Locale = 'zh' | 'en';

/** Flat key → { zh, en } mapping for every UI string. */
export const translations = {
  // ── Brand & Global ──────────────────────────────────────────
  'brand.name': { zh: 'Zorron', en: 'Zorron' },

  // ── Toolbar ─────────────────────────────────────────────────
  'toolbar.untitled': { zh: '未命名项目', en: 'Untitled Project' },
  'toolbar.save.saved': { zh: '已保存', en: 'SAVED' },
  'toolbar.save.saving': { zh: '保存中…', en: 'SAVING…' },
  'toolbar.save.unsaved': { zh: '未保存', en: 'UNSAVED' },
  'toolbar.save.error': { zh: '保存失败', en: 'ERROR' },
  'toolbar.projects': { zh: '项目', en: 'Projects' },
  'toolbar.projects.tip': { zh: '浏览云端项目', en: 'Browse cloud projects' },
  'toolbar.sample': { zh: '示例', en: 'Sample' },
  'toolbar.sample.tip': { zh: '加载内置示例项目', en: 'Load built-in sample project' },
  'toolbar.import': { zh: '导入', en: 'Import' },
  'toolbar.export': { zh: '导出', en: 'Export' },
  'toolbar.save': { zh: '保存', en: 'Save' },
  'toolbar.lang.tip': { zh: '切换语言', en: 'Switch language' },

  // ── Workspace Switcher ──────────────────────────────────────
  'ws.cloud': { zh: '云端', en: 'Cloud' },
  'ws.local': { zh: '本地', en: 'Local' },
  'ws.cloud.title': { zh: '云端工作区', en: 'Cloud workspace' },
  'ws.cloud.disabled': { zh: '登录后可使用云端模式', en: 'Sign in to use cloud mode' },
  'ws.local.title': { zh: '本地工作区（文件保存到本地设备）', en: 'Local workspace (files saved to your device)' },
  'ws.cloud.signin': { zh: '请登录后使用云端模式', en: 'Please sign in to use cloud mode.' },
  'ws.local.fail': { zh: '切换到本地模式失败', en: 'Failed to switch to local mode.' },
  'ws.local.idb': { zh: '使用浏览器存储（IndexedDB）— 文件系统 API 不可用', en: 'Using browser storage (IndexedDB) — File System Access API not available.' },

  // ── Sync Status ─────────────────────────────────────────────
  'sync.idle': { zh: '空闲', en: 'Idle' },
  'sync.syncing': { zh: '同步中', en: 'Syncing' },
  'sync.synced': { zh: '已同步', en: 'SYNCED' },
  'sync.offline': { zh: '离线', en: 'Offline' },
  'sync.conflict': { zh: '冲突', en: 'Conflict' },
  'sync.error': { zh: '错误', en: 'Error' },
  'sync.local': { zh: '本地', en: 'Local' },
  'sync.local.tip': { zh: '本地模式 — 修改保存到本地设备', en: 'Working in local mode — changes save to your device.' },
  'sync.lastSync': { zh: '上次同步：{date}', en: 'Last synced: {date}' },

  // ── Node Palette ────────────────────────────────────────────
  'palette.title': { zh: '节点面板', en: 'NODE PALETTE' },
  'palette.hint': { zh: '将节点拖到画布上，或点击添加到中心位置。', en: 'Drag a node onto the canvas, or click to add at center.' },

  // ── Node Type Labels & Descriptions ─────────────────────────
  'node.start.label': { zh: '开始', en: 'Start' },
  'node.start.desc': { zh: '叙事流程的入口', en: 'Entry point of the narrative flow' },
  'node.scene.label': { zh: '场景', en: 'Scene' },
  'node.scene.desc': { zh: '对话舞台，包含选项与媒体', en: 'Dialogue stage with choices and media' },
  'node.logic.label': { zh: '逻辑', en: 'Logic' },
  'node.logic.desc': { zh: '基于变量或碎片分支', en: 'Branch flow based on variables or fragments' },
  'node.setter.label': { zh: '赋值', en: 'Setter' },
  'node.setter.desc': { zh: '修改变量', en: 'Modify narrative variables' },
  'node.calculator.label': { zh: '计算器', en: 'Calculator' },
  'node.calculator.desc': { zh: '应用待处理的人格向量增量', en: 'Apply pending personality vector deltas' },
  'node.settlement.label': { zh: '结算', en: 'Settlement' },
  'node.settlement.desc': { zh: '最终结果与原型匹配', en: 'Final result and archetype matching' },
  'node.video.label': { zh: '视频', en: 'Video' },
  'node.video.desc': { zh: '全屏视频播放节点', en: 'Fullscreen video playback node' },
  'node.link.label': { zh: '外链', en: 'External Link' },
  'node.link.desc': { zh: '打开外部链接', en: 'Open an external URL' },

  // ── Node defaults ───────────────────────────────────────────
  'node.default.start': { zh: '开始', en: 'Start' },
  'node.default.scene': { zh: '场景', en: 'Scene' },
  'node.default.logic': { zh: '逻辑', en: 'Logic' },
  'node.default.setter': { zh: '赋值', en: 'Setter' },
  'node.default.calculator': { zh: '计算器', en: 'Calculator' },
  'node.default.settlement': { zh: '结算', en: 'Settlement' },
  'node.default.video': { zh: '视频', en: 'Video' },
  'node.default.link': { zh: '链接', en: 'Link' },
  'node.default.newStory': { zh: '新故事', en: 'New Story' },

  // ── Inspector Panel ─────────────────────────────────────────
  'inspector.noSelect': { zh: '未选中节点', en: 'No node selected' },
  'inspector.noSelect.hint': { zh: '点击画布上的节点以编辑属性。', en: 'Click a node on the canvas to edit its properties.' },

  // ── Inspector Field Labels ──────────────────────────────────
  'field.label': { zh: '标签', en: 'LABEL' },
  'field.title': { zh: '标题', en: 'TITLE' },
  'field.intro': { zh: '简介', en: 'INTRO' },
  'field.coverUrl': { zh: '封面链接', en: 'COVER URL' },
  'field.speaker': { zh: '说话人', en: 'SPEAKER' },
  'field.dialogue': { zh: '对话', en: 'DIALOGUE' },
  'field.bgUrl': { zh: '背景图', en: 'BACKGROUND URL' },
  'field.charUrl': { zh: '角色图', en: 'CHARACTER URL' },
  'field.bgmUrl': { zh: '背景音乐', en: 'BGM URL' },
  'field.videoUrl': { zh: '视频链接', en: 'VIDEO URL' },
  'field.url': { zh: '链接', en: 'URL' },
  'field.description': { zh: '描述', en: 'DESCRIPTION' },
  'field.checkType': { zh: '检查类型', en: 'CHECK TYPE' },
  'field.variable': { zh: '变量', en: 'VARIABLE' },
  'field.operator': { zh: '运算符', en: 'OPERATOR' },
  'field.value': { zh: '值', en: 'VALUE' },
  'field.threshold': { zh: '阈值', en: 'THRESHOLD' },
  'field.fragmentId': { zh: '碎片 ID', en: 'FRAGMENT ID' },
  'field.vectorDelta': { zh: '向量增量', en: 'VECTOR DELTA' },
  'field.vectorDelta.hint': { zh: '穿越时应用到人格向量。', en: 'Applied to the personality vector on traversal.' },
  'field.targetVar': { zh: '目标变量', en: 'TARGET VARIABLE' },
  'field.targetVar.hint': { zh: '可选：将向量模长存入此变量。', en: 'Optional: store the vector magnitude into this variable.' },
  'field.targetVar.ph': { zh: '向量模长', en: 'vectorMagnitude' },
  'field.autoPlay': { zh: '自动播放', en: 'Auto play' },
  'field.allowSkip': { zh: '允许跳过', en: 'Allow skip' },
  'field.dragImage': { zh: '拖入图片资源', en: 'Drag an image here.' },
  'field.dragVideo': { zh: '拖入视频资源', en: 'Drag a video asset here.' },
  'field.urlPlaceholder': { zh: 'https://…', en: 'https://...' },
  'field.set': { zh: '设置', en: 'set' },

  // ── Inspector: Check Type options ───────────────────────────
  'checkType.variable': { zh: '变量检查', en: 'Variable' },
  'checkType.count': { zh: '碎片数量', en: 'Fragment count' },
  'checkType.has': { zh: '拥有碎片', en: 'Has fragment' },

  // ── Inspector: Choices Editor ───────────────────────────────
  'choices.title': { zh: '选项（{n}）', en: 'CHOICES ({n})' },
  'choices.add': { zh: '+ 添加', en: '+ Add' },
  'choices.empty': { zh: '暂无选项，添加一个让玩家继续推进。', en: 'No choices yet. Add one to let the player advance.' },
  'choices.del': { zh: '删除', en: 'Del' },
  'choices.textPh': { zh: '选项文本', en: 'Choice text' },
  'choices.newDefault': { zh: '新选项', en: 'New choice' },
  'choices.interaction': { zh: '交互方式', en: 'INTERACTION' },
  'choices.holdMs': { zh: '长按时长（毫秒）', en: 'HOLD (MS)' },
  'choices.direction': { zh: '方向', en: 'DIRECTION' },

  // ── Interaction types ───────────────────────────────────────
  'interaction.tap': { zh: '点击', en: 'Tap' },
  'interaction.hold': { zh: '长按', en: 'Hold' },
  'interaction.slash': { zh: '滑动', en: 'Slash' },

  // ── Slash directions ────────────────────────────────────────
  'dir.left': { zh: '左', en: 'Left' },
  'dir.right': { zh: '右', en: 'Right' },
  'dir.up': { zh: '上', en: 'Up' },
  'dir.down': { zh: '下', en: 'Down' },

  // ── Inspector: Assignments Editor ───────────────────────────
  'assign.title': { zh: '赋值（{n}）', en: 'ASSIGNMENTS ({n})' },
  'assign.add': { zh: '+ 添加', en: '+ Add' },
  'assign.empty': { zh: '暂无赋值。', en: 'No assignments yet.' },
  'assign.del': { zh: '删除', en: 'Del' },
  'assign.varPh': { zh: '变量名', en: 'score' },
  'assign.op.set': { zh: '= 赋值', en: '= set' },
  'assign.op.add': { zh: '+= 加', en: '+= add' },
  'assign.op.sub': { zh: '-= 减', en: '-= sub' },

  // ── Inspector: Settlement Results ───────────────────────────
  'results.title': { zh: '结果（{n}）', en: 'RESULTS ({n})' },
  'results.add': { zh: '+ 添加', en: '+ Add' },
  'results.del': { zh: '删除', en: 'Del' },
  'results.descPh': { zh: '描述', en: 'Description' },
  'results.newDefault': { zh: '新结果', en: 'New result' },

  // ── Inspector footer ────────────────────────────────────────
  'inspector.duplicate': { zh: '复制', en: 'Duplicate' },
  'inspector.delete': { zh: '删除', en: 'Delete' },

  // ── Vector Editor ───────────────────────────────────────────
  'vector.x': { zh: 'X', en: 'X' },
  'vector.y': { zh: 'Y', en: 'Y' },
  'vector.z': { zh: 'Z', en: 'Z' },

  // ── Assets Panel ────────────────────────────────────────────
  'asset.title': { zh: '资源库', en: 'ASSETS' },
  'asset.all': { zh: '全部', en: 'All' },
  'asset.image': { zh: '图片', en: 'Image' },
  'asset.audio': { zh: '音频', en: 'Audio' },
  'asset.video': { zh: '视频', en: 'Video' },
  'asset.font': { zh: '字体', en: 'Font' },
  'asset.other': { zh: '其他', en: 'Other' },
  'asset.search': { zh: '搜索资源…', en: 'Search assets...' },
  'asset.upload': { zh: '上传或拖入文件', en: 'Upload or drop files' },
  'asset.uploadHint': { zh: '图片 / 音频 / 视频 / 字体', en: 'Image / Audio / Video / Font' },
  'asset.uploading': { zh: '上传中…', en: 'Uploading...' },
  'asset.empty': { zh: '暂无资源', en: 'No assets' },
  'asset.emptyHint': { zh: '上传文件或调整筛选条件。', en: 'Upload a file or adjust your filters.' },
  'asset.selectHint': { zh: '选择资源查看详情。', en: 'Select an asset to view details.' },
  'asset.details': { zh: '详情', en: 'Details' },
  'asset.references': { zh: '引用', en: 'References' },
  'asset.url': { zh: '链接', en: 'URL' },
  'asset.local': { zh: '本地', en: 'local' },
  'asset.remote': { zh: '远程', en: 'remote' },
  'asset.delete': { zh: '删除资源', en: 'Delete asset' },
  'asset.confirm': { zh: '再次点击确认', en: 'Click again to confirm' },
  'asset.cancel': { zh: '取消', en: 'Cancel' },
  'asset.close': { zh: '关闭详情', en: 'Close details' },
  'asset.networkError': { zh: '网络错误：无法连接服务器。', en: 'Network error: unable to reach the server.' },

  // ── Simulation ──────────────────────────────────────────────
  'sim.trigger': { zh: '模拟', en: 'Simulate' },
  'sim.trigger.tip': { zh: '运行蒙特卡洛模拟', en: 'Run Monte Carlo simulation' },
  'sim.title': { zh: '蒙特卡洛模拟', en: 'Monte Carlo Simulation' },
  'sim.desc': { zh: '对当前流程图进行随机遍历，发现死胡同、不可达节点和结算分布不均等问题。', en: 'Run random traversals of the current flow graph to discover dead ends, unreachable nodes and settlement distribution imbalances.' },
  'sim.runs': { zh: '运行次数', en: 'Runs' },
  'sim.seed': { zh: '随机种子（可选）', en: 'Seed (optional)' },
  'sim.seedPh': { zh: '随机', en: 'random' },
  'sim.strategy': { zh: '策略', en: 'Strategy' },
  'sim.strategy.random': { zh: '随机（均匀）', en: 'Random (uniform)' },
  'sim.strategy.weighted': { zh: '加权（按选项顺序）', en: 'Weighted (by choice order)' },
  'sim.run': { zh: '运行模拟', en: 'Run Simulation' },
  'sim.running': { zh: '运行中…', en: 'Running...' },
  'sim.stat.runs': { zh: '运行', en: 'Runs' },
  'sim.stat.settlements': { zh: '结算', en: 'Settlements' },
  'sim.stat.deadEnds': { zh: '死胡同', en: 'Dead ends' },
  'sim.stat.timeouts': { zh: '超时', en: 'Timeouts' },
  'sim.distribution': { zh: '结算分布', en: 'Settlement Distribution' },
  'sim.vectorStats': { zh: '向量统计', en: 'Vector Statistics' },
  'sim.reachability': { zh: '节点可达性', en: 'Node Reachability' },
  'sim.noSettlements': { zh: '没有到达任何结算节点。', en: 'No settlement nodes were reached.' },
  'sim.noNodes': { zh: '流程中没有节点。', en: 'No nodes in the flow.' },
  'sim.axis': { zh: '轴', en: 'Axis' },
  'sim.meanStd': { zh: '均值 ± 标准差', en: 'Mean ± StdDev' },
  'sim.mean': { zh: '均值', en: 'Mean' },
  'sim.stddev': { zh: '标准差', en: 'StdDev' },
  'sim.export': { zh: '导出报告', en: 'Export Report' },
  'sim.close': { zh: '关闭', en: 'Close' },

  // ── Cloud Projects ──────────────────────────────────────────
  'cloud.title': { zh: '云端项目', en: 'Cloud Projects' },
  'cloud.new': { zh: '新建项目', en: 'New Project' },
  'cloud.creating': { zh: '创建中…', en: 'Creating...' },
  'cloud.search': { zh: '搜索项目…', en: 'Search projects...' },
  'cloud.searchBtn': { zh: '搜索', en: 'Search' },
  'cloud.loading': { zh: '加载项目中…', en: 'Loading projects...' },
  'cloud.empty': { zh: '暂无项目。点击「新建项目」创建。', en: 'No projects yet. Click "New Project" to create one.' },
  'cloud.published': { zh: '已发布', en: 'Published' },
  'cloud.noDesc': { zh: '无描述', en: 'No description' },
  'cloud.updated': { zh: '更新于', en: 'Updated' },
  'cloud.open': { zh: '打开', en: 'Open' },
  'cloud.delete': { zh: '删除', en: 'Delete' },
  'cloud.deleteConfirm': { zh: '确定删除此项目？此操作不可撤销。', en: 'Delete this project? This cannot be undone.' },
  'cloud.untitled': { zh: '未命名项目', en: 'Untitled Project' },
  'cloud.page': { zh: '第 {n} 页', en: 'Page {n}' },
  'cloud.prev': { zh: '上一页', en: 'Prev' },
  'cloud.next': { zh: '下一页', en: 'Next' },
  'cloud.signinTitle': { zh: '需要登录', en: 'Sign in required' },
  'cloud.signinDesc': { zh: '云端项目需要登录后才能使用。切换到本地模式可无需账号工作。', en: 'Cloud projects are only available after signing in. Switch to local mode to work without an account.' },

  // ── Conflict Dialog ─────────────────────────────────────────
  'conflict.title': { zh: '检测到同步冲突', en: 'Sync Conflict Detected' },
  'conflict.body': { zh: '项目「{title}」在本地和云端均被修改。请选择保留哪个版本。', en: 'The project {title} was modified both locally and in the cloud. Choose which version to keep.' },
  'conflict.local': { zh: '本地', en: 'Local' },
  'conflict.cloud': { zh: '云端', en: 'Cloud' },
  'conflict.titleLabel': { zh: '标题：', en: 'Title:' },
  'conflict.updated': { zh: '更新：', en: 'Updated:' },
  'conflict.nodes': { zh: '节点：', en: 'Nodes:' },
  'conflict.keepLocal': { zh: '保留本地', en: 'Keep Local' },
  'conflict.keepCloud': { zh: '保留云端', en: 'Keep Cloud' },

  // ── Vector 3D ───────────────────────────────────────────────
  'vector3d.title': { zh: '三维向量空间', en: '3D Vector Space' },
  'vector3d.sects': { zh: '{n} 个门派', en: '{n} sects' },
  'vector3d.disabled': { zh: '向量空间未启用。在项目设置中开启以可视化三维人格空间。', en: 'Vector space is disabled. Enable it in the project settings to visualize the 3D personality space.' },
  'vector3d.settings': { zh: '向量空间', en: 'Vector Space' },
  'vector3d.enable': { zh: '启用三维向量空间', en: 'Enable 3D vector space' },
  'vector3d.xAxis': { zh: 'X 轴', en: 'X Axis' },
  'vector3d.yAxis': { zh: 'Y 轴', en: 'Y Axis' },
  'vector3d.zAxis': { zh: 'Z 轴', en: 'Z Axis' },
  'vector3d.sects.title': { zh: '门派锚点（{n}）', en: 'Sect Anchors ({n})' },
  'vector3d.sects.add': { zh: '+ 添加门派', en: '+ Add Sect' },
  'vector3d.sects.empty': { zh: '暂无门派锚点。添加一个来定义人格原型。', en: 'No sect anchors yet. Add one to define a personality archetype.' },
  'vector3d.sects.del': { zh: '删除', en: 'Del' },
  'vector3d.sects.titleField': { zh: '称号', en: 'Title' },
  'vector3d.sects.titlePh': { zh: '显示称号', en: 'Display title' },
  'vector3d.sects.anchor': { zh: '锚点向量', en: 'Anchor Vector' },
  'vector3d.sects.anchor.hint': { zh: '此门派在三维空间中的位置。', en: 'Position of this sect in the 3D space.' },
  'vector3d.sects.namePh': { zh: '门派名称', en: 'Sect name' },
  'vector3d.sects.default': { zh: '门派 {n}', en: 'Sect {n}' },

  // ── Node fallbacks (canvas) ─────────────────────────────────
  'nodeFallback.scene': { zh: '场景', en: 'Scene' },
  'nodeFallback.noDialogue': { zh: '暂无对话', en: 'No dialogue yet' },
  'nodeFallback.more': { zh: '+{n} 更多', en: '+{n} more' },
  'nodeFallback.logic': { zh: '逻辑', en: 'Logic' },
  'nodeFallback.logicCheck': { zh: '{type} 检查', en: '{type} check' },
  'nodeFallback.setter': { zh: '赋值', en: 'Setter' },
  'nodeFallback.noAssign': { zh: '暂无赋值', en: 'No assignments' },
  'nodeFallback.calculator': { zh: '计算器', en: 'Calculator' },
  'nodeFallback.settlement': { zh: '结算', en: 'Settlement' },
  'nodeFallback.noResults': { zh: '暂无结果', en: 'No results mapped' },
  'nodeFallback.video': { zh: '视频', en: 'Video' },
  'nodeFallback.noVideo': { zh: '暂无视频', en: 'No video URL' },
  'nodeFallback.autoplay': { zh: '自动播放', en: 'autoplay' },
  'nodeFallback.noAutoplay': { zh: '不自动播放', en: 'no-autoplay' },
  'nodeFallback.skippable': { zh: '可跳过', en: 'skippable' },
  'nodeFallback.noSkip': { zh: '不可跳过', en: 'no-skip' },
  'nodeFallback.link': { zh: '链接', en: 'Link' },
  'nodeFallback.noUrl': { zh: '暂无链接', en: 'No URL' },
  'nodeFallback.edge': { zh: '流程', en: 'flow' },

  // ── Player ──────────────────────────────────────────────────
  'player.loading': { zh: '加载中…', en: 'Loading...' },
  'player.exit': { zh: '退出', en: 'Exit' },
  'player.begin': { zh: '开始', en: 'Begin' },
  'player.restart': { zh: '重新开始', en: 'Restart' },
  'player.skip': { zh: '跳过', en: 'Skip' },
  'player.openLink': { zh: '打开链接', en: 'Open link' },
  'player.magnitude': { zh: '模长：', en: 'Magnitude:' },
  'player.quadrant': { zh: '象限：', en: 'Quadrant:' },
  'player.distance': { zh: '距离：', en: 'Distance:' },
  'player.noProjectId': { zh: '未提供项目 ID', en: 'No project id provided' },
  'player.loadFail': { zh: '加载失败', en: 'Failed to load' },
  'player.loadingPlayer': { zh: '正在加载播放器…', en: 'Loading player...' },
  'player.loadProjectFail': { zh: '项目加载失败', en: 'Failed to load project' },
  'player.backToEditor': { zh: '返回编辑器', en: 'Back to Editor' },
  'player.noProjectJson': { zh: '未提供 projectId 或 projectJson', en: 'No projectId or projectJson provided' },
  'player.loadProjectStatus': { zh: '项目加载失败：{status}', en: 'Failed to load project: {status}' },

  // ── Canvas controls ─────────────────────────────────────────
  'canvas.zoomIn': { zh: '放大', en: 'Zoom In' },
  'canvas.zoomOut': { zh: '缩小', en: 'Zoom Out' },
  'canvas.fitView': { zh: '适应视图', en: 'Fit View' },
  'canvas.toggleInteract': { zh: '切换交互', en: 'Toggle Interactivity' },
  'canvas.minimap': { zh: '小地图', en: 'Mini Map' },

  // ── P1-1: Preview Player ────────────────────────────────────
  'toolbar.preview': { zh: '预览', en: 'Preview' },
  'toolbar.preview.tip': { zh: '在编辑器内预览当前流程', en: 'Preview current flow in-editor' },
  'preview.title': { zh: '预览播放器', en: 'Preview Player' },
  'preview.exit': { zh: '退出预览', en: 'Exit Preview' },
  'preview.empty': { zh: '画布为空，请先添加节点再预览。', en: 'Canvas is empty. Add nodes before previewing.' },
  'preview.noStart': { zh: '未找到开始节点，预览将从第一个节点开始。', en: 'No start node found. Preview will begin from the first node.' },

  // ── P1-2: Onboarding Tutorial ───────────────────────────────
  'onboarding.welcome': { zh: '欢迎使用 Zorron 编辑器', en: 'Welcome to Zorron Editor' },
  'onboarding.skip': { zh: '跳过引导', en: 'Skip Tour' },
  'onboarding.next': { zh: '下一步', en: 'Next' },
  'onboarding.prev': { zh: '上一步', en: 'Back' },
  'onboarding.done': { zh: '开始使用', en: 'Get Started' },
  'onboarding.step': { zh: '第 {n}/{total} 步', en: 'Step {n}/{total}' },
  'onboarding.step1.title': { zh: '添加节点', en: 'Add Nodes' },
  'onboarding.step1.body': { zh: '从左侧节点面板拖拽或点击节点，构建你的叙事流程。', en: 'Drag or click nodes from the left palette to build your narrative flow.' },
  'onboarding.step2.title': { zh: '编辑属性', en: 'Edit Properties' },
  'onboarding.step2.body': { zh: '选中节点后，在右侧检查器中编辑对话、选项、变量等属性。', en: 'Select a node and edit dialogue, choices, variables and more in the right inspector.' },
  'onboarding.step3.title': { zh: '预览与发布', en: 'Preview & Publish' },
  'onboarding.step3.body': { zh: '点击工具栏「预览」按钮即时试玩，或导出 JSON 在 H5 中嵌入。', en: 'Click "Preview" in the toolbar to playtest, or export JSON to embed in H5.' },

  // ── P1-3: Context Menu ──────────────────────────────────────
  'ctx.copy': { zh: '复制', en: 'Copy' },
  'ctx.paste': { zh: '粘贴', en: 'Paste' },
  'ctx.duplicate': { zh: '克隆', en: 'Duplicate' },
  'ctx.delete': { zh: '删除', en: 'Delete' },
  'ctx.select.all': { zh: '全选', en: 'Select All' },
  'ctx.add': { zh: '添加节点', en: 'Add Node' },
  'ctx.empty': { zh: '此处无可用操作', en: 'No actions available' },

  // ── P1-4: Node Search ───────────────────────────────────────
  'search.placeholder': { zh: '搜索节点（按标签或对话）…', en: 'Search nodes (by label or dialogue)...' },
  'search.title': { zh: '跳转到节点', en: 'Go to Node' },
  'search.empty': { zh: '未找到匹配的节点。', en: 'No matching nodes found.' },
  'search.hint': { zh: '↑↓ 选择，Enter 跳转，Esc 关闭', en: '↑↓ to navigate, Enter to jump, Esc to close' },
  'search.count': { zh: '{n} 个结果', en: '{n} results' },

  // ── P2-1: Variables Panel ───────────────────────────────────
  'vars.title': { zh: '变量管理', en: 'Variables' },
  'vars.tip': { zh: '管理项目变量', en: 'Manage project variables' },
  'vars.empty': { zh: '暂无变量。点击「+ 添加」创建。', en: 'No variables yet. Click "+ Add" to create one.' },
  'vars.add': { zh: '+ 添加', en: '+ Add' },
  'vars.name': { zh: '名称', en: 'Name' },
  'vars.value': { zh: '值', en: 'Value' },
  'vars.type': { zh: '类型', en: 'Type' },
  'vars.del': { zh: '删除', en: 'Delete' },
  'vars.namePh': { zh: '变量名', en: 'variableName' },
  'vars.type.string': { zh: '字符串', en: 'String' },
  'vars.type.number': { zh: '数字', en: 'Number' },
  'vars.type.boolean': { zh: '布尔', en: 'Boolean' },
  'vars.used': { zh: '已被 {n} 处引用', en: 'Referenced by {n} nodes' },
  'vars.unused': { zh: '未被引用', en: 'Unused' },
  'vars.confirmDel': { zh: '该变量已被引用，确定删除？', en: 'This variable is referenced. Delete anyway?' },

  // ── P2-2: Fragment System ───────────────────────────────────
  'frag.title': { zh: '碎片系统', en: 'Fragment System' },
  'frag.tip': { zh: '查看碎片收集路径', en: 'View fragment collection paths' },
  'frag.empty': { zh: '暂无碎片。在场景选项中设置「掉落碎片」即可生成。', en: 'No fragments yet. Set "drop fragment" on scene choices to generate them.' },
  'frag.id': { zh: '碎片 ID', en: 'Fragment ID' },
  'frag.sources': { zh: '来源节点', en: 'Source Nodes' },
  'frag.checks': { zh: '检查节点', en: 'Check Nodes' },
  'frag.count': { zh: '{n} 个碎片', en: '{n} fragments' },

  // ── P2-3: Template Library ──────────────────────────────────
  'tpl.title': { zh: '模板库', en: 'Templates' },
  'tpl.tip': { zh: '一键插入预设结构', en: 'Insert preset structures' },
  'tpl.insert': { zh: '插入', en: 'Insert' },
  'tpl.empty.start': { zh: '开始 + 场景', en: 'Start + Scene' },
  'tpl.empty.start.desc': { zh: '一个开始节点连接到一个场景节点，适合快速起步。', en: 'A start node connected to a scene node. Great for quick starts.' },
  'tpl.branch.desc': { zh: '一个场景节点分出两个分支，适合二选一情境。', en: 'A scene node branching into two paths. Great for either/or choices.' },
  'tpl.branch': { zh: '场景 + 分支', en: 'Scene + Branch' },
  'tpl.loop.desc': { zh: '场景 → 逻辑 → 赋值 → 回到场景，构成循环结构。', en: 'Scene → Logic → Setter → back to Scene, forming a loop.' },
  'tpl.loop': { zh: '循环结构', en: 'Loop Structure' },
  'tpl.end.desc': { zh: '场景 → 结算，构成最简完整流程。', en: 'Scene → Settlement, the simplest complete flow.' },
  'tpl.end': { zh: '场景 + 结算', en: 'Scene + Settlement' },
  'tpl.confirm': { zh: '将追加到画布，是否继续？', en: 'Will append to canvas. Continue?' },

  // ── P2-4: Condition Builder ─────────────────────────────────
  'cond.title': { zh: '条件构建器', en: 'Condition Builder' },
  'cond.add': { zh: '+ 添加条件', en: '+ Add Condition' },
  'cond.empty': { zh: '暂无条件。', en: 'No conditions yet.' },
  'cond.del': { zh: '删除', en: 'Del' },
  'cond.and': { zh: '且（AND）', en: 'AND' },
  'cond.or': { zh: '或（OR）', en: 'OR' },
  'cond.not': { zh: '非（NOT）', en: 'NOT' },
  'cond.preview': { zh: '预览表达式', en: 'Expression Preview' },
  'cond.preview.empty': { zh: '添加条件后将显示表达式预览。', en: 'Add conditions to see the expression preview.' },
  'cond.operand.var': { zh: '变量', en: 'Variable' },
  'cond.operand.frag': { zh: '碎片数', en: 'Fragment Count' },
  'cond.operand.const': { zh: '常量', en: 'Constant' },
  'cond.operator.eq': { zh: '等于 ==', en: 'Equals ==' },
  'cond.operator.ne': { zh: '不等于 !=', en: 'Not equals !=' },
  'cond.operator.gt': { zh: '大于 >', en: 'Greater than >' },
  'cond.operator.lt': { zh: '小于 <', en: 'Less than <' },
  'cond.operator.ge': { zh: '大于等于 >=', en: 'Greater or equal >=' },
  'cond.operator.le': { zh: '小于等于 <=', en: 'Less or equal <=' },

  // ── P2-5: Version History ───────────────────────────────────
  'history.title': { zh: '版本历史', en: 'Version History' },
  'history.tip': { zh: '查看与恢复历史快照', en: 'View and restore history snapshots' },
  'history.empty': { zh: '暂无历史快照。保存后将自动记录。', en: 'No snapshots yet. They are recorded automatically on save.' },
  'history.restore': { zh: '恢复', en: 'Restore' },
  'history.current': { zh: '当前', en: 'Current' },
  'history.snapshot': { zh: '快照 {n}', en: 'Snapshot {n}' },
  'history.nodes': { zh: '{n} 节点', en: '{n} nodes' },
  'history.confirm': { zh: '恢复此快照将覆盖当前画布，是否继续？', en: 'Restoring will overwrite the current canvas. Continue?' },
  'history.clear': { zh: '清空历史', en: 'Clear History' },
  'history.clearConfirm': { zh: '确定清空所有历史快照？此操作不可撤销。', en: 'Clear all snapshots? This cannot be undone.' },

  // ── Common UI ───────────────────────────────────────────────
  'common.confirm': { zh: '确认', en: 'Confirm' },
  'common.cancel': { zh: '取消', en: 'Cancel' },
  'common.close': { zh: '关闭', en: 'Close' },
  'common.apply': { zh: '应用', en: 'Apply' },
  'common.ok': { zh: '好', en: 'OK' },
} as const;

/** Type of a translation key. */
export type TranslationKey = keyof typeof translations;

/** Replace {placeholder} tokens in a string with provided params. */
export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in params ? String(params[key]) : `{${key}}`,
  );
}
