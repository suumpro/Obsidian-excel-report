"""
Weekly Report Generator - Lawson format with 7 sheets
"""

from pathlib import Path
from datetime import datetime
from typing import Optional

from ..config import Config
from ..generators.excel_generator import ExcelGenerator
from ..generators.chart_builder import ChartBuilder
from ..aggregators.data_aggregator import DataAggregator
from ..aggregators.metrics_calculator import MetricsCalculator
from ..utils.date_utils import get_current_week_info, format_date
from ..utils.logger import logger


class WeeklyReportGenerator(ExcelGenerator):
    """Generates weekly report with 7 sheets"""

    def __init__(self, config: Config):
        super().__init__(config)
        self.aggregator = DataAggregator(config)
        self.chart_builder = ChartBuilder()

    def generate(self, output_filename: Optional[str] = None, date: Optional[datetime] = None) -> Path:
        """
        Generate weekly report

        Args:
            output_filename: Custom filename (optional)
            date: Report date (defaults to today)

        Returns:
            Path to generated file
        """
        logger.info("🚀 Generating Weekly Report...")

        # Get week info
        week_info = get_current_week_info() if date is None else {
            "week_number": date.isocalendar()[1],
            "formatted_week": f"W{date.isocalendar()[1]}",
            "formatted_date": format_date(date),
        }

        # Load all data
        logger.info("Loading data from Obsidian files...")
        dashboard = self.aggregator.load_dashboard_data()
        roadmap = self.aggregator.load_roadmap_data()
        blockers = self.aggregator.load_blocker_data()
        q1_data = self.aggregator.load_quarterly_data(1)

        # Calculate metrics
        metrics = MetricsCalculator.calculate_combined_metrics(
            dashboard, roadmap, blockers, q1_data
        )

        # Create workbook
        self.create_workbook()

        # Generate 7 sheets
        logger.info("Creating Sheet 1: 주간현황 (Weekly Summary)...")
        self._create_sheet1_weekly_summary(dashboard, metrics, week_info)

        logger.info("Creating Sheet 2: 로드맵진척 (Roadmap Progress)...")
        self._create_sheet2_roadmap_progress(roadmap)

        logger.info("Creating Sheet 3: Q1작업상세 (Q1 Tasks Detail)...")
        self._create_sheet3_q1_tasks(q1_data)

        logger.info("Creating Sheet 4: 블로커추적 (Blockers)...")
        self._create_sheet4_blockers(blockers)

        logger.info("Creating Sheet 5: Lawson협의 (Lawson Coordination)...")
        self._create_sheet5_lawson_coordination(roadmap)

        logger.info("Creating Sheet 6: 마일스톤 (Milestones)...")
        self._create_sheet6_milestones(q1_data)

        logger.info("Creating Sheet 7: 플레이북진척 (Playbook Progress)...")
        self._create_sheet7_playbook_progress()

        # Generate filename
        if not output_filename:
            output_filename = self.config.reports['weekly']['filename_format'].format(
                week=week_info['formatted_week'],
                date=week_info['formatted_date'].replace('-', '')
            )

        output_path = self.config.get_output_path(output_filename)

        # Save
        self.save(output_path)

        logger.info(f"✅ Weekly report generated: {output_path}")
        return output_path

    def _create_sheet1_weekly_summary(self, dashboard, metrics, week_info):
        """Sheet 1: 주간현황 - Weekly summary with KPIs"""
        ws = self.add_sheet("주간현황", 0)

        row = 1

        # Title
        ws.merge_cells(f"A{row}:G{row}")
        title_cell = ws.cell(row=row, column=1)
        title_cell.value = f"Lawson StoreAgent 주간 점검 대시보드 - {week_info['formatted_week']}"
        self.style_manager.apply_header_style(title_cell)
        row += 1

        # Metadata
        ws.cell(row=row, column=1).value = f"작성일: {week_info['formatted_date']} | 작성자: 박재민"
        row += 2

        # 📊 핵심 지표
        ws.merge_cells(f"A{row}:G{row}")
        section_cell = ws.cell(row=row, column=1)
        section_cell.value = "📊 핵심 지표"
        self.style_manager.apply_subheader_style(section_cell)
        row += 1

        # Metrics table
        headers = ["지표", "목표", "현재", "진행률"]
        metric_data = [
            ["제안 수락률", "40%", "측정 중", "-"],
            ["Golden Case", "10개", "0개", "0%"],
            ["P0 작업 완료", f"{metrics.p0_total}개", f"{metrics.p0_completed}개", f"{metrics.p0_completion_rate:.0f}%"],
            ["P1 작업 완료", f"{metrics.p1_total}개", f"{metrics.p1_completed}개", f"{metrics.p1_completion_rate:.0f}%"],
        ]

        row = self.add_table(ws, headers, metric_data, row, 1)

        # ✅ 이번 주 완료 작업
        ws.merge_cells(f"A{row}:G{row}")
        section_cell = ws.cell(row=row, column=1)
        section_cell.value = "✅ 이번 주 완료 작업"
        self.style_manager.apply_subheader_style(section_cell)
        row += 1

        completed_tasks = [t for t in dashboard.all_tasks if t.status][:5]
        if completed_tasks:
            for task in completed_tasks:
                ws.cell(row=row, column=1).value = f"- {task.content}"
                row += 1
        else:
            ws.cell(row=row, column=1).value = "- (완료된 작업 없음)"
            row += 1
        row += 1

        # 🔄 다음 주 계획
        ws.merge_cells(f"A{row}:G{row}")
        section_cell = ws.cell(row=row, column=1)
        section_cell.value = "🔄 다음 주 계획"
        self.style_manager.apply_subheader_style(section_cell)
        row += 1

        pending_tasks = [t for t in dashboard.p0_tasks if not t.status][:5]
        if pending_tasks:
            for task in pending_tasks:
                ws.cell(row=row, column=1).value = f"- {task.content}"
                row += 1
        else:
            ws.cell(row=row, column=1).value = "- (예정된 작업 없음)"
            row += 1

        # Set column widths
        self.style_manager.set_column_widths(ws, {1: 30, 2: 15, 3: 15, 4: 15})
        self.set_sheet_properties(ws, freeze_panes=False, auto_filter=False)

    def _create_sheet2_roadmap_progress(self, roadmap):
        """Sheet 2: 로드맵진척 - 17 features progress"""
        ws = self.add_sheet("로드맵진척", 1)

        headers = ["ID", "기능명", "우선순위", "상태", "착수일", "완료일", "진행률"]

        # Convert features to table data
        data = []
        for feature in roadmap.features:
            data.append([
                feature.id,
                feature.name,
                feature.priority,
                feature.status,
                feature.start_date or "-",
                feature.completion_date or "-",
                f"{feature.progress}%" if feature.progress else "-"
            ])

        self.add_table(ws, headers, data, 1, 1)

        # Apply priority coloring
        for row_idx, feature in enumerate(roadmap.features, start=2):
            priority_cell = ws.cell(row=row_idx, column=3)
            self.style_manager.apply_priority_style(priority_cell, feature.priority)

            status_cell = ws.cell(row=row_idx, column=4)
            self.style_manager.apply_status_style(status_cell, feature.status)

        self.set_sheet_properties(ws)

    def _create_sheet3_q1_tasks(self, q1_data):
        """Sheet 3: Q1작업상세 - P0/P1 tasks breakdown"""
        ws = self.add_sheet("Q1작업상세", 2)

        headers = ["카테고리", "작업명", "우선순위", "담당", "마감일", "상태"]

        # P0 tasks
        p0_data = []
        for task in q1_data.p0_tasks:
            p0_data.append([
                task.category or "-",
                task.content,
                "P0",
                task.owner or "-",
                task.due_date.strftime("%m/%d") if task.due_date else "-",
                "완료" if task.status else "진행중"
            ])

        # P1 tasks
        p1_data = []
        for task in q1_data.p1_tasks:
            p1_data.append([
                task.category or "-",
                task.content,
                "P1",
                task.owner or "-",
                task.due_date.strftime("%m/%d") if task.due_date else "-",
                "완료" if task.status else "진행중"
            ])

        # Combine
        all_data = p0_data + p1_data
        self.add_table(ws, headers, all_data, 1, 1)

        # Apply coloring
        for row_idx in range(2, len(all_data) + 2):
            priority_cell = ws.cell(row=row_idx, column=3)
            priority = priority_cell.value
            if priority:
                self.style_manager.apply_priority_style(priority_cell, priority)

        self.set_sheet_properties(ws)

    def _create_sheet4_blockers(self, blocker_data):
        """Sheet 4: 블로커추적 - Blocker status"""
        ws = self.add_sheet("블로커추적", 3)

        headers = ["ID", "블로커명", "우선순위", "담당", "목표일", "영향범위", "상태"]

        data = []
        for blocker in blocker_data.all_blockers:
            data.append([
                blocker.id,
                blocker.title,
                blocker.priority,
                blocker.owner,
                blocker.target_date,
                blocker.impact,
                blocker.status
            ])

        self.add_table(ws, headers, data, 1, 1)

        # Apply priority coloring to priority column
        for row_idx, blocker in enumerate(blocker_data.all_blockers, start=2):
            priority_cell = ws.cell(row=row_idx, column=3)
            if blocker.priority == '높음':
                self.style_manager.apply_priority_style(priority_cell, 'P0')
            elif blocker.priority == '중간':
                self.style_manager.apply_priority_style(priority_cell, 'P1')
            else:
                self.style_manager.apply_priority_style(priority_cell, 'P2')

        self.set_sheet_properties(ws)

    def _create_sheet5_lawson_coordination(self, roadmap):
        """Sheet 5: Lawson협의 - Coordination items"""
        ws = self.add_sheet("Lawson협의", 4)

        headers = ["구분", "협의 내용", "우선순위", "담당", "기한", "상태"]

        # Sample coordination data (would come from roadmap/config)
        data = [
            ["긴급확인", "B4 체크리스트 시스템 존재 여부", "높음", "Lawson", "Q1 내", "대기"],
            ["긴급확인", "B6 클라우드 비용/보안 Go/No-Go", "높음", "Lawson", "Q2 내", "협의중"],
            ["데이터", "스냅샷 저장/활용 정책 확정", "중간", "Lawson", "Q1 내", "대기"],
            ["데이터", "날씨/스케줄 샘플 데이터셋", "중간", "Lawson", "Q1 내", "대기"],
            ["시스템", "POS 데이터 연동 범위 합의", "중간", "Lawson", "Q2 내", "예정"],
        ]

        self.add_table(ws, headers, data, 1, 1)
        self.set_sheet_properties(ws)

    def _create_sheet6_milestones(self, q1_data):
        """Sheet 6: 마일스톤 - Milestone tracking"""
        ws = self.add_sheet("마일스톤", 5)

        headers = ["날짜", "마일스톤", "목표", "상태", "리스크"]

        data = [
            ["2/7", "Demo", "날씨MCP, 리포트 통합", "진행중", "낮음"],
            ["2/15", "Q1 중간점검", "P0 50% 완료", "예정", "중간"],
            ["2/28", "스냅샷 완료", "리포트 통합", "예정", "중간"],
            ["3/15", "브리핑 기능 반영", "자동 발송 기능", "예정", "낮음"],
            ["3/31", "Q1 마감 리뷰", "P0 100% 완료", "예정", "중간"],
        ]

        self.add_table(ws, headers, data, 1, 1)
        self.set_sheet_properties(ws)

    def _create_sheet7_playbook_progress(self):
        """Sheet 7: 플레이북진척 - Playbook progress"""
        ws = self.add_sheet("플레이북진척", 6)

        headers = ["항목", "목표", "현재", "비율", "상태"]

        data = [
            ["Golden Case", "10개", "0개", "0%", "진행중"],
            ["Playbook", "2개", "2 Draft", "50%", "진행중"],
            ["D1 템플릿", "1개", "1개", "100%", "완료"],
            ["D2-D4 개발", "3개", "0개", "0%", "대기"],
            ["R1-R5 조사", "5개", "0개", "0%", "대기"],
        ]

        self.add_table(ws, headers, data, 1, 1)

        # Apply status coloring
        for row_idx in range(2, len(data) + 2):
            status_cell = ws.cell(row=row_idx, column=5)
            self.style_manager.apply_status_style(status_cell, status_cell.value or "")

        self.set_sheet_properties(ws)
