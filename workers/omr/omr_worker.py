"""Leitor OMR determinístico para gabaritos de meia folha A4."""
from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np

try:
    import fitz
except ImportError:
    fitz = None


CHOICES = "ABCDE"
PX_PER_MM = 10
NORMALIZED_WIDTH = 1485
NORMALIZED_HEIGHT = 2100
EXPECTED_MARKERS = np.float32([[130, 130], [1355, 130], [1355, 1970], [130, 1970]])


@dataclass(frozen=True)
class OmrConfig:
    marker_min_area_ratio: float = float(os.getenv("OMR_MARKER_MIN_AREA_RATIO", "0.00015"))
    marker_max_area_ratio: float = float(os.getenv("OMR_MARKER_MAX_AREA_RATIO", "0.004"))
    marker_min_extent: float = float(os.getenv("OMR_MARKER_MIN_EXTENT", "0.68"))
    marker_aspect_tolerance: float = float(os.getenv("OMR_MARKER_ASPECT_TOLERANCE", "0.30"))
    marker_size_cv_max: float = float(os.getenv("OMR_MARKER_SIZE_CV_MAX", "0.45"))
    sheet_ratio_min: float = float(os.getenv("OMR_SHEET_RATIO_MIN", "0.54"))
    sheet_ratio_max: float = float(os.getenv("OMR_SHEET_RATIO_MAX", "0.80"))
    bubble_inner_radius_ratio: float = float(os.getenv("OMR_BUBBLE_INNER_RADIUS_RATIO", "0.58"))
    debug: bool = os.getenv("OMR_DEBUG", "false").lower() == "true"


class MarkerDetectionError(RuntimeError):
    pass


def processar_arquivo(input_path: Path, config: OmrConfig | None = None) -> dict:
    return processar_lote(input_path, config or OmrConfig())


def carregar_paginas(path: Path) -> list[np.ndarray]:
    if path.suffix.lower() == ".pdf":
        if fitz is None:
            raise RuntimeError("PyMuPDF não instalado")
        document = fitz.open(path)
        try:
            return [cv2.cvtColor(np.frombuffer(pix.samples, np.uint8).reshape(pix.height, pix.width, pix.n), cv2.COLOR_RGB2BGR)
                    for page in document for pix in [page.get_pixmap(dpi=300, alpha=False)]]
        finally:
            document.close()
    image = cv2.imread(str(path))
    if image is None:
        raise RuntimeError("Imagem ilegível")
    return [image]


def detectar_gabaritos(image: np.ndarray) -> list[np.ndarray]:
    """Gera candidatos sem assumir que a página inteira corresponde ao gabarito."""
    height, width = image.shape[:2]
    if width / max(height, 1) > 1.15:
        middle = width // 2
        return [image[:, :middle], image[:, middle:]]
    if height / max(width, 1) > 2.25:
        middle = height // 2
        return [image[:middle, :], image[middle:, :]]
    return [image]


