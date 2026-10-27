"""
Unit tests for FYP Recommender scoring and tagging logic.
"""

import pytest
from datetime import datetime, timezone, timedelta
from pipeline.fyp_recommender.scoring import (
    _count_keyword_hits,
    tag_degree,
    tag_domain,
    compute_industry_score,
)

def test_word_boundary_matching():
    # 'api' must NOT match inside 'capital', 'rapid', etc.
    text = "The capital of France is Paris. Rapid development."
    count, matches = _count_keyword_hits(text, ["api"])
    assert count == 0
    assert matches == []

    # 'api' MUST match isolated word
    text2 = "We built a REST API for the application."
    count2, matches2 = _count_keyword_hits(text2, ["api"])
    assert count2 == 1
    assert matches2 == ["api"]

    # 'test' must not match 'latest'
    text3 = "This is our latest release version."
    count3, _ = _count_keyword_hits(text3, ["test"])
    assert count3 == 0

def test_tag_degree_cse_dominant():
    cse_kw = ["arduino", "esp32", "microcontroller", "robotics"]
    cs_kw = ["react", "django", "nlp"]
    text = "An IoT project with Arduino and ESP32 microcontroller and robotics arm using django."
    # cse: 4 hits, cs: 1 hit
    res = tag_degree(text, cse_kw, cs_kw)
    assert res["degree_tag"] == "CSE"
    assert res["cse_hits"] == 4
    assert res["cs_hits"] == 1

def test_tag_degree_cs_dominant():
    cse_kw = ["arduino", "esp32"]
    cs_kw = ["react", "django", "nlp", "machine learning"]
    text = "A fullstack web platform built with React, Django, and Machine Learning models."
    res = tag_degree(text, cse_kw, cs_kw)
    assert res["degree_tag"] == "CS"
    assert res["cs_hits"] == 3
    assert res["cse_hits"] == 0

def test_tag_degree_general():
    cse_kw = ["arduino"]
    cs_kw = ["django"]
    text = "A study of computational theory and algorithmic graphs."
    res = tag_degree(text, cse_kw, cs_kw)
    assert res["degree_tag"] == "General"
    assert res["cs_hits"] == 0
    assert res["cse_hits"] == 0

def test_tag_domain_ai_ml():
    domains = {
        "ai_ml": ["machine learning", "deep learning", "yolo"],
        "iot_embedded": ["arduino", "sensor"],
    }
    text = "Object detection using Deep Learning and YOLO models."
    assert tag_domain(text, domains) == "ai_ml"

def test_compute_industry_score_max():
    now_iso = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    repo_data = {
        "stargazers_count": 25,
        "forks_count": 5,
        "license": {"key": "mit"},
        "pushed_at": now_iso,
    }
    # Readme with > 1500 chars and all signals
    readme = "Docker setup with detailed architecture and guide instructions.\n" * 40 + "Run pytest for testing\n" + "CI/CD with GitHub Actions\n" + "Deploy to AWS live demo\n" + "Postgres database authentication\n"
    signals_cfg = {
        "docker": ["docker"],
        "tests": ["pytest"],
        "ci_cd": ["github actions"],
        "deployment": ["deploy", "live demo"],
        "auth_db": ["authentication", "database"],
    }
    res = compute_industry_score(repo_data, readme, signals_cfg, threshold=6)
    assert res["industry_score"] == 10
    assert res["is_industry_ready"] is True
    assert res["industry_label"] == "Yes"

def test_compute_industry_score_low():
    old_iso = "2020-01-01T00:00:00Z"
    repo_data = {
        "stargazers_count": 1,
        "forks_count": 0,
        "license": None,
        "pushed_at": old_iso,
    }
    readme = "Simple hello world project without details."
    signals_cfg = {
        "docker": ["docker"],
        "tests": ["pytest"],
        "ci_cd": ["github actions"],
        "deployment": ["deploy"],
        "auth_db": ["database"],
    }
    res = compute_industry_score(repo_data, readme, signals_cfg, threshold=6)
    assert res["industry_score"] == 0
    assert res["is_industry_ready"] is False
    assert res["industry_label"] == "No"
