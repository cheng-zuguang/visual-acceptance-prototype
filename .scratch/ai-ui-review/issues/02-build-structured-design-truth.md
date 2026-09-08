# 为一个 Figma Frame 构建结构化 DesignTruth

Status: ready-for-agent

Type: AFK

User stories: US-01, US-02, US-07

## What to build

把一个可访问 Figma Frame 转换为结构化 DesignTruth。除了渲染图和展平元素，还要保留父子层级、Component/Instance 关系、Variant 属性、布局信息和样式证据，供后续动态行情识别和确定性比对使用。

## Acceptance criteria

- [ ] DesignTruth 同时包含 Frame 渲染图和结构化节点树
- [ ] 节点保留稳定 Figma ID、父节点、相对几何和样式信息
- [ ] Component、Instance 和 Variant 属性能够从固定样本中读取
- [ ] 非统一中英文 Variant 名称不会在解析阶段丢失
- [ ] 当前静态像素和元素比对仍可消费新的 DesignTruth
- [ ] 自动化测试覆盖普通 Frame、组件实例和缺少可选元数据的 Frame

## Blocked by

- [01 通过统一 ReviewService 运行现有静态 PagePair](./01-run-static-page-pair-through-review-service.md)

## Comments
