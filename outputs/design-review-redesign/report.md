# 视觉验收报告

**结论：不通过**

- 设计来源：Figma 0:72
- 实际来源：https://luna.gtjaf.cc:30443/market-helper/fed?template_id=1401
- 证据模式：live
- 视口：375 × 2370
- 稳定区域相似度：76.58%
- 动态区域占比：0.25%
- 归一化策略：normalize-probability-text
- 错误：32；警告：1；待确认：71
- 交集覆盖：匹配 34；设计未匹配 281；开发未匹配 112

设计覆盖未完成：仍有设计区域未能验证。规则通过不代表所有设计项已验收，请核查待确认问题与覆盖清单。

## 模块核验建议（非确认缺失）

- 编组 模块疑似缺失（待核验）：核查实际页面是否存在「编组」模块；确认缺失后按设计补齐，若已存在则核对其内部结构与样式。 (`review-issue:coverage:0:73`)
- 快评 模块疑似缺失（待核验）：核查实际页面是否存在「快评」模块；确认缺失后按设计补齐，若已存在则核对其内部结构与样式。 (`review-issue:coverage:0:78`)
- 层叠备份 4 模块疑似缺失（待核验）：核查实际页面是否存在「层叠备份 4」模块；确认缺失后按设计补齐，若已存在则核对其内部结构与样式。 (`review-issue:coverage:0:119`)
- jimeng-2025-07-31-1289-UI图标，采用卡通3D风格，立体，从斜45度视角俯视，日历图标（蓝色外框，中间白... (1) 模块疑似缺失（待核验）：核查实际页面是否存在「jimeng-2025-07-31-1289-UI图标，采用卡通3D风格，立体，从斜45度视角俯视，日历图标（蓝色外框，中间白... (1)」模块；确认缺失后按设计补齐，若已存在则核对其内部结构与样式。 (`review-issue:coverage:0:143`)
- 概率 设计覆盖未能验证：核查实际页面是否存在「概率」模块；确认缺失后按设计补齐，若已存在则核对其内部结构与样式。 (`review-issue:coverage:0:328`)
- 最新概率 设计覆盖未能验证：核查实际页面是否存在「最新概率」模块；确认缺失后按设计补齐，若已存在则核对其内部结构与样式。 (`review-issue:coverage:0:340`)
- 免费开通期货权限 设计覆盖未能验证：核查实际页面是否存在「免费开通期货权限」模块；确认缺失后按设计补齐，若已存在则核对其内部结构与样式。 (`review-issue:coverage:0:319`)

## 设计覆盖清单

像素范围：已审查 / 已豁免 / 整图 616125 / 2200 / 888750

| 节点 | 名称 | 对应关系 | 审查结果 | 原因 | 实际元素 | 问题引用 |
| --- | --- | --- | --- | --- | --- | --- |
| 0:224 | 状态栏 | unverified | pending | correspondence-unresolved | - | review-issue:coverage:0:224 |
| 0:225 | 矩形 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:224 |
| 0:226 | Bars/Status Bars/iPhone/Dark | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:224 |
| I0:226;0:2192 | Time Style | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:224 |
| I0:226;0:2193 | Battery | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:224 |
| I0:226;0:2194 | Border | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:224 |
| I0:226;0:2203 | Cellular Connection | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:224 |
| I0:226;0:2205 | Cellular-Connection-path | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:224 |
| I0:226;0:2199 | Wifi | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:224 |
| I0:226;0:2197 | Wifi-path | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:224 |
| I0:226;0:2196 | Capacity | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:224 |
| I0:226;0:2192;0:2222 | Time | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:224 |
| I0:226;0:2204 | Cellular-Connection-path | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:224 |
| I0:226;0:2198 | Wifi-path | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:224 |
| I0:226;0:2195 | Cap | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:224 |
| I0:226;0:2202 | Cellular-Connection-path | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:224 |
| I0:226;0:2201 | Cellular-Connection-path | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:224 |
| I0:226;0:2200 | Wifi-path | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:224 |
| 0:210 | 导航栏 | unverified | pending | correspondence-unresolved | - | review-issue:coverage:0:210 |
| 0:211 | 美联储观察 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:210 |
| 0:222 | Object | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:210 |
| 0:212 | 分享 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:210 |
| 0:213 | quotations_icon_share备份 6 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:210 |
| 0:223 | 美联储观察 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:210 |
| 0:219 | 导航栏/返回@2x | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:210 |
| 0:220 | 导航栏/返回@2x | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:210 |
| 0:221 | 导航栏/返回@2x | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:210 |
| 0:214 | 矩形 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:210 |
| 0:215 | 编组 2 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:210 |
| 0:216 | 路径 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:210 |
| 0:217 | 路径 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:210 |
| 0:218 | 路径 9 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:210 |
| 0:73 | 编组 | unverified | pending | correspondence-unresolved | - | review-issue:coverage:0:73 |
| 0:74 | 画板 1 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:73 |
| 0:77 | 编组备份 6 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:73 |
| 0:76 | 矩形 4 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:73 |
| 0:75 | 矩形 4 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:73 |
| 0:78 | 快评 | unverified | pending | correspondence-unresolved | - | review-issue:coverage:0:78 |
| 0:79 | 蒙版 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:78 |
| 0:80 | 快评 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:78 |
| 0:84 | home page_news flash_label_important | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:78 |
| 0:87 | home page_news flash_label_important备份 8 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:78 |
| 0:83 | 中果网：质量差异明显 优果优价… | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:78 |
| 0:85 | 矩形 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:78 |
| 0:82 | 10:29 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:78 |
| 0:86 | 快评 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:78 |
| 0:81 | 快讯/txt/文本 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:78 |
| 0:102 | news_kuaiping_icon_click_play | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:78 |
| 0:103 | news_kuaiping_icon_click_play备份 6 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:78 |
| 0:104 | 矩形备份 12 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:78 |
| 0:105 | 椭圆形 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:78 |
| 0:106 | 编组 19 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:78 |
| 0:107 | 路径 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:78 |
| 0:108 | 矩形 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:78 |
| 0:109 | 矩形备份 12 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:78 |
| 0:88 | 季先飞 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:78 |
| 0:89 | 矩形 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:78 |
| 0:92 | 集运指数（欧线） | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:78 |
| 0:93 | 矩形 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:78 |
| 0:97 | 快讯/txt/文本备份 2 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:78 |
| 0:98 | 快讯/txt/文本备份 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:78 |
| 0:90 | 快讯/txt/文本备份 2 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:78 |
| 0:91 | 快讯/txt/文本备份 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:78 |
| 0:94 | list/icon/right | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:78 |
| 0:95 | more_icon_right备份 8 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:78 |
| 0:96 | 路径 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:78 |
| 0:99 | 轮播控件 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:78 |
| 0:101 | 矩形 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:78 |
| 0:100 | 椭圆形备份 3 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:78 |
| 0:110 | 最新货币政策 | missing | difference | static-module-absent | - | review-issue:missing-module:coverage:0:110 |
| 0:112 | 最新货币政策 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:110 |
| 0:111 | 决议时间:2026/01/29 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:110 |
| 0:113 | 利率 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:110 |
| 0:162 | 资产负债表 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:110 |
| 0:163 | 利率 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:110 |
| 0:165 | 资产负债表 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:110 |
| 0:114 | 上调 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:110 |
| 0:115 | 矩形 2 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:110 |
| 0:168 | 编组备份 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:110 |
| 0:169 | 矩形 2 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:110 |
| 0:116 | 上调 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:110 |
| 0:170 | 缩表 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:110 |
| 0:164 | 3.5%-3.75% | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:110 |
| 0:166 | 6.59万亿美元 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:110 |
| 0:167 | 图标_通用_帮助_16pt备份 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:110 |
| I0:167;0:2210 | 矩形 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:110 |
| I0:167;0:2217 | 形状结合 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:110 |
| I0:167;0:2213 | 椭圆形 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:110 |
| I0:167;0:2211 | 路径 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:110 |
| I0:167;0:2212 | 路径 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:110 |
| I0:167;0:2216 | 形状结合 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:110 |
| I0:167;0:2215 | 路径 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:110 |
| I0:167;0:2214 | 路径 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:110 |
| 0:117 | 利率观察 | matched | pending | verified-binding | body > div > div > div > div:nth-of-type(1) | review-issue:issue-001, review-issue:issue-011 |
| 0:161 | 利率观察 | matched | passed | verified-binding | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(1) > span | - |
| 0:142 | 天 | matched | passed | verified-binding | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) | - |
| 0:143 | jimeng-2025-07-31-1289-UI图标，采用卡通3D风格，立体，从斜45度视角俯视，日历图标（蓝色外框，中间白... (1) | unverified | pending | correspondence-unresolved | - | review-issue:coverage:0:143 |
| 0:144 | 编组 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:143 |
| 0:146 | 蒙版 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:143 |
| 0:145 | 蒙版 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:143 |
| 0:147 | jimeng-2025-07-31-1289-UI图标，采用卡通3D风格，立体，从斜45度视角俯视，日历图标（蓝色外框，中间白... (1) | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:143 |
| 0:149 | 下一次美联储议息决议公布 2026年3月 | unverified | pending | correspondence-unresolved | - | review-issue:coverage:0:149 |
| 0:150 | 天 | unverified | pending | correspondence-unresolved | - | review-issue:coverage:0:150 |
| 0:151 | 矩形 5 | unverified | pending | correspondence-unresolved | - | review-issue:coverage:0:151 |
| 0:154 | 小时 | unverified | pending | correspondence-unresolved | - | review-issue:coverage:0:154 |
| 0:155 | 矩形 5备份 | unverified | pending | correspondence-unresolved | - | review-issue:coverage:0:155 |
| 0:158 | 矩形 5备份 2 | unverified | pending | correspondence-unresolved | - | review-issue:coverage:0:158 |
| 0:152 | 40 | unverified | pending | correspondence-unresolved | - | review-issue:coverage:0:152 |
| 0:156 | 14 | unverified | pending | correspondence-unresolved | - | review-issue:coverage:0:156 |
| 0:159 | 53 | unverified | pending | correspondence-unresolved | - | review-issue:coverage:0:159 |
| 0:153 | 天 | matched | passed | verified-binding | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) | - |
| 0:157 | 小时 | matched | passed | verified-binding | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) | - |
| 0:160 | 分钟 | matched | passed | verified-binding | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) | - |
| 0:118 | 未来利率预测 | matched | difference | verified-binding | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) | review-issue:issue-012 |
| 0:134 | 矩形 6 | unverified | pending | scope-incomplete | - | review-issue:coverage:0:134 |
| 0:136 | 利率走势图 | unverified | pending | scope-incomplete | - | review-issue:coverage:0:136 |
| 0:137 | 矩形 7 | unverified | pending | scope-incomplete | - | review-issue:coverage:0:137 |
| 0:139 | 资产负债表 | unverified | pending | scope-incomplete | - | review-issue:coverage:0:139 |
| 0:140 | 矩形 7备份 2 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:139 |
| 0:135 | 未来利率预测 | matched | difference | verified-binding | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) | review-issue:issue-012, review-issue:issue-027, review-issue:issue-029, review-issue:issue-030 |
| 0:138 | 利率走势图 | matched | difference | verified-binding | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) | review-issue:issue-012, review-issue:issue-040, review-issue:issue-042, review-issue:issue-043 |
| 0:141 | 资产负债表 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:139 |
| 0:119 | 层叠备份 4 | unverified | pending | scope-incomplete | - | review-issue:coverage:0:119 |
| 0:121 | 蒙版 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:119 |
| 0:120 | 蒙版 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:119 |
| 0:123 | 编组 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:119 |
| 0:126 | 层叠 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:119 |
| 0:128 | 层叠备份 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:119 |
| 0:130 | 层叠备份 2 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:119 |
| 0:132 | 层叠备份 3 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:119 |
| 0:124 | 层叠备份 4 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:119 |
| 0:127 | 3月19日 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:119 |
| 0:129 | 4月30日 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:119 |
| 0:131 | 6月18日 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:119 |
| 0:133 | 7月30日 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:119 |
| 0:125 | 9月18日 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:119 |
| 0:122 | 会议时间：2027年03月18日 02: | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:119 |
| 0:327 | 概率 | matched | difference | verified-binding | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) | review-issue:issue-012, review-issue:issue-013 |
| 0:328 | 概率 | unverified | pending | scope-incomplete | - | review-issue:coverage:0:328 |
| 0:329 | 利率区间(%) | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:328 |
| 0:334 | 概率 | matched | difference | verified-binding | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > span:nth-of-type(2) | review-issue:issue-017 |
| 0:330 | 3.25-3.50 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:328 |
| 0:332 | 20.30% | matched | difference | verified-binding | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > span:nth-of-type(2) | review-issue:issue-013, review-issue:issue-050 |
| 0:335 | 矩形 8 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:328 |
| 0:336 | 矩形 8 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:328 |
| 0:331 | 3.50-3.75 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:328 |
| 0:333 | 79.70% | matched | difference | verified-binding | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > span:nth-of-type(2) | review-issue:issue-013, review-issue:issue-052 |
| 0:337 | 矩形 8备份 2 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:328 |
| 0:338 | 矩形 8备份 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:328 |
| 0:339 | 最新概率 | matched | passed | verified-binding | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) | review-issue:module-position:0:339 |
| 0:340 | 最新概率 | unverified | pending | scope-incomplete | - | review-issue:coverage:0:340 |
| 0:342 | 利率区间(%) | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:340 |
| 0:343 | 最新概率 | matched | difference | verified-binding | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(2) | review-issue:module-position:0:339, review-issue:issue-012, review-issue:issue-023 |
| 0:344 | 上一日概率 | matched | difference | verified-binding | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(3) | review-issue:module-position:0:339, review-issue:issue-012, review-issue:issue-020 |
| 0:345 | 上周概率 | matched | difference | verified-binding | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(4) | review-issue:module-position:0:339, review-issue:issue-012 |
| 0:341 | 矩形 13 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:340 |
| 0:346 | 3.50-3.50 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:340 |
| 0:348 | 20.30% | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:340 |
| 0:350 | 10.90% | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:340 |
| 0:351 | 12.90% | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:340 |
| 0:347 | 3.50-3.75 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:340 |
| 0:349 | 79.70% | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:340 |
| 0:352 | 89.10% | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:340 |
| 0:353 | 87.10% | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:340 |
| 0:354 | 基于30天联邦基金期货价格测算，反映市场 | matched | difference | verified-binding | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > p | review-issue:issue-016 |
| 0:286 | 投票 | missing | difference | static-module-absent | - | review-issue:missing-module:coverage:0:286 |
| 0:287 | 投票 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:286 |
| 0:295 | 标签_投票进行中 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:286 |
| 0:296 | 矩形 2 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:286 |
| 0:292 | 投票 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:286 |
| 0:293 | 矩形 2 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:286 |
| 0:294 | 最多选2项 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:286 |
| 0:297 | 编组 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:286 |
| 0:298 | 路径 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:286 |
| 0:302 | 投票进行中 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:286 |
| 0:301 | 形状 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:286 |
| 0:299 | 路径 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:286 |
| 0:300 | 路径 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:286 |
| 0:304 | 文案文案文案文案文案文案文案文案文案文案 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:286 |
| 0:303 | 矩形 8备份 3 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:286 |
| 0:311 | 选项A | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:286 |
| 0:312 | 编组 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:286 |
| 0:313 | 矩形 10 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:286 |
| 0:314 | 路径 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:286 |
| 0:315 | 矩形 8备份 6 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:286 |
| 0:316 | 选项B | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:286 |
| 0:305 | 编组 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:286 |
| 0:307 | icon_火 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:286 |
| 0:306 | 10000人参与 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:286 |
| 0:308 | 编组 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:286 |
| 0:310 | 形状 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:286 |
| 0:309 | 路径 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:286 |
| 0:288 | @数据展示/数据列表/交易详情/弹窗/确定 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:286 |
| 0:289 | 确定 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:286 |
| 0:290 | 矩形 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:286 |
| 0:291 | 投票 | covered-by-parent | pending | parent-finding | - | review-issue:missing-module:coverage:0:286 |
| 0:171 | 相关品种动态 | matched | pending | verified-binding | body > div > div > div > div:nth-of-type(2) | review-issue:issue-002, review-issue:missing-module:coverage:0:286 |
| 0:176 | 相关品种动态 | matched | passed | verified-binding | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(1) > span | - |
| 0:228 | 投资有风险，入市需谨慎 | matched | difference | verified-binding | body > div > div > div > div:nth-of-type(2) > span | review-issue:issue-026 |
| 0:203 | 图标_通用_帮助_16pt备份 | unverified | pending | scope-incomplete | - | review-issue:coverage:0:203 |
| I0:203;0:2210 | 矩形 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:203 |
| I0:203;0:2217 | 形状结合 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:203 |
| I0:203;0:2213 | 椭圆形 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:203 |
| I0:203;0:2211 | 路径 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:203 |
| I0:203;0:2212 | 路径 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:203 |
| I0:203;0:2216 | 形状结合 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:203 |
| I0:203;0:2215 | 路径 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:203 |
| I0:203;0:2214 | 路径 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:203 |
| 0:233 | 相关品种状态_品种卡片 | unverified | pending | scope-incomplete | - | review-issue:coverage:0:233 |
| 0:237 | 矩形 3备份 4 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:233 |
| 0:235 | 路径 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:233 |
| 0:238 | 美联储观察备份 6 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:233 |
| 0:236 | 路径 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:233 |
| 0:234 | 矩形 3备份 4 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:233 |
| 0:204 | 模拟收益率 | unverified | pending | scope-incomplete | - | review-issue:coverage:0:204 |
| 0:242 | 沪银2604 | unverified | pending | scope-incomplete | - | review-issue:coverage:0:242 |
| 0:206 | 模拟收益率 | matched | difference | verified-binding | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > p | review-issue:issue-037, review-issue:issue-038, review-issue:issue-039 |
| 0:207 | 1手模拟盈利 | matched | difference | verified-binding | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(3) > p | review-issue:issue-031, review-issue:issue-032, review-issue:issue-033 |
| 0:239 | 编组备份 3 | unverified | pending | scope-incomplete | - | review-issue:coverage:0:239 |
| 0:240 | 矩形 2 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:239 |
| 0:241 | 多 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:239 |
| 0:205 | 矩形 11 | unverified | pending | scope-incomplete | - | review-issue:coverage:0:205 |
| 0:243 | 19570 | unverified | pending | scope-incomplete | - | review-issue:coverage:0:243 |
| 0:244 | 11.4% | unverified | pending | scope-incomplete | - | review-issue:coverage:0:244 |
| 0:208 | 12.13% | unverified | pending | scope-incomplete | - | review-issue:coverage:0:208 |
| 0:209 | 12.13%备份 | unverified | pending | scope-incomplete | - | review-issue:coverage:0:209 |
| 0:229 | @数据展示/数据列表/交易详情/弹窗/确定备份 | unverified | pending | scope-incomplete | - | review-issue:coverage:0:229 |
| 0:230 | 确定 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:229 |
| 0:231 | 矩形 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:229 |
| 0:232 | 利率起浪，速来掌舵 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:229 |
| 0:172 | 编组 | unverified | pending | scope-incomplete | - | review-issue:coverage:0:172 |
| 0:175 | 矩形 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:172 |
| 0:173 | 椭圆形备份 3 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:172 |
| 0:174 | 椭圆形备份 4 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:172 |
| 0:177 | 热点解读 | matched | difference | verified-binding | body > div > div > div > div:nth-of-type(3) | review-issue:issue-015, review-issue:issue-003, review-issue:missing-module:coverage:0:286 |
| 0:202 | 热点解读 | matched | passed | verified-binding | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(1) > span | - |
| 0:178 | 东升西渐风景独好-国泰君安字符字符字 | unverified | pending | scope-incomplete | - | review-issue:coverage:0:178 |
| 0:180 | 所长早读 | unverified | pending | scope-incomplete | - | review-issue:coverage:0:180 |
| 0:179 | 2021年度投度投度投度投投度 | unverified | pending | scope-incomplete | - | review-issue:coverage:0:179 |
| 0:181 | ·5分钟前 | unverified | pending | scope-incomplete | - | review-issue:coverage:0:181 |
| 0:182 | 矩形 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:181 |
| 0:188 | 国泰君安期货研究所 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:181 |
| 0:189 | 17分钟前 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:181 |
| 0:186 | 快讯/txt/文本备份 2 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:181 |
| 0:187 | 快讯/txt/文本备份 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:181 |
| 0:183 | list/icon/right | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:181 |
| 0:184 | pop-up_icon_right_1备份 25 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:181 |
| 0:185 | 路径 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:181 |
| 0:245 | 矩形 12 | unverified | pending | scope-incomplete | - | review-issue:coverage:0:245 |
| 0:190 | 东升西渐风景独好-国泰君安字符字符字 | unverified | pending | scope-incomplete | - | review-issue:coverage:0:190 |
| 0:192 | 所长早读 | unverified | pending | scope-incomplete | - | review-issue:coverage:0:192 |
| 0:191 | 字符字符字符字符字符字符字符字符字符字符 | unverified | pending | scope-incomplete | - | review-issue:coverage:0:191 |
| 0:193 | ·5分钟前备份 | unverified | pending | scope-incomplete | - | review-issue:coverage:0:193 |
| 0:194 | 矩形 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:193 |
| 0:200 | 国泰君安期货研究所 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:193 |
| 0:201 | 17分钟前 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:193 |
| 0:198 | 快讯/txt/文本备份 2 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:193 |
| 0:199 | 快讯/txt/文本备份 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:193 |
| 0:195 | list/icon/right | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:193 |
| 0:196 | pop-up_icon_right_1备份 26 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:193 |
| 0:197 | 路径 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:193 |
| 0:246 | 矩形 12备份 | unverified | pending | scope-incomplete | - | review-issue:coverage:0:246 |
| 0:247 | 东升西渐风景独好-国泰君安字符字符字备份 | unverified | pending | scope-incomplete | - | review-issue:coverage:0:247 |
| 0:248 | 收盘点评 | unverified | pending | scope-incomplete | - | review-issue:coverage:0:248 |
| 0:249 | ·5分钟前备份 2 | unverified | pending | scope-incomplete | - | review-issue:coverage:0:249 |
| 0:250 | 矩形 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:249 |
| 0:256 | 国泰君安期货研究所 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:249 |
| 0:257 | 17分钟前 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:249 |
| 0:254 | 快讯/txt/文本备份 2 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:249 |
| 0:255 | 快讯/txt/文本备份 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:249 |
| 0:251 | list/icon/right | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:249 |
| 0:252 | pop-up_icon_right_1备份 27 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:249 |
| 0:253 | 路径 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:249 |
| 0:258 | 矩形 12备份 2 | unverified | pending | scope-incomplete | - | review-issue:coverage:0:258 |
| 0:259 | 东升西渐风景独好-国泰君安字符字符字备份 2 | unverified | pending | scope-incomplete | - | review-issue:coverage:0:259 |
| 0:260 | 收盘点评备份 | unverified | pending | scope-incomplete | - | review-issue:coverage:0:260 |
| 0:261 | ·5分钟前备份 3 | unverified | pending | scope-incomplete | - | review-issue:coverage:0:261 |
| 0:262 | 矩形 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:261 |
| 0:268 | 国泰君安期货研究所 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:261 |
| 0:269 | 17分钟前 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:261 |
| 0:266 | 快讯/txt/文本备份 2 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:261 |
| 0:267 | 快讯/txt/文本备份 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:261 |
| 0:263 | list/icon/right | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:261 |
| 0:264 | pop-up_icon_right_1备份 28 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:261 |
| 0:265 | 路径 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:261 |
| 0:270 | 矩形 12备份 3 | unverified | pending | scope-incomplete | - | review-issue:coverage:0:270 |
| 0:271 | 东升西渐风景独好-国泰君安字符字符字备份 3 | unverified | pending | scope-incomplete | - | review-issue:coverage:0:271 |
| 0:272 | 收盘点评备份 2 | unverified | pending | scope-incomplete | - | review-issue:coverage:0:272 |
| 0:273 | ·5分钟前备份 4 | unverified | pending | scope-incomplete | - | review-issue:coverage:0:273 |
| 0:274 | 矩形 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:273 |
| 0:280 | 国泰君安期货研究所 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:273 |
| 0:281 | 17分钟前 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:273 |
| 0:278 | 快讯/txt/文本备份 2 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:273 |
| 0:279 | 快讯/txt/文本备份 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:273 |
| 0:275 | list/icon/right | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:273 |
| 0:276 | pop-up_icon_right_1备份 29 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:273 |
| 0:277 | 路径 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:273 |
| 0:282 | 矩形 12备份 4 | unverified | pending | scope-incomplete | - | review-issue:coverage:0:282 |
| 0:283 | 展开更多 | unverified | pending | scope-incomplete | - | review-issue:coverage:0:283 |
| 0:284 | 展开更多 | matched | difference | verified-binding | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(7) | review-issue:issue-015, review-issue:issue-046, review-issue:issue-048 |
| 0:285 | 图标_通用_更多_16pt | unverified | pending | scope-incomplete | - | review-issue:coverage:0:285 |
| I0:285;0:2207 | 矩形 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:285 |
| I0:285;0:2208 | 路径 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:285 |
| 0:227 | 本页面中所有政策数据及相关资讯等，均源于 | matched | difference | verified-binding | body > div > div > div > div:nth-of-type(4) | review-issue:issue-044, review-issue:issue-045 |
| 0:319 | 免费开通期货权限 | unverified | pending | correspondence-unresolved | - | review-issue:coverage:0:319 |
| 0:317 | 我已阅读并知悉各项内容 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:319 |
| 0:320 | 免费开通期货权限 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:319 |
| 0:321 | 免费开通期货权限 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:319 |
| 0:322 | 大btn | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:319 |
| 0:323 | 免费开通期货权限 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:319 |
| 0:324 | 免费开通期货权限 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:319 |
| 0:318 | 我已阅读并知悉各项内容 | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:319 |
| 0:325 | 免费开通期货权限 | matched | difference | verified-binding | body > div > div > div > div:nth-of-type(5) > div | review-issue:issue-034, review-issue:issue-035, review-issue:issue-036 |
| 0:326 | Bars/Home Indicators/iPhone/Light - Portrait | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:319 |
| I0:326;0:2219 | Home Indicator | covered-by-parent | pending | parent-finding | - | review-issue:coverage:0:319 |

