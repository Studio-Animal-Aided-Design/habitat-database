from __future__ import annotations

from dataclasses import dataclass, asdict, field
from typing import Any


@dataclass
class Issue:
    stage: str
    severity: str  # warning|error
    reason_code: str
    message: str
    file: str | None = None
    row: int | None = None
    details: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class StageResult:
    stage: str
    status: str  # success|warning|failed
    produced_files: list[str] = field(default_factory=list)
    row_counts: dict[str, int] = field(default_factory=dict)
    issues: list[Issue] = field(default_factory=list)
    blocking: bool = False

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["issues"] = [i.to_dict() for i in self.issues]
        return payload


@dataclass
class RunConfig:
    input_root: str
    output_root: str
    mode: str = "tolerant"
    locale: str = "de"
    use_project_defaults: bool = True

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class RunResult:
    config: RunConfig
    started_at: str
    finished_at: str | None = None
    overall_status: str = "running"
    stage_results: list[StageResult] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "config": self.config.to_dict(),
            "started_at": self.started_at,
            "finished_at": self.finished_at,
            "overall_status": self.overall_status,
            "stage_results": [r.to_dict() for r in self.stage_results],
        }
