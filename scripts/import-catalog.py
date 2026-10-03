"""Build the storefront catalog from a Shopee price export and reviewed brand map.

Usage: python scripts/import-catalog.py <normalized-csv> <classification-csv>
The source spreadsheet is never edited. Prices are stored in sen.
"""

from __future__ import annotations

import csv
import json
import re
import sys
from collections import defaultdict
from decimal import Decimal, InvalidOperation
from pathlib import Path


BRANDS = {
    "UDESIGN PROJECTS": "projects",
    "UDESIGN MOMENTS": "moments",
    "WINNIE CAKE TOPPER": "winnie",
}

# These rows need a real product option, a clearer category, or a reliable title
# before they can be offered in the public catalog. Keep their source rows intact.
HOLD_PRODUCT_IDS = {
    "23763534135",  # truncated listing title
    "25552568308",  # truncated listing title
    "25255664147",  # size options without units
    "52504948234",  # size options without units
    "55504564333",  # size options without units
    "26603580375",  # material/category unclear
    "28003580140",  # Chat Now is the only option
    "29054308863",  # Details is the only option
    "21254433444",  # Message Us is the only option
    "48259442627",  # duplicate listing with truncated title
    "41102622262",  # branded character theme needs review
    "18389075495",  # branded film theme needs review
    "4748183490",   # branded character theme needs review
}


def display_name(raw: str) -> str:
    """Remove Shopee-specific speed claims we cannot promise on this site."""
    name = re.sub(r"\[\s*ship\s+next\s+day\s*\]", " ", raw, flags=re.I)
    name = re.sub(r"ship\s+(?:next\s+day|today)", " ", name, flags=re.I)
    name = re.sub(r"next\s+day\s+(?:delivery|shipping)", " ", name, flags=re.I)
    name = re.sub(r"[♡❤️🎄✨]+", " ", name)
    name = re.sub(r"\s+", " ", name).strip(" -_|,.")
    return name


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def price_in_sen(value: str) -> int:
    try:
        amount = Decimal(value)
    except InvalidOperation as exc:
        raise ValueError(f"Invalid product price: {value!r}") from exc
    if amount <= 0 or amount.as_tuple().exponent < -2:
        raise ValueError(f"Invalid product price: {value!r}")
    return int(amount * 100)


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    rows = read_csv(Path(sys.argv[1]))
    classification = {row["Product ID"].strip(): row for row in read_csv(Path(sys.argv[2]))}
    grouped: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        grouped[row["Product ID"].strip()].append(row)

    products = []
    for product_id, options in grouped.items():
        decision = classification.get(product_id)
        if not decision or decision["Sellable"].strip().lower() != "yes" or product_id in HOLD_PRODUCT_IDS:
            continue
        brand = BRANDS.get(decision["Suggested brand"].strip())
        if not brand:
            raise ValueError(f"Missing brand for product {product_id}")
        category = decision["Suggested category"].strip()
        name = display_name(options[0]["Product Name"].strip())
        if not name or not category:
            raise ValueError(f"Missing name/category for product {product_id}")

        variants = []
        seen_keys: set[str] = set()
        for index, option in enumerate(options):
            variant_id = option["Variation ID"].strip() or str(index + 1)
            key = f"{product_id}:{variant_id}"
            if key in seen_keys:
                key = f"{key}:{index + 1}"
            seen_keys.add(key)
            stock = int(Decimal(option["Stock"].strip()))
            option_name = option["Variation Name"].strip() or "Standard"
            if option_name.lower() == "send us design":
                option_name = "Custom design"
            option_name = re.sub(r"^send\s+logo\s*,\s*", "", option_name, flags=re.I)
            variants.append({
                "id": key,
                "name": option_name,
                "priceSen": price_in_sen(option["Price"].strip()),
                "available": stock > 0,
            })

        if not any(variant["available"] for variant in variants):
            continue

        products.append({
            "id": product_id,
            "name": name,
            "brand": brand,
            "category": category,
            "variants": variants,
        })

    products.sort(key=lambda item: (item["brand"], item["category"], item["name"].casefold()))
    output = Path(__file__).resolve().parents[1] / "data" / "catalog.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(products, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Wrote {len(products)} products and {sum(len(p['variants']) for p in products)} options to {output}")


if __name__ == "__main__":
    main()