### 状态栏 · 0:224

Design: {"x":0,"y":0,"width":375,"height":44} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 · 0:225

Design: {"x":0,"y":0,"width":375,"height":44} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### Bars/Status Bars/iPhone/Dark · 0:226

Design: {"x":17,"y":15,"width":342.6613464355469,"height":21} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### Time Style · I0:226;0:2192

Design: {"x":17,"y":15,"width":54,"height":21} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### Battery · I0:226;0:2193

Design: {"x":332.333251953125,"y":19.333343505859375,"width":27.32803726196289,"height":13} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### Border · I0:226;0:2194

Design: {"x":332.333251953125,"y":19.333343505859375,"width":25,"height":13} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### Cellular Connection · I0:226;0:2203

Design: {"x":281.4000244140625,"y":20,"width":19.200000762939453,"height":12} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### Cellular-Connection-path · I0:226;0:2205

Design: {"x":297.4000244140625,"y":20,"width":3.200000047683716,"height":12} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### Wifi · I0:226;0:2199

Design: {"x":308,"y":20,"width":17.00001335144043,"height":12} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### Wifi-path · I0:226;0:2197

Design: {"x":308,"y":20,"width":17,"height":5} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### Capacity · I0:226;0:2196

Design: {"x":334.333251953125,"y":21.333343505859375,"width":21,"height":9} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### Time · I0:226;0:2192;0:2222

Design: {"x":17,"y":22,"width":54,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### Cellular-Connection-path · I0:226;0:2204

Design: {"x":292.0999755859375,"y":22.399993896484375,"width":3.200000047683716,"height":9.600000381469727} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### Wifi-path · I0:226;0:2198

Design: {"x":311,"y":24,"width":11,"height":4} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### Cap · I0:226;0:2195

Design: {"x":358.333251953125,"y":24,"width":1.328037977218628,"height":4} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### Cellular-Connection-path · I0:226;0:2202

Design: {"x":286.7000732421875,"y":25,"width":3.200000047683716,"height":7} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### Cellular-Connection-path · I0:226;0:2201

Design: {"x":281.4000244140625,"y":27.399993896484375,"width":3.200000047683716,"height":4.599999904632568} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### Wifi-path · I0:226;0:2200

Design: {"x":314,"y":28,"width":5,"height":4} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 导航栏 · 0:210

Design: {"x":0,"y":44,"width":375,"height":44} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 美联储观察 · 0:211

Design: {"x":0,"y":44,"width":375,"height":44} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### Object · 0:222

Design: {"x":0,"y":44,"width":100,"height":100} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 分享 · 0:212

Design: {"x":336,"y":54,"width":24,"height":24} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### quotations_icon_share备份 6 · 0:213

Design: {"x":336,"y":54,"width":24,"height":24} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 美联储观察 · 0:223

Design: {"x":148,"y":55,"width":80,"height":22} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 导航栏/返回@2x · 0:219

Design: {"x":19,"y":56,"width":20,"height":20} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 导航栏/返回@2x · 0:220

Design: {"x":19,"y":56,"width":20,"height":20} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 导航栏/返回@2x · 0:221

Design: {"x":19,"y":56,"width":20,"height":20} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 · 0:214

Design: {"x":338,"y":56,"width":20,"height":20} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 编组 2 · 0:215

Design: {"x":339.00439453125,"y":58,"width":18,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 路径 · 0:216

Design: {"x":339.00439453125,"y":58,"width":18,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 路径 · 0:217

Design: {"x":351,"y":58,"width":6,"height":6} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 路径 9 · 0:218

Design: {"x":348,"y":59,"width":8,"height":8} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 编组 · 0:73

Design: {"x":0,"y":88,"width":375,"height":185} / Actual: {"x":0,"y":0,"width":375,"height":185}

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |
| x | 0 | 0 | 4 | pending | evidence-insufficient | body > div > div > div > img · {"x":0,"y":0,"width":375,"height":185} |
| y | 88 | 0 | 4 | pending | evidence-insufficient | body > div > div > div > img · {"x":0,"y":0,"width":375,"height":185} |
| width | 375 | 375 | 4 | pending | evidence-insufficient | body > div > div > div > img · {"x":0,"y":0,"width":375,"height":185} |
| height | 185 | 185 | 4 | pending | evidence-insufficient | body > div > div > div > img · {"x":0,"y":0,"width":375,"height":185} |
| text | — | — | — | not-applicable | no-design-constraint | body > div > div > div > img · {"x":0,"y":0,"width":375,"height":185} |
| fontSize | — | 16 | 1 | not-applicable | no-design-constraint | body > div > div > div > img · {"x":0,"y":0,"width":375,"height":185} |
| fontFamily | — | PingFangSC, "PingFang SC", system-ui, Avenir, Helvetica, Arial, sans-serif | — | not-applicable | no-design-constraint | body > div > div > div > img · {"x":0,"y":0,"width":375,"height":185} |
| fontWeight | — | 400 | 99 | not-applicable | no-design-constraint | body > div > div > div > img · {"x":0,"y":0,"width":375,"height":185} |
| lineHeight | — | — | 2 | not-applicable | no-design-constraint | body > div > div > div > img · {"x":0,"y":0,"width":375,"height":185} |
| borderRadius | — | 0 | 2 | not-applicable | no-design-constraint | body > div > div > div > img · {"x":0,"y":0,"width":375,"height":185} |
| borderWidth | 0 | 0 | 1 | pending | evidence-insufficient | body > div > div > div > img · {"x":0,"y":0,"width":375,"height":185} |
| opacity | 1 | 1 | 0.05 | pending | evidence-insufficient | body > div > div > div > img · {"x":0,"y":0,"width":375,"height":185} |
| textAlign | — | start | — | not-applicable | no-design-constraint | body > div > div > div > img · {"x":0,"y":0,"width":375,"height":185} |
| color | — | — | 3 | not-applicable | no-design-constraint | body > div > div > div > img · {"x":0,"y":0,"width":375,"height":185} |

### 画板 1 · 0:74

Design: {"x":0,"y":88,"width":375,"height":184} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 编组备份 6 · 0:77

Design: {"x":0,"y":88,"width":375,"height":185} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 4 · 0:76

Design: {"x":0,"y":214,"width":375,"height":59} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 4 · 0:75

Design: {"x":0,"y":229,"width":375,"height":44} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 快评 · 0:78

Design: {"x":10,"y":248,"width":355,"height":145} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 蒙版 · 0:79

Design: {"x":10,"y":248,"width":355,"height":145} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 快评 · 0:80

Design: {"x":20,"y":260,"width":335,"height":121} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### home page_news flash_label_important · 0:84

Design: {"x":20,"y":260,"width":36,"height":22} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### home page_news flash_label_important备份 8 · 0:87

Design: {"x":20,"y":260,"width":36,"height":22} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 中果网：质量差异明显 优果优价… · 0:83

Design: {"x":62,"y":260,"width":238,"height":22} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 · 0:85

Design: {"x":22,"y":262,"width":32,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 10:29 · 0:82

Design: {"x":320,"y":262,"width":35,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 快评 · 0:86

Design: {"x":27,"y":266,"width":22,"height":12} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 快讯/txt/文本 · 0:81

Design: {"x":20,"y":292,"width":291,"height":44} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### news_kuaiping_icon_click_play · 0:102

Design: {"x":323,"y":298,"width":32,"height":32} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### news_kuaiping_icon_click_play备份 6 · 0:103

Design: {"x":323,"y":298,"width":32,"height":32} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形备份 12 · 0:104

Design: {"x":323,"y":298,"width":32,"height":32} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 椭圆形 · 0:105

Design: {"x":325,"y":300,"width":28,"height":28} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 编组 19 · 0:106

Design: {"x":332,"y":308,"width":14,"height":12.727272987365723} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 路径 · 0:107

Design: {"x":332.7498779296875,"y":308,"width":12.492433547973633,"height":9.625} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 · 0:108

Design: {"x":332,"y":315,"width":3.8181817531585693,"height":5.7272725105285645} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形备份 12 · 0:109

Design: {"x":342.1817626953125,"y":315,"width":3.8181817531585693,"height":5.7272725105285645} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 季先飞 · 0:88

Design: {"x":20,"y":346,"width":144,"height":22} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 · 0:89

Design: {"x":20,"y":346,"width":144,"height":22} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 集运指数（欧线） · 0:92

Design: {"x":171,"y":346,"width":184,"height":22} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 · 0:93

Design: {"x":171,"y":346,"width":184,"height":22} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 快讯/txt/文本备份 2 · 0:97

Design: {"x":177,"y":348,"width":104,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 快讯/txt/文本备份 · 0:98

Design: {"x":287,"y":348,"width":50,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 快讯/txt/文本备份 2 · 0:90

Design: {"x":26,"y":349,"width":39,"height":16} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 快讯/txt/文本备份 · 0:91

Design: {"x":71,"y":349,"width":87,"height":16} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### list/icon/right · 0:94

Design: {"x":341,"y":354,"width":8,"height":8} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### more_icon_right备份 8 · 0:95

Design: {"x":341,"y":354,"width":8,"height":8} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 路径 · 0:96

Design: {"x":342.60002422332764,"y":354.79998779296875,"width":4.800000190734863,"height":6.400000095367432} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 轮播控件 · 0:99

Design: {"x":180,"y":378,"width":16,"height":3} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 · 0:101

Design: {"x":180,"y":378,"width":9,"height":3} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 椭圆形备份 3 · 0:100

Design: {"x":193,"y":378,"width":3,"height":3} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 最新货币政策 · 0:110

Design: {"x":10,"y":405,"width":355,"height":122} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 最新货币政策 · 0:112

Design: {"x":20,"y":416,"width":96,"height":20} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 决议时间:2026/01/29 · 0:111

Design: {"x":236,"y":418,"width":119,"height":36} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 利率 · 0:113

Design: {"x":20,"y":449,"width":165,"height":66} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 资产负债表 · 0:162

Design: {"x":191,"y":449,"width":164,"height":66} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 利率 · 0:163

Design: {"x":30,"y":459,"width":28,"height":20} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 资产负债表 · 0:165

Design: {"x":201,"y":459,"width":70,"height":20} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 上调 · 0:114

Design: {"x":64,"y":460,"width":32,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 2 · 0:115

Design: {"x":64,"y":460,"width":32,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 编组备份 · 0:168

Design: {"x":277,"y":460,"width":32,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 2 · 0:169

Design: {"x":277,"y":460,"width":32,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 上调 · 0:116

Design: {"x":68,"y":461,"width":24,"height":16} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 缩表 · 0:170

Design: {"x":281,"y":461,"width":24,"height":16} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 3.5%-3.75% · 0:164

Design: {"x":30,"y":485,"width":86,"height":20} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 6.59万亿美元 · 0:166

Design: {"x":201,"y":486,"width":91,"height":20} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 图标_通用_帮助_16pt备份 · 0:167

Design: {"x":294,"y":489,"width":14,"height":14} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 · I0:167;0:2210

Design: {"x":294,"y":489,"width":14,"height":14} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 形状结合 · I0:167;0:2217

Design: {"x":294.875,"y":489.875,"width":12.25,"height":12.25} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 椭圆形 · I0:167;0:2213

Design: {"x":294.875,"y":489.875,"width":12.25,"height":12.25} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 路径 · I0:167;0:2211

Design: {"x":294.875,"y":489.875,"width":12.25,"height":12.25} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 路径 · I0:167;0:2212

Design: {"x":295.793701171875,"y":490.79376220703125,"width":10.41249942779541,"height":10.41249942779541} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 形状结合 · I0:167;0:2216

Design: {"x":299.25,"y":492.9375,"width":3.5,"height":6.125} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 路径 · I0:167;0:2215

Design: {"x":299.25,"y":492.9375,"width":3.5,"height":4.454545497894287} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 路径 · I0:167;0:2214

Design: {"x":300.4166259765625,"y":497.9488525390625,"width":1.1666667461395264,"height":1.1136363744735718} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 利率观察 · 0:117

Design: {"x":10,"y":539,"width":355,"height":539} / Actual: {"x":10,"y":165,"width":355,"height":537} · Displacement y -374px; explained 0px; unverified remainder -374px (pending)

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |
| x | 10 | 10 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) · {"x":10,"y":165,"width":355,"height":537} |
| y | 539 | 539 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) · {"x":10,"y":165,"width":355,"height":537} |
| width | 355 | 355 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) · {"x":10,"y":165,"width":355,"height":537} |
| height | 539 | 537 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) · {"x":10,"y":165,"width":355,"height":537} |
| text | — | — | — | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) · {"x":10,"y":165,"width":355,"height":537} |
| fontSize | — | 16 | 1 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) · {"x":10,"y":165,"width":355,"height":537} |
| fontFamily | — | PingFangSC, "PingFang SC", system-ui, Avenir, Helvetica, Arial, sans-serif | — | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) · {"x":10,"y":165,"width":355,"height":537} |
| fontWeight | — | 400 | 99 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) · {"x":10,"y":165,"width":355,"height":537} |
| lineHeight | — | — | 2 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) · {"x":10,"y":165,"width":355,"height":537} |
| borderRadius | 8 | 8 | 2 | passed | measured | body > div > div > div > div:nth-of-type(1) · {"x":10,"y":165,"width":355,"height":537} |
| borderWidth | 0 | 0 | 1 | passed | measured | body > div > div > div > div:nth-of-type(1) · {"x":10,"y":165,"width":355,"height":537} |
| opacity | 1 | 1 | 0.05 | passed | measured | body > div > div > div > div:nth-of-type(1) · {"x":10,"y":165,"width":355,"height":537} |
| textAlign | — | start | — | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) · {"x":10,"y":165,"width":355,"height":537} |
| color | rgba(255, 255, 255, 1.000) | rgb(255, 255, 255) | 3 | passed | measured | body > div > div > div > div:nth-of-type(1) · {"x":10,"y":165,"width":355,"height":537} |

### 利率观察 · 0:161

Design: {"x":20,"y":551,"width":64,"height":20} / Actual: {"x":20,"y":176,"width":65.28125,"height":20}

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |
| x | 20 | 20 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(1) > span · {"x":20,"y":176,"width":65.28125,"height":20} |
| y | 551 | 550 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(1) > span · {"x":20,"y":176,"width":65.28125,"height":20} |
| width | 64 | 65.28125 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(1) > span · {"x":20,"y":176,"width":65.28125,"height":20} |
| height | 20 | 20 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(1) > span · {"x":20,"y":176,"width":65.28125,"height":20} |
| text | 利率观察 | 利率观察 | — | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(1) > span · {"x":20,"y":176,"width":65.28125,"height":20} |
| fontSize | 16 | 16 | 1 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(1) > span · {"x":20,"y":176,"width":65.28125,"height":20} |
| fontFamily | PingFang SC | PingFangSC, "PingFang SC", system-ui, Avenir, Helvetica, Arial, sans-serif | — | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(1) > span · {"x":20,"y":176,"width":65.28125,"height":20} |
| fontWeight | 500 | 500 | 99 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(1) > span · {"x":20,"y":176,"width":65.28125,"height":20} |
| lineHeight | 20 | 20 | 2 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(1) > span · {"x":20,"y":176,"width":65.28125,"height":20} |
| borderRadius | — | 0 | 2 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(1) > span · {"x":20,"y":176,"width":65.28125,"height":20} |
| borderWidth | 0 | 0 | 1 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(1) > span · {"x":20,"y":176,"width":65.28125,"height":20} |
| opacity | 1 | 1 | 0.05 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(1) > span · {"x":20,"y":176,"width":65.28125,"height":20} |
| textAlign | left | start | — | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(1) > span · {"x":20,"y":176,"width":65.28125,"height":20} |
| color | rgba(44, 44, 44, 1.000) | rgb(44, 44, 44) | 3 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(1) > span · {"x":20,"y":176,"width":65.28125,"height":20} |

### 天 · 0:142

Design: {"x":20,"y":583,"width":335,"height":119} / Actual: {"x":20,"y":209,"width":335,"height":119}

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |
| x | 20 | 20 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) · {"x":20,"y":209,"width":335,"height":119} |
| y | 583 | 583 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) · {"x":20,"y":209,"width":335,"height":119} |
| width | 335 | 335 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) · {"x":20,"y":209,"width":335,"height":119} |
| height | 119 | 119 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) · {"x":20,"y":209,"width":335,"height":119} |
| text | — | — | — | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) · {"x":20,"y":209,"width":335,"height":119} |
| fontSize | — | 16 | 1 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) · {"x":20,"y":209,"width":335,"height":119} |
| fontFamily | — | PingFangSC, "PingFang SC", system-ui, Avenir, Helvetica, Arial, sans-serif | — | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) · {"x":20,"y":209,"width":335,"height":119} |
| fontWeight | — | 400 | 99 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) · {"x":20,"y":209,"width":335,"height":119} |
| lineHeight | — | — | 2 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) · {"x":20,"y":209,"width":335,"height":119} |
| borderRadius | — | 6 | 2 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) · {"x":20,"y":209,"width":335,"height":119} |
| borderWidth | 0 | 0 | 1 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) · {"x":20,"y":209,"width":335,"height":119} |
| opacity | 1 | 1 | 0.05 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) · {"x":20,"y":209,"width":335,"height":119} |
| textAlign | — | start | — | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) · {"x":20,"y":209,"width":335,"height":119} |
| color | — | — | 3 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) · {"x":20,"y":209,"width":335,"height":119} |