def detectar_marcadores(image: np.ndarray, config: OmrConfig) -> list[dict]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    binary = cv2.threshold(cv2.GaussianBlur(gray, (5, 5), 0), 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
    contours, _ = cv2.findContours(binary, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    image_area = image.shape[0] * image.shape[1]
    markers = []
    for contour in contours:
        area = cv2.contourArea(contour)
        x, y, width, height = cv2.boundingRect(contour)
        if not config.marker_min_area_ratio * image_area <= area <= config.marker_max_area_ratio * image_area:
            continue
        aspect = width / max(height, 1)
        extent = area / max(width * height, 1)
        if abs(1 - aspect) > config.marker_aspect_tolerance or extent < config.marker_min_extent:
            continue
        markers.append({"point": (x + width / 2, y + height / 2), "area": area, "extent": extent, "aspect": aspect})
    return markers


def ordenar_marcadores(markers: list[dict], shape: tuple[int, ...]) -> np.ndarray:
    height, width = shape[:2]
    quadrants = [
        [m for m in markers if m["point"][0] < width * .40 and m["point"][1] < height * .40],
        [m for m in markers if m["point"][0] > width * .60 and m["point"][1] < height * .40],
        [m for m in markers if m["point"][0] > width * .60 and m["point"][1] > height * .60],
        [m for m in markers if m["point"][0] < width * .40 and m["point"][1] > height * .60],
    ]
    if any(not quadrant for quadrant in quadrants):
        raise MarkerDetectionError("ERRO_PARAMETRIZACAO: quatro marcadores não encontrados")
    expected = [(width * .0875, height * .062), (width * .9125, height * .062), (width * .9125, height * .938), (width * .0875, height * .938)]
    selected = [min(group, key=lambda marker: (marker["point"][0] - target[0]) ** 2 + (marker["point"][1] - target[1]) ** 2) for group, target in zip(quadrants, expected)]
    return np.float32([marker["point"] for marker in selected])


def validar_marcadores(points: np.ndarray, markers: list[dict], shape: tuple[int, ...], config: OmrConfig) -> float:
    height, width = shape[:2]
    selected_areas = []
    for point in points:
        selected_areas.append(min(markers, key=lambda marker: np.linalg.norm(np.array(marker["point"]) - point))["area"])
    coefficient = float(np.std(selected_areas) / max(np.mean(selected_areas), 1))
    top = np.linalg.norm(points[1] - points[0]); bottom = np.linalg.norm(points[2] - points[3])
    right = np.linalg.norm(points[2] - points[1]); left = np.linalg.norm(points[3] - points[0])
    ratio = ((top + bottom) / 2) / max((left + right) / 2, 1)
    polygon = points.reshape((-1, 1, 2)).astype(np.int32)
    if coefficient > config.marker_size_cv_max or not config.sheet_ratio_min <= ratio <= config.sheet_ratio_max or not cv2.isContourConvex(polygon):
        raise MarkerDetectionError("ERRO_PARAMETRIZACAO: geometria dos marcadores incoerente")
    coverage = ((top + bottom) / 2 / width + (left + right) / 2 / height) / 2
    return float(max(0, min(1, coverage * (1 - coefficient))))


def normalizar_gabarito(image: np.ndarray, points: np.ndarray) -> np.ndarray:
    matrix = cv2.getPerspectiveTransform(points, EXPECTED_MARKERS)
    return cv2.warpPerspective(image, matrix, (NORMALIZED_WIDTH, NORMALIZED_HEIGHT))


def detectar_qrcode(image: np.ndarray) -> dict | None:
    data, _, _ = cv2.QRCodeDetector().detectAndDecode(image)
    if not data:
        return None
    try:
        payload = json.loads(data)
        return payload if isinstance(payload, dict) else None
    except json.JSONDecodeError:
        return None


def calcular_preenchimento(binary: np.ndarray, center_x: int, center_y: int, radius: int) -> float:
    roi = binary[center_y - radius:center_y + radius + 1, center_x - radius:center_x + radius + 1]
    if roi.shape != (radius * 2 + 1, radius * 2 + 1):
        return 0.0
    yy, xx = np.ogrid[-radius:radius + 1, -radius:radius + 1]
    mask = (xx * xx + yy * yy) <= radius * radius
    return round(float(np.count_nonzero(roi[mask])) / max(np.count_nonzero(mask), 1), 4)


def ler_respostas(image: np.ndarray, config: OmrConfig, count: int = 20) -> list[dict]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    binary = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 31, 8)
    radius = round(2.2 * PX_PER_MM * config.bubble_inner_radius_ratio)
    answers = []
    for question in range(count):
        center_y = round((78 + question * 4.6) * PX_PER_MM)
        values = [{"choice": choice, "fill": calcular_preenchimento(binary, round((34 + index * 14) * PX_PER_MM), center_y, radius)} for index, choice in enumerate(CHOICES)]
        answers.append({"question": question + 1, "fills": values})
    return answers


def processar_candidato(image: np.ndarray, page_number: int, candidate_number: int, config: OmrConfig) -> dict:
    markers = detectar_marcadores(image, config)
    points = ordenar_marcadores(markers, image.shape)
    marker_confidence = validar_marcadores(points, markers, image.shape, config)
    normalized = normalizar_gabarito(image, points)
    payload = detectar_qrcode(normalized)
    quality = {"alignment": round(marker_confidence, 4), "markerConfidence": round(marker_confidence, 4), "pageNumber": page_number, "candidateNumber": candidate_number}
    if config.debug:
        quality["markersNorm"] = [[round(float(x / image.shape[1]), 4), round(float(y / image.shape[0]), 4)] for x, y in points]
    return {"pageNumber": page_number, "qrPayload": payload, "quality": quality, "answers": ler_respostas(normalized, config)}


def processar_lote(input_path: Path, config: OmrConfig) -> dict:
    sheets, errors, seen = [], [], set()
    for page_number, page in enumerate(carregar_paginas(input_path), 1):
        page_results = []
        last_error = "ERRO_PARAMETRIZACAO"
        candidates = detectar_gabaritos(page)
        for candidate_number, candidate in enumerate(candidates, 1):
            try:
                result = processar_candidato(candidate, page_number, candidate_number, config)
                sheet_id = (result.get("qrPayload") or {}).get("sid")
                dedupe_key = sheet_id or f"{page_number}:{candidate_number}:{result['quality']['alignment']}"
                if dedupe_key not in seen:
                    seen.add(dedupe_key); page_results.append(result)
            except (MarkerDetectionError, RuntimeError) as error:
                last_error = str(error)
        if not page_results:
            for rotation_number, candidate in enumerate((cv2.rotate(page, cv2.ROTATE_90_CLOCKWISE), cv2.rotate(page, cv2.ROTATE_90_COUNTERCLOCKWISE)), len(candidates) + 1):
                try:
                    result = processar_candidato(candidate, page_number, rotation_number, config)
                    sheet_id = (result.get("qrPayload") or {}).get("sid")
                    dedupe_key = sheet_id or f"{page_number}:{rotation_number}:{result['quality']['alignment']}"
                    if dedupe_key not in seen:
                        seen.add(dedupe_key); page_results.append(result)
                    break
                except (MarkerDetectionError, RuntimeError) as error:
                    last_error = str(error)
        if page_results:
            sheets.extend(page_results)
        else:
            errors.append({"pageNumber": page_number, "status": "ERRO_PARAMETRIZACAO", "message": last_error[:300]})
    return {"sheets": sheets, "errors": errors, "summary": {"totalDetected": len(sheets) + len(errors), "success": len(sheets), "errors": len(errors)}}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--template", required=True)
    args = parser.parse_args()
    print(json.dumps(processar_arquivo(Path(args.input)), ensure_ascii=False, allow_nan=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(2)
