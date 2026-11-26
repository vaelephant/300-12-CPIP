from __future__ import annotations

from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Inches, Pt

SOURCE = Path("/Users/yan/Downloads/HCC_智能临床路径平台_差异化战略版.pptx")
OUTPUT = Path("docs/HCC_智能临床路径平台_差异化战略版_优化版.pptx")
ASSETS = Path(".ppt-build/assets")

NAVY = RGBColor(0x1C, 0x37, 0x54)
INK = RGBColor(0x1C, 0x1C, 0x1C)
GREY = RGBColor(0x76, 0x76, 0x76)
LINE = RGBColor(0xE0, 0xE3, 0xE6)
WASH = RGBColor(0xF5, 0xF6, 0xF7)
RED = RGBColor(0xB8, 0x42, 0x42)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)

FONT_SANS = "Noto Sans SC"
FONT_SERIF = "Noto Serif SC"


def set_text(shape, text: str, *, size: float | None = None, color: RGBColor | None = None,
             font: str | None = None, bold: bool | None = None) -> None:
    """Replace text while keeping the first run's character formatting."""
    tf = shape.text_frame
    first = tf.paragraphs[0]
    template = first.runs[0] if first.runs else None
    tf.clear()
    p = tf.paragraphs[0]
    run = p.add_run()
    run.text = text
    if template is not None:
        run.font.name = template.font.name
        run.font.size = template.font.size
        run.font.bold = template.font.bold
        run.font.italic = template.font.italic
        if template.font.color and template.font.color.type is not None:
            run.font.color.rgb = template.font.color.rgb
    if size is not None:
        run.font.size = Pt(size)
    if color is not None:
        run.font.color.rgb = color
    if font is not None:
        run.font.name = font
    if bold is not None:
        run.font.bold = bold


def add_text(slide, text, left, top, width, height, *, size=12, color=INK, font=FONT_SANS,
             bold=False, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, spacing=None):
    box = slide.shapes.add_textbox(Inches(left), Inches(top), Inches(width), Inches(height))
    tf = box.text_frame
    tf.clear()
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.margin_left = 0
    tf.margin_right = 0
    tf.margin_top = 0
    tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.alignment = align
    if spacing:
        p.space_after = Pt(spacing)
    run = p.add_run()
    run.text = text
    run.font.name = font
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    return box


def add_rule(slide, left, top, width, color=LINE, height=0.012):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(left), Inches(top), Inches(width), Inches(height))
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()
    return shape


def add_card(slide, left, top, width, height, *, fill=WHITE, border=LINE):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(left), Inches(top), Inches(width), Inches(height))
    shape.adjustments[0] = 0.04
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill
    shape.line.color.rgb = border
    shape.line.width = Pt(0.8)
    return shape


def add_footer(slide, page: int, section: str = "V0.6.1 · PRODUCT EVIDENCE"):
    add_text(slide, "DR.SeeK  ·  产品研发方案  /  2026.11", 0.68, 7.18, 7.0, 0.22, size=10, color=GREY)
    add_text(slide, f"{page:02d}", 12.10, 7.15, 0.55, 0.25, size=10, color=GREY, align=PP_ALIGN.RIGHT)
    add_text(slide, section, 9.45, 7.18, 2.55, 0.22, size=8.5, color=GREY, align=PP_ALIGN.RIGHT)


def header(slide, kicker: str, title: str, *, subtitle: str | None = None):
    add_text(slide, kicker, 0.65, 0.35, 12.0, 0.32, size=11, color=GREY)
    add_text(slide, title, 0.65, 0.80, 12.0, 0.75, size=22, color=NAVY, font=FONT_SERIF)
    add_rule(slide, 0.65, 1.62, 12.03)
    if subtitle:
        add_text(slide, subtitle, 0.65, 1.78, 11.9, 0.45, size=11.5, color=GREY)


def picture_card(slide, image: Path, left, top, width, height, title, caption):
    add_card(slide, left, top, width, height, fill=WHITE)
    slide.shapes.add_picture(str(image), Inches(left + 0.12), Inches(top + 0.12), width=Inches(width - 0.24), height=Inches(height - 0.78))
    pic = slide.shapes[-1]
    pic.line.color.rgb = LINE
    pic.line.width = Pt(0.6)
    add_text(slide, title, left + 0.16, top + height - 0.60, width - 0.32, 0.25, size=11.5, color=NAVY, bold=True)
    add_text(slide, caption, left + 0.16, top + height - 0.35, width - 0.32, 0.25, size=9.5, color=GREY)


