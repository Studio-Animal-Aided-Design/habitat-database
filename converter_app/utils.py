from __future__ import annotations

import re
import unicodedata


def slugify_de(value: str) -> str:
    if value is None:
        return ""
    text = str(value).strip().lower()
    text = (
        text.replace("ä", "ae")
        .replace("ö", "oe")
        .replace("ü", "ue")
        .replace("ß", "ss")
    )
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = re.sub(r"[^a-z0-9]+", "_", text)
    text = re.sub(r"_+", "_", text).strip("_")
    return text


def norm_col(value: str) -> str:
    return slugify_de(value)