### jimeng-2025-07-31-1289-UI图标，采用卡通3D风格，立体，从斜45度视角俯视，日历图标（蓝色外框，中间白... (1) · 0:143

Design: {"x":20,"y":583,"width":335,"height":119} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 编组 · 0:144

Design: {"x":20,"y":583,"width":335,"height":119} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 蒙版 · 0:146

Design: {"x":20,"y":583,"width":335,"height":119} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 蒙版 · 0:145

Design: {"x":20,"y":583,"width":335,"height":119} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### jimeng-2025-07-31-1289-UI图标，采用卡通3D风格，立体，从斜45度视角俯视，日历图标（蓝色外框，中间白... (1) · 0:147

Design: {"x":199.8072509765625,"y":595.5611279159784,"width":142.5226694047451,"height":136.73572133481503} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 下一次美联储议息决议公布 2026年3月 · 0:149

Design: {"x":35,"y":603,"width":306,"height":20} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 天 · 0:150

Design: {"x":71,"y":639,"width":233,"height":39} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 5 · 0:151

Design: {"x":71,"y":639,"width":38,"height":39} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 小时 · 0:154

Design: {"x":146,"y":639,"width":72,"height":39} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 5备份 · 0:155

Design: {"x":146,"y":639,"width":38,"height":39} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 5备份 2 · 0:158

Design: {"x":232,"y":639,"width":38,"height":39} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 40 · 0:152

Design: {"x":77,"y":643,"width":26,"height":31} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 14 · 0:156

Design: {"x":152,"y":643,"width":26,"height":31} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 53 · 0:159

Design: {"x":238,"y":643,"width":26,"height":31} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 天 · 0:153

Design: {"x":113,"y":651,"width":15,"height":21} / Actual: {"x":113.234375,"y":274,"width":15.3125,"height":21}

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |
| x | 113 | 113.234375 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) · {"x":113.234375,"y":274,"width":15.3125,"height":21} |
| y | 651 | 648 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) · {"x":113.234375,"y":274,"width":15.3125,"height":21} |
| width | 15 | 15.3125 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) · {"x":113.234375,"y":274,"width":15.3125,"height":21} |
| height | 21 | 21 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) · {"x":113.234375,"y":274,"width":15.3125,"height":21} |
| text | 天 | 天 | — | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) · {"x":113.234375,"y":274,"width":15.3125,"height":21} |
| fontSize | 15 | 15 | 1 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) · {"x":113.234375,"y":274,"width":15.3125,"height":21} |
| fontFamily | PingFang SC | PingFangSC, "PingFang SC", system-ui, Avenir, Helvetica, Arial, sans-serif | — | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) · {"x":113.234375,"y":274,"width":15.3125,"height":21} |
| fontWeight | 400 | 400 | 99 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) · {"x":113.234375,"y":274,"width":15.3125,"height":21} |
| lineHeight | 21 | 21 | 2 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) · {"x":113.234375,"y":274,"width":15.3125,"height":21} |
| borderRadius | — | 0 | 2 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) · {"x":113.234375,"y":274,"width":15.3125,"height":21} |
| borderWidth | 0 | 0 | 1 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) · {"x":113.234375,"y":274,"width":15.3125,"height":21} |
| opacity | 1 | 1 | 0.05 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) · {"x":113.234375,"y":274,"width":15.3125,"height":21} |
| textAlign | left | start | — | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) · {"x":113.234375,"y":274,"width":15.3125,"height":21} |
| color | rgba(44, 44, 44, 1.000) | rgb(44, 44, 44) | 3 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) · {"x":113.234375,"y":274,"width":15.3125,"height":21} |

### 小时 · 0:157

Design: {"x":188,"y":651,"width":30,"height":21} / Actual: {"x":185.546875,"y":274,"width":30.609375,"height":21}

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |
| x | 188 | 185.546875 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) · {"x":185.546875,"y":274,"width":30.609375,"height":21} |
| y | 651 | 648 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) · {"x":185.546875,"y":274,"width":30.609375,"height":21} |
| width | 30 | 30.609375 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) · {"x":185.546875,"y":274,"width":30.609375,"height":21} |
| height | 21 | 21 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) · {"x":185.546875,"y":274,"width":30.609375,"height":21} |
| text | 小时 | 小时 | — | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) · {"x":185.546875,"y":274,"width":30.609375,"height":21} |
| fontSize | 15 | 15 | 1 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) · {"x":185.546875,"y":274,"width":30.609375,"height":21} |
| fontFamily | PingFang SC | PingFangSC, "PingFang SC", system-ui, Avenir, Helvetica, Arial, sans-serif | — | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) · {"x":185.546875,"y":274,"width":30.609375,"height":21} |
| fontWeight | 400 | 400 | 99 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) · {"x":185.546875,"y":274,"width":30.609375,"height":21} |
| lineHeight | 21 | 21 | 2 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) · {"x":185.546875,"y":274,"width":30.609375,"height":21} |
| borderRadius | — | 0 | 2 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) · {"x":185.546875,"y":274,"width":30.609375,"height":21} |
| borderWidth | 0 | 0 | 1 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) · {"x":185.546875,"y":274,"width":30.609375,"height":21} |
| opacity | 1 | 1 | 0.05 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) · {"x":185.546875,"y":274,"width":30.609375,"height":21} |
| textAlign | left | start | — | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) · {"x":185.546875,"y":274,"width":30.609375,"height":21} |
| color | rgba(44, 44, 44, 1.000) | rgb(44, 44, 44) | 3 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) · {"x":185.546875,"y":274,"width":30.609375,"height":21} |

### 分钟 · 0:160

Design: {"x":274,"y":651,"width":30,"height":21} / Actual: {"x":273.15625,"y":274,"width":30.609375,"height":21}

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |
| x | 274 | 273.15625 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) · {"x":273.15625,"y":274,"width":30.609375,"height":21} |
| y | 651 | 648 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) · {"x":273.15625,"y":274,"width":30.609375,"height":21} |
| width | 30 | 30.609375 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) · {"x":273.15625,"y":274,"width":30.609375,"height":21} |
| height | 21 | 21 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) · {"x":273.15625,"y":274,"width":30.609375,"height":21} |
| text | 分钟 | 分钟 | — | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) · {"x":273.15625,"y":274,"width":30.609375,"height":21} |
| fontSize | 15 | 15 | 1 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) · {"x":273.15625,"y":274,"width":30.609375,"height":21} |
| fontFamily | PingFang SC | PingFangSC, "PingFang SC", system-ui, Avenir, Helvetica, Arial, sans-serif | — | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) · {"x":273.15625,"y":274,"width":30.609375,"height":21} |
| fontWeight | 400 | 400 | 99 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) · {"x":273.15625,"y":274,"width":30.609375,"height":21} |
| lineHeight | 21 | 21 | 2 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) · {"x":273.15625,"y":274,"width":30.609375,"height":21} |
| borderRadius | — | 0 | 2 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) · {"x":273.15625,"y":274,"width":30.609375,"height":21} |
| borderWidth | 0 | 0 | 1 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) · {"x":273.15625,"y":274,"width":30.609375,"height":21} |
| opacity | 1 | 1 | 0.05 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) · {"x":273.15625,"y":274,"width":30.609375,"height":21} |
| textAlign | left | start | — | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) · {"x":273.15625,"y":274,"width":30.609375,"height":21} |
| color | rgba(44, 44, 44, 1.000) | rgb(44, 44, 44) | 3 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) · {"x":273.15625,"y":274,"width":30.609375,"height":21} |

### 未来利率预测 · 0:118

Design: {"x":20,"y":714,"width":335,"height":282} / Actual: {"x":20,"y":338,"width":335,"height":356}

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |
| x | 20 | 20 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) · {"x":20,"y":338,"width":335,"height":356} |
| y | 714 | 712 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) · {"x":20,"y":338,"width":335,"height":356} |
| width | 335 | 335 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) · {"x":20,"y":338,"width":335,"height":356} |
| height | 282 | 356 | 4 | difference | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) · {"x":20,"y":338,"width":335,"height":356} |
| text | — | — | — | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) · {"x":20,"y":338,"width":335,"height":356} |
| fontSize | — | 16 | 1 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) · {"x":20,"y":338,"width":335,"height":356} |
| fontFamily | — | PingFangSC, "PingFang SC", system-ui, Avenir, Helvetica, Arial, sans-serif | — | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) · {"x":20,"y":338,"width":335,"height":356} |
| fontWeight | — | 400 | 99 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) · {"x":20,"y":338,"width":335,"height":356} |
| lineHeight | — | — | 2 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) · {"x":20,"y":338,"width":335,"height":356} |
| borderRadius | 6 | 6 | 2 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) · {"x":20,"y":338,"width":335,"height":356} |
| borderWidth | 0 | 0 | 1 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) · {"x":20,"y":338,"width":335,"height":356} |
| opacity | 1 | 1 | 0.05 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) · {"x":20,"y":338,"width":335,"height":356} |
| textAlign | — | start | — | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) · {"x":20,"y":338,"width":335,"height":356} |
| color | — | — | 3 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) · {"x":20,"y":338,"width":335,"height":356} |

### 矩形 6 · 0:134

Design: {"x":26,"y":720,"width":114,"height":38} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 利率走势图 · 0:136

Design: {"x":134,"y":720,"width":108,"height":38} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 7 · 0:137

Design: {"x":134,"y":720,"width":108,"height":38} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 资产负债表 · 0:139

Design: {"x":242,"y":720,"width":107,"height":38} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 7备份 2 · 0:140

Design: {"x":242,"y":720,"width":107,"height":38} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 未来利率预测 · 0:135

Design: {"x":33,"y":728,"width":91,"height":21} / Actual: {"x":26,"y":344,"width":107,"height":38}

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |
| x | 33 | 26 | 4 | difference | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) · {"x":26,"y":344,"width":107,"height":38} |
| y | 728 | 718 | 4 | difference | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) · {"x":26,"y":344,"width":107,"height":38} |
| width | 91 | 107 | 4 | difference | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) · {"x":26,"y":344,"width":107,"height":38} |
| height | 21 | 38 | 4 | difference | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) · {"x":26,"y":344,"width":107,"height":38} |
| text | 未来利率预测 | 未来利率预测 | — | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) · {"x":26,"y":344,"width":107,"height":38} |
| fontSize | 15 | 15 | 1 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) · {"x":26,"y":344,"width":107,"height":38} |
| fontFamily | PingFang SC | PingFangSC, "PingFang SC", system-ui, Avenir, Helvetica, Arial, sans-serif | — | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) · {"x":26,"y":344,"width":107,"height":38} |
| fontWeight | 500 | 400 | 99 | difference | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) · {"x":26,"y":344,"width":107,"height":38} |
| lineHeight | 21 | 38 | 2 | difference | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) · {"x":26,"y":344,"width":107,"height":38} |
| borderRadius | — | 6 | 2 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) · {"x":26,"y":344,"width":107,"height":38} |
| borderWidth | 0 | 0 | 1 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) · {"x":26,"y":344,"width":107,"height":38} |
| opacity | 1 | 1 | 0.05 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) · {"x":26,"y":344,"width":107,"height":38} |
| textAlign | left | center | — | difference | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) · {"x":26,"y":344,"width":107,"height":38} |
| color | rgba(44, 44, 44, 1.000) | rgb(44, 44, 44) | 3 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) · {"x":26,"y":344,"width":107,"height":38} |

### 利率走势图 · 0:138

Design: {"x":150,"y":728,"width":75,"height":21} / Actual: {"x":134,"y":344,"width":107,"height":38}

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |
| x | 150 | 134 | 4 | difference | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) · {"x":134,"y":344,"width":107,"height":38} |
| y | 728 | 718 | 4 | difference | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) · {"x":134,"y":344,"width":107,"height":38} |
| width | 75 | 107 | 4 | difference | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) · {"x":134,"y":344,"width":107,"height":38} |
| height | 21 | 38 | 4 | difference | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) · {"x":134,"y":344,"width":107,"height":38} |
| text | 利率走势图 | 利率走势图 | — | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) · {"x":134,"y":344,"width":107,"height":38} |
| fontSize | 15 | 15 | 1 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) · {"x":134,"y":344,"width":107,"height":38} |
| fontFamily | PingFang SC | PingFangSC, "PingFang SC", system-ui, Avenir, Helvetica, Arial, sans-serif | — | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) · {"x":134,"y":344,"width":107,"height":38} |
| fontWeight | 400 | 400 | 99 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) · {"x":134,"y":344,"width":107,"height":38} |
| lineHeight | 21 | 38 | 2 | difference | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) · {"x":134,"y":344,"width":107,"height":38} |
| borderRadius | — | 0 | 2 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) · {"x":134,"y":344,"width":107,"height":38} |
| borderWidth | 0 | 0 | 1 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) · {"x":134,"y":344,"width":107,"height":38} |
| opacity | 1 | 1 | 0.05 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) · {"x":134,"y":344,"width":107,"height":38} |
| textAlign | left | center | — | difference | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) · {"x":134,"y":344,"width":107,"height":38} |
| color | rgba(80, 80, 80, 1.000) | rgb(80, 80, 80) | 3 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) · {"x":134,"y":344,"width":107,"height":38} |

### 资产负债表 · 0:141

Design: {"x":265,"y":728,"width":75,"height":21} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 层叠备份 4 · 0:119

Design: {"x":26,"y":758,"width":323,"height":238} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 蒙版 · 0:121

Design: {"x":26,"y":758,"width":323,"height":238} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 蒙版 · 0:120

Design: {"x":26,"y":758,"width":323,"height":238} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 编组 · 0:123

Design: {"x":34,"y":766,"width":374,"height":22} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 层叠 · 0:126

Design: {"x":34,"y":766,"width":68,"height":22} / Actual: {"x":36,"y":611,"width":81.3125,"height":20}

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |
| x | 34 | 36 | 4 | pending | evidence-insufficient | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(1) · {"x":36,"y":611,"width":81.3125,"height":20} |
| y | 766 | 985 | 4 | pending | evidence-insufficient | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(1) · {"x":36,"y":611,"width":81.3125,"height":20} |
| width | 68 | 81.3125 | 4 | pending | evidence-insufficient | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(1) · {"x":36,"y":611,"width":81.3125,"height":20} |
| height | 22 | 20 | 4 | pending | evidence-insufficient | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(1) · {"x":36,"y":611,"width":81.3125,"height":20} |
| text | — | 3.75~4.00 | — | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(1) · {"x":36,"y":611,"width":81.3125,"height":20} |
| fontSize | — | 15 | 1 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(1) · {"x":36,"y":611,"width":81.3125,"height":20} |
| fontFamily | — | DINPro-Medium | — | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(1) · {"x":36,"y":611,"width":81.3125,"height":20} |
| fontWeight | — | 500 | 99 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(1) · {"x":36,"y":611,"width":81.3125,"height":20} |
| lineHeight | — | 20 | 2 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(1) · {"x":36,"y":611,"width":81.3125,"height":20} |
| borderRadius | 0 | 0 | 2 | pending | evidence-insufficient | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(1) · {"x":36,"y":611,"width":81.3125,"height":20} |
| borderWidth | 0 | 0 | 1 | pending | evidence-insufficient | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(1) · {"x":36,"y":611,"width":81.3125,"height":20} |
| opacity | 1 | 1 | 0.05 | pending | evidence-insufficient | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(1) · {"x":36,"y":611,"width":81.3125,"height":20} |
| textAlign | — | left | — | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(1) · {"x":36,"y":611,"width":81.3125,"height":20} |
| color | — | — | 3 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(1) · {"x":36,"y":611,"width":81.3125,"height":20} |

### 层叠备份 · 0:128

Design: {"x":111,"y":766,"width":68,"height":22} / Actual: {"x":117.3125,"y":611,"width":69.703125,"height":20}

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |
| x | 111 | 117.3125 | 4 | pending | evidence-insufficient | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(2) · {"x":117.3125,"y":611,"width":69.703125,"height":20} |
| y | 766 | 985 | 4 | pending | evidence-insufficient | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(2) · {"x":117.3125,"y":611,"width":69.703125,"height":20} |
| width | 68 | 69.703125 | 4 | pending | evidence-insufficient | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(2) · {"x":117.3125,"y":611,"width":69.703125,"height":20} |
| height | 22 | 20 | 4 | pending | evidence-insufficient | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(2) · {"x":117.3125,"y":611,"width":69.703125,"height":20} |
| text | — | 88.50% | — | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(2) · {"x":117.3125,"y":611,"width":69.703125,"height":20} |
| fontSize | — | 15 | 1 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(2) · {"x":117.3125,"y":611,"width":69.703125,"height":20} |
| fontFamily | — | DINPro-Medium | — | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(2) · {"x":117.3125,"y":611,"width":69.703125,"height":20} |
| fontWeight | — | 500 | 99 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(2) · {"x":117.3125,"y":611,"width":69.703125,"height":20} |
| lineHeight | — | 20 | 2 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(2) · {"x":117.3125,"y":611,"width":69.703125,"height":20} |
| borderRadius | 0 | 0 | 2 | pending | evidence-insufficient | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(2) · {"x":117.3125,"y":611,"width":69.703125,"height":20} |
| borderWidth | 0 | 0 | 1 | pending | evidence-insufficient | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(2) · {"x":117.3125,"y":611,"width":69.703125,"height":20} |
| opacity | 1 | 1 | 0.05 | pending | evidence-insufficient | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(2) · {"x":117.3125,"y":611,"width":69.703125,"height":20} |
| textAlign | — | right | — | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(2) · {"x":117.3125,"y":611,"width":69.703125,"height":20} |
| color | — | — | 3 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(2) · {"x":117.3125,"y":611,"width":69.703125,"height":20} |

### 层叠备份 2 · 0:130

Design: {"x":188,"y":766,"width":68,"height":22} / Actual: {"x":117.3125,"y":585,"width":69.703125,"height":20}

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |
| x | 188 | 117.3125 | 4 | pending | evidence-insufficient | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > span:nth-of-type(2) · {"x":117.3125,"y":585,"width":69.703125,"height":20} |
| y | 766 | 959 | 4 | pending | evidence-insufficient | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > span:nth-of-type(2) · {"x":117.3125,"y":585,"width":69.703125,"height":20} |
| width | 68 | 69.703125 | 4 | pending | evidence-insufficient | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > span:nth-of-type(2) · {"x":117.3125,"y":585,"width":69.703125,"height":20} |
| height | 22 | 20 | 4 | pending | evidence-insufficient | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > span:nth-of-type(2) · {"x":117.3125,"y":585,"width":69.703125,"height":20} |
| text | — | 11.50% | — | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > span:nth-of-type(2) · {"x":117.3125,"y":585,"width":69.703125,"height":20} |
| fontSize | — | 15 | 1 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > span:nth-of-type(2) · {"x":117.3125,"y":585,"width":69.703125,"height":20} |
| fontFamily | — | DINPro-Medium | — | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > span:nth-of-type(2) · {"x":117.3125,"y":585,"width":69.703125,"height":20} |
| fontWeight | — | 500 | 99 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > span:nth-of-type(2) · {"x":117.3125,"y":585,"width":69.703125,"height":20} |
| lineHeight | — | 20 | 2 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > span:nth-of-type(2) · {"x":117.3125,"y":585,"width":69.703125,"height":20} |
| borderRadius | 0 | 0 | 2 | pending | evidence-insufficient | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > span:nth-of-type(2) · {"x":117.3125,"y":585,"width":69.703125,"height":20} |
| borderWidth | 0 | 0 | 1 | pending | evidence-insufficient | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > span:nth-of-type(2) · {"x":117.3125,"y":585,"width":69.703125,"height":20} |
| opacity | 1 | 1 | 0.05 | pending | evidence-insufficient | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > span:nth-of-type(2) · {"x":117.3125,"y":585,"width":69.703125,"height":20} |
| textAlign | — | right | — | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > span:nth-of-type(2) · {"x":117.3125,"y":585,"width":69.703125,"height":20} |
| color | — | — | 3 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > span:nth-of-type(2) · {"x":117.3125,"y":585,"width":69.703125,"height":20} |

### 层叠备份 3 · 0:132

