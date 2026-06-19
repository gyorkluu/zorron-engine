# Zorron Engine API 契约

## 1. 约定

1. **协议**：HTTP/1.1 或 HTTP/2，JSON 数据交换。
2. **认证**：请求头 `Authorization: Bearer <JWT>`。
3. **请求 ID**：服务端从 `X-Request-Id` 读取，无则生成 UUID v7；响应头回写 `X-Request-Id`。
4. **内容类型**：`Content-Type: application/json`；文件上传使用 `multipart/form-data`。
5. **时间格式**：ISO 8601 UTC，如 `2026-06-18T12:00:00.000Z`。
6. **错误响应**：统一格式，见第 7 节。

---

## 2. 通用 Zod Schema

```ts
import { z } from 'zod';

export const UuidSchema = z.string().uuid();

export const TimestampSchema = z.string().datetime();

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const PaginationMetaSchema = z.object({
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});

export const ListResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    meta: PaginationMetaSchema,
  });
```

---

## 3. 认证 (Auth)

### 3.1 注册

```http
POST /api/auth/register
```

**请求体 Zod Schema**

```ts
export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  nickname: z.string().min(1).max(64).optional(),
});
```

**响应 201 Created**

```ts
export const AuthResponseSchema = z.object({
  user: z.object({
    id: UuidSchema,
    email: z.string().email(),
    nickname: z.string().nullable(),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  }),
  token: z.string(),
});
```

### 3.2 登录

```http
POST /api/auth/login
```

**请求体 Zod Schema**

```ts
export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});
```

**响应 200 OK**

```ts
AuthResponseSchema
```

### 3.3 刷新 Token

```http
POST /api/auth/refresh
```

**请求头**：`Authorization: Bearer <JWT>`

**响应 200 OK**

```ts
export const RefreshResponseSchema = z.object({
  token: z.string(),
});
```

### 3.4 获取当前用户

```http
GET /api/auth/me
```

**请求头**：`Authorization: Bearer <JWT>`

**响应 200 OK**

```ts
export const UserResponseSchema = z.object({
  id: UuidSchema,
  email: z.string().email(),
  nickname: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
```

---

## 4. 项目 (Project)

### 4.1 列表查询

```http
GET /api/projects
```

**查询参数 Zod Schema**

```ts
export const ListProjectsQuerySchema = PaginationQuerySchema.extend({
  keyword: z.string().max(100).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
```

**响应 200 OK**

```ts
export const ProjectListItemSchema = z.object({
  id: UuidSchema,
  title: z.string(),
  description: z.string().nullable(),
  coverUrl: z.string().url().nullable(),
  isPublished: z.boolean(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export const ListProjectsResponseSchema = ListResponseSchema(ProjectListItemSchema);
```

### 4.2 创建项目

```http
POST /api/projects
```

**请求体 Zod Schema**

```ts
export const CreateProjectRequestSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  data: FlowDataSchema.optional(),
});
```

其中 `FlowDataSchema` 见第 6 节。

**响应 201 Created**

```ts
export const ProjectDetailSchema = z.object({
  id: UuidSchema,
  title: z.string(),
  description: z.string().nullable(),
  coverUrl: z.string().url().nullable(),
  isPublished: z.boolean(),
  data: FlowDataSchema,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
```

### 4.3 获取项目详情

```http
GET /api/projects/:id
```

**路径参数**

```ts
export const ProjectIdParamSchema = z.object({
  id: UuidSchema,
});
```

**响应 200 OK**

```ts
ProjectDetailSchema
```

### 4.4 更新项目

```http
PATCH /api/projects/:id
```

**请求体 Zod Schema**

```ts
export const UpdateProjectRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  coverUrl: z.string().url().optional().nullable(),
  isPublished: z.boolean().optional(),
  data: FlowDataSchema.optional(),
});
```

**响应 200 OK**

```ts
ProjectDetailSchema
```

### 4.5 删除项目

```http
DELETE /api/projects/:id
```

**响应 204 No Content**

### 4.6 导出项目 JSON

```http
GET /api/projects/:id/export
```

**响应 200 OK**

```ts
ProjectDetailSchema
```

用于与本地 `project.json` 互操作。

### 4.7 导入项目 JSON

```http
POST /api/projects/import
```

**请求体 Zod Schema**

```ts
export const ImportProjectRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  data: FlowDataSchema,
});
```

**响应 201 Created**

```ts
ProjectDetailSchema
```

---

## 5. 资源 (Asset)

### 5.1 上传资源

```http
POST /api/assets
Content-Type: multipart/form-data
```

**表单字段**