def bullet_card(slide, left, top, width, title, body):
    add_card(slide, left, top, width, 1.02, fill=WHITE)
    add_text(slide, title, left + 0.18, top + 0.12, width - 0.36, 0.25, size=11, color=NAVY, bold=True)
    add_text(slide, body, left + 0.18, top + 0.42, width - 0.36, 0.52, size=9.5, color=INK)


def move_slide(prs, old_index: int, new_index: int):
    sld_ids = prs.slides._sldIdLst
    slide_id = list(sld_ids)[old_index]
    sld_ids.remove(slide_id)
    sld_ids.insert(new_index, slide_id)


def add_live_interface(prs, page):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    header(s, "LIVE PRODUCT · 可运行界面", "不是概念图：核心业务已能端到端走通",
           subtitle="以下截图来自当前 V0.6.1 本地演示，全部为合成数据；展示交互与信息结构，不代表临床验证。")
    picture_card(s, ASSETS / "dashboard.jpg", 0.65, 2.30, 3.82, 3.55, "临床工作台", "今日任务、风险预警与路径进度")
    picture_card(s, ASSETS / "patient.jpg", 4.75, 2.30, 3.82, 3.55, "患者 360", "状态快照、数据完整度与缺失字段")
    picture_card(s, ASSETS / "pathway.jpg", 8.85, 2.30, 3.82, 3.55, "路径执行", "完成/执行中/变异/UNKNOWN/未选分支")
    add_text(s, "从患者状态到路径执行，再到任务与随访，界面读取同一套服务端状态；Server 模式不回退 mock 数据。",
             0.65, 6.05, 11.9, 0.40, size=11, color=GREY)
    add_footer(s, page, "V0.6.1 · SYNTHETIC DEMO")
    s.notes_slide.notes_text_frame.text = "截图均为合成数据演示，clinical_use=false；用于展示信息结构，不作为临床证据。"
    return s


def add_engine(prs, page):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    header(s, "EXECUTION ENGINE · 路径执行内核", "条件分支、阻断与审批，都能被解释和追溯")
    s.shapes.add_picture(str(ASSETS / "pathway.jpg"), Inches(0.65), Inches(1.90), width=Inches(7.15), height=Inches(4.72))
    pic = s.shapes[-1]
    pic.line.color.rgb = LINE
    pic.line.width = Pt(0.8)
    bullet_card(s, 8.65, 1.90, 4.03, "条件边", "TRUE / FALSE / UNKNOWN 由冻结规则上下文判定；未知不默认 FALSE。")
    bullet_card(s, 8.65, 3.04, 4.03, "未选分支", "不生成可执行任务，画布以虚线弱化；决策轨迹保留。")
    bullet_card(s, 8.65, 4.18, 4.03, "执行 trace", "记录快照、规则版本、边、结果与原因，确定性重放。")
    bullet_card(s, 8.65, 5.32, 4.03, "审批指纹", "execution_fingerprint 绑定审批；trace 篡改返回 409。")
    add_text(s, "图例：已完成 / 执行中 / 变异 / 阻塞 / UNKNOWN / 待执行 / 未选路径。",
             0.65, 6.72, 8.5, 0.25, size=9.5, color=GREY)
    add_footer(s, page, "V0.6.1 · PATHWAY ENGINE")
    s.notes_slide.notes_text_frame.text = "路径图状态由服务端 execution_trace 驱动，前端不推断临床规则。"
    return s


