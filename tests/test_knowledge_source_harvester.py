import json
import tempfile
import unittest
from pathlib import Path

from tools.knowledge_source_harvester import (
    build_openalex_url,
    enrich_failed_record,
    extract_doi,
    load_manifest,
    retry_failed_sources,
    write_manifest,
)


class KnowledgeSourceHarvesterTests(unittest.TestCase):
    def test_extract_doi_from_supported_urls(self) -> None:
        self.assertEqual(extract_doi("https://pubs.acs.org/doi/10.1021/ac070609j"), "10.1021/ac070609j")
        self.assertEqual(extract_doi("https://pubs.acs.org/doi/abs/10.1021/acssensors.0c00883"), "10.1021/acssensors.0c00883")
        self.assertEqual(extract_doi("https://doi.org/10.1021/nl052163x"), "10.1021/nl052163x")
        self.assertEqual(
            extract_doi("https://pubs.acs.org/doi/suppl/10.1021/acssensors.0c00883/suppl_file/se0c00883_si_001.pdf"),
            "10.1021/acssensors.0c00883",
        )

    def test_build_openalex_url_wraps_doi(self) -> None:
        self.assertEqual(
            build_openalex_url("10.1021/ac070609j"),
            "https://api.openalex.org/works/https://doi.org/10.1021/ac070609j",
        )

    def test_load_manifest_reads_csv_rows(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            manifest_path = Path(temp_dir) / "manifest.csv"
            manifest_path.write_text(
                "title,source_type,url,local_file,status,notes\n"
                "Example,html,https://doi.org/10.1021/ac070609j,,download_failed,test\n",
                encoding="utf-8",
            )

            rows = load_manifest(manifest_path)

            self.assertEqual(len(rows), 1)
            self.assertEqual(rows[0]["title"], "Example")

    def test_enrich_failed_record_saves_openalex_metadata(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            record = {
                "title": "Example",
                "source_type": "html",
                "url": "https://pubs.acs.org/doi/10.1021/ac070609j",
                "local_file": "",
                "status": "download_failed",
                "notes": "test",
            }

            payload = {
                "id": "https://openalex.org/W2038052244",
                "doi": "https://doi.org/10.1021/ac070609j",
                "open_access": {"oa_url": None},
                "primary_location": {"landing_page_url": "https://example.org/landing", "pdf_url": None},
            }

            def fake_fetch_json(url: str) -> dict:
                self.assertIn("10.1021/ac070609j", url)
                return payload

            updated = enrich_failed_record(record, root, fetch_json=fake_fetch_json)

            self.assertEqual(updated["status"], "metadata_only")
            self.assertTrue(updated["openalex_metadata_file"].endswith(".json"))
            metadata_path = Path(updated["openalex_metadata_file"])
            self.assertTrue(metadata_path.exists())
            saved = json.loads(metadata_path.read_text(encoding="utf-8"))
            self.assertEqual(saved["id"], payload["id"])
            self.assertEqual(updated["openalex_landing_url"], "https://example.org/landing")

    def test_write_manifest_accepts_new_fields_from_enrichment(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            manifest_path = Path(temp_dir) / "manifest.csv"
            rows = [
                {
                    "title": "Example",
                    "source_type": "html",
                    "url": "https://doi.org/10.1021/ac070609j",
                    "local_file": "",
                    "status": "metadata_only",
                    "notes": "test",
                    "openalex_metadata_file": "meta.json",
                    "openalex_landing_url": "https://example.org",
                    "openalex_pdf_url": "",
                }
            ]

            write_manifest(manifest_path, rows)

            content = manifest_path.read_text(encoding="utf-8-sig")
            self.assertIn("openalex_metadata_file", content)
            self.assertIn("https://example.org", content)

    def test_retry_failed_sources_retries_prefixed_failure_status(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            manifest_path = Path(temp_dir) / "manifest.csv"
            manifest_path.write_text(
                "title,source_type,url,local_file,status,notes\n"
                "Example,pdf,https://pubs.acs.org/doi/suppl/10.1021/acssensors.0c00883/suppl_file/se0c00883_si_001.pdf,,download_failed_openalex,test\n",
                encoding="utf-8",
            )

            def fake_fetch_json(_: str) -> dict:
                return {
                    "id": "https://openalex.org/W1",
                    "doi": "https://doi.org/10.1021/acssensors.0c00883",
                    "open_access": {"oa_url": None},
                    "primary_location": {"landing_page_url": "https://example.org/landing", "pdf_url": None},
                }

            changed = retry_failed_sources(manifest_path, fetch_json_func=fake_fetch_json)

            self.assertEqual(changed, 1)


if __name__ == "__main__":
    unittest.main()