Design: {"x":264,"y":766,"width":68,"height":22} / Actual: {"x":269.296875,"y":611,"width":69.703125,"height":20}

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |
| x | 264 | 269.296875 | 4 | pending | evidence-insufficient | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(4) · {"x":269.296875,"y":611,"width":69.703125,"height":20} |
| y | 766 | 985 | 4 | pending | evidence-insufficient | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(4) · {"x":269.296875,"y":611,"width":69.703125,"height":20} |
| width | 68 | 69.703125 | 4 | pending | evidence-insufficient | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(4) · {"x":269.296875,"y":611,"width":69.703125,"height":20} |
| height | 22 | 20 | 4 | pending | evidence-insufficient | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(4) · {"x":269.296875,"y":611,"width":69.703125,"height":20} |
| text | — | 58.60% | — | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(4) · {"x":269.296875,"y":611,"width":69.703125,"height":20} |
| fontSize | — | 15 | 1 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(4) · {"x":269.296875,"y":611,"width":69.703125,"height":20} |
| fontFamily | — | DINPro-Medium | — | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(4) · {"x":269.296875,"y":611,"width":69.703125,"height":20} |
| fontWeight | — | 500 | 99 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(4) · {"x":269.296875,"y":611,"width":69.703125,"height":20} |
| lineHeight | — | 20 | 2 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(4) · {"x":269.296875,"y":611,"width":69.703125,"height":20} |
| borderRadius | 0 | 0 | 2 | pending | evidence-insufficient | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(4) · {"x":269.296875,"y":611,"width":69.703125,"height":20} |
| borderWidth | 0 | 0 | 1 | pending | evidence-insufficient | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(4) · {"x":269.296875,"y":611,"width":69.703125,"height":20} |
| opacity | 1 | 1 | 0.05 | pending | evidence-insufficient | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(4) · {"x":269.296875,"y":611,"width":69.703125,"height":20} |
| textAlign | — | right | — | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(4) · {"x":269.296875,"y":611,"width":69.703125,"height":20} |
| color | — | — | 3 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(4) · {"x":269.296875,"y":611,"width":69.703125,"height":20} |

### 层叠备份 4 · 0:124

Design: {"x":340,"y":766,"width":68,"height":22} / Actual: {"x":269.296875,"y":585,"width":69.703125,"height":20}

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |
| x | 340 | 269.296875 | 4 | pending | evidence-insufficient | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > span:nth-of-type(4) · {"x":269.296875,"y":585,"width":69.703125,"height":20} |
| y | 766 | 959 | 4 | pending | evidence-insufficient | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > span:nth-of-type(4) · {"x":269.296875,"y":585,"width":69.703125,"height":20} |
| width | 68 | 69.703125 | 4 | pending | evidence-insufficient | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > span:nth-of-type(4) · {"x":269.296875,"y":585,"width":69.703125,"height":20} |
| height | 22 | 20 | 4 | pending | evidence-insufficient | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > span:nth-of-type(4) · {"x":269.296875,"y":585,"width":69.703125,"height":20} |
| text | — | 41.40% | — | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > span:nth-of-type(4) · {"x":269.296875,"y":585,"width":69.703125,"height":20} |
| fontSize | — | 15 | 1 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > span:nth-of-type(4) · {"x":269.296875,"y":585,"width":69.703125,"height":20} |
| fontFamily | — | DINPro-Medium | — | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > span:nth-of-type(4) · {"x":269.296875,"y":585,"width":69.703125,"height":20} |
| fontWeight | — | 500 | 99 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > span:nth-of-type(4) · {"x":269.296875,"y":585,"width":69.703125,"height":20} |
| lineHeight | — | 20 | 2 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > span:nth-of-type(4) · {"x":269.296875,"y":585,"width":69.703125,"height":20} |
| borderRadius | 0 | 0 | 2 | pending | evidence-insufficient | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > span:nth-of-type(4) · {"x":269.296875,"y":585,"width":69.703125,"height":20} |
| borderWidth | 0 | 0 | 1 | pending | evidence-insufficient | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > span:nth-of-type(4) · {"x":269.296875,"y":585,"width":69.703125,"height":20} |
| opacity | 1 | 1 | 0.05 | pending | evidence-insufficient | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > span:nth-of-type(4) · {"x":269.296875,"y":585,"width":69.703125,"height":20} |
| textAlign | — | right | — | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > span:nth-of-type(4) · {"x":269.296875,"y":585,"width":69.703125,"height":20} |
| color | — | — | 3 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > span:nth-of-type(4) · {"x":269.296875,"y":585,"width":69.703125,"height":20} |

### 3月19日 · 0:127

Design: {"x":42.5,"y":768,"width":51,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 4月30日 · 0:129

Design: {"x":118,"y":768,"width":54,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 6月18日 · 0:131

Design: {"x":196.5,"y":768,"width":51,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 7月30日 · 0:133

Design: {"x":271.5,"y":768,"width":53,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 9月18日 · 0:125

Design: {"x":348.5,"y":768,"width":51,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 会议时间：2027年03月18日 02: · 0:122

Design: {"x":34,"y":798,"width":203,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 概率 · 0:327

Design: {"x":26,"y":824,"width":323,"height":242} / Actual: {"x":26,"y":414,"width":323,"height":223}

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |
| x | 26 | 26 | 4 | difference | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) · {"x":26,"y":414,"width":323,"height":223} |
| y | 824 | 788 | 4 | difference | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) · {"x":26,"y":414,"width":323,"height":223} |
| width | 323 | 323 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) · {"x":26,"y":414,"width":323,"height":223} |
| height | 242 | 223 | 4 | difference | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) · {"x":26,"y":414,"width":323,"height":223} |
| text | — | — | — | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) · {"x":26,"y":414,"width":323,"height":223} |
| fontSize | — | 16 | 1 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) · {"x":26,"y":414,"width":323,"height":223} |
| fontFamily | — | PingFangSC, "PingFang SC", system-ui, Avenir, Helvetica, Arial, sans-serif | — | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) · {"x":26,"y":414,"width":323,"height":223} |
| fontWeight | — | 400 | 99 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) · {"x":26,"y":414,"width":323,"height":223} |
| lineHeight | — | — | 2 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) · {"x":26,"y":414,"width":323,"height":223} |
| borderRadius | 0 | 0 | 2 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) · {"x":26,"y":414,"width":323,"height":223} |
| borderWidth | 0 | 0 | 1 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) · {"x":26,"y":414,"width":323,"height":223} |
| opacity | 1 | 1 | 0.05 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) · {"x":26,"y":414,"width":323,"height":223} |
| textAlign | — | start | — | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) · {"x":26,"y":414,"width":323,"height":223} |
| color | — | — | 3 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) · {"x":26,"y":414,"width":323,"height":223} |

### 概率 · 0:328

Design: {"x":30,"y":824,"width":315,"height":87} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 利率区间(%) · 0:329

Design: {"x":36,"y":830,"width":74,"height":20} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 概率 · 0:334

Design: {"x":313,"y":831,"width":26,"height":18} / Actual: {"x":312.46875,"y":456,"width":26.53125,"height":20}

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |
| x | 313 | 312.46875 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > span:nth-of-type(2) · {"x":312.46875,"y":456,"width":26.53125,"height":20} |
| y | 831 | 830 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > span:nth-of-type(2) · {"x":312.46875,"y":456,"width":26.53125,"height":20} |
| width | 26 | 26.53125 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > span:nth-of-type(2) · {"x":312.46875,"y":456,"width":26.53125,"height":20} |
| height | 18 | 20 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > span:nth-of-type(2) · {"x":312.46875,"y":456,"width":26.53125,"height":20} |
| text | 概率 | 概率 | — | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > span:nth-of-type(2) · {"x":312.46875,"y":456,"width":26.53125,"height":20} |
| fontSize | 13 | 13 | 1 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > span:nth-of-type(2) · {"x":312.46875,"y":456,"width":26.53125,"height":20} |
| fontFamily | PingFang SC | PingFangSC, "PingFang SC", system-ui, Avenir, Helvetica, Arial, sans-serif | — | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > span:nth-of-type(2) · {"x":312.46875,"y":456,"width":26.53125,"height":20} |
| fontWeight | 400 | 400 | 99 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > span:nth-of-type(2) · {"x":312.46875,"y":456,"width":26.53125,"height":20} |
| lineHeight | 18.19999885559082 | 20 | 2 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > span:nth-of-type(2) · {"x":312.46875,"y":456,"width":26.53125,"height":20} |
| borderRadius | — | 0 | 2 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > span:nth-of-type(2) · {"x":312.46875,"y":456,"width":26.53125,"height":20} |
| borderWidth | 0 | 0 | 1 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > span:nth-of-type(2) · {"x":312.46875,"y":456,"width":26.53125,"height":20} |
| opacity | 1 | 1 | 0.05 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > span:nth-of-type(2) · {"x":312.46875,"y":456,"width":26.53125,"height":20} |
| textAlign | right | start | — | difference | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > span:nth-of-type(2) · {"x":312.46875,"y":456,"width":26.53125,"height":20} |
| color | rgba(119, 119, 119, 1.000) | rgb(119, 119, 119) | 3 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > span:nth-of-type(2) · {"x":312.46875,"y":456,"width":26.53125,"height":20} |

### 3.25-3.50 · 0:330

Design: {"x":36,"y":857,"width":63,"height":19} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 20.30% · 0:332

Design: {"x":290,"y":857,"width":49,"height":19} / Actual: {"x":284,"y":483,"width":55,"height":20}

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |
| x | 290 | 284 | 4 | difference | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > span:nth-of-type(2) · {"x":284,"y":483,"width":55,"height":20} |
| y | 857 | 857 | 4 | difference | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > span:nth-of-type(2) · {"x":284,"y":483,"width":55,"height":20} |
| width | 49 | 55 | 4 | pending | dynamic-text: design sizing constraint unavailable | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > span:nth-of-type(2) · {"x":284,"y":483,"width":55,"height":20} |
| height | 19 | 20 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > span:nth-of-type(2) · {"x":284,"y":483,"width":55,"height":20} |
| text | 20.30% | 11.50% | — | exempt | normalize-probability-text | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > span:nth-of-type(2) · {"x":284,"y":483,"width":55,"height":20} |
| fontSize | 15 | 15 | 1 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > span:nth-of-type(2) · {"x":284,"y":483,"width":55,"height":20} |
| fontFamily | DIN Pro | DINPro-Medium | — | difference | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > span:nth-of-type(2) · {"x":284,"y":483,"width":55,"height":20} |
| fontWeight | 500 | 500 | 99 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > span:nth-of-type(2) · {"x":284,"y":483,"width":55,"height":20} |
| lineHeight | 19.31999969482422 | — | 2 | pending | evidence-insufficient | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > span:nth-of-type(2) · {"x":284,"y":483,"width":55,"height":20} |
| borderRadius | — | 0 | 2 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > span:nth-of-type(2) · {"x":284,"y":483,"width":55,"height":20} |
| borderWidth | 0 | 0 | 1 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > span:nth-of-type(2) · {"x":284,"y":483,"width":55,"height":20} |
| opacity | 1 | 1 | 0.05 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > span:nth-of-type(2) · {"x":284,"y":483,"width":55,"height":20} |
| textAlign | right | right | — | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > span:nth-of-type(2) · {"x":284,"y":483,"width":55,"height":20} |
| color | rgba(44, 44, 44, 1.000) | rgb(44, 44, 44) | 3 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > span:nth-of-type(2) · {"x":284,"y":483,"width":55,"height":20} |

### 矩形 8 · 0:335

Design: {"x":105,"y":862,"width":179,"height":12} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 8 · 0:336

Design: {"x":105,"y":862,"width":32.9357795715332,"height":12} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 3.50-3.75 · 0:331

Design: {"x":36,"y":885,"width":63,"height":19} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 79.70% · 0:333

Design: {"x":290,"y":885,"width":49,"height":19} / Actual: {"x":284,"y":510,"width":55,"height":20}

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |
| x | 290 | 284 | 4 | difference | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > span:nth-of-type(2) · {"x":284,"y":510,"width":55,"height":20} |
| y | 885 | 884 | 4 | difference | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > span:nth-of-type(2) · {"x":284,"y":510,"width":55,"height":20} |
| width | 49 | 55 | 4 | pending | dynamic-text: design sizing constraint unavailable | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > span:nth-of-type(2) · {"x":284,"y":510,"width":55,"height":20} |
| height | 19 | 20 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > span:nth-of-type(2) · {"x":284,"y":510,"width":55,"height":20} |
| text | 79.70% | 88.50% | — | exempt | normalize-probability-text | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > span:nth-of-type(2) · {"x":284,"y":510,"width":55,"height":20} |
| fontSize | 15 | 15 | 1 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > span:nth-of-type(2) · {"x":284,"y":510,"width":55,"height":20} |
| fontFamily | DIN Pro | DINPro-Medium | — | difference | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > span:nth-of-type(2) · {"x":284,"y":510,"width":55,"height":20} |
| fontWeight | 500 | 500 | 99 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > span:nth-of-type(2) · {"x":284,"y":510,"width":55,"height":20} |
| lineHeight | 19.31999969482422 | — | 2 | pending | evidence-insufficient | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > span:nth-of-type(2) · {"x":284,"y":510,"width":55,"height":20} |
| borderRadius | — | 0 | 2 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > span:nth-of-type(2) · {"x":284,"y":510,"width":55,"height":20} |
| borderWidth | 0 | 0 | 1 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > span:nth-of-type(2) · {"x":284,"y":510,"width":55,"height":20} |
| opacity | 1 | 1 | 0.05 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > span:nth-of-type(2) · {"x":284,"y":510,"width":55,"height":20} |
| textAlign | right | right | — | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > span:nth-of-type(2) · {"x":284,"y":510,"width":55,"height":20} |
| color | rgba(44, 44, 44, 1.000) | rgb(44, 44, 44) | 3 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > span:nth-of-type(2) · {"x":284,"y":510,"width":55,"height":20} |

### 矩形 8备份 2 · 0:337

Design: {"x":105,"y":890,"width":179,"height":12} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 8备份 · 0:338

Design: {"x":105,"y":890,"width":135,"height":12} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 最新概率 · 0:339

Design: {"x":30,"y":923,"width":315,"height":89} / Actual: {"x":30,"y":548,"width":315,"height":89}

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |
| x | 30 | 30 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) · {"x":30,"y":548,"width":315,"height":89} |
| y | 923 | 922 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) · {"x":30,"y":548,"width":315,"height":89} |
| width | 315 | 315 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) · {"x":30,"y":548,"width":315,"height":89} |
| height | 89 | 89 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) · {"x":30,"y":548,"width":315,"height":89} |
| text | — | — | — | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) · {"x":30,"y":548,"width":315,"height":89} |
| fontSize | — | 16 | 1 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) · {"x":30,"y":548,"width":315,"height":89} |
| fontFamily | — | PingFangSC, "PingFang SC", system-ui, Avenir, Helvetica, Arial, sans-serif | — | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) · {"x":30,"y":548,"width":315,"height":89} |
| fontWeight | — | 400 | 99 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) · {"x":30,"y":548,"width":315,"height":89} |
| lineHeight | — | — | 2 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) · {"x":30,"y":548,"width":315,"height":89} |
| borderRadius | 4 | 4 | 2 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) · {"x":30,"y":548,"width":315,"height":89} |
| borderWidth | 0 | 0 | 1 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) · {"x":30,"y":548,"width":315,"height":89} |
| opacity | 1 | 1 | 0.05 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) · {"x":30,"y":548,"width":315,"height":89} |
| textAlign | — | start | — | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) · {"x":30,"y":548,"width":315,"height":89} |
| color | — | — | 3 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) · {"x":30,"y":548,"width":315,"height":89} |

### 最新概率 · 0:340

Design: {"x":30,"y":923,"width":315,"height":89} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 利率区间(%) · 0:342