```ts
export const UploadAssetRequestSchema = z.object({
  file: z.instanceof(File),
  projectId: UuidSchema.optional(),
  metadata: z.string().optional(), // JSON 字符串，解析后校验
});
```

**metadata 结构**

```ts
export const AssetMetadataSchema = z.object({
  type: z.enum(['image', 'audio', 'video', 'font', 'other']).default('other'),
  tags: z.array(z.string().max(50)).default([]),
});
```

**响应 201 Created**

```ts
export const AssetResponseSchema = z.object({
  id: UuidSchema,
  name: z.string(),
  type: z.enum(['image', 'audio', 'video', 'font', 'other']),
  mimeType: z.string(),
  size: z.number().int(),
  url: z.string().url(),
  projectId: UuidSchema.nullable(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
```

### 5.2 获取资源列表

```http
GET /api/assets
```

**查询参数 Zod Schema**

```ts
export const ListAssetsQuerySchema = PaginationQuerySchema.extend({
  projectId: UuidSchema.optional(),
  type: z.enum(['image', 'audio', 'video', 'font', 'other']).optional(),
  keyword: z.string().max(100).optional(),
});
```

**响应 200 OK**

```ts
ListResponseSchema(AssetResponseSchema)
```

### 5.3 获取资源详情

```http
GET /api/assets/:id
```

**响应 200 OK**

```ts
AssetResponseSchema
```

### 5.4 删除资源

```http
DELETE /api/assets/:id
```

**响应 204 No Content**

### 5.5 获取资源直链 / 签名 URL

```http
GET /api/assets/:id/url?expires=3600
```

**查询参数**

```ts
export const AssetUrlQuerySchema = z.object({
  expires: z.coerce.number().int().min(60).max(86400).optional().default(3600),
});
```

**响应 200 OK**

```ts
export const AssetUrlResponseSchema = z.object({
  url: z.string().url(),
  expiresAt: TimestampSchema.optional(),
});
```

---

## 6. FlowData Schema

`FlowData` 是项目的核心图数据，存储于 PostgreSQL JSONB 字段，同时用 Zod 校验。

```ts
export const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const NodeTypeSchema = z.enum([
  'start',
  'scene',
  'logic',
  'setter',
  'calculator',
  'settlement',
  'video',
  'link',
]);

export const BaseNodeDataSchema = z.object({
  label: z.string().optional(),
});

export const StartNodeDataSchema = BaseNodeDataSchema.extend({
  coverUrl: z.string().url().optional(),
  title: z.string().optional(),
  intro: z.string().optional(),
});

export const SceneNodeDataSchema = BaseNodeDataSchema.extend({
  dialogue: z.string().optional(),
  backgroundUrl: z.string().url().optional(),
  characterUrl: z.string().url().optional(),
  choices: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        targetNodeId: z.string().optional(),
        interaction: z.enum(['tap', 'hold', 'slash']).default('tap'),
        holdDuration: z.number().optional(),
        slashDirection: z.enum(['left', 'right', 'up', 'down']).optional(),
      })
    )
    .default([]),
});

export const LogicNodeDataSchema = BaseNodeDataSchema.extend({
  condition: z.string().optional(), // 条件表达式，后续可细化为结构化对象
});

export const SetterNodeDataSchema = BaseNodeDataSchema.extend({
  assignments: z
    .array(
      z.object({
        variable: z.string(),
        value: z.union([z.string(), z.number(), z.boolean()]),
        operator: z.enum(['set', 'add', 'sub']).default('set'),
      })
    )
    .default([]),
});

export const CalculatorNodeDataSchema = BaseNodeDataSchema.extend({
  vector: z.object({
    x: z.number().default(0),
    y: z.number().default(0),
    z: z.number().default(0),
  }),
  targetVariable: z.string().optional(),
});

export const SettlementNodeDataSchema = BaseNodeDataSchema.extend({
  resultMapping: z
    .array(
      z.object({
        resultId: z.string(),
        condition: z.string().optional(),
        title: z.string(),
        description: z.string().optional(),
        coverUrl: z.string().url().optional(),
      })
    )
    .default([]),
});

export const VideoNodeDataSchema = BaseNodeDataSchema.extend({
  videoUrl: z.string().url(),
  autoPlay: z.boolean().default(true),
  skipAllowed: z.boolean().default(true),
});

export const LinkNodeDataSchema = BaseNodeDataSchema.extend({
  url: z.string().url(),
  title: z.string().optional(),
});

export const GameNodeDataSchema = z.union([
  StartNodeDataSchema,
  SceneNodeDataSchema,
  LogicNodeDataSchema,
  SetterNodeDataSchema,
  CalculatorNodeDataSchema,
  SettlementNodeDataSchema,
  VideoNodeDataSchema,
  LinkNodeDataSchema,
]);

export const GameNodeSchema = z.object({
  id: z.string(),
  type: NodeTypeSchema,
  position: PositionSchema,
  data: GameNodeDataSchema,
  width: z.number().optional(),
  height: z.number().optional(),
});

export const GameEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  type: z.string().optional(),
  data: z.record(z.unknown()).optional(),
});

export const VariableSchema = z.record(z.union([z.string(), z.number(), z.boolean()]));

export const VectorSpaceConfigSchema = z.object({
  enabled: z.boolean().default(false),
  dimensions: z.object({
    x: z.string().default('处世'),
    y: z.string().default('立场'),
    z: z.string().default('性情'),
  }),
  sects: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        vector: z.object({ x: z.number(), y: z.number(), z: z.number() }),
      })
    )
    .optional(),
});

export const ProjectSettingsSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  coverUrl: z.string().url().optional(),
  bgmUrl: z.string().url().optional(),
  vectorSpace: VectorSpaceConfigSchema.default({ enabled: false }),
});

export const FlowDataSchema = z.object({
  nodes: z.array(GameNodeSchema).default([]),
  edges: z.array(GameEdgeSchema).default([]),
  variables: VariableSchema.default({}),
  settings: ProjectSettingsSchema.default({}),
  version: z.string().default('1.0.0'),
});
```

