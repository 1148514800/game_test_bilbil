"""
将美术提供的非标准玩家图片处理成 Phaser 可直接加载的标准 Sprite Sheet。

处理原则：
1. 不按整张图片平均分格，而是先用深色像素投影找出真实的行、列中心。
2. 只移除与画布边缘相连的近白背景，尽量保留衣服和鞋子内部的白色区域。
3. 每一帧都缩放到相同人物高度，并按人物可见区域水平居中、脚底对齐。
4. 待机和行走共用完全相同的帧宽、帧高和脚底基准线。

运行方式：在项目根目录执行 `python tools/process_player_sprites.py`。
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = PROJECT_ROOT / "source/assets/images/characters/player"
OUTPUT_DIR = PROJECT_ROOT / "public/assets/images/characters/player"

IDLE_SOURCE = SOURCE_DIR / "player_idle_original.png"
WALK_SOURCE = SOURCE_DIR / "player_walk_original.png"

# 人物可见区域统一为 160px 高，帧底部额外留 16px，防止脚部贴边。
TARGET_CHARACTER_HEIGHT = 160
FRAME_HEIGHT = 192
FOOT_BASELINE_Y = 176

# 深色投影只用于寻找人物，不直接决定透明度；240 可排除近白背景。
FOREGROUND_DETECTION_THRESHOLD = 240


def find_projection_runs(projection: np.ndarray, minimum_count: int) -> list[tuple[int, int]]:
    """返回投影中连续超过阈值的区间，区间采用左闭右开坐标。"""
    active = projection > minimum_count
    changes = np.diff(np.concatenate(([False], active, [False])).astype(np.int8))
    starts = np.where(changes == 1)[0]
    ends = np.where(changes == -1)[0]
    return list(zip(starts.tolist(), ends.tolist()))


def detect_grid(image: Image.Image, expected_rows: int, expected_columns: int) -> tuple[list[tuple[int, int]], list[tuple[int, int]]]:
    """通过像素投影检测人物行列，而不是假设原图已经等宽等高切分。"""
    rgb = np.asarray(image.convert("RGB"))
    foreground = np.min(rgb, axis=2) < FOREGROUND_DETECTION_THRESHOLD

    row_runs = find_projection_runs(foreground.sum(axis=1), minimum_count=10)
    column_runs = find_projection_runs(foreground.sum(axis=0), minimum_count=3)

    if len(row_runs) != expected_rows or len(column_runs) != expected_columns:
        raise RuntimeError(
            f"无法识别标准人物网格：期望 {expected_rows} 行 × {expected_columns} 列，"
            f"实际检测到 {len(row_runs)} 行 × {len(column_runs)} 列。"
        )

    return row_runs, column_runs


def runs_to_cell_bounds(runs: list[tuple[int, int]], axis_length: int) -> list[tuple[int, int]]:
    """用相邻人物中心的中点作为搜索单元边界，确保每格只包含一个人物。"""
    centers = [(start + end) / 2 for start, end in runs]
    boundaries = [0]
    boundaries.extend(round((left + right) / 2) for left, right in zip(centers, centers[1:]))
    boundaries.append(axis_length)
    return list(zip(boundaries[:-1], boundaries[1:]))


def remove_connected_white_background(cell: Image.Image) -> Image.Image:
    """
    去掉与单元格边缘相连的近白背景。

    直接把所有白色像素设为透明会挖空白色 T 恤和鞋子；这里先从四角洪水填充，
    只有能连通到外部的近白像素才会参与透明化，并对抗锯齿边缘生成柔和 Alpha。
    """
    rgb_image = cell.convert("RGB")
    marked = rgb_image.copy()
    marker = (1, 2, 3)
    draw = ImageDraw.Draw(marked)

    width, height = marked.size
    for seed in ((0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1)):
        ImageDraw.floodfill(marked, seed, marker, thresh=40)

    rgb = np.asarray(rgb_image).copy()
    marked_array = np.asarray(marked)
    exterior = np.all(marked_array == marker, axis=2)
    minimum_channel = np.min(rgb, axis=2).astype(np.float32)

    alpha = np.full((height, width), 255, dtype=np.uint8)
    # 250 以上完全透明，215 以下完全不透明，中间区域形成平滑抗锯齿。
    exterior_coverage = np.clip((250.0 - minimum_channel) / 35.0, 0.0, 1.0)
    alpha[exterior] = np.round(exterior_coverage[exterior] * 255).astype(np.uint8)
    alpha[exterior & (minimum_channel >= 250)] = 0

    rgba = np.dstack((rgb, alpha))
    rgba[alpha == 0, :3] = 0
    return Image.fromarray(rgba, mode="RGBA")


def get_visible_bbox(image: Image.Image, alpha_threshold: int = 12) -> tuple[int, int, int, int]:
    """取得真正可见人物的包围盒，忽略极弱的背景噪点。"""
    alpha = np.asarray(image.getchannel("A"))
    ys, xs = np.where(alpha > alpha_threshold)
    if len(xs) == 0:
        raise RuntimeError("检测到空白动画帧，请检查原始素材。")
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def extract_frames(source: Path, expected_rows: int, expected_columns: int) -> list[list[Image.Image]]:
    """按检测到的真实人物中心提取所有帧，并保留固定的方向行顺序。"""
    image = Image.open(source).convert("RGB")
    row_runs, column_runs = detect_grid(image, expected_rows, expected_columns)
    row_cells = runs_to_cell_bounds(row_runs, image.height)
    column_cells = runs_to_cell_bounds(column_runs, image.width)

    frames: list[list[Image.Image]] = []
    for y_start, y_end in row_cells:
        row: list[Image.Image] = []
        for x_start, x_end in column_cells:
            cell = image.crop((x_start, y_start, x_end, y_end))
            transparent_cell = remove_connected_white_background(cell)
            bbox = get_visible_bbox(transparent_cell)

            # 在人物周围保留少量透明边缘，避免缩放时裁掉抗锯齿像素。
            padding = 4
            crop_box = (
                max(0, bbox[0] - padding),
                max(0, bbox[1] - padding),
                min(transparent_cell.width, bbox[2] + padding),
                min(transparent_cell.height, bbox[3] + padding),
            )
            row.append(transparent_cell.crop(crop_box))
        frames.append(row)
    return frames


def normalize_frame(frame: Image.Image) -> Image.Image:
    """把单帧人物缩放到统一高度；返回的仍是紧凑透明图，不含最终帧画布。"""
    bbox = get_visible_bbox(frame)
    visible_height = bbox[3] - bbox[1]
    scale = TARGET_CHARACTER_HEIGHT / visible_height
    resized_size = (
        max(1, round(frame.width * scale)),
        max(1, round(frame.height * scale)),
    )
    return frame.resize(resized_size, Image.Resampling.LANCZOS)


def calculate_frame_width(all_frames: list[Image.Image]) -> int:
    """根据最宽动作自动计算帧宽，并向上取 16 的倍数，禁止裁切斜向跑步姿势。"""
    widest_visible_frame = 0
    for frame in all_frames:
        bbox = get_visible_bbox(frame)
        widest_visible_frame = max(widest_visible_frame, bbox[2] - bbox[0])
    return max(128, math.ceil((widest_visible_frame + 16) / 16) * 16)


def place_on_standard_canvas(frame: Image.Image, frame_width: int) -> Image.Image:
    """将人物水平居中，并令所有帧的可见脚底严格落在同一 Y 基准线上。"""
    bbox = get_visible_bbox(frame)
    visible_center_x = (bbox[0] + bbox[2]) / 2
    paste_x = round(frame_width / 2 - visible_center_x)
    paste_y = FOOT_BASELINE_Y - bbox[3]

    canvas = Image.new("RGBA", (frame_width, FRAME_HEIGHT), (0, 0, 0, 0))
    canvas.alpha_composite(frame, (paste_x, paste_y))
    return canvas


def build_sheet(frames: list[list[Image.Image]], frame_width: int) -> Image.Image:
    """按原始方向行顺序组装 Sprite Sheet，不生成额外的右侧方向图片。"""
    rows = len(frames)
    columns = len(frames[0])
    sheet = Image.new("RGBA", (frame_width * columns, FRAME_HEIGHT * rows), (0, 0, 0, 0))
    for row_index, row in enumerate(frames):
        for column_index, frame in enumerate(row):
            standardized = place_on_standard_canvas(frame, frame_width)
            sheet.alpha_composite(
                standardized,
                (column_index * frame_width, row_index * FRAME_HEIGHT),
            )
    return sheet


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    idle_frames = extract_frames(IDLE_SOURCE, expected_rows=5, expected_columns=1)
    walk_frames = extract_frames(WALK_SOURCE, expected_rows=5, expected_columns=8)

    normalized_idle = [[normalize_frame(frame) for frame in row] for row in idle_frames]
    normalized_walk = [[normalize_frame(frame) for frame in row] for row in walk_frames]
    all_normalized_frames = [frame for row in normalized_idle + normalized_walk for frame in row]
    frame_width = calculate_frame_width(all_normalized_frames)

    idle_sheet = build_sheet(normalized_idle, frame_width)
    walk_sheet = build_sheet(normalized_walk, frame_width)

    idle_output = OUTPUT_DIR / "player_idle_sheet.png"
    walk_output = OUTPUT_DIR / "player_walk_sheet.png"
    metadata_output = OUTPUT_DIR / "player_sheet_metadata.json"

    idle_sheet.save(idle_output, optimize=True)
    walk_sheet.save(walk_output, optimize=True)

    metadata = {
        "frameWidth": frame_width,
        "frameHeight": FRAME_HEIGHT,
        "characterHeight": TARGET_CHARACTER_HEIGHT,
        "footBaselineY": FOOT_BASELINE_Y,
        "idle": {"rows": 5, "columns": 1, "sheetSize": list(idle_sheet.size)},
        "walk": {"rows": 5, "columns": 8, "sheetSize": list(walk_sheet.size)},
        "directionRows": ["down", "down-left", "left", "up-left", "up"],
    }
    metadata_output.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")

    print(json.dumps(metadata, ensure_ascii=False, indent=2))
    print(f"已生成：{idle_output.relative_to(PROJECT_ROOT)}")
    print(f"已生成：{walk_output.relative_to(PROJECT_ROOT)}")


if __name__ == "__main__":
    main()