def add_safety(prs, page):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    header(s, "SAFETY BY DESIGN · 临床安全边界", "AI 不替医生做决定，系统替医生守住边界",
           subtitle="高亮不是“模型多聪明”，而是每个建议都可解释、可拒绝、可追溯。")
    s.shapes.add_picture(str(ASSETS / "timeline.jpg"), Inches(0.65), Inches(2.20), width=Inches(5.95), height=Inches(3.85))
    pic = s.shapes[-1]
    pic.line.color.rgb = LINE
    pic.line.width = Pt(0.8)
    add_text(s, "真实时间轴 · 事件时间与录入时间分列 · 缺失不补造", 0.65, 6.22, 5.95, 0.28, size=10, color=GREY)
    bullets = [
        ("三值规则", "未知 = UNKNOWN，不通过；排除与安全条件未知必须阻断。"),
        ("对象级授权", "患者、科室、角色逐层校验；越权返回 403 并留痕。"),
        ("人工审核", "计划必须由非提交人审核、绑定执行指纹后才能激活。"),
        ("审计与重评", "成功业务与审计同事务；状态变化触发重评而非自动改治疗。"),
    ]
    for i, (title, body) in enumerate(bullets):
        left = 6.95 + (i % 2) * 2.95
        top = 2.20 + (i // 2) * 1.58
        add_card(s, left, top, 2.75, 1.36, fill=WASH)
        add_text(s, title, left + 0.16, top + 0.12, 2.43, 0.25, size=11, color=NAVY, bold=True)
        add_text(s, body, left + 0.16, top + 0.42, 2.43, 0.82, size=9.5, color=INK)
    add_text(s, "注：HCC-CIP 仍为研发演示；临床签署、真实数据合规与生产 PostgreSQL 验证为独立门槛。",
             0.65, 6.70, 11.9, 0.35, size=10, color=GREY)
    add_footer(s, page, "V0.6.1 · SAFETY")
    s.notes_slide.notes_text_frame.text = "安全边界优先于演示效果；不声称已获临床验证。"
    return s


def add_status(prs, page):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    header(s, "BUILD STATUS · 当前研发基线", "从战略方案推进到可运行 V0.6.1",
           subtitle="不是只有路线图：核心引擎、接口、页面和浏览器验收已经跑通。")
    metrics = [
        ("53", "契约路径", "OpenAPI 路径全部实现"),
        ("75", "后端测试", "pytest 通过"),
        ("9", "Server 页面", "登录到随访的真实 API 切片"),
        ("6", "浏览器场景", "Playwright 核心链路"),
    ]
    for i, (value, label, sub) in enumerate(metrics):
        left = 0.65 + i * 3.05
        add_card(s, left, 2.05, 2.85, 1.62, fill=WHITE)
        add_text(s, value, left + 0.18, 2.18, 1.35, 0.60, size=30, color=NAVY, font=FONT_SERIF)
        add_text(s, label, left + 0.18, 2.88, 2.45, 0.28, size=11.5, color=NAVY, bold=True)
        add_text(s, sub, left + 0.18, 3.17, 2.45, 0.30, size=9.5, color=GREY)
    add_text(s, "已完成", 0.65, 4.10, 1.2, 0.28, size=10, color=RED, bold=True)
    add_text(s, "条件图执行 · 执行 trace · 审批指纹 · 随访预警 · 事件驱动重评 · 唯一 ACTIVE 计划 · Demo/Server 隔离",
             1.55, 4.08, 11.0, 0.55, size=11, color=INK)
    add_text(s, "仍然明确", 0.65, 4.78, 1.2, 0.28, size=10, color=GREY, bold=True)
    add_text(s, "临床规则待专家签署；生产 PostgreSQL、TLS、会话吊销与真实数据合规为下一阶段门槛。",
             1.75, 4.76, 10.8, 0.55, size=11, color=INK)
    add_rule(s, 0.65, 5.55, 12.03)
    add_text(s, "产品不是 PPT 里的流程图，而是已经可以逐步演示的工作流。",
             0.65, 5.72, 11.9, 0.45, size=14, color=NAVY, font=FONT_SERIF)
    add_text(s, "从患者状态到路径、任务、随访；截图证据见第 9、22、23 页。",
             0.65, 6.22, 11.9, 0.35, size=10, color=GREY)
    add_text(s, "演示环境：SQLite + 合成数据 · clinical_use=false · 不代表临床有效性",
             0.65, 6.62, 11.9, 0.40, size=10, color=GREY)
    add_footer(s, page, "V0.6.1 · STATUS")
    s.notes_slide.notes_text_frame.text = "数字为本地当前基线：75 个后端测试、53 个契约路径、6 个 Playwright 场景；CI runner 尚未实际执行。"
    return s


def main():
    prs = Presentation(str(SOURCE))

    # Text refresh to match the shipped V0.6.1 prototype.
    for slide in prs.slides:
        for shape in slide.shapes:
            if not shape.has_text_frame:
                continue
            if "V0.5" in shape.text:
                set_text(shape, shape.text.replace("V0.5", "V0.6.1"))
            if shape.text.strip() == "第一期围绕八项能力，形成可运行的业务闭环":
                set_text(shape, "第一期能力已形成可运行的业务闭环")
            if shape.text.strip() == "从标准临床路径到预测驱动的全病程管理":
                set_text(shape, "从标准临床路径到可解释、可追溯的全病程执行")
            if shape.text.strip() == "先确定数据、临床专家和交付范围，再启动开发":
                set_text(shape, "先确定数据、临床专家和试点范围，再进入临床验证")
            if shape.text.strip() == "工程启动":
                set_text(shape, "试点集成")
            if shape.text.strip() == "独立产品仓库  ·  路径引擎、专病模板、数据接口与验收":
                set_text(shape, "HIS/EMR/LIS 接口  ·  角色、权限、审计与验收")
            if shape.text.strip().startswith("第一期交付规则驱动的工具"):
                set_text(shape, "第一期已交付规则驱动的可运行工具；预测模型通过标准接口逐步接入。")

    # Slide 21 becomes the next-stage roadmap rather than a past 30-day plan.
    slide21 = prs.slides[20]
    for shape in slide21.shapes:
        if not shape.has_text_frame:
            continue
        t = shape.text.strip()
        if t == "ROADMAP · 30天研发计划":
            set_text(shape, "ROADMAP · 下一阶段")
        elif t == "四周完成可运行演示，优先打通核心业务闭环":
            set_text(shape, "从 V0.6.1 可运行基线，推进到临床试点")
        elif t == "基础工具  ·  工程、数据模型、编辑器、模板与版本":
            set_text(shape, "数据与合规  ·  数据授权、脱敏、伦理与安全评估")
        elif t == "核心引擎  ·  状态、规则、执行、专病CDSS基础":
            set_text(shape, "临床共建  ·  专家确认规则、路径与审核责任")
        elif t == "数据与规划  ·  导入、时间轴、个体化路径、挖掘原型":
            set_text(shape, "试点集成  ·  HIS/EMR/LIS 接口、角色与审计")
        elif t == "集成与演示  ·  可视化、随访、测试及演示交付":
            set_text(shape, "验证发布  ·  真实数据验证、培训与试点评估")
        elif t.startswith("30天目标是研发演示"):
            set_text(shape, "当前不宣称临床验证完成；真实数据使用需医院授权与合规审查。")

    # Build new slides at the end, then move into narrative positions.
    live = add_live_interface(prs, 9)
    move_slide(prs, len(prs.slides) - 1, 8)

    engine = add_engine(prs, 22)
    move_slide(prs, len(prs.slides) - 1, 21)

    safety = add_safety(prs, 23)
    move_slide(prs, len(prs.slides) - 1, 22)

    status = add_status(prs, 21)
    # Place build status after tech stack, before the next-stage roadmap.
    move_slide(prs, len(prs.slides) - 1, 23)

    # The source deck used two page-number systems; after inserting slides they
    # diverge. Keep one page marker per slide and remove the old section marker.
    for slide in prs.slides:
        for shape in list(slide.shapes):
            if not shape.has_text_frame:
                continue
            left = shape.left / 914400 if shape.left is not None else 0
            top = shape.top / 914400 if shape.top is not None else 0
            text = shape.text.strip()
            if left > 11.4 and 6.55 < top < 6.90 and text.isdigit() and len(text) <= 2:
                element = shape._element
                element.getparent().remove(element)

    # Renumber the remaining bottom page marker so inserted slides do not break the deck.
    for index, slide in enumerate(prs.slides, start=1):
        for shape in slide.shapes:
            if not shape.has_text_frame:
                continue
            left = shape.left / 914400 if shape.left is not None else 0
            top = shape.top / 914400 if shape.top is not None else 0
            text = shape.text.strip()
            if left > 11.5 and top > 6.85 and text.isdigit() and len(text) <= 2:
                set_text(shape, f"{index:02d}")

    prs.core_properties.title = "HCC 智能临床路径平台 · 差异化战略版（V0.6.1 可运行证据）"
    prs.core_properties.subject = "原发性肝癌智能临床路径平台 · 产品研发方案"
    prs.core_properties.author = "DR.SeeK"
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    prs.save(str(OUTPUT))
    print(f"saved {OUTPUT} with {len(prs.slides)} slides")


if __name__ == "__main__":
    main()
