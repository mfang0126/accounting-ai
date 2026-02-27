# THINKING.md

## 基础概念

**这个文件 > 所有其他文件。**

逻辑链：底层逻辑对 → Journey 描述对 → 开发对 → Demo 有意义。

任何一环出错，根因一定在这个文件里——回来改这里，不要去改下游。

**这个文件必须不断 refine。** 做错了、卡住了、想通了——先更新这里，再继续干。文件保持简洁，每次只加真正想明白的东西。

**相信流程。** 每一步做对了，下一步一定是对的。不要跳步，不要怀疑，按顺序走。

**所有文档方向一致。** THINKING.md 是根，其他文档（PLAN.md、demo 脚本、任务列表）都是它的延伸。方向不一致 = 回这里对齐，不是去改其他文件。

> 文件结构见 `PROJECT.md`，流程图见 `diagrams/`。每次开始前先读这两个。

---

## Journey Loop（每圈 = Demo 一段）

```
1. 痛点 → 2. 场景 → 3. 价值验证 → 4. 规格(DoD+场景) → 5. 执行
                                                              ↓
                                                       6. Critic 验收
                                                        ↙         ↘
                                                   PASS           FAIL
                                                     ↓               ↓
                                             ✅ Checkpoint    Reflexion 反思
                                                     ↓          (最多3次)
                                             下一个 Journey    → 回 Step 5
```

**规则：一次只做一个 Journey。J1 没过 Checkpoint，不开始 J2。**

**Step 1-4 输出规范：** 每个 Journey 解锁后，主 agent 先在 `TASKS.md` 对应区块写清楚四项，写完才能进 Step 5：

```
痛点：一句话（用户现在的痛）
场景：用户做什么操作，期望看到什么
价值：这个 Journey 证明了什么能力
DoD：一条验收命令 + 预期输出
```

---

## ⛔ 强制禁止（违反 = 重来）

- **必须真实开发**：每行代码生产级别，不是 demo 壳
- **禁止 Hacky**：问题必须真正解决，不能绕
- **禁止跳步**：没想清楚规格（Step 4）不写代码，没验收（Step 6）不进下一步
- **验收标准**：curl/命令跑出真实输出，不接受"应该可以"

---

## 谁干什么

**核心原则：主 agent 只看摘要，不看原始数据。共享状态只通过 `TASKS.md` 传递。**

| 任务 | 谁干 | 权限 |
|------|------|------|
| 规格、拆任务、最终决策 | **主 agent（我）** | 只读结论 |
| 写代码 | **Claude Code** (`exec pty:true`) | 限定项目目录 |
| DoD 验收（Critic） | **Verifier agent** (`sessions_send`) | 只读代码+DoD |
| 研究、竞品 | **Kimi** (`sessions_spawn`) | 只读 |
| 写文章 | **Content agent** (`sessions_send`) | 只写文章文件 |

**委派最多 2 层**：主 agent → 执行 agent。执行 agent 不再往下派。

**共享状态**：所有 agent 只通过 `TASKS.md` 交接，不依赖彼此的 memory。

---

## 当前 Journeys（= 助理会计季度末工作流）

> 完整背景见 `CONTEXT.md`。每个 Journey = 助理会计的一个真实工作步骤。

| Journey | 助理会计在做什么 | AI 证明什么 | 状态 |
|---------|-----------------|-----------|------|
| **J1** | "帮我对一下 Q1 的账" | 读数据 + 逐笔匹配 + 找出所有不匹配 | ⚠️ Step 6 待验收 |
| **J2** | "这几笔对不上的，查一下什么情况" | 追查异常原因，给出会计判断和处理建议 | 🔒 等 J1 |
| **J3** | "算一下 GST，我要报 IRD" | 正确计算 NZ 15% GST，算出净额 | 🔒 等 J2 |
| **J4** | "出一份 Q1 的 P&L 给我" | 按科目汇总，生成标准损益表 | 🔒 等 J3 |
| **J5** | "整理成底稿，每个数字要有来源" | 生成完整 Working Paper，数字可溯源 | 🔒 等 J4 |
| **J6** | 合伙人审阅 + 追问细节 | 上传文件、看结果、自然语言问答 | 🔒 等 J5 |

**现在**：J1 Step 6 — 跑真实对账，AI 找到 Harbourside 5 个错误才算过。

---

## 拆任务给 Claude Code

每个 task 必须包含三样东西，缺一不给 Claude Code：

```
任务描述：做什么
Definition of Done：我怎么知道完成了？（一条 curl/命令，看到具体输出）
Acceptance Scenarios：哪些场景必须 work？
  - 正常场景：输入正确时应该输出什么
  - 边界场景：输入为空/格式错/金额为零时不能崩
  - 错误场景：文件不存在时应该报什么错
```

**测试不用写代码，用描述。** 模型的编码能力不是瓶颈——瓶颈是场景有没有想全。场景描述越具体，输出越可靠。

- 一次一个文件，< 50 行
- Claude Code 超时 → 任务太大，继续拆
- Sub-agent 完成 → 写 handoff notes 到 `TASKS.md`，发 EXIT_SIGNAL，不用解释细节
- **Critic Agent 验收**（不是主 agent 自己验收）：对照 DoD 逐条检查，输出 PASS/FAIL + 原因
- **FAIL → Reflexion**：Critic 的反馈存入记忆，Implementer 读反馈重试，最多 3 次，3 次还不过 → 人工介入

---

## TASKS.md 协议（agent 必读）

**每次启动，第一件事：读 `TASKS.md`，找到"当前任务"，从那里继续。不要重新规划，不要问人。**

### Task 状态

每个 task 只有三种状态，必须实时更新：

```
[ ] 待做
[>] 进行中（同一时间只能有一个）
[x] 完成（附上验收命令 + 实际输出摘要）
```

### Checkpoint 格式

每个 Journey 通过 Critic 验收后，在 `TASKS.md` 写一条 Checkpoint 记录：

```
### ✅ Checkpoint J1 — 2026-XX-XX
命令：curl http://localhost:3000/api/reconcile ...
输出：找到5个异常 [REF001 金额差/INV-2026-004 未收款/...]
结论：PASS
```

### 进度日志（Status Log）

**每完成一个动作，立即在 `TASKS.md` 的 Status Log 追加一行。** 用户打开文件就能看到你在干什么，不需要问你。

```
- [时间] [一句话说明]
```

示例：
```
- 14:03 读取 bank-statement-Q1-2026.csv，44笔交易解析成功
- 14:05 委派 Claude Code 写 reconcileTool，DoD: 匹配率 > 90%
- 14:12 Claude Code 完成，41/44 匹配，3个异常
- 14:13 委派 Critic Agent 验收 J1
- 14:18 Critic FAIL — 只找到3个错误，漏了 REF011 和 GST 差异
- 14:19 写入 Learning Log，回 Step 5 重试
```

**原则：宁可多写一行，不要让用户猜。每行 < 20 字。**

### 踩坑记录（Learning Log）

**每次 FAIL 或遇到意外问题，必须在 `TASKS.md` 的 Learning Log 区块追加一条。**
下一次遇到类似问题，先查 Learning Log，不要重复踩同一个坑。

```
- [日期] [坑的描述] → [解法]
```

---