---

## 7. 健康检查

### 7.1 存活探针

```http
GET /health
```

**响应 200 OK**

```json
{
  "status": "ok",
  "timestamp": "2026-06-18T12:00:00.000Z"
}
```

### 7.2 就绪探针

```http
GET /ready
```

检查 PostgreSQL 与 Redis 连通性。

**响应 200 OK**

```json
{
  "status": "ready",
  "checks": {
    "database": "ok",
    "redis": "ok"
  },
  "timestamp": "2026-06-18T12:00:00.000Z"
}
```

**响应 503 Service Unavailable**

```json
{
  "status": "not_ready",
  "checks": {
    "database": "error",
    "redis": "ok"
  },
  "timestamp": "2026-06-18T12:00:00.000Z"
}
```

---

## 8. 错误响应

所有错误均返回以下统一结构：

```ts
export const ErrorResponseSchema = z.object({
  code: z.string(),        // 业务错误码，如 AUTH_001、PROJECT_404
  message: z.string(),     // 用户可读信息
  details: z.unknown().optional(), // 调试信息，仅 dev 环境返回
  requestId: z.string(),
});
```

### 8.1 常见业务错误码

| 错误码 | 说明 | HTTP 状态码 |
|---|---|---|
| `AUTH_001` | 未授权 | 401 |
| `AUTH_002` | Token 无效或过期 | 401 |
| `AUTH_003` | 邮箱或密码错误 | 401 |
| `AUTH_004` | 邮箱已注册 | 409 |
| `PROJECT_001` | 项目不存在 | 404 |
| `PROJECT_002` | 无权访问该项目 | 403 |
| `PROJECT_003` | 项目数据校验失败 | 400 |
| `ASSET_001` | 资源不存在 | 404 |
| `ASSET_002` | 文件过大 | 413 |
| `ASSET_003` | 不支持的文件类型 | 415 |
| `VALIDATION_001` | 请求参数校验失败 | 400 |
| `RATE_LIMIT_001` | 请求过于频繁 | 429 |
| `INTERNAL_001` | 服务器内部错误 | 500 |

---

## 9. 接口速查表

| 方法 | 路径 | 认证 | 说明 |
|---|---|---|---|
| POST | `/api/auth/register` | 否 | 注册 |
| POST | `/api/auth/login` | 否 | 登录 |
| POST | `/api/auth/refresh` | 是 | 刷新 Token |
| GET | `/api/auth/me` | 是 | 当前用户 |
| GET | `/api/projects` | 是 | 项目列表 |
| POST | `/api/projects` | 是 | 创建项目 |
| GET | `/api/projects/:id` | 是 | 项目详情 |
| PATCH | `/api/projects/:id` | 是 | 更新项目 |
| DELETE | `/api/projects/:id` | 是 | 删除项目 |
| GET | `/api/projects/:id/export` | 是 | 导出项目 |
| POST | `/api/projects/import` | 是 | 导入项目 |
| GET | `/api/assets` | 是 | 资源列表 |
| POST | `/api/assets` | 是 | 上传资源 |
| GET | `/api/assets/:id` | 是 | 资源详情 |
| DELETE | `/api/assets/:id` | 是 | 删除资源 |
| GET | `/api/assets/:id/url` | 是 | 资源直链/签名 URL |
| GET | `/health` | 否 | 存活探针 |
| GET | `/ready` | 否 | 就绪探针 |
