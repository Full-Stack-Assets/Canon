"import importlib.util
import unittest
from pathlib import Path


SCRIPT = Path(__file__).parents[1] / "scripts" / "validate_reference_record.py"
SPEC = importlib.util.spec_from_file_location("validate_reference_record", SCRIPT)
assert SPEC and SPEC.loader
VALIDATOR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(VALIDATOR)


def record(**overrides):
    candidate = {
        "Item ID": "OUT-001-ITEM-02",
        "Sourcing Classification": "Exact Model",
        "Selected Visual Reference URL": "https://brand.example/products/model-blue",
        "Direct Image URL": "https://images.brand.example/model-blue.jpg",
        "Match Class": "official_exact",
        "Reference Status": "Verified",
        "Review Notes": "Official page confirms model, style code, and blue colorway.",
    }
    candidate.update(overrides)
    return candidate


class ValidateReferenceRecordTests(unittest.TestCase):
    def test_accepts_official_retailer_and_archive_classes(self):
        for match_class in sorted(VALIDATOR.MATCH_CLASSES):
            with self.subTest(match_class=match_class):
                self.assertEqual([], VALIDATOR.validate_record(record(**{"Match Class": match_class}), 1))

    def test_accepts_optional_blank_direct_url(self):
        self.assertEqual([], VALIDATOR.validate_record(record(**{"Direct Image URL": ""}), 1))

    def test_accepts_manual_generic_record_with_blank_reference_fields(self):
        manual = record(
            **{
                "Sourcing Classification": "Generic/Unbranded",
                "Selected Visual Reference URL": "",
                "Direct Image URL": "",
                "Match Class": "",
                "Reference Status": "Manual Only / Omitted",
                "Review Notes": "Generic item excluded from automated sourcing.",
            }
        )
        self.assertEqual([], VALIDATOR.validate_record(manual, 1))

    def test_rejects_google_result_as_landing_page(self):
        errors = VALIDATOR.validate_record(
            record(**{"Selected Visual Reference URL": "https://www.google.com/search?tbm=isch&q=model"}),
            1,
        )
        self.assertTrue(any("search" in error for error in errors))

    def test_rejects_direct_image_as_selected_landing_page(self):
        errors = VALIDATOR.validate_record(
            record(**{"Selected Visual Reference URL": "https://cdn.retailer.example/model.jpg"}),
            1,
        )
        self.assertTrue(any("landing page" in error for error in errors))

    def test_rejects_data_direct_url_and_unknown_class(self):
        errors = VALIDATOR.validate_record(
            record(**{"Direct Image URL": "data:image/png;base64,abc", "Match Class": "looks_close"}),
            1,
        )
        self.assertEqual(2, len(errors))

    def test_rejects_manual_record_with_placeholder_url(self):
        errors = VALIDATOR.validate_record(
            record(
                **{
                    "Sourcing Classification": "Generic/Unbranded",
                    "Reference Status": "Manual Only / Omitted",
                }
            ),
            1,
        )
        self.assertTrue(any("must leave" in error for error in errors))


if __name__ == "__main__":
    unittest.main()

"