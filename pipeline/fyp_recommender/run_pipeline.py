"""
CLI entry point for running the FYP Recommender collection pipeline.
Supports --test mode (collects 15 repos for verification) or --full mode.
"""

import sys
import argparse
from pathlib import Path
from pipeline.fyp_recommender.collector import FYPCollector
from pipeline.fyp_recommender.storage import save_to_json, save_to_csv

def main():
    parser = argparse.ArgumentParser(description="FYP Recommender Pipeline")
    parser.add_argument("--test", action="store_true", help="Run in test mode with max 15 repositories")
    parser.add_argument("--max", type=int, default=None, help="Maximum repositories to collect")
    args = parser.parse_args()

    max_count = 15 if args.test else args.max

    print("==================================================")
    print("   EduCompass FYP Recommender Pipeline")
    print(f"   Mode: {'TEST (Max 15 repos)' if args.test else ('CUSTOM (Max ' + str(max_count) + ')' if max_count else 'FULL COLLECTION')}")
    print("==================================================")

    collector = FYPCollector()
    results = collector.collect(max_total=max_count)

    json_path = save_to_json(results)
    csv_path = save_to_csv(results)

    print(f"\n[OK] Pipeline complete! Saved {len(results)} records.")
    print(f"  JSON Cache: {json_path}")
    print(f"  CSV Export: {csv_path}")

    # Summary statistics
    degrees = {}
    domains = {}
    industry = {"Yes": 0, "No": 0}

    for r in results:
        deg = r.get("degree_tag", "Unknown")
        degrees[deg] = degrees.get(deg, 0) + 1

        dom = r.get("domain", "Unknown")
        domains[dom] = domains.get(dom, 0) + 1

        lbl = r.get("industry_label", "No")
        industry[lbl] = industry.get(lbl, 0) + 1

    print("\n--- Summary Breakdown ---")
    print(f"Degree Tags: {degrees}")
    print(f"Domains: {domains}")
    print(f"Industry Ready (Score >= 6): {industry}")

    if results:
        print("\n--- Sample Record ---")
        sample = results[0]
        print(f"Title: {sample['full_name']}")
        print(f"URL: {sample['html_url']}")
        print(f"Stars: {sample['stars']}, Forks: {sample['forks']}")
        print(f"Degree: {sample['degree_tag']} (CS hits: {sample['cs_hits']}, CSE hits: {sample['cse_hits']})")
        print(f"Domain: {sample['domain']}")
        print(f"Industry Score: {sample['industry_score']}/10 (Ready: {sample['industry_label']})")
        print(f"Active Signals: {[k for k, v in sample['signals'].items() if v]}")

if __name__ == "__main__":
    main()
