import importlib.util
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
APP_PATH = ROOT / "app.py"


def load_app_module(tmp_path):
    spec = importlib.util.spec_from_file_location("cover_creator_app_test", APP_PATH)
    app = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(app)
    app.ROOT = tmp_path
    app.UPLOAD_ROOT = tmp_path / "image" / "uploads"
    app.ASSET_INDEX_PATH = app.UPLOAD_ROOT / "assets-index.json"
    return app


class AssetApiTests(unittest.TestCase):
    def setUp(self):
        import tempfile

        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        self.app = load_app_module(self.root)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_asset_index_and_cleanup(self):
        keep_asset = self.app.save_upload("奖杯.png", b"keep", "assets")
        stale_asset = self.app.save_upload("旧素材.jpg", b"stale", "assets")

        index = self.app.write_asset_index()
        self.assertEqual({asset["src"] for asset in index}, {keep_asset["src"], stale_asset["src"]})
        self.assertTrue(json.loads(self.app.ASSET_INDEX_PATH.read_text(encoding="utf-8"))["assets"])

        removed = self.app.cleanup_uploads({keep_asset["src"]})
        self.assertEqual(removed, [stale_asset["src"]])
        self.assertTrue((self.root / keep_asset["src"]).exists())
        self.assertFalse((self.root / stale_asset["src"]).exists())

    def test_upload_path_protection(self):
        asset = self.app.save_upload("../危险.svg", b"<svg></svg>", "bad bucket!")
        resolved = self.app.resolve_upload_src(asset["src"])

        self.assertTrue(resolved.exists())
        resolved.relative_to(self.app.UPLOAD_ROOT.resolve())

        for src in ("", "app.py", "../app.py", "image/uploads/assets-index.json"):
            with self.subTest(src=src):
                with self.assertRaises(ValueError):
                    self.app.resolve_upload_src(src)


if __name__ == "__main__":
    unittest.main()
