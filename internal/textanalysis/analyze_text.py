
import json
import sys

import numpy as np
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import TfidfVectorizer


STOP_WORDS_ID = [
    "yang", "dan", "di", "ke", "dari", "untuk", "pada",
    "dengan", "karena", "ini", "itu", "ada", "tidak",
    "sudah", "belum", "akan", "dalam", "oleh", "saat",
    "agar", "atau", "juga", "serta", "maka", "dapat",
    "bisa", "telah", "tersebut", "mengalami", "terjadi",
    "aset", "barang", "unit", "buah", "buahnya",
]


def clean_text(value):
    if value is None:
        return ""
    return " ".join(str(value).strip().lower().split())


def build_group_name(keywords):
    if not keywords:
        return "Kelompok masalah umum"

    return "Kelompok: " + ", ".join(
        word.title() for word in keywords[:3]
    )


def main():
    request = json.load(sys.stdin)

    records = request.get("records", [])
    source = request.get("source", "all")
    requested_clusters = int(request.get("clusters", 3))

    records = [
        item for item in records
        if clean_text(item.get("title", "") + " " +
                      item.get("description", ""))
    ]

    if not records:
        print(json.dumps({
            "source": source,
            "total_reports": 0,
            "clusters_requested": requested_clusters,
            "groups": [],
        }, ensure_ascii=False))
        return

    texts = [
        clean_text(
            str(item.get("title", "")) + " " +
            str(item.get("description", ""))
        )
        for item in records
    ]

    vectorizer = TfidfVectorizer(
        stop_words=STOP_WORDS_ID,
        ngram_range=(1, 2),
        max_features=500,
        strip_accents="unicode",
        sublinear_tf=True,
    )

    try:
        matrix = vectorizer.fit_transform(texts)
    except ValueError:
        # Contoh: seluruh teks hanya berisi stop words.
        print(json.dumps({
            "source": source,
            "total_reports": len(records),
            "clusters_requested": requested_clusters,
            "groups": [{
                "cluster_id": 1,
                "name": "Kelompok masalah umum",
                "keywords": [],
                "report_count": len(records),
                "total_damaged_units": sum(
                    int(item.get("quantity", 0) or 0)
                    for item in records
                    if item.get("source") == "damage"
                ),
                "items": [
                    {
                        "id": item.get("id", ""),
                        "source": item.get("source", ""),
                        "title": item.get("title", ""),
                        "description": item.get("description", ""),
                        "quantity": int(item.get("quantity", 0) or 0),
                        "status": item.get("status", ""),
                        "created_at": item.get("created_at"),
                    }
                    for item in records
                ],
            }],
        }, ensure_ascii=False))
        return

    # Hindari meminta jumlah cluster melebihi jumlah teks unik.
    unique_text_count = len(set(texts))
    cluster_count = min(
        requested_clusters,
        len(records),
        unique_text_count,
    )
    cluster_count = max(1, cluster_count)

    model = KMeans(
        n_clusters=cluster_count,
        random_state=42,
        n_init=10,
    )

    labels = model.fit_predict(matrix)
    terms = vectorizer.get_feature_names_out()

    groups = []

    for cluster_id in sorted(set(labels.tolist())):
        indexes = np.where(labels == cluster_id)[0]
        cluster_matrix = matrix[indexes]

        # Cari kata kunci dominan pada kelompok.
        mean_scores = np.asarray(
            cluster_matrix.mean(axis=0)
        ).ravel()

        top_indexes = mean_scores.argsort()[::-1][:5]
        keywords = [
            str(terms[index])
            for index in top_indexes
            if mean_scores[index] > 0
        ]

        items = []
        total_damaged_units = 0

        for index in indexes:
            record = records[int(index)]
            quantity = int(record.get("quantity", 0) or 0)

            if record.get("source") == "damage":
                total_damaged_units += quantity

            items.append({
                "id": record.get("id", ""),
                "source": record.get("source", ""),
                "title": record.get("title", ""),
                "description": record.get("description", ""),
                "quantity": quantity,
                "status": record.get("status", ""),
                "created_at": record.get("created_at"),
            })

        groups.append({
            "cluster_id": int(cluster_id) + 1,
            "name": build_group_name(keywords),
            "keywords": keywords,
            "report_count": len(items),
            "total_damaged_units": total_damaged_units,
            "items": items,
        })

    groups.sort(
        key=lambda group: group["report_count"],
        reverse=True,
    )

    print(json.dumps({
        "source": source,
        "total_reports": len(records),
        "clusters_requested": requested_clusters,
        "groups": groups,
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
