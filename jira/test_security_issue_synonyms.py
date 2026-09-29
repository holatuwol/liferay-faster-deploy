#!/usr/bin/env python3
import unittest

from security_issue_synonyms import get_security_issue_synonyms, natural_sort_key

class TestSecurityIssueSynonyms(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.synonyms = get_security_issue_synonyms()

    def test_lpd_lpe_lsv_synonyms(self):
        # Specifically requested by user:
        # LPD-104695, LPE-18800, and LSV-1793 are all synonyms of each other
        synonyms = self.synonyms

        self.assertIn('LPD-104695', synonyms)
        self.assertIn('LPE-18800', synonyms)
        self.assertIn('LSV-1793', synonyms)

        self.assertIn('LPE-18800', synonyms['LPD-104695'])
        self.assertIn('LSV-1793', synonyms['LPD-104695'])

        self.assertIn('LPD-104695', synonyms['LPE-18800'])
        self.assertIn('LSV-1793', synonyms['LPE-18800'])

        self.assertIn('LPD-104695', synonyms['LSV-1793'])
        self.assertIn('LPE-18800', synonyms['LSV-1793'])

    def test_cve_and_lpe_synonyms(self):
        synonyms = self.synonyms

        # 1. Direct CVE <-> LPE mapping (e.g. CVE-2020-7961 <-> LPE-16814)
        self.assertIn('CVE-2020-7961', synonyms)
        self.assertIn('LPE-16814', synonyms)
        self.assertIn('CVE-2020-7961', synonyms['LPE-16814'])
        self.assertIn('LPE-16814', synonyms['CVE-2020-7961'])
        # Also linked LPS and LSV
        self.assertIn('LPS-97029', synonyms['CVE-2020-7961'])
        self.assertIn('LSV-545', synonyms['CVE-2020-7961'])

        # 2. Multi-LPE to single CVE (e.g. CVE-2012-5783 mapped to multiple LPEs)
        self.assertIn('CVE-2012-5783', synonyms)
        for lpe in ['LPE-17186', 'LPE-17228', 'LPE-17238', 'LPE-17249']:
            self.assertIn(lpe, synonyms)
            self.assertIn(lpe, synonyms['CVE-2012-5783'])
            self.assertIn('CVE-2012-5783', synonyms[lpe])

        # 3. LPE mapped to multiple CVEs (e.g. LPE-17563 with CVE-2013-0248 and CVE-2014-0050)
        self.assertIn('LPE-17563', synonyms)
        self.assertIn('CVE-2013-0248', synonyms['LPE-17563'])
        self.assertIn('CVE-2014-0050', synonyms['LPE-17563'])
        self.assertIn('LPE-17563', synonyms['CVE-2013-0248'])
        self.assertIn('LPE-17563', synonyms['CVE-2014-0050'])

        # 4. Hard-coded LSV-1684 CVEs (e.g. CVE-2026-22735 and LPE-18651)
        self.assertIn('LSV-1684', synonyms)
        self.assertIn('CVE-2026-22735', synonyms)
        self.assertIn('LPE-18651', synonyms)
        self.assertIn('CVE-2026-22735', synonyms['LSV-1684'])
        self.assertIn('LPE-18651', synonyms['LSV-1684'])
        self.assertIn('LSV-1684', synonyms['CVE-2026-22735'])
        self.assertIn('LPE-18651', synonyms['CVE-2026-22735'])

    def test_symmetry_and_self_exclusion(self):
        # For all keys, key must not be in synonyms[key], and relation must be symmetric
        for key, syn_list in self.synonyms.items():
            self.assertNotIn(key, syn_list, f"{key} should not be in its own synonym list")
            for other in syn_list:
                self.assertIn(other, self.synonyms)
                self.assertIn(
                    key,
                    self.synonyms[other],
                    f"Symmetry broken: {other} has synonym {key}, but {key} does not have {other}"
                )

    def test_natural_sorting(self):
        # Check that lists are naturally sorted
        for key, syn_list in list(self.synonyms.items())[:100]:
            self.assertEqual(syn_list, sorted(syn_list, key=natural_sort_key))

if __name__ == '__main__':
    unittest.main()
