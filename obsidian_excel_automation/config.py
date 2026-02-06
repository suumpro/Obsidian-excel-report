"""
Configuration management for Obsidian Excel Automation
"""

import os
import yaml
from pathlib import Path
from typing import Dict, Any, Optional
from dataclasses import dataclass, field


@dataclass
class Config:
    """Configuration data class"""
    vault_path: str
    base_path: str
    output_dir: str
    sources: Dict[str, str]
    reports: Dict[str, Dict[str, Any]]
    styling: Dict[str, Any]
    advanced: Dict[str, Any] = field(default_factory=dict)

    def get_full_path(self, source_key: str) -> Path:
        """Get full path to a source file"""
        relative_path = self.sources.get(source_key)
        if not relative_path:
            raise ValueError(f"Source key '{source_key}' not found in configuration")

        return Path(self.vault_path) / self.base_path / relative_path

    def get_output_path(self, filename: str) -> Path:
        """Get full output path for a file"""
        if self.output_dir.startswith("/"):
            # Absolute path
            return Path(self.output_dir) / filename
        else:
            # Relative to vault
            return Path(self.vault_path) / self.output_dir / filename


class ConfigManager:
    """Manages loading and saving configuration"""

    DEFAULT_CONFIG_PATH = Path.home() / ".obsidian_excel_config.yaml"

    @classmethod
    def load(cls, config_path: Optional[Path] = None) -> Config:
        """Load configuration from YAML file"""
        path = config_path or cls.DEFAULT_CONFIG_PATH

        if not path.exists():
            raise FileNotFoundError(
                f"Configuration file not found at {path}. "
                f"Run 'obsidian-excel init' to create one."
            )

        with open(path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)

        return Config(
            vault_path=data["vault_path"],
            base_path=data["base_path"],
            output_dir=data["output_dir"],
            sources=data["sources"],
            reports=data["reports"],
            styling=data["styling"],
            advanced=data.get("advanced", {})
        )

    @classmethod
    def save(cls, config: Config, config_path: Optional[Path] = None):
        """Save configuration to YAML file"""
        path = config_path or cls.DEFAULT_CONFIG_PATH

        data = {
            "vault_path": config.vault_path,
            "base_path": config.base_path,
            "output_dir": config.output_dir,
            "sources": config.sources,
            "reports": config.reports,
            "styling": config.styling,
            "advanced": config.advanced,
        }

        with open(path, "w", encoding="utf-8") as f:
            yaml.dump(data, f, default_flow_style=False, allow_unicode=True, sort_keys=False)

    @classmethod
    def init(cls, vault_path: str, base_path: str = "02. Area/03. Work/STOREAGENT") -> Config:
        """Initialize a new configuration with defaults"""
        config = Config(
            vault_path=vault_path,
            base_path=base_path,
            output_dir=f"{base_path}/05_Roadmap/Excel",
            sources={
                "dashboard": "00_Dashboard/_PM Dashboard.md",
                "q1_status": "00_Dashboard/2026_Q1_Status.md",
                "q2_status": "00_Dashboard/2026_Q2_Status.md",
                "q3_status": "00_Dashboard/2026_Q3_Status.md",
                "q4_status": "00_Dashboard/2026_Q4_Status.md",
                "blockers": "00_Dashboard/Blockers_Tracker.md",
                "roadmap": "05_Roadmap/Lawson_2026_로드맵_관리.md",
                "betting": "02_Implementation/Betting/2026_Q1_Betting.md",
                "features_dir": "02_Implementation/Features",
                "playbook": "../../01. Project/PRJ_2026_플레이북/01_Strategic/KPIs/2026_H1_Goals.md",
            },
            reports={
                "weekly": {
                    "enabled": True,
                    "filename_format": "Lawson_Weekly_Report_W{week}_{date}.xlsx",
                    "sheets": ["주간현황", "로드맵진척", "Q1작업상세", "블로커추적", "Lawson협의", "마일스톤", "플레이북진척"],
                },
                "quarterly": {
                    "enabled": True,
                    "filename_format": "STOREAGENT_Q{quarter}_Status_{date}.xlsx",
                    "sheets": ["Overview", "P0_Tasks", "P1_Tasks", "Progress_Charts"],
                },
                "features": {
                    "enabled": True,
                    "filename_format": "STOREAGENT_Features_{date}.xlsx",
                    "sheets": ["All_Features", "By_Priority", "By_Cycle"],
                },
                "blockers": {
                    "enabled": True,
                    "filename_format": "STOREAGENT_Blockers_{date}.xlsx",
                    "sheets": ["Active_Blockers", "Blocker_History"],
                },
            },
            styling={
                "header_color": "4472C4",
                "subheader_color": "D9E1F2",
                "priority_colors": {
                    "P0": "FFC7CE",
                    "P1": "FFEB9C",
                    "P2": "C6EFCE",
                },
                "status_colors": {
                    "completed": "C6EFCE",
                    "in_progress": "FFEB9C",
                    "pending": "FFC7CE",
                },
            },
            advanced={
                "week_start_day": 1,  # Monday
                "date_format": "%Y-%m-%d",
                "debug": False,
                "log_level": "INFO",
            },
        )

        cls.save(config)
        return config

    @classmethod
    def update(cls, key: str, value: Any, config_path: Optional[Path] = None):
        """Update a specific configuration value"""
        config = cls.load(config_path)

        # Handle nested keys (e.g., "styling.header_color")
        keys = key.split(".")
        obj = config.__dict__

        for k in keys[:-1]:
            if k not in obj:
                obj[k] = {}
            obj = obj[k]

        obj[keys[-1]] = value

        cls.save(config, config_path)
