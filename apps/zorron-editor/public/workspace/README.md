# Workspace 资源目录

将图片文件放在此目录下，可以直接通过 `/workspace/文件名` 在项目中引用。

## 使用方式

1. **开发时**: 将图片复制到此文件夹，Vite 会自动提供服务
2. **Player 组件**: 图片路径可以直接写 `/workspace/image.png`
3. **构建后**: 需要手动将图片复制到 `dist/workspace` 目录

## 支持的格式

- PNG
- JPG/JPEG
- WebP
- GIF

## 示例

```vue
<img src="/workspace/background.png" />
```
