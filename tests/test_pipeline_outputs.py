"""Minimal end-to-end sanity tests against pipeline_output.json (real, non-fabricated results)."""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "ml-service", "app", "models", "pipeline_output.json")

def load():
    with open(PATH) as f:
        return json.load(f)

def test_model_evaluation_present_and_reasonable():
    d = load()
    for m in ("XGBoost", "RandomForest"):
        ev = d["model_evaluation"][m]
        assert ev["R2"] > 0.5, f"{m} R2 too low: {ev['R2']}"
        assert ev["MAE"] > 0

def test_chronological_split_no_shuffle():
    d = load()
    split = d["model_evaluation"]["split"]
    assert split["method"] == "chronological (no shuffling)"

def test_behaviour_clusters_exist():
    d = load()
    assert len(d["behaviour_patterns"]) > 0
    assert len(set(b["cluster"] for b in d["behaviour_patterns"])) >= 2

def test_forecasts_cover_all_horizons():
    d = load()
    horizons = set(f["horizon"] for f in d["forecasts"])
    assert horizons == {"next_1h", "next_6h", "tomorrow", "next_weekend"}

def test_recommendations_have_reason_and_label():
    d = load()
    for r in d["recommendations"]:
        assert r["reason"]
        assert r["label"] == "AI-Generated Recommendation"

def test_festival_mode_labeled_scenario():
    d = load()
    for name, obj in d["festival_forecasts"].items():
        assert obj["label"] == "Scenario / Demo Forecast"

def test_data_sources_labeled():
    d = load()
    assert d["meta"]["primary_dataset_type"] == "REAL/PUBLIC"

if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn()
            print(f"PASS {name}")