Design: {"x":36,"y":929,"width":74,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 最新概率 · 0:343

Design: {"x":130,"y":929,"width":52,"height":18} / Actual: {"x":117.3125,"y":554,"width":69.703125,"height":18}

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |
| x | 130 | 117.3125 | 4 | difference | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(2) · {"x":117.3125,"y":554,"width":69.703125,"height":18} |
| y | 929 | 928 | 4 | difference | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(2) · {"x":117.3125,"y":554,"width":69.703125,"height":18} |
| width | 52 | 69.703125 | 4 | difference | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(2) · {"x":117.3125,"y":554,"width":69.703125,"height":18} |
| height | 18 | 18 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(2) · {"x":117.3125,"y":554,"width":69.703125,"height":18} |
| text | 最新概率 | 最新概率 | — | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(2) · {"x":117.3125,"y":554,"width":69.703125,"height":18} |
| fontSize | 13 | 13 | 1 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(2) · {"x":117.3125,"y":554,"width":69.703125,"height":18} |
| fontFamily | PingFang SC | PingFangSC, "PingFang SC", system-ui, Avenir, Helvetica, Arial, sans-serif | — | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(2) · {"x":117.3125,"y":554,"width":69.703125,"height":18} |
| fontWeight | 400 | 400 | 99 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(2) · {"x":117.3125,"y":554,"width":69.703125,"height":18} |
| lineHeight | 18 | — | 2 | pending | evidence-insufficient | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(2) · {"x":117.3125,"y":554,"width":69.703125,"height":18} |
| borderRadius | — | 0 | 2 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(2) · {"x":117.3125,"y":554,"width":69.703125,"height":18} |
| borderWidth | 0 | 0 | 1 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(2) · {"x":117.3125,"y":554,"width":69.703125,"height":18} |
| opacity | 1 | 1 | 0.05 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(2) · {"x":117.3125,"y":554,"width":69.703125,"height":18} |
| textAlign | left | right | — | difference | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(2) · {"x":117.3125,"y":554,"width":69.703125,"height":18} |
| color | rgba(119, 119, 119, 1.000) | rgb(119, 119, 119) | 3 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(2) · {"x":117.3125,"y":554,"width":69.703125,"height":18} |

### 上一日概率 · 0:344

Design: {"x":202,"y":929,"width":65,"height":18} / Actual: {"x":187.015625,"y":554,"width":82.28125,"height":18}

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |
| x | 202 | 187.015625 | 4 | difference | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(3) · {"x":187.015625,"y":554,"width":82.28125,"height":18} |
| y | 929 | 928 | 4 | difference | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(3) · {"x":187.015625,"y":554,"width":82.28125,"height":18} |
| width | 65 | 82.28125 | 4 | difference | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(3) · {"x":187.015625,"y":554,"width":82.28125,"height":18} |
| height | 18 | 18 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(3) · {"x":187.015625,"y":554,"width":82.28125,"height":18} |
| text | 上一日概率 | 上一日概率 | — | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(3) · {"x":187.015625,"y":554,"width":82.28125,"height":18} |
| fontSize | 13 | 13 | 1 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(3) · {"x":187.015625,"y":554,"width":82.28125,"height":18} |
| fontFamily | PingFang SC | PingFangSC, "PingFang SC", system-ui, Avenir, Helvetica, Arial, sans-serif | — | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(3) · {"x":187.015625,"y":554,"width":82.28125,"height":18} |
| fontWeight | 400 | 400 | 99 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(3) · {"x":187.015625,"y":554,"width":82.28125,"height":18} |
| lineHeight | 18 | — | 2 | pending | evidence-insufficient | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(3) · {"x":187.015625,"y":554,"width":82.28125,"height":18} |
| borderRadius | — | 0 | 2 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(3) · {"x":187.015625,"y":554,"width":82.28125,"height":18} |
| borderWidth | 0 | 0 | 1 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(3) · {"x":187.015625,"y":554,"width":82.28125,"height":18} |
| opacity | 1 | 1 | 0.05 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(3) · {"x":187.015625,"y":554,"width":82.28125,"height":18} |
| textAlign | left | right | — | difference | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(3) · {"x":187.015625,"y":554,"width":82.28125,"height":18} |
| color | rgba(119, 119, 119, 1.000) | rgb(119, 119, 119) | 3 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(3) · {"x":187.015625,"y":554,"width":82.28125,"height":18} |

### 上周概率 · 0:345

Design: {"x":287,"y":929,"width":52,"height":18} / Actual: {"x":269.296875,"y":554,"width":69.703125,"height":18}

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |
| x | 287 | 269.296875 | 4 | difference | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(4) · {"x":269.296875,"y":554,"width":69.703125,"height":18} |
| y | 929 | 928 | 4 | difference | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(4) · {"x":269.296875,"y":554,"width":69.703125,"height":18} |
| width | 52 | 69.703125 | 4 | difference | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(4) · {"x":269.296875,"y":554,"width":69.703125,"height":18} |
| height | 18 | 18 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(4) · {"x":269.296875,"y":554,"width":69.703125,"height":18} |
| text | 上周概率 | 上周概率 | — | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(4) · {"x":269.296875,"y":554,"width":69.703125,"height":18} |
| fontSize | 13 | 13 | 1 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(4) · {"x":269.296875,"y":554,"width":69.703125,"height":18} |
| fontFamily | PingFang SC | PingFangSC, "PingFang SC", system-ui, Avenir, Helvetica, Arial, sans-serif | — | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(4) · {"x":269.296875,"y":554,"width":69.703125,"height":18} |
| fontWeight | 400 | 400 | 99 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(4) · {"x":269.296875,"y":554,"width":69.703125,"height":18} |
| lineHeight | 18 | — | 2 | pending | evidence-insufficient | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(4) · {"x":269.296875,"y":554,"width":69.703125,"height":18} |
| borderRadius | — | 0 | 2 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(4) · {"x":269.296875,"y":554,"width":69.703125,"height":18} |
| borderWidth | 0 | 0 | 1 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(4) · {"x":269.296875,"y":554,"width":69.703125,"height":18} |
| opacity | 1 | 1 | 0.05 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(4) · {"x":269.296875,"y":554,"width":69.703125,"height":18} |
| textAlign | right | right | — | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(4) · {"x":269.296875,"y":554,"width":69.703125,"height":18} |
| color | rgba(119, 119, 119, 1.000) | rgb(119, 119, 119) | 3 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(4) · {"x":269.296875,"y":554,"width":69.703125,"height":18} |

### 矩形 13 · 0:341

Design: {"x":36,"y":952.5,"width":303,"height":1} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 3.50-3.50 · 0:346

Design: {"x":36,"y":960,"width":63,"height":19} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 20.30% · 0:348

Design: {"x":133,"y":960,"width":49,"height":19} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 10.90% · 0:350

Design: {"x":218,"y":960,"width":49,"height":19} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 12.90% · 0:351

Design: {"x":290,"y":960,"width":49,"height":19} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 3.50-3.75 · 0:347

Design: {"x":36,"y":986,"width":63,"height":19} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 79.70% · 0:349

Design: {"x":133,"y":986,"width":49,"height":19} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 89.10% · 0:352

Design: {"x":218,"y":986,"width":49,"height":19} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 87.10% · 0:353

Design: {"x":290,"y":986,"width":49,"height":19} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 基于30天联邦基金期货价格测算，反映市场 · 0:354

Design: {"x":26,"y":1026,"width":323,"height":40} / Actual: {"x":26,"y":645,"width":323,"height":40}

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |
| x | 26 | 26 | 4 | difference | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > p · {"x":26,"y":645,"width":323,"height":40} |
| y | 1026 | 1019 | 4 | difference | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > p · {"x":26,"y":645,"width":323,"height":40} |
| width | 323 | 323 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > p · {"x":26,"y":645,"width":323,"height":40} |
| height | 40 | 40 | 4 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > p · {"x":26,"y":645,"width":323,"height":40} |
| text | 基于30天联邦基金期货价格测算，反映市场对美联储货币政策的利率变化可能性预期 | 基于30天联邦基金期货价格测算，反映市场对美联储货币政策的利率变化可能性预期 | — | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > p · {"x":26,"y":645,"width":323,"height":40} |
| fontSize | 13 | 13 | 1 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > p · {"x":26,"y":645,"width":323,"height":40} |
| fontFamily | PingFang SC | PingFangSC, "PingFang SC", system-ui, Avenir, Helvetica, Arial, sans-serif | — | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > p · {"x":26,"y":645,"width":323,"height":40} |
| fontWeight | 400 | 400 | 99 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > p · {"x":26,"y":645,"width":323,"height":40} |
| lineHeight | 20 | 20 | 2 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > p · {"x":26,"y":645,"width":323,"height":40} |
| borderRadius | — | 0 | 2 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > p · {"x":26,"y":645,"width":323,"height":40} |
| borderWidth | 0 | 0 | 1 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > p · {"x":26,"y":645,"width":323,"height":40} |
| opacity | 1 | 1 | 0.05 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > p · {"x":26,"y":645,"width":323,"height":40} |
| textAlign | left | start | — | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > p · {"x":26,"y":645,"width":323,"height":40} |
| color | rgba(154, 154, 154, 1.000) | rgb(154, 154, 154) | 3 | passed | measured | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > p · {"x":26,"y":645,"width":323,"height":40} |

### 投票 · 0:286

Design: {"x":10,"y":1090,"width":355,"height":261} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 投票 · 0:287

Design: {"x":10,"y":1090,"width":355,"height":261} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 标签_投票进行中 · 0:295

Design: {"x":280,"y":1101,"width":85,"height":22} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 2 · 0:296

Design: {"x":280,"y":1101,"width":85,"height":22} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 投票 · 0:292

Design: {"x":20,"y":1102,"width":32,"height":20} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 2 · 0:293

Design: {"x":58,"y":1103,"width":64,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 最多选2项 · 0:294

Design: {"x":62,"y":1104,"width":56,"height":16} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 编组 · 0:297

Design: {"x":284,"y":1105,"width":71,"height":15} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 路径 · 0:298

Design: {"x":284,"y":1105,"width":14,"height":14} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 投票进行中 · 0:302

Design: {"x":299,"y":1105,"width":56,"height":15} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 形状 · 0:301

Design: {"x":285.3125,"y":1106.3125,"width":11.375,"height":11.375} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 路径 · 0:299

Design: {"x":285.3125,"y":1106.3125,"width":11.375,"height":11.375} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 路径 · 0:300

Design: {"x":290.5625,"y":1108.6458740234375,"width":3.2083332538604736,"height":3.7916667461395264} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 文案文案文案文案文案文案文案文案文案文案 · 0:304

Design: {"x":20,"y":1131,"width":335,"height":48} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 8备份 3 · 0:303

Design: {"x":20,"y":1191,"width":335,"height":32} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 选项A · 0:311

Design: {"x":30,"y":1197,"width":291,"height":20} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 编组 · 0:312

Design: {"x":329,"y":1199,"width":16,"height":16} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 10 · 0:313

Design: {"x":329,"y":1199,"width":16,"height":16} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 路径 · 0:314

Design: {"x":331,"y":1202.5,"width":12,"height":9} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 8备份 6 · 0:315

Design: {"x":20,"y":1231,"width":335,"height":32} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 选项B · 0:316

Design: {"x":30,"y":1237,"width":40,"height":20} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 编组 · 0:305

Design: {"x":20,"y":1273,"width":92,"height":16} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### icon_火 · 0:307

Design: {"x":20,"y":1273,"width":16,"height":16} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 10000人参与 · 0:306

Design: {"x":36,"y":1273,"width":76,"height":16} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 编组 · 0:308

Design: {"x":23,"y":1275,"width":10,"height":12.5} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 形状 · 0:310

Design: {"x":23,"y":1275,"width":10,"height":12.5} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 路径 · 0:309

Design: {"x":27.31787109375,"y":1282.611083984375,"width":1.2721271514892578,"height":1.5351248979568481} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### @数据展示/数据列表/交易详情/弹窗/确定 · 0:288

Design: {"x":20,"y":1305,"width":335,"height":34} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 确定 · 0:289

Design: {"x":20,"y":1305,"width":335,"height":34} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 · 0:290

Design: {"x":20,"y":1305,"width":335,"height":34} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 投票 · 0:291

Design: {"x":172.3448486328125,"y":1313,"width":28,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 相关品种动态 · 0:171

Design: {"x":10,"y":1363,"width":355,"height":192} / Actual: {"x":10,"y":714,"width":355,"height":191} · Displacement y -650px; explained -276px; unverified remainder -374px (partial)

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |
| x | 10 | 10 | 4 | passed | measured | body > div > div > div > div:nth-of-type(2) · {"x":10,"y":714,"width":355,"height":191} |
| y | 1363 | 1364 | 4 | passed | measured | body > div > div > div > div:nth-of-type(2) · {"x":10,"y":714,"width":355,"height":191} |
| width | 355 | 355 | 4 | passed | measured | body > div > div > div > div:nth-of-type(2) · {"x":10,"y":714,"width":355,"height":191} |
| height | 192 | 191 | 4 | passed | measured | body > div > div > div > div:nth-of-type(2) · {"x":10,"y":714,"width":355,"height":191} |
| text | — | — | — | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(2) · {"x":10,"y":714,"width":355,"height":191} |
| fontSize | — | 16 | 1 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(2) · {"x":10,"y":714,"width":355,"height":191} |
| fontFamily | — | PingFangSC, "PingFang SC", system-ui, Avenir, Helvetica, Arial, sans-serif | — | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(2) · {"x":10,"y":714,"width":355,"height":191} |
| fontWeight | — | 400 | 99 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(2) · {"x":10,"y":714,"width":355,"height":191} |
| lineHeight | — | — | 2 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(2) · {"x":10,"y":714,"width":355,"height":191} |
| borderRadius | 8 | 8 | 2 | passed | measured | body > div > div > div > div:nth-of-type(2) · {"x":10,"y":714,"width":355,"height":191} |
| borderWidth | 0 | 0 | 1 | passed | measured | body > div > div > div > div:nth-of-type(2) · {"x":10,"y":714,"width":355,"height":191} |
| opacity | 1 | 1 | 0.05 | passed | measured | body > div > div > div > div:nth-of-type(2) · {"x":10,"y":714,"width":355,"height":191} |
| textAlign | — | start | — | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(2) · {"x":10,"y":714,"width":355,"height":191} |
| color | rgba(255, 255, 255, 1.000) | rgb(255, 255, 255) | 3 | passed | measured | body > div > div > div > div:nth-of-type(2) · {"x":10,"y":714,"width":355,"height":191} |

### 相关品种动态 · 0:176

Design: {"x":20,"y":1375,"width":96,"height":20} / Actual: {"x":20,"y":725,"width":97.921875,"height":20}

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |
| x | 20 | 20 | 4 | passed | measured | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(1) > span · {"x":20,"y":725,"width":97.921875,"height":20} |
| y | 1375 | 1375 | 4 | passed | measured | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(1) > span · {"x":20,"y":725,"width":97.921875,"height":20} |
| width | 96 | 97.921875 | 4 | passed | measured | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(1) > span · {"x":20,"y":725,"width":97.921875,"height":20} |
| height | 20 | 20 | 4 | passed | measured | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(1) > span · {"x":20,"y":725,"width":97.921875,"height":20} |
| text | 相关品种动态 | 相关品种动态 | — | passed | measured | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(1) > span · {"x":20,"y":725,"width":97.921875,"height":20} |
| fontSize | 16 | 16 | 1 | passed | measured | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(1) > span · {"x":20,"y":725,"width":97.921875,"height":20} |
| fontFamily | PingFang SC | PingFangSC, "PingFang SC", system-ui, Avenir, Helvetica, Arial, sans-serif | — | passed | measured | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(1) > span · {"x":20,"y":725,"width":97.921875,"height":20} |
| fontWeight | 500 | 500 | 99 | passed | measured | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(1) > span · {"x":20,"y":725,"width":97.921875,"height":20} |
| lineHeight | 20 | 20 | 2 | passed | measured | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(1) > span · {"x":20,"y":725,"width":97.921875,"height":20} |
| borderRadius | — | 0 | 2 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(1) > span · {"x":20,"y":725,"width":97.921875,"height":20} |
| borderWidth | 0 | 0 | 1 | passed | measured | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(1) > span · {"x":20,"y":725,"width":97.921875,"height":20} |
| opacity | 1 | 1 | 0.05 | passed | measured | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(1) > span · {"x":20,"y":725,"width":97.921875,"height":20} |
| textAlign | left | start | — | passed | measured | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(1) > span · {"x":20,"y":725,"width":97.921875,"height":20} |
| color | rgba(44, 44, 44, 1.000) | rgb(44, 44, 44) | 3 | passed | measured | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(1) > span · {"x":20,"y":725,"width":97.921875,"height":20} |

### 投资有风险，入市需谨慎 · 0:228

Design: {"x":220,"y":1377,"width":132,"height":18} / Actual: {"x":217.21875,"y":727,"width":134.78125,"height":18}

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |
| x | 220 | 217.21875 | 4 | passed | measured | body > div > div > div > div:nth-of-type(2) > span · {"x":217.21875,"y":727,"width":134.78125,"height":18} |
| y | 1377 | 1377 | 4 | passed | measured | body > div > div > div > div:nth-of-type(2) > span · {"x":217.21875,"y":727,"width":134.78125,"height":18} |
| width | 132 | 134.78125 | 4 | passed | measured | body > div > div > div > div:nth-of-type(2) > span · {"x":217.21875,"y":727,"width":134.78125,"height":18} |
| height | 18 | 18 | 4 | passed | measured | body > div > div > div > div:nth-of-type(2) > span · {"x":217.21875,"y":727,"width":134.78125,"height":18} |
| text | 投资有风险，入市需谨慎 | 投资有风险，入市需谨慎 | — | passed | measured | body > div > div > div > div:nth-of-type(2) > span · {"x":217.21875,"y":727,"width":134.78125,"height":18} |
| fontSize | 12 | 12 | 1 | passed | measured | body > div > div > div > div:nth-of-type(2) > span · {"x":217.21875,"y":727,"width":134.78125,"height":18} |
| fontFamily | PingFang SC | PingFangSC, "PingFang SC", system-ui, Avenir, Helvetica, Arial, sans-serif | — | passed | measured | body > div > div > div > div:nth-of-type(2) > span · {"x":217.21875,"y":727,"width":134.78125,"height":18} |
| fontWeight | 400 | 400 | 99 | passed | measured | body > div > div > div > div:nth-of-type(2) > span · {"x":217.21875,"y":727,"width":134.78125,"height":18} |
| lineHeight | 18 | 18 | 2 | passed | measured | body > div > div > div > div:nth-of-type(2) > span · {"x":217.21875,"y":727,"width":134.78125,"height":18} |
| borderRadius | — | 0 | 2 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(2) > span · {"x":217.21875,"y":727,"width":134.78125,"height":18} |
| borderWidth | 0 | 0 | 1 | passed | measured | body > div > div > div > div:nth-of-type(2) > span · {"x":217.21875,"y":727,"width":134.78125,"height":18} |
| opacity | 1 | 1 | 0.05 | passed | measured | body > div > div > div > div:nth-of-type(2) > span · {"x":217.21875,"y":727,"width":134.78125,"height":18} |
| textAlign | center | start | — | difference | measured | body > div > div > div > div:nth-of-type(2) > span · {"x":217.21875,"y":727,"width":134.78125,"height":18} |
| color | rgba(154, 154, 154, 1.000) | rgb(154, 154, 154) | 3 | passed | measured | body > div > div > div > div:nth-of-type(2) > span · {"x":217.21875,"y":727,"width":134.78125,"height":18} |

### 图标_通用_帮助_16pt备份 · 0:203

Design: {"x":118,"y":1378,"width":14,"height":14} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 · I0:203;0:2210

Design: {"x":118,"y":1378,"width":14,"height":14} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 形状结合 · I0:203;0:2217

Design: {"x":118.875,"y":1378.875,"width":12.25,"height":12.25} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 椭圆形 · I0:203;0:2213

Design: {"x":118.875,"y":1378.875,"width":12.25,"height":12.25} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 路径 · I0:203;0:2211

Design: {"x":118.875,"y":1378.875,"width":12.25,"height":12.25} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 路径 · I0:203;0:2212

Design: {"x":119.793701171875,"y":1379.793701171875,"width":10.41249942779541,"height":10.41249942779541} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 形状结合 · I0:203;0:2216

Design: {"x":123.25,"y":1381.9375,"width":3.5,"height":6.125} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 路径 · I0:203;0:2215

Design: {"x":123.25,"y":1381.9375,"width":3.5,"height":4.454545497894287} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 路径 · I0:203;0:2214

Design: {"x":124.4166259765625,"y":1386.9488525390625,"width":1.1666667461395264,"height":1.1136363744735718} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 相关品种状态_品种卡片 · 0:233

Design: {"x":18,"y":1406,"width":142,"height":70} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 3备份 4 · 0:237

Design: {"x":18,"y":1406,"width":142,"height":70} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 路径 · 0:235

Design: {"x":18,"y":1406,"width":142,"height":70} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 美联储观察备份 6 · 0:238

Design: {"x":20,"y":1406,"width":140,"height":70} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 路径 · 0:236

Design: {"x":20,"y":1408,"width":138,"height":66} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 3备份 4 · 0:234

Design: {"x":20.001708984375,"y":1408,"width":139.12149047851562,"height":66} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 模拟收益率 · 0:204

Design: {"x":151,"y":1408,"width":204,"height":66} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 沪银2604 · 0:242

Design: {"x":30,"y":1418,"width":62,"height":20} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 模拟收益率 · 0:206

Design: {"x":171,"y":1418,"width":70,"height":20} / Actual: {"x":150,"y":768,"width":102,"height":20}

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |
| x | 171 | 150 | 4 | difference | measured | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > p · {"x":150,"y":768,"width":102,"height":20} |
| y | 1418 | 1418 | 4 | difference | measured | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > p · {"x":150,"y":768,"width":102,"height":20} |
| width | 70 | 102 | 4 | difference | measured | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > p · {"x":150,"y":768,"width":102,"height":20} |
| height | 20 | 20 | 4 | passed | measured | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > p · {"x":150,"y":768,"width":102,"height":20} |
| text | 模拟收益率 | 模拟收益率 | — | passed | measured | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > p · {"x":150,"y":768,"width":102,"height":20} |
| fontSize | 14 | 14 | 1 | passed | measured | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > p · {"x":150,"y":768,"width":102,"height":20} |
| fontFamily | PingFang SC | PingFangSC, "PingFang SC", system-ui, Avenir, Helvetica, Arial, sans-serif | — | passed | measured | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > p · {"x":150,"y":768,"width":102,"height":20} |
| fontWeight | 400 | 400 | 99 | passed | measured | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > p · {"x":150,"y":768,"width":102,"height":20} |
| lineHeight | 20 | 20 | 2 | passed | measured | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > p · {"x":150,"y":768,"width":102,"height":20} |
| borderRadius | — | 0 | 2 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > p · {"x":150,"y":768,"width":102,"height":20} |
| borderWidth | 0 | 0 | 1 | passed | measured | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > p · {"x":150,"y":768,"width":102,"height":20} |
| opacity | 1 | 1 | 0.05 | passed | measured | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > p · {"x":150,"y":768,"width":102,"height":20} |
| textAlign | left | center | — | difference | measured | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > p · {"x":150,"y":768,"width":102,"height":20} |
| color | rgba(80, 80, 80, 1.000) | rgb(80, 80, 80) | 3 | passed | measured | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > p · {"x":150,"y":768,"width":102,"height":20} |

### 1手模拟盈利 · 0:207

Design: {"x":267,"y":1418,"width":76,"height":20} / Actual: {"x":253,"y":768,"width":102,"height":20}

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |
| x | 267 | 253 | 4 | difference | measured | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(3) > p · {"x":253,"y":768,"width":102,"height":20} |
| y | 1418 | 1418 | 4 | difference | measured | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(3) > p · {"x":253,"y":768,"width":102,"height":20} |
| width | 76 | 102 | 4 | difference | measured | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(3) > p · {"x":253,"y":768,"width":102,"height":20} |
| height | 20 | 20 | 4 | passed | measured | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(3) > p · {"x":253,"y":768,"width":102,"height":20} |
| text | 1手模拟盈利 | 1手模拟盈利 | — | passed | measured | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(3) > p · {"x":253,"y":768,"width":102,"height":20} |
| fontSize | 14 | 14 | 1 | passed | measured | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(3) > p · {"x":253,"y":768,"width":102,"height":20} |
| fontFamily | PingFang SC | PingFangSC, "PingFang SC", system-ui, Avenir, Helvetica, Arial, sans-serif | — | passed | measured | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(3) > p · {"x":253,"y":768,"width":102,"height":20} |
| fontWeight | 400 | 400 | 99 | passed | measured | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(3) > p · {"x":253,"y":768,"width":102,"height":20} |
| lineHeight | 20 | 20 | 2 | passed | measured | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(3) > p · {"x":253,"y":768,"width":102,"height":20} |
| borderRadius | — | 0 | 2 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(3) > p · {"x":253,"y":768,"width":102,"height":20} |
| borderWidth | 0 | 0 | 1 | passed | measured | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(3) > p · {"x":253,"y":768,"width":102,"height":20} |
| opacity | 1 | 1 | 0.05 | passed | measured | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(3) > p · {"x":253,"y":768,"width":102,"height":20} |
| textAlign | left | center | — | difference | measured | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(3) > p · {"x":253,"y":768,"width":102,"height":20} |
| color | rgba(80, 80, 80, 1.000) | rgb(80, 80, 80) | 3 | passed | measured | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(3) > p · {"x":253,"y":768,"width":102,"height":20} |

### 编组备份 3 · 0:239

Design: {"x":96,"y":1419,"width":20,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 2 · 0:240

Design: {"x":96,"y":1419,"width":20,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 多 · 0:241

Design: {"x":100,"y":1420,"width":12,"height":16} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 11 · 0:205

Design: {"x":253.25,"y":1422,"width":1,"height":39} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 19570 · 0:243

Design: {"x":30,"y":1444,"width":43,"height":20} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 11.4% · 0:244

Design: {"x":79,"y":1444,"width":44,"height":20} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 12.13% · 0:208

Design: {"x":180,"y":1444,"width":53,"height":20} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 12.13%备份 · 0:209

Design: {"x":279,"y":1444,"width":53,"height":20} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### @数据展示/数据列表/交易详情/弹窗/确定备份 · 0:229

Design: {"x":20,"y":1490,"width":335,"height":34} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 确定 · 0:230

Design: {"x":20,"y":1490,"width":335,"height":34} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 · 0:231

Design: {"x":20,"y":1490,"width":335,"height":34} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 利率起浪，速来掌舵 · 0:232

Design: {"x":123.3448486328125,"y":1498,"width":126,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 编组 · 0:172

Design: {"x":176,"y":1540,"width":23,"height":3} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 · 0:175

Design: {"x":176,"y":1540,"width":9,"height":3} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 椭圆形备份 3 · 0:173

Design: {"x":189,"y":1540,"width":3,"height":3} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 椭圆形备份 4 · 0:174

Design: {"x":196,"y":1540,"width":3,"height":3} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 热点解读 · 0:177

Design: {"x":10,"y":1567,"width":355,"height":587} / Actual: {"x":10,"y":917,"width":355,"height":531} · Displacement y -650px; explained -276px; unverified remainder -374px (partial)

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |
| x | 10 | 10 | 4 | passed | measured | body > div > div > div > div:nth-of-type(3) · {"x":10,"y":917,"width":355,"height":531} |
| y | 1567 | 1567 | 4 | passed | measured | body > div > div > div > div:nth-of-type(3) · {"x":10,"y":917,"width":355,"height":531} |
| width | 355 | 355 | 4 | passed | measured | body > div > div > div > div:nth-of-type(3) · {"x":10,"y":917,"width":355,"height":531} |
| height | 587 | 531 | 4 | difference | measured | body > div > div > div > div:nth-of-type(3) · {"x":10,"y":917,"width":355,"height":531} |
| text | — | — | — | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(3) · {"x":10,"y":917,"width":355,"height":531} |
| fontSize | — | 16 | 1 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(3) · {"x":10,"y":917,"width":355,"height":531} |
| fontFamily | — | PingFangSC, "PingFang SC", system-ui, Avenir, Helvetica, Arial, sans-serif | — | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(3) · {"x":10,"y":917,"width":355,"height":531} |
| fontWeight | — | 400 | 99 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(3) · {"x":10,"y":917,"width":355,"height":531} |
| lineHeight | — | — | 2 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(3) · {"x":10,"y":917,"width":355,"height":531} |
| borderRadius | 8 | 8 | 2 | passed | measured | body > div > div > div > div:nth-of-type(3) · {"x":10,"y":917,"width":355,"height":531} |
| borderWidth | 0 | 0 | 1 | passed | measured | body > div > div > div > div:nth-of-type(3) · {"x":10,"y":917,"width":355,"height":531} |
| opacity | 1 | 1 | 0.05 | passed | measured | body > div > div > div > div:nth-of-type(3) · {"x":10,"y":917,"width":355,"height":531} |
| textAlign | — | start | — | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(3) · {"x":10,"y":917,"width":355,"height":531} |
| color | rgba(255, 255, 255, 1.000) | rgb(255, 255, 255) | 3 | passed | measured | body > div > div > div > div:nth-of-type(3) · {"x":10,"y":917,"width":355,"height":531} |

### 热点解读 · 0:202

Design: {"x":20,"y":1579,"width":64,"height":20} / Actual: {"x":20,"y":928,"width":65.28125,"height":20}

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |
| x | 20 | 20 | 4 | passed | measured | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(1) > span · {"x":20,"y":928,"width":65.28125,"height":20} |
| y | 1579 | 1578 | 4 | passed | measured | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(1) > span · {"x":20,"y":928,"width":65.28125,"height":20} |
| width | 64 | 65.28125 | 4 | passed | measured | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(1) > span · {"x":20,"y":928,"width":65.28125,"height":20} |
| height | 20 | 20 | 4 | passed | measured | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(1) > span · {"x":20,"y":928,"width":65.28125,"height":20} |
| text | 热点解读 | 热点解读 | — | passed | measured | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(1) > span · {"x":20,"y":928,"width":65.28125,"height":20} |
| fontSize | 16 | 16 | 1 | passed | measured | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(1) > span · {"x":20,"y":928,"width":65.28125,"height":20} |
| fontFamily | PingFang SC | PingFangSC, "PingFang SC", system-ui, Avenir, Helvetica, Arial, sans-serif | — | passed | measured | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(1) > span · {"x":20,"y":928,"width":65.28125,"height":20} |
| fontWeight | 500 | 500 | 99 | passed | measured | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(1) > span · {"x":20,"y":928,"width":65.28125,"height":20} |
| lineHeight | 20 | 20 | 2 | passed | measured | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(1) > span · {"x":20,"y":928,"width":65.28125,"height":20} |
| borderRadius | — | 0 | 2 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(1) > span · {"x":20,"y":928,"width":65.28125,"height":20} |
| borderWidth | 0 | 0 | 1 | passed | measured | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(1) > span · {"x":20,"y":928,"width":65.28125,"height":20} |
| opacity | 1 | 1 | 0.05 | passed | measured | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(1) > span · {"x":20,"y":928,"width":65.28125,"height":20} |
| textAlign | left | start | — | passed | measured | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(1) > span · {"x":20,"y":928,"width":65.28125,"height":20} |
| color | rgba(44, 44, 44, 1.000) | rgb(44, 44, 44) | 3 | passed | measured | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(1) > span · {"x":20,"y":928,"width":65.28125,"height":20} |

### 东升西渐风景独好-国泰君安字符字符字 · 0:178

Design: {"x":76,"y":1612,"width":279,"height":22} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 所长早读 · 0:180

Design: {"x":20,"y":1615,"width":48,"height":16} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 2021年度投度投度投度投投度 · 0:179

Design: {"x":20,"y":1634,"width":335,"height":22} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### ·5分钟前 · 0:181

Design: {"x":20,"y":1671,"width":305,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 · 0:182

Design: {"x":20,"y":1671,"width":137,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 国泰君安期货研究所 · 0:188

Design: {"x":163,"y":1671,"width":108,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 17分钟前 · 0:189

Design: {"x":277,"y":1671,"width":48,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 快讯/txt/文本备份 2 · 0:186

Design: {"x":26,"y":1672,"width":66,"height":16} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 快讯/txt/文本备份 · 0:187

Design: {"x":98,"y":1672,"width":41,"height":16} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### list/icon/right · 0:183

Design: {"x":143,"y":1676,"width":8,"height":8} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### pop-up_icon_right_1备份 25 · 0:184

Design: {"x":143,"y":1676,"width":8,"height":8} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 路径 · 0:185

Design: {"x":144.60002422332764,"y":1676.800048828125,"width":4.800000190734863,"height":6.400000095367432} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 12 · 0:245

Design: {"x":20,"y":1701.5,"width":335,"height":0.5} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 东升西渐风景独好-国泰君安字符字符字 · 0:190

Design: {"x":76,"y":1714,"width":279,"height":22} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 所长早读 · 0:192

Design: {"x":20,"y":1717,"width":48,"height":16} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 字符字符字符字符字符字符字符字符字符字符 · 0:191

Design: {"x":20,"y":1736,"width":335,"height":22} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### ·5分钟前备份 · 0:193

Design: {"x":20,"y":1773,"width":305,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 · 0:194

Design: {"x":20,"y":1773,"width":137,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 国泰君安期货研究所 · 0:200

Design: {"x":163,"y":1773,"width":108,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 17分钟前 · 0:201

Design: {"x":277,"y":1773,"width":48,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 快讯/txt/文本备份 2 · 0:198

Design: {"x":26,"y":1774,"width":66,"height":16} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 快讯/txt/文本备份 · 0:199

Design: {"x":98,"y":1774,"width":41,"height":16} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### list/icon/right · 0:195

Design: {"x":143,"y":1778,"width":8,"height":8} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### pop-up_icon_right_1备份 26 · 0:196

Design: {"x":143,"y":1778,"width":8,"height":8} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 路径 · 0:197

Design: {"x":144.60002422332764,"y":1778.800048828125,"width":4.800000190734863,"height":6.400000095367432} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 12备份 · 0:246

Design: {"x":20,"y":1803.5,"width":335,"height":0.5} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 东升西渐风景独好-国泰君安字符字符字备份 · 0:247

Design: {"x":76,"y":1816,"width":279,"height":22} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 收盘点评 · 0:248

Design: {"x":20,"y":1819,"width":48,"height":16} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### ·5分钟前备份 2 · 0:249

Design: {"x":20,"y":1875,"width":305,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 · 0:250

Design: {"x":20,"y":1875,"width":137,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 国泰君安期货研究所 · 0:256

Design: {"x":163,"y":1875,"width":108,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 17分钟前 · 0:257

Design: {"x":277,"y":1875,"width":48,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 快讯/txt/文本备份 2 · 0:254

Design: {"x":26,"y":1876,"width":66,"height":16} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 快讯/txt/文本备份 · 0:255

Design: {"x":98,"y":1876,"width":41,"height":16} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### list/icon/right · 0:251

Design: {"x":143,"y":1880,"width":8,"height":8} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### pop-up_icon_right_1备份 27 · 0:252

Design: {"x":143,"y":1880,"width":8,"height":8} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 路径 · 0:253

Design: {"x":144.60002422332764,"y":1880.800048828125,"width":4.800000190734863,"height":6.400000095367432} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 12备份 2 · 0:258

Design: {"x":20,"y":1905.5,"width":335,"height":0.5} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 东升西渐风景独好-国泰君安字符字符字备份 2 · 0:259

Design: {"x":76,"y":1918,"width":279,"height":22} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 收盘点评备份 · 0:260

Design: {"x":20,"y":1921,"width":48,"height":16} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### ·5分钟前备份 3 · 0:261

Design: {"x":20,"y":1977,"width":305,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 · 0:262

Design: {"x":20,"y":1977,"width":137,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 国泰君安期货研究所 · 0:268

Design: {"x":163,"y":1977,"width":108,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 17分钟前 · 0:269

Design: {"x":277,"y":1977,"width":48,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 快讯/txt/文本备份 2 · 0:266

Design: {"x":26,"y":1978,"width":66,"height":16} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 快讯/txt/文本备份 · 0:267

Design: {"x":98,"y":1978,"width":41,"height":16} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### list/icon/right · 0:263

Design: {"x":143,"y":1982,"width":8,"height":8} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### pop-up_icon_right_1备份 28 · 0:264

Design: {"x":143,"y":1982,"width":8,"height":8} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 路径 · 0:265

Design: {"x":144.60002422332764,"y":1982.800048828125,"width":4.800000190734863,"height":6.400000095367432} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 12备份 3 · 0:270

Design: {"x":20,"y":2007.5,"width":335,"height":0.5} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 东升西渐风景独好-国泰君安字符字符字备份 3 · 0:271

Design: {"x":76,"y":2020,"width":279,"height":22} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 收盘点评备份 2 · 0:272

Design: {"x":20,"y":2023,"width":48,"height":16} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### ·5分钟前备份 4 · 0:273

Design: {"x":20,"y":2079,"width":305,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 · 0:274

Design: {"x":20,"y":2079,"width":137,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 国泰君安期货研究所 · 0:280

Design: {"x":163,"y":2079,"width":108,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 17分钟前 · 0:281

Design: {"x":277,"y":2079,"width":48,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 快讯/txt/文本备份 2 · 0:278

Design: {"x":26,"y":2080,"width":66,"height":16} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 快讯/txt/文本备份 · 0:279

Design: {"x":98,"y":2080,"width":41,"height":16} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### list/icon/right · 0:275

Design: {"x":143,"y":2084,"width":8,"height":8} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### pop-up_icon_right_1备份 29 · 0:276

Design: {"x":143,"y":2084,"width":8,"height":8} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 路径 · 0:277

Design: {"x":144.60002422332764,"y":2084.800048828125,"width":4.800000190734863,"height":6.400000095367432} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 12备份 4 · 0:282

Design: {"x":20,"y":2109.5,"width":335,"height":0.5} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 展开更多 · 0:283

Design: {"x":151,"y":2122,"width":74,"height":20} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 展开更多 · 0:284

Design: {"x":151,"y":2122,"width":56,"height":20} / Actual: {"x":20,"y":1406,"width":335,"height":42}

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |
| x | 151 | 20 | 4 | difference | measured | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(7) · {"x":20,"y":1406,"width":335,"height":42} |
| y | 2122 | 2056 | 4 | difference | measured | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(7) · {"x":20,"y":1406,"width":335,"height":42} |
| width | 56 | 335 | 4 | difference | measured | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(7) · {"x":20,"y":1406,"width":335,"height":42} |
| height | 20 | 42 | 4 | difference | measured | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(7) · {"x":20,"y":1406,"width":335,"height":42} |
| text | 展开更多 | 展开更多 | — | passed | measured | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(7) · {"x":20,"y":1406,"width":335,"height":42} |
| fontSize | 14 | 14 | 1 | passed | measured | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(7) · {"x":20,"y":1406,"width":335,"height":42} |
| fontFamily | PingFang SC | PingFangSC, "PingFang SC", system-ui, Avenir, Helvetica, Arial, sans-serif | — | passed | measured | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(7) · {"x":20,"y":1406,"width":335,"height":42} |
| fontWeight | 400 | 400 | 99 | passed | measured | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(7) · {"x":20,"y":1406,"width":335,"height":42} |
| lineHeight | 19.600000381469727 | 20 | 2 | passed | measured | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(7) · {"x":20,"y":1406,"width":335,"height":42} |
| borderRadius | — | 0 | 2 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(7) · {"x":20,"y":1406,"width":335,"height":42} |
| borderWidth | 0 | 0 | 1 | passed | measured | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(7) · {"x":20,"y":1406,"width":335,"height":42} |
| opacity | 1 | 1 | 0.05 | passed | measured | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(7) · {"x":20,"y":1406,"width":335,"height":42} |
| textAlign | justified | start | — | difference | measured | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(7) · {"x":20,"y":1406,"width":335,"height":42} |
| color | rgba(119, 119, 119, 1.000) | rgb(119, 119, 119) | 3 | passed | measured | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(7) · {"x":20,"y":1406,"width":335,"height":42} |

### 图标_通用_更多_16pt · 0:285

Design: {"x":209,"y":2124,"width":16,"height":16} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 矩形 · I0:285;0:2207

Design: {"x":209,"y":2124,"width":16,"height":16} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 路径 · I0:285;0:2208

Design: {"x":211.5,"y":2129,"width":11,"height":6} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 本页面中所有政策数据及相关资讯等，均源于 · 0:227

Design: {"x":10,"y":2176,"width":355,"height":80} / Actual: {"x":10,"y":1470,"width":355,"height":194}

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |
| x | 10 | 10 | 4 | difference | measured | body > div > div > div > div:nth-of-type(4) · {"x":10,"y":1470,"width":355,"height":194} |
| y | 2176 | 1470 | 4 | difference | measured | body > div > div > div > div:nth-of-type(4) · {"x":10,"y":1470,"width":355,"height":194} |
| width | 355 | 355 | 4 | passed | measured | body > div > div > div > div:nth-of-type(4) · {"x":10,"y":1470,"width":355,"height":194} |
| height | 80 | 194 | 4 | difference | measured | body > div > div > div > div:nth-of-type(4) · {"x":10,"y":1470,"width":355,"height":194} |
| text | 本页面中所有政策数据及相关资讯等，均源于公开信息。本公司力求但不保证信息的绝对准确、完整与及时性，仅供参考。页面内投票、分析等内容仅为市场观点呈现与互动交流，不构成任何投资建议。投资有风险，入市需谨慎。 | 本页面中所有政策数据及相关资讯等，均源于公开信息。本公司力求但不保证信息的绝对准确、完整与及时性，仅供参考。页面内投票、分析等内容仅为市场观点呈现与互动交流，不构成任何投资建议。投资有风险，入市需谨慎。 | — | passed | measured | body > div > div > div > div:nth-of-type(4) · {"x":10,"y":1470,"width":355,"height":194} |
| fontSize | 13 | 13 | 1 | passed | measured | body > div > div > div > div:nth-of-type(4) · {"x":10,"y":1470,"width":355,"height":194} |
| fontFamily | PingFang SC | PingFangSC, "PingFang SC", system-ui, Avenir, Helvetica, Arial, sans-serif | — | passed | measured | body > div > div > div > div:nth-of-type(4) · {"x":10,"y":1470,"width":355,"height":194} |
| fontWeight | 400 | 400 | 99 | passed | measured | body > div > div > div > div:nth-of-type(4) · {"x":10,"y":1470,"width":355,"height":194} |
| lineHeight | 20 | 20 | 2 | passed | measured | body > div > div > div > div:nth-of-type(4) · {"x":10,"y":1470,"width":355,"height":194} |
| borderRadius | — | 0 | 2 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(4) · {"x":10,"y":1470,"width":355,"height":194} |
| borderWidth | 0 | 0 | 1 | passed | measured | body > div > div > div > div:nth-of-type(4) · {"x":10,"y":1470,"width":355,"height":194} |
| opacity | 1 | 1 | 0.05 | passed | measured | body > div > div > div > div:nth-of-type(4) · {"x":10,"y":1470,"width":355,"height":194} |
| textAlign | left | start | — | passed | measured | body > div > div > div > div:nth-of-type(4) · {"x":10,"y":1470,"width":355,"height":194} |
| color | rgba(255, 255, 255, 0.480) | rgba(255, 255, 255, 0.48) | 3 | passed | measured | body > div > div > div > div:nth-of-type(4) · {"x":10,"y":1470,"width":355,"height":194} |

### 免费开通期货权限 · 0:319

Design: {"x":0,"y":2276,"width":375,"height":94} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 我已阅读并知悉各项内容 · 0:317

Design: {"x":15,"y":2284,"width":345,"height":44} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 免费开通期货权限 · 0:320

Design: {"x":15,"y":2292,"width":345,"height":44} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 免费开通期货权限 · 0:321

Design: {"x":15,"y":2292,"width":345,"height":44} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 大btn · 0:322

Design: {"x":15,"y":2292,"width":345,"height":44} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 免费开通期货权限 · 0:323

Design: {"x":15,"y":2292,"width":345,"height":44} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 免费开通期货权限 · 0:324

Design: {"x":15,"y":2292,"width":345,"height":44} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 我已阅读并知悉各项内容 · 0:318

Design: {"x":99,"y":2297,"width":178,"height":18} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### 免费开通期货权限 · 0:325

Design: {"x":124,"y":2303,"width":128,"height":22} / Actual: {"x":15,"y":2296,"width":345,"height":44}

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |
| x | 124 | 15 | 4 | difference | measured | body > div > div > div > div:nth-of-type(5) > div · {"x":15,"y":2296,"width":345,"height":44} |
| y | 2303 | 2296 | 4 | difference | measured | body > div > div > div > div:nth-of-type(5) > div · {"x":15,"y":2296,"width":345,"height":44} |
| width | 128 | 345 | 4 | difference | measured | body > div > div > div > div:nth-of-type(5) > div · {"x":15,"y":2296,"width":345,"height":44} |
| height | 22 | 44 | 4 | difference | measured | body > div > div > div > div:nth-of-type(5) > div · {"x":15,"y":2296,"width":345,"height":44} |
| text | 免费开通期货权限 | 免费开通期货权限 | — | passed | measured | body > div > div > div > div:nth-of-type(5) > div · {"x":15,"y":2296,"width":345,"height":44} |
| fontSize | 16 | 16 | 1 | passed | measured | body > div > div > div > div:nth-of-type(5) > div · {"x":15,"y":2296,"width":345,"height":44} |
| fontFamily | PingFang SC | PingFangSC, "PingFang SC", system-ui, Avenir, Helvetica, Arial, sans-serif | — | passed | measured | body > div > div > div > div:nth-of-type(5) > div · {"x":15,"y":2296,"width":345,"height":44} |
| fontWeight | 400 | 400 | 99 | passed | measured | body > div > div > div > div:nth-of-type(5) > div · {"x":15,"y":2296,"width":345,"height":44} |
| lineHeight | 22 | 44 | 2 | difference | measured | body > div > div > div > div:nth-of-type(5) > div · {"x":15,"y":2296,"width":345,"height":44} |
| borderRadius | — | 4 | 2 | not-applicable | no-design-constraint | body > div > div > div > div:nth-of-type(5) > div · {"x":15,"y":2296,"width":345,"height":44} |
| borderWidth | 0 | 0 | 1 | passed | measured | body > div > div > div > div:nth-of-type(5) > div · {"x":15,"y":2296,"width":345,"height":44} |
| opacity | 1 | 1 | 0.05 | passed | measured | body > div > div > div > div:nth-of-type(5) > div · {"x":15,"y":2296,"width":345,"height":44} |
| textAlign | center | center | — | passed | measured | body > div > div > div > div:nth-of-type(5) > div · {"x":15,"y":2296,"width":345,"height":44} |
| color | rgba(255, 255, 255, 1.000) | rgb(255, 255, 255) | 3 | passed | measured | body > div > div > div > div:nth-of-type(5) > div · {"x":15,"y":2296,"width":345,"height":44} |

### Bars/Home Indicators/iPhone/Light - Portrait · 0:326

Design: {"x":118,"y":2336,"width":140,"height":34} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


### Home Indicator · I0:326;0:2219

Design: {"x":118,"y":2357,"width":140,"height":5} / Actual: null

| 属性 | 设计值 | 实际值 | 容差 | 结果 | 原因 | 实际元素 / 坐标 |
| --- | --- | --- | --- | --- | --- | --- |


| 无设计对应的实际内容 | 元素 | 状态 | 坐标 | 问题引用 |
| --- | --- | --- | --- | --- |
| div | body > div > div > div | unverified | {"x":0,"y":0,"width":375,"height":2370} | actual-coverage:body > div > div > div |
| img | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > img | covered-by-parent | {"x":20,"y":209,"width":335,"height":119} | actual-coverage:body > div > div > div |
| 下一次美联储议息决议公布 | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) | covered-by-parent | {"x":20,"y":209,"width":335,"height":40} | actual-coverage:body > div > div > div |
| 2026-09-17 02:00 | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > span | covered-by-parent | {"x":218.703125,"y":230,"width":101.296875,"height":17} | actual-coverage:body > div > div > div |
| 1 | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) | covered-by-parent | {"x":71.234375,"y":265,"width":38,"height":39} | actual-coverage:body > div > div > div |
| 12 | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) | covered-by-parent | {"x":143.546875,"y":265,"width":38,"height":39} | actual-coverage:body > div > div > div |
| 22 | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) | covered-by-parent | {"x":231.15625,"y":265,"width":38,"height":39} | actual-coverage:body > div > div > div |
| 资产负债表 | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(3) | covered-by-parent | {"x":242,"y":344,"width":107,"height":38} | actual-coverage:body > div > div > div |
| img | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > img:nth-of-type(2) | covered-by-parent | {"x":126,"y":344,"width":14,"height":38} | actual-coverage:body > div > div > div |
| div | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) | covered-by-parent | {"x":26,"y":382,"width":323,"height":303} | actual-coverage:body > div > div > div |
| 09月17日 | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div | covered-by-parent | {"x":35,"y":392,"width":75.5,"height":22} | actual-coverage:body > div > div > div |
| 10月29日 | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(3) > div | covered-by-parent | {"x":120.5,"y":392,"width":76.140625,"height":22} | actual-coverage:body > div > div > div |
| 12月10日 | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(4) > div | covered-by-parent | {"x":206.640625,"y":392,"width":73.265625,"height":22} | actual-coverage:body > div > div > div |
| 01月28日 | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(5) > div | covered-by-parent | {"x":289.90625,"y":392,"width":76.078125,"height":22} | actual-coverage:body > div > div > div |
| 公布时间： 2026-09-17 02:00 | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(1) | covered-by-parent | {"x":30,"y":424,"width":315,"height":18} | actual-coverage:body > div > div > div |
| 利率区间(%) | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > span:nth-of-type(1) | covered-by-parent | {"x":36,"y":456,"width":74.453125,"height":20} | actual-coverage:body > div > div > div |
| 3.50~3.75 | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > span:nth-of-type(1) | covered-by-parent | {"x":36,"y":483,"width":70,"height":20} | actual-coverage:body > div > div > div |
| div | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > div | covered-by-parent | {"x":106,"y":487,"width":178,"height":12} | actual-coverage:body > div > div > div |
| div | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > div > div | covered-by-parent | {"x":106,"y":487,"width":20.46875,"height":12} | actual-coverage:body > div > div > div |
| 3.75~4.00 | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > span:nth-of-type(1) | covered-by-parent | {"x":36,"y":510,"width":70,"height":20} | actual-coverage:body > div > div > div |
| div | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div | covered-by-parent | {"x":106,"y":514,"width":178,"height":12} | actual-coverage:body > div > div > div |
| div | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div > div | covered-by-parent | {"x":106,"y":514,"width":157.515625,"height":12} | actual-coverage:body > div > div > div |
| div | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) | covered-by-parent | {"x":36,"y":548,"width":303,"height":31} | actual-coverage:body > div > div > div |
| 利率区间(%) | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(1) | covered-by-parent | {"x":36,"y":554,"width":81.3125,"height":18} | actual-coverage:body > div > div > div |
| 3.50~3.75 | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > span:nth-of-type(1) | covered-by-parent | {"x":36,"y":585,"width":81.3125,"height":20} | actual-coverage:body > div > div > div |
| 39.60% | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) > span:nth-of-type(3) | covered-by-parent | {"x":187.015625,"y":585,"width":82.28125,"height":20} | actual-coverage:body > div > div > div |
| 60.40% | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > span:nth-of-type(3) | covered-by-parent | {"x":187.015625,"y":611,"width":82.28125,"height":20} | actual-coverage:body > div > div > div |
| img | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(1) > img | covered-by-parent | {"x":118.921875,"y":728,"width":14,"height":14} | actual-coverage:body > div > div > div |
| 沪金2612 | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > span | covered-by-parent | {"x":32,"y":768,"width":64.5,"height":20} | actual-coverage:body > div > div > div |
| 空 | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div | covered-by-parent | {"x":100.5,"y":769,"width":20,"height":18} | actual-coverage:body > div > div > div |
| 932.32 | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > span:nth-of-type(1) | covered-by-parent | {"x":32,"y":793,"width":47.09375,"height":21} | actual-coverage:body > div > div > div |
| -1.50% | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > span:nth-of-type(2) | covered-by-parent | {"x":85.09375,"y":793,"width":50.3125,"height":21} | actual-coverage:body > div > div > div |
| div | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) | covered-by-parent | {"x":150,"y":758,"width":205,"height":66} | actual-coverage:body > div > div > div |
| 5.77% | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div | covered-by-parent | {"x":150,"y":794,"width":102,"height":20} | actual-coverage:body > div > div > div |
| 14,220元 | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(3) > div | covered-by-parent | {"x":253,"y":794,"width":102,"height":20} | actual-coverage:body > div > div > div |
| 利率起浪，速来掌舵 | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(2) | covered-by-parent | {"x":20,"y":840,"width":335,"height":34} | actual-coverage:body > div > div > div |
| 沪银2612 | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(2) > div > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > span | covered-by-parent | {"x":367,"y":768,"width":64.5,"height":20} | actual-coverage:body > div > div > div |
| 15442 | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(2) > div > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > span:nth-of-type(1) | covered-by-parent | {"x":367,"y":793,"width":42.640625,"height":21} | actual-coverage:body > div > div > div |
| 利率起浪，速来掌舵 | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(2) > div > div:nth-of-type(2) | covered-by-parent | {"x":355,"y":840,"width":335,"height":34} | actual-coverage:body > div > div > div |
| div | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > div > div:nth-of-type(1) | covered-by-parent | {"x":176.5,"y":890,"width":7,"height":3} | actual-coverage:body > div > div > div |
| div | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > div > div:nth-of-type(2) | covered-by-parent | {"x":186.5,"y":890,"width":3,"height":3} | actual-coverage:body > div > div > div |
| div | body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > div > div:nth-of-type(3) | covered-by-parent | {"x":192.5,"y":890,"width":3,"height":3} | actual-coverage:body > div > div > div |
| div | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(2) | covered-by-parent | {"x":20,"y":948,"width":335,"height":74} | actual-coverage:body > div > div > div |
| 中金财富期货：AI叙事依然维持足够强势 | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(1) | covered-by-parent | {"x":20,"y":958,"width":335,"height":22} | actual-coverage:body > div > div > div |
| 同花顺7x24快讯 | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) | covered-by-parent | {"x":20,"y":996,"width":89.234375,"height":12} | actual-coverage:body > div > div > div |
| 09:04 | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) | covered-by-parent | {"x":115.234375,"y":996,"width":32.859375,"height":12} | actual-coverage:body > div > div > div |
| div | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(3) | covered-by-parent | {"x":20,"y":1022,"width":335,"height":96} | actual-coverage:body > div > div > div |
| 中金财富期货：未来沥青原料进口恢复和供需格局扭转并非不可能 | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(3) > div:nth-of-type(1) | covered-by-parent | {"x":20,"y":1032,"width":335,"height":44} | actual-coverage:body > div > div > div |
| 同花顺7x24快讯 | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(1) | covered-by-parent | {"x":20,"y":1092,"width":89.234375,"height":12} | actual-coverage:body > div > div > div |
| 08:58 | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(2) | covered-by-parent | {"x":115.234375,"y":1092,"width":32.90625,"height":12} | actual-coverage:body > div > div > div |
| div | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(4) | covered-by-parent | {"x":20,"y":1118,"width":335,"height":96} | actual-coverage:body > div > div > div |
| 期货早报：美联储加息概率升至92.4% 特朗普称愿与伊朗谈判 | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(4) > div:nth-of-type(1) | covered-by-parent | {"x":20,"y":1128,"width":335,"height":44} | actual-coverage:body > div > div > div |
| 同花顺7x24快讯 | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(4) > div:nth-of-type(2) > div:nth-of-type(1) | covered-by-parent | {"x":20,"y":1188,"width":89.234375,"height":12} | actual-coverage:body > div > div > div |
| 07:58 | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(4) > div:nth-of-type(2) > div:nth-of-type(2) | covered-by-parent | {"x":115.234375,"y":1188,"width":32.328125,"height":12} | actual-coverage:body > div > div > div |
| div | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(5) | covered-by-parent | {"x":20,"y":1214,"width":335,"height":96} | actual-coverage:body > div > div > div |
| 流动性无忧？美联储再按“暂停键”，储备管理购债停至10月中旬 | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(5) > div:nth-of-type(1) | covered-by-parent | {"x":20,"y":1224,"width":335,"height":44} | actual-coverage:body > div > div > div |
| 同花顺7x24快讯 | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(5) > div:nth-of-type(2) > div:nth-of-type(1) | covered-by-parent | {"x":20,"y":1284,"width":89.234375,"height":12} | actual-coverage:body > div > div > div |
| 07:34 | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(5) > div:nth-of-type(2) > div:nth-of-type(2) | covered-by-parent | {"x":115.234375,"y":1284,"width":32.28125,"height":12} | actual-coverage:body > div > div > div |
| div | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(6) | covered-by-parent | {"x":20,"y":1310,"width":335,"height":96} | actual-coverage:body > div > div > div |
| CME“美联储观察”：美联储到9月维持利率不变的概率为7.6%，累计加息25个基点的概率为92.4% | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(6) > div:nth-of-type(1) | covered-by-parent | {"x":20,"y":1320,"width":335,"height":44} | actual-coverage:body > div > div > div |
| 同花顺7x24快讯 | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(6) > div:nth-of-type(2) > div:nth-of-type(1) | covered-by-parent | {"x":20,"y":1380,"width":89.234375,"height":12} | actual-coverage:body > div > div > div |
| 07:10 | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(6) > div:nth-of-type(2) > div:nth-of-type(2) | covered-by-parent | {"x":115.234375,"y":1380,"width":29.84375,"height":12} | actual-coverage:body > div > div > div |
| img | body > div > div > div > div:nth-of-type(3) > div:nth-of-type(7) > img | covered-by-parent | {"x":209.0625,"y":1419,"width":16,"height":16} | actual-coverage:body > div > div > div |
| div | body > div > div > div > div:nth-of-type(5) | covered-by-parent | {"x":0,"y":2280,"width":375,"height":90} | actual-coverage:body > div > div > div |

## 页面结构对齐

-

| 设计模块 | 状态 | 开发区域 | 整体位移 | 锚点统计 | 评分分量 | 置信度 | 判断依据 | 证据引用 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 美联储观察 / 利率观察 | 已匹配 | body > div > div > div > div:nth-of-type(1) | x 0px / y -374px | 候选 2 · 稳定 2 · 动态排除 0 · 结构 2 · RANSAC 内点 2 · 残差 0.7071067811865476px | 稳定覆盖 100%×25%=25% · 锚点充足 66.67%×20%=13.33% · 内点率 100%×30%=30% · 残差质量 82.32%×15%=12.35% · 动态纯净 100%×5%=5% · 结构支持 100%×5%=5% · 加权 90.68% · 上限 97% · 最终 91% · H≥86% · M≥72% · L≥0% | 91% | Stable descendant anchors: 未来利率预测 / 利率走势图 / 小时 / 分钟 / 利率观察 / 概率 / 最新概率 / 上一日概率 / 上周概率 | `page-alignment:0:117` |
| 美联储观察 / 利率观察 / 未来利率预测 | 已匹配 | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) | - | 候选 3 · 稳定 3 · 动态排除 0 · 结构 3 · RANSAC 内点 1 · 残差 - | 稳定覆盖 100%×25%=25% · 锚点充足 100%×20%=20% · 内点率 33.33%×30%=10% · 残差质量 0%×15%=0% · 动态纯净 100%×5%=5% · 结构支持 100%×5%=5% · 加权 65% · 上限 97% · 最终 65% · H≥86% · M≥72% · L≥0% | 65% | Stable descendant anchors: 未来利率预测 / 利率走势图 | `page-alignment:0:118` |
| 美联储观察 / 利率观察 / 天 | 已匹配 | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) | x -0.84375px / y -377px | 候选 2 · 稳定 2 · 动态排除 0 · 结构 0 · RANSAC 内点 2 · 残差 1.1379999759721px | 稳定覆盖 100%×25%=25% · 锚点充足 66.67%×20%=13.33% · 内点率 100%×30%=30% · 残差质量 71.55%×15%=10.73% · 动态纯净 100%×5%=5% · 结构支持 0%×5%=0% · 加权 84.06% · 上限 97% · 最终 84% · H≥86% · M≥72% · L≥0% | 84% | Stable descendant anchors: 小时 / 分钟 | `page-alignment:0:142` |
| 美联储观察 / 利率观察 / 概率 | 已匹配 | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) | - | 候选 2 · 稳定 2 · 动态排除 0 · 结构 2 · RANSAC 内点 1 · 残差 - | 稳定覆盖 100%×25%=25% · 锚点充足 66.67%×20%=13.33% · 内点率 50%×30%=15% · 残差质量 0%×15%=0% · 动态纯净 100%×5%=5% · 结构支持 100%×5%=5% · 加权 63.33% · 上限 97% · 最终 63% · H≥86% · M≥72% · L≥0% | 63% | Stable descendant anchors: 概率 / 最新概率 / 上一日概率 / 上周概率 | `page-alignment:0:327` |
| 美联储观察 / 利率观察 / 概率 / 最新概率 | 已匹配 | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) | x -14.984375px / y -375px | 候选 4 · 稳定 4 · 动态排除 0 · 结构 4 · RANSAC 内点 3 · 残差 2.0548508727824997px | 稳定覆盖 100%×25%=25% · 锚点充足 100%×20%=20% · 内点率 75%×30%=22.5% · 残差质量 48.63%×15%=7.29% · 动态纯净 100%×5%=5% · 结构支持 100%×5%=5% · 加权 84.79% · 上限 97% · 最终 85% · H≥86% · M≥72% · L≥0% | 85% | Stable descendant anchors: 最新概率 / 上一日概率 / 上周概率 | `page-alignment:0:339` |
| 美联储观察 / 相关品种动态 | 已匹配 | body > div > div > div > div:nth-of-type(2) | x 0px / y -650px | 候选 3 · 稳定 3 · 动态排除 0 · 结构 3 · RANSAC 内点 3 · 残差 1.7063949877348639px | 稳定覆盖 100%×25%=25% · 锚点充足 100%×20%=20% · 内点率 100%×30%=30% · 残差质量 57.34%×15%=8.6% · 动态纯净 100%×5%=5% · 结构支持 100%×5%=5% · 加权 93.6% · 上限 97% · 最终 94% · H≥86% · M≥72% · L≥0% | 94% | Stable descendant anchors: 相关品种动态 / 模拟收益率 / 投资有风险，入市需谨慎 | `page-alignment:0:171` |
| 美联储观察 / 热点解读 | 已匹配 | body > div > div > div > div:nth-of-type(3) | x 0px / y -650px | 候选 2 · 稳定 2 · 动态排除 0 · 结构 2 · RANSAC 内点 2 · 残差 0.7071067811865476px | 稳定覆盖 100%×25%=25% · 锚点充足 66.67%×20%=13.33% · 内点率 100%×30%=30% · 残差质量 82.32%×15%=12.35% · 动态纯净 100%×5%=5% · 结构支持 100%×5%=5% · 加权 90.68% · 上限 97% · 最终 91% · H≥86% · M≥72% · L≥0% | 91% | Stable descendant anchors: 热点解读 / 展开更多 | `page-alignment:0:177` |
| 美联储观察 / 矩形 4备份 6 / 编组 / 编组 / 编组 | 已匹配 | body > div > div > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) | - | 候选 1 · 稳定 1 · 动态排除 0 · 结构 0 · RANSAC 内点 1 · 残差 0px | 稳定覆盖 100%×25%=25% · 锚点充足 33.33%×20%=6.67% · 内点率 100%×30%=30% · 残差质量 100%×15%=15% · 动态纯净 100%×5%=5% · 结构支持 0%×5%=0% · 加权 81.67% · 上限 97.39% · 最终 82% · H≥86% · M≥72% · L≥0% | 82% | 1 个跨帧稳定锚点参与位移共识，排除 0 个动态或不完整锚点。 模块对应关系已确定，但稳定锚点位移无多数共识，未发布整体位移。 | `page-alignment:0:154` |
| 美联储观察 / 矩形 / 编组 2 / Group / 大btn / 编组 3 / 矩形 | 已匹配 | body > div > div > div > div:nth-of-type(5) | - | 候选 1 · 稳定 1 · 动态排除 0 · 结构 0 · RANSAC 内点 1 · 残差 0px | 稳定覆盖 100%×25%=25% · 锚点充足 33.33%×20%=6.67% · 内点率 100%×30%=30% · 残差质量 100%×15%=15% · 动态纯净 100%×5%=5% · 结构支持 0%×5%=0% · 加权 81.67% · 上限 94.33% · 最终 82% · H≥86% · M≥72% · L≥0% | 82% | 1 个跨帧稳定锚点参与位移共识，排除 0 个动态或不完整锚点。 模块对应关系已确定，但稳定锚点位移无多数共识，未发布整体位移。 | `page-alignment:0:323` |
| 美联储观察 / 矩形 4备份 9 / 编组 | 已匹配 | body > div > div > div > div:nth-of-type(3) | - | 候选 1 · 稳定 1 · 动态排除 0 · 结构 0 · RANSAC 内点 1 · 残差 0px | 稳定覆盖 100%×25%=25% · 锚点充足 33.33%×20%=6.67% · 内点率 100%×30%=30% · 残差质量 100%×15%=15% · 动态纯净 100%×5%=5% · 结构支持 0%×5%=0% · 加权 81.67% · 上限 88.52% · 最终 82% · H≥86% · M≥72% · L≥0% | 82% | 1 个跨帧稳定锚点参与位移共识，排除 0 个动态或不完整锚点。 模块对应关系已确定，但稳定锚点位移无多数共识，未发布整体位移。 | `page-alignment:0:283` |
| 美联储观察 / 矩形 4备份 6 / 编组 / 编组 | 已匹配 | - | x -0.8px / y -377px | 候选 3 · 稳定 3 · 动态排除 0 · 结构 0 · RANSAC 内点 3 · 残差 1.13px | 稳定覆盖 100%×25%=25% · 锚点充足 100%×20%=20% · 内点率 100%×30%=30% · 残差质量 71.75%×15%=10.76% · 动态纯净 100%×5%=5% · 结构支持 0%×5%=0% · 加权 90.76% · 上限 97.38% · 最终 91% · H≥86% · M≥72% · L≥0% | 91% | 3 个跨帧稳定锚点参与位移共识，排除 0 个动态或不完整锚点。3/3 个强锚点在多个结构分支中共同支持“编组”模块及其整体位移。 | `page-alignment:0:150` |




## 问题清单

| 序号 | 页面名称 | 差异位置 | 设计稿表现 | 开发表现 | 修改内容 | 设计稿图 | 开发图 | 优先级 | 置信度 | 证据引用 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Figma 0:72 | 页面模块 最新概率 · 最新概率模块整体位移 | 模块保持 Figma 设计位置 | 模块整体位移 x -14.984375px / y -375px | 优先修复 body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) 的容器定位、间距或文档流，再重新走查。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 85% · stable-text + structure-geometry + temporal-consistency | `review-issue:module-position:0:339` |
| 2 | Figma 0:72 | 整个页面 · 稳定区域视觉相似度未达标 | ≥ 95.00% | 76.58% | 先处理报告中变化像素最多的区域，再重新运行验收。 | 见设计基准图 | 见开发实际图 | P0 / 错误 | 99% · pixel-measurement | `review-issue:issue-004` |
| 3 | Figma 0:72 | 页面区域 body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) · 矩形 6备份 2 尺寸不一致 | 335px × 282px | 335px × 356px | 调整 body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) 的 width、height、padding 或 box-sizing。 | 见设计基准图 | 见开发实际图 | P1 / 错误 | 95% · verified-region + temporal-consistency + structure-geometry | `review-issue:issue-012` |
| 4 | Figma 0:72 | 页面区域 body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) · 编组 位置偏移 | x 26px · y 824px | x 26px · y 788px (regional coordinates) | 检查 body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) 的定位、容器 padding、margin 和对齐方式。 | 见设计基准图 | 见开发实际图 | P1 / 错误 | 95% · verified-region + temporal-consistency + structure-geometry | `review-issue:issue-013` |
| 5 | Figma 0:72 | 页面区域 body > div > div > div > div:nth-of-type(3) · 矩形 4备份 9 尺寸不一致 | 355px × 587px | 355px × 531px | 调整 body > div > div > div > div:nth-of-type(3) 的 width、height、padding 或 box-sizing。 | 见设计基准图 | 见开发实际图 | P1 / 错误 | 95% · verified-region + temporal-consistency + structure-geometry | `review-issue:issue-015` |
| 6 | Figma 0:72 | 页面区域 body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > p · 基于30天联邦基金期货价格测算，反映市场 位置偏移 | x 26px · y 1026px | x 26px · y 1019px (regional coordinates) | 检查 body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > p 的定位、容器 padding、margin 和对齐方式。 | 见设计基准图 | 见开发实际图 | P1 / 错误 | 97% · stable-text + structure-geometry | `review-issue:issue-016` |
| 7 | Figma 0:72 | 页面区域 body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > span:nth-of-type(2) · 概率 文字对齐不一致 | right | start | 将 body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > span:nth-of-type(2) 的 text-align 调整为设计值。 | 见设计基准图 | 见开发实际图 | P1 / 错误 | 97% · stable-text + structure-geometry | `review-issue:issue-017` |
| 8 | Figma 0:72 | 页面区域 body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(3) · 上一日概率 文字对齐不一致 | left | right | 将 body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(3) 的 text-align 调整为设计值。 | 见设计基准图 | 见开发实际图 | P1 / 错误 | 96% · stable-text + structure-geometry | `review-issue:issue-020` |
| 9 | Figma 0:72 | 页面区域 body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(2) · 最新概率 文字对齐不一致 | left | right | 将 body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > span:nth-of-type(2) 的 text-align 调整为设计值。 | 见设计基准图 | 见开发实际图 | P1 / 错误 | 96% · stable-text + structure-geometry | `review-issue:issue-023` |
| 10 | Figma 0:72 | 页面区域 body > div > div > div > div:nth-of-type(2) > span · 投资有风险，入市需谨慎 文字对齐不一致 | center | start | 将 body > div > div > div > div:nth-of-type(2) > span 的 text-align 调整为设计值。 | 见设计基准图 | 见开发实际图 | P1 / 错误 | 96% · stable-text + structure-geometry | `review-issue:issue-026` |
| 11 | Figma 0:72 | 页面区域 body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) · 未来利率预测 位置偏移 | x 33px · y 728px | x 26px · y 718px (regional coordinates) | 检查 body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) 的定位、容器 padding、margin 和对齐方式。 | 见设计基准图 | 见开发实际图 | P1 / 错误 | 95% · stable-text + structure-geometry | `review-issue:issue-027` |
| 12 | Figma 0:72 | 页面区域 body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) · 未来利率预测 排版属性不一致 | - | - | 按设计值调整 body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) 的字体相关 CSS。 | 见设计基准图 | 见开发实际图 | P1 / 错误 | 95% · stable-text + structure-geometry | `review-issue:issue-029` |
| 13 | Figma 0:72 | 页面区域 body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) · 未来利率预测 文字对齐不一致 | left | center | 将 body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) 的 text-align 调整为设计值。 | 见设计基准图 | 见开发实际图 | P1 / 错误 | 95% · stable-text + structure-geometry | `review-issue:issue-030` |
| 14 | Figma 0:72 | 页面区域 body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(3) > p · 1手模拟盈利 位置偏移 | x 267px · y 1418px | x 253px · y 1418px (regional coordinates) | 检查 body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(3) > p 的定位、容器 padding、margin 和对齐方式。 | 见设计基准图 | 见开发实际图 | P1 / 错误 | 94% · stable-text + structure-geometry | `review-issue:issue-031` |
| 15 | Figma 0:72 | 页面区域 body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(3) > p · 1手模拟盈利 尺寸不一致 | 76px × 20px | 102px × 20px | 调整 body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(3) > p 的 width、height、padding 或 box-sizing。 | 见设计基准图 | 见开发实际图 | P1 / 错误 | 94% · stable-text + structure-geometry | `review-issue:issue-032` |
| 16 | Figma 0:72 | 页面区域 body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(3) > p · 1手模拟盈利 文字对齐不一致 | left | center | 将 body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(3) > p 的 text-align 调整为设计值。 | 见设计基准图 | 见开发实际图 | P1 / 错误 | 94% · stable-text + structure-geometry | `review-issue:issue-033` |
| 17 | Figma 0:72 | 页面区域 body > div > div > div > div:nth-of-type(5) > div · 免费开通期货权限 位置偏移 | x 124px · y 2303px | x 15px · y 2296px | 检查 body > div > div > div > div:nth-of-type(5) > div 的定位、容器 padding、margin 和对齐方式。 | 见设计基准图 | 见开发实际图 | P1 / 错误 | 94% · stable-text + structure-geometry | `review-issue:issue-034` |
| 18 | Figma 0:72 | 页面区域 body > div > div > div > div:nth-of-type(5) > div · 免费开通期货权限 尺寸不一致 | 128px × 22px | 345px × 44px | 调整 body > div > div > div > div:nth-of-type(5) > div 的 width、height、padding 或 box-sizing。 | 见设计基准图 | 见开发实际图 | P1 / 错误 | 94% · stable-text + structure-geometry | `review-issue:issue-035` |
| 19 | Figma 0:72 | 页面区域 body > div > div > div > div:nth-of-type(5) > div · 免费开通期货权限 排版属性不一致 | - | - | 按设计值调整 body > div > div > div > div:nth-of-type(5) > div 的字体相关 CSS。 | 见设计基准图 | 见开发实际图 | P1 / 错误 | 94% · stable-text + structure-geometry | `review-issue:issue-036` |
| 20 | Figma 0:72 | 页面区域 body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > p · 模拟收益率 位置偏移 | x 171px · y 1418px | x 150px · y 1418px (regional coordinates) | 检查 body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > p 的定位、容器 padding、margin 和对齐方式。 | 见设计基准图 | 见开发实际图 | P1 / 错误 | 94% · stable-text + structure-geometry | `review-issue:issue-037` |
| 21 | Figma 0:72 | 页面区域 body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > p · 模拟收益率 尺寸不一致 | 70px × 20px | 102px × 20px | 调整 body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > p 的 width、height、padding 或 box-sizing。 | 见设计基准图 | 见开发实际图 | P1 / 错误 | 94% · stable-text + structure-geometry | `review-issue:issue-038` |
| 22 | Figma 0:72 | 页面区域 body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > p · 模拟收益率 文字对齐不一致 | left | center | 将 body > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > p 的 text-align 调整为设计值。 | 见设计基准图 | 见开发实际图 | P1 / 错误 | 94% · stable-text + structure-geometry | `review-issue:issue-039` |
| 23 | Figma 0:72 | 页面区域 body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) · 利率走势图 位置偏移 | x 150px · y 728px | x 134px · y 718px (regional coordinates) | 检查 body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) 的定位、容器 padding、margin 和对齐方式。 | 见设计基准图 | 见开发实际图 | P1 / 错误 | 94% · stable-text + structure-geometry | `review-issue:issue-040` |
| 24 | Figma 0:72 | 页面区域 body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) · 利率走势图 排版属性不一致 | - | - | 按设计值调整 body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) 的字体相关 CSS。 | 见设计基准图 | 见开发实际图 | P1 / 错误 | 94% · stable-text + structure-geometry | `review-issue:issue-042` |
| 25 | Figma 0:72 | 页面区域 body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) · 利率走势图 文字对齐不一致 | left | center | 将 body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) 的 text-align 调整为设计值。 | 见设计基准图 | 见开发实际图 | P1 / 错误 | 94% · stable-text + structure-geometry | `review-issue:issue-043` |
| 26 | Figma 0:72 | 页面区域 body > div > div > div > div:nth-of-type(4) · 本页面中所有政策数据及相关资讯等，均源于 位置偏移 | x 10px · y 2176px | x 10px · y 1470px | 检查 body > div > div > div > div:nth-of-type(4) 的定位、容器 padding、margin 和对齐方式。 | 见设计基准图 | 见开发实际图 | P1 / 错误 | 93% · stable-text + structure-geometry | `review-issue:issue-044` |
| 27 | Figma 0:72 | 页面区域 body > div > div > div > div:nth-of-type(4) · 本页面中所有政策数据及相关资讯等，均源于 尺寸不一致 | 355px × 80px | 355px × 194px | 调整 body > div > div > div > div:nth-of-type(4) 的 width、height、padding 或 box-sizing。 | 见设计基准图 | 见开发实际图 | P1 / 错误 | 93% · stable-text + structure-geometry | `review-issue:issue-045` |
| 28 | Figma 0:72 | 页面区域 body > div > div > div > div:nth-of-type(3) > div:nth-of-type(7) · 展开更多 位置偏移 | x 151px · y 2122px | x 20px · y 2056px (regional coordinates) | 检查 body > div > div > div > div:nth-of-type(3) > div:nth-of-type(7) 的定位、容器 padding、margin 和对齐方式。 | 见设计基准图 | 见开发实际图 | P1 / 错误 | 89% · stable-text + structure-geometry | `review-issue:issue-046` |
| 29 | Figma 0:72 | 页面区域 body > div > div > div > div:nth-of-type(3) > div:nth-of-type(7) · 展开更多 文字对齐不一致 | justified | start | 将 body > div > div > div > div:nth-of-type(3) > div:nth-of-type(7) 的 text-align 调整为设计值。 | 见设计基准图 | 见开发实际图 | P1 / 错误 | 89% · stable-text + structure-geometry | `review-issue:issue-048` |
| 30 | Figma 0:72 | 页面区域 body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > span:nth-of-type(2) · 20.30% 排版属性不一致 | - | - | 按设计值调整 body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > span:nth-of-type(2) 的字体相关 CSS。 | 见设计基准图 | 见开发实际图 | P1 / 错误 | 90% · verified-template + temporal-consistency + structure-geometry | `review-issue:issue-050` |
| 31 | Figma 0:72 | 页面区域 body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > span:nth-of-type(2) · 79.70% 排版属性不一致 | - | - | 按设计值调整 body > div > div > div > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > span:nth-of-type(2) 的字体相关 CSS。 | 见设计基准图 | 见开发实际图 | P1 / 错误 | 90% · verified-template + temporal-consistency + structure-geometry | `review-issue:issue-052` |
| 32 | Figma 0:72 | 页面区域 body > div > div > div > div:nth-of-type(3) > div:nth-of-type(6) > div:nth-of-type(1) · 文本可能被截断 | - | - | 检查容器尺寸、line-height、overflow 和文本换行规则。 | 见设计基准图 | 见开发实际图 | P2 / 警告 | 99% · dom-audit | `review-issue:issue-060` |
| 33 | Figma 0:72 | 页面区域 body > div > div > div > div:nth-of-type(1) · 矩形 4备份 6 整体位移（原因待核验） | - | - | 核验前序缺失、列表高度或区域位置原因；内部样式问题独立处理。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 91% · stable-text + structure-geometry + temporal-consistency | `review-issue:issue-001` |
| 34 | Figma 0:72 | 页面区域 body > div > div > div > div:nth-of-type(2) · 矩形 4备份 8 整体位移（原因待核验） | - | - | 核验前序缺失、列表高度或区域位置原因；内部样式问题独立处理。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 94% · stable-text + structure-geometry + temporal-consistency | `review-issue:issue-002` |
| 35 | Figma 0:72 | 页面区域 body > div > div > div > div:nth-of-type(3) · 矩形 4备份 9 整体位移（原因待核验） | - | - | 核验前序缺失、列表高度或区域位置原因；内部样式问题独立处理。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 91% · stable-text + structure-geometry + temporal-consistency | `review-issue:issue-003` |
| 36 | Figma 0:72 | 页面区域 body > div > div > div > img · 编组 位置偏移 | x 0px · y 88px | x 0px · y 0px | 检查 body > div > div > div > img 的定位、容器 padding、margin 和对齐方式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 76% · structure-geometry | `review-issue:issue-053` |
| 37 | Figma 0:72 | 整个页面 · 高密度差异区域 1 | - | - | 在叠加视图中检查该区域，再结合元素级规则确认具体属性。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 70% · pixel-measurement + visual-inference | `review-issue:issue-005` |
| 38 | Figma 0:72 | 整个页面 · 高密度差异区域 2 | - | - | 在叠加视图中检查该区域，再结合元素级规则确认具体属性。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 70% · pixel-measurement + visual-inference | `review-issue:issue-006` |
| 39 | Figma 0:72 | 整个页面 · 高密度差异区域 3 | - | - | 在叠加视图中检查该区域，再结合元素级规则确认具体属性。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 70% · pixel-measurement + visual-inference | `review-issue:issue-007` |
| 40 | Figma 0:72 | 整个页面 · 高密度差异区域 4 | - | - | 在叠加视图中检查该区域，再结合元素级规则确认具体属性。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 70% · pixel-measurement + visual-inference | `review-issue:issue-008` |
| 41 | Figma 0:72 | 整个页面 · 高密度差异区域 5 | - | - | 在叠加视图中检查该区域，再结合元素级规则确认具体属性。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 70% · pixel-measurement + visual-inference | `review-issue:issue-009` |
| 42 | Figma 0:72 | 整个页面 · 高密度差异区域 6 | - | - | 在叠加视图中检查该区域，再结合元素级规则确认具体属性。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 70% · pixel-measurement + visual-inference | `review-issue:issue-010` |
| 43 | Figma 0:72 | 页面区域 0:117 · 高密度差异区域 7 | - | - | 在叠加视图中检查该区域，再结合元素级规则确认具体属性。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 70% · pixel-measurement + visual-inference | `review-issue:issue-011` |
| 44 | Figma 0:72 | 编组 · 编组 模块疑似缺失（待核验） | - | - | 核查实际页面是否存在「编组」模块；确认缺失后按设计补齐，若已存在则核对其内部结构与样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:73` |
| 45 | Figma 0:72 | 快评 · 快评 模块疑似缺失（待核验） | - | - | 核查实际页面是否存在「快评」模块；确认缺失后按设计补齐，若已存在则核对其内部结构与样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:78` |
| 46 | Figma 0:72 | 最新货币政策 · 最新货币政策 模块缺失 | 决议时间 / 最新货币政策 / 资产负债表 | 全部完整采样中未找到 | 按 Figma 补齐该模块及其视觉结构，再复核样式。 | 见设计基准图 | 见开发实际图 | P1 / 错误 | 90% · dom-audit + stable-text + temporal-consistency | `review-issue:missing-module:coverage:0:110` |
| 47 | Figma 0:72 | 层叠备份 4 · 层叠备份 4 模块疑似缺失（待核验） | - | - | 核查实际页面是否存在「层叠备份 4」模块；确认缺失后按设计补齐，若已存在则核对其内部结构与样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:119` |
| 48 | Figma 0:72 | 矩形 6 · 矩形 6 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:134` |
| 49 | Figma 0:72 | 利率走势图 · 利率走势图 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:136` |
| 50 | Figma 0:72 | 矩形 7 · 矩形 7 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:137` |
| 51 | Figma 0:72 | 资产负债表 · 资产负债表 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:139` |
| 52 | Figma 0:72 | jimeng-2025-07-31-1289-UI图标，采用卡通3D风格，立体，从斜45度视角俯视，日历图标（蓝色外框，中间白... (1) · jimeng-2025-07-31-1289-UI图标，采用卡通3D风格，立体，从斜45度视角俯视，日历图标（蓝色外框，中间白... (1) 模块疑似缺失（待核验） | - | - | 核查实际页面是否存在「jimeng-2025-07-31-1289-UI图标，采用卡通3D风格，立体，从斜45度视角俯视，日历图标（蓝色外框，中间白... (1)」模块；确认缺失后按设计补齐，若已存在则核对其内部结构与样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:143` |
| 53 | Figma 0:72 | 下一次美联储议息决议公布 2026年3月 · 下一次美联储议息决议公布 2026年3月 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:149` |
| 54 | Figma 0:72 | 天 · 天 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:150` |
| 55 | Figma 0:72 | 矩形 5 · 矩形 5 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:151` |
| 56 | Figma 0:72 | 40 · 40 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:152` |
| 57 | Figma 0:72 | 小时 · 小时 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:154` |
| 58 | Figma 0:72 | 矩形 5备份 · 矩形 5备份 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:155` |
| 59 | Figma 0:72 | 14 · 14 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:156` |
| 60 | Figma 0:72 | 矩形 5备份 2 · 矩形 5备份 2 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:158` |
| 61 | Figma 0:72 | 53 · 53 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:159` |
| 62 | Figma 0:72 | 概率 · 概率 设计覆盖未能验证 | - | - | 核查实际页面是否存在「概率」模块；确认缺失后按设计补齐，若已存在则核对其内部结构与样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:328` |
| 63 | Figma 0:72 | 最新概率 · 最新概率 设计覆盖未能验证 | - | - | 核查实际页面是否存在「最新概率」模块；确认缺失后按设计补齐，若已存在则核对其内部结构与样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:340` |
| 64 | Figma 0:72 | 编组 · 编组 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:172` |
| 65 | Figma 0:72 | 图标_通用_帮助_16pt备份 · 图标_通用_帮助_16pt备份 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:203` |
| 66 | Figma 0:72 | 模拟收益率 · 模拟收益率 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:204` |
| 67 | Figma 0:72 | 矩形 11 · 矩形 11 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:205` |
| 68 | Figma 0:72 | 12.13% · 12.13% 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:208` |
| 69 | Figma 0:72 | 12.13%备份 · 12.13%备份 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:209` |
| 70 | Figma 0:72 | @数据展示/数据列表/交易详情/弹窗/确定备份 · @数据展示/数据列表/交易详情/弹窗/确定备份 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:229` |
| 71 | Figma 0:72 | 相关品种状态_品种卡片 · 相关品种状态_品种卡片 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:233` |
| 72 | Figma 0:72 | 编组备份 3 · 编组备份 3 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:239` |
| 73 | Figma 0:72 | 沪银2604 · 沪银2604 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:242` |
| 74 | Figma 0:72 | 19570 · 19570 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:243` |
| 75 | Figma 0:72 | 11.4% · 11.4% 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:244` |
| 76 | Figma 0:72 | 东升西渐风景独好-国泰君安字符字符字 · 东升西渐风景独好-国泰君安字符字符字 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:178` |
| 77 | Figma 0:72 | 2021年度投度投度投度投投度 · 2021年度投度投度投度投投度 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:179` |
| 78 | Figma 0:72 | 所长早读 · 所长早读 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:180` |
| 79 | Figma 0:72 | ·5分钟前 · ·5分钟前 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:181` |
| 80 | Figma 0:72 | 东升西渐风景独好-国泰君安字符字符字 · 东升西渐风景独好-国泰君安字符字符字 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:190` |
| 81 | Figma 0:72 | 字符字符字符字符字符字符字符字符字符字符 · 字符字符字符字符字符字符字符字符字符字符 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:191` |
| 82 | Figma 0:72 | 所长早读 · 所长早读 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:192` |
| 83 | Figma 0:72 | ·5分钟前备份 · ·5分钟前备份 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:193` |
| 84 | Figma 0:72 | 矩形 12 · 矩形 12 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:245` |
| 85 | Figma 0:72 | 矩形 12备份 · 矩形 12备份 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:246` |
| 86 | Figma 0:72 | 东升西渐风景独好-国泰君安字符字符字备份 · 东升西渐风景独好-国泰君安字符字符字备份 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:247` |
| 87 | Figma 0:72 | 收盘点评 · 收盘点评 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:248` |
| 88 | Figma 0:72 | ·5分钟前备份 2 · ·5分钟前备份 2 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:249` |
| 89 | Figma 0:72 | 矩形 12备份 2 · 矩形 12备份 2 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:258` |
| 90 | Figma 0:72 | 东升西渐风景独好-国泰君安字符字符字备份 2 · 东升西渐风景独好-国泰君安字符字符字备份 2 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:259` |
| 91 | Figma 0:72 | 收盘点评备份 · 收盘点评备份 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:260` |
| 92 | Figma 0:72 | ·5分钟前备份 3 · ·5分钟前备份 3 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:261` |
| 93 | Figma 0:72 | 矩形 12备份 3 · 矩形 12备份 3 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:270` |
| 94 | Figma 0:72 | 东升西渐风景独好-国泰君安字符字符字备份 3 · 东升西渐风景独好-国泰君安字符字符字备份 3 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:271` |
| 95 | Figma 0:72 | 收盘点评备份 2 · 收盘点评备份 2 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:272` |
| 96 | Figma 0:72 | ·5分钟前备份 4 · ·5分钟前备份 4 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:273` |
| 97 | Figma 0:72 | 矩形 12备份 4 · 矩形 12备份 4 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:282` |
| 98 | Figma 0:72 | 展开更多 · 展开更多 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:283` |
| 99 | Figma 0:72 | 图标_通用_更多_16pt · 图标_通用_更多_16pt 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:285` |
| 100 | Figma 0:72 | 导航栏 · 导航栏 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:210` |
| 101 | Figma 0:72 | 状态栏 · 状态栏 设计覆盖未能验证 | - | - | 补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:224` |
| 102 | Figma 0:72 | 投票 · 投票 模块缺失 | 投票 | 全部完整采样中未找到 | 按 Figma 补齐该模块及其视觉结构，再复核样式。 | 见设计基准图 | 见开发实际图 | P1 / 错误 | 90% · dom-audit + stable-text + temporal-consistency | `review-issue:missing-module:coverage:0:286` |
| 103 | Figma 0:72 | 免费开通期货权限 · 免费开通期货权限 设计覆盖未能验证 | - | - | 核查实际页面是否存在「免费开通期货权限」模块；确认缺失后按设计补齐，若已存在则核对其内部结构与样式。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:coverage:0:319` |
| 104 | Figma 0:72 | div · div · 无设计对应（待核验） | - | - | 查找对应设计，或确认该新增内容是否符合预期。 | 见设计基准图 | 见开发实际图 | Pending / 待确认 | 0% ·  | `review-issue:actual-coverage:body > div > div > div` |

---

此报告由 DiffLab 可抛弃原型生成。通过/不通过仅由 YAML 规则决定，AI 不参与门禁。
