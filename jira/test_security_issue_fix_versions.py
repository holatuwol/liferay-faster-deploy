#!/usr/bin/env python3

from unittest.mock import patch, mock_open
import orjson as json
import builtins
import os
import security_issue_fix_versions
import unittest

from security_issue_fix_versions import get_issue_fix_versions, is_applicable_fix_version, normalize_version, get_standard_ulevel, get_target_version_data, ALL_VERSIONS, parse_product_line

class TestSecurityIssueFixVersions(unittest.TestCase):

    def test_get_issue_fix_versions_resolves_x(self):
        # 1. Standard fixVersions with .X and non-.X
        issue_1 = {
            'fixVersions': [
                {'name': '7.3.X EE'},
                {'name': '7.3.10 DXP U24'},
                {'name': '7.4.x'}
            ]
        }
        res_1 = get_issue_fix_versions(issue_1)
        expected_74 = max([v for v in ALL_VERSIONS if parse_product_line(v) == '7.4'], key=get_standard_ulevel)
        self.assertEqual(res_1, {'7.3.10-u24', expected_74})

    def test_get_issue_fix_versions_customfield_list(self):
        # 2. customfield_10886 as a list of dicts
        issue_2 = {
            'customfield_10886': [
                {'name': '7.2.X EE'},
                {'name': '7.2.10 DXP FP15'},
                {'name': '7.2.x'}
            ]
        }
        res_2 = get_issue_fix_versions(issue_2)
        self.assertEqual(res_2, {'7.2.10-fp15'})

    def test_get_issue_fix_versions_customfield_single_dict(self):
        # 3. customfield_10886 as a single dict
        issue_3 = {
            'customfield_10886': {'name': '7.4.13-u100'}
        }
        res_3 = get_issue_fix_versions(issue_3)
        self.assertEqual(res_3, {'7.4.13-u100'})

    def test_get_issue_fix_versions_customfield_single_dict_with_x(self):
        # 4. customfield_10886 as a single dict containing .X
        issue_4 = {
            'customfield_10886': {'name': '7.3.X'}
        }
        res_4 = get_issue_fix_versions(issue_4)
        expected_73 = max([v for v in ALL_VERSIONS if parse_product_line(v) == '7.3'], key=get_standard_ulevel)
        self.assertEqual(res_4, {expected_73})

    def test_is_applicable_fix_version(self):
        # Test standard major/minor lines
        self.assertTrue(is_applicable_fix_version('7.3.10 DXP U24', '7.3.10-ga1'))
        self.assertFalse(is_applicable_fix_version('7.4.13 DXP U79', '7.3.10-ga1'))
        # Test with normalized versions too
        self.assertTrue(is_applicable_fix_version('7.3.10-u24', '7.3.10-ga1'))

    def test_normalize_version(self):
        self.assertEqual(normalize_version('7.3.10 DXP U24'), '7.3.10-u24')
        self.assertEqual(normalize_version('7.4.13 DXP GA1'), '7.4.13-ga1')
        self.assertEqual(normalize_version('7.2.10 DXP FP20'), '7.2.10-fp20')
        self.assertEqual(normalize_version('2025.Q1.15'), '2025.q1.15')
        self.assertEqual(normalize_version('2024.Q1.5 '), '2024.q1.5')
        self.assertEqual(normalize_version('7.4.13-u100'), '7.4.13-u100')

    def test_get_standard_ulevel(self):
        self.assertEqual(get_standard_ulevel('7.3.10-u24'), 24)
        self.assertEqual(get_standard_ulevel('7.2.10-fp15'), 15)
        self.assertEqual(get_standard_ulevel('7.4.13-u100'), 100)
        self.assertEqual(get_standard_ulevel('7.3.10-ga1'), 0)
        self.assertEqual(get_standard_ulevel('7.3.10'), 0)

    def test_quarterly_release_stream_fixes(self):
        # LPE-18093 is fixed in 2024.q1.13.
        # It should affect 2024.q1.12, but NOT 2024.q1.13 or 2024.q1.14.
        
        # 1. Affected in older version (2024.q1.12)
        d12 = get_target_version_data('2024.q1.12')
        self.assertEqual(d12['sev-3'].get('LPE-18093'), ['2024.q1.13'])
        
        # 2. Fixed/not affected in the fix version itself (2024.q1.13)
        d13 = get_target_version_data('2024.q1.13')
        for group in ['sev-1', 'sev-2', 'sev-3', 'unknown']:
            self.assertNotIn('LPE-18093', d13[group])
            
        # 3. Fixed/not affected in subsequent versions (2024.q1.14)
        d14 = get_target_version_data('2024.q1.14')
        for group in ['sev-1', 'sev-2', 'sev-3', 'unknown']:
            self.assertNotIn('LPE-18093', d14[group])

    def test_linked_tickets_missing_backports(self):
        # LPE-18210 has own fixes in 2025.q1 (2025.q1.7) and 2025.q2 (2025.q2.0)
        # But a backport to 2024.q1 is defined on linked ticket LPD-51821 as 2024.q1.22.
        # This backport should be merged in and handled.
        
        # 1. Affected in version older than 2024.q1.22 (e.g. 2024.q1.21)
        d21 = get_target_version_data('2024.q1.21')
        self.assertEqual(d21['sev-3'].get('LPE-18210'), ['2024.q1.22'])
        
        # 2. Fixed in 2024.q1.22
        d22 = get_target_version_data('2024.q1.22')
        for group in ['sev-1', 'sev-2', 'sev-3', 'unknown']:
            self.assertNotIn('LPE-18210', d22[group])
            
        # 3. Fixed in 2024.q1.23
        d23 = get_target_version_data('2024.q1.23')
        for group in ['sev-1', 'sev-2', 'sev-3', 'unknown']:
            self.assertNotIn('LPE-18210', d23[group])

    def test_get_issue_fix_versions_labels_70_and_71(self):
        # 7.0 and 7.1 fixpack labels
        issue = {
            'labels': [
                'liferay-fixpack-de-60-7010',
                'liferay-fixpack-dxp-3-7110',
                'lsv-123',
                'sev-3'
            ]
        }
        res = get_issue_fix_versions(issue)
        self.assertIn('7.0.10-de60', res)
        self.assertIn('7.1.10-fp3', res)

    def test_normalize_version_70_and_71(self):
        self.assertEqual(normalize_version('7.0.10-de60'), '7.0.10-de60')
        self.assertEqual(normalize_version('7.1.10-fp3'), '7.1.10-fp3')
        self.assertEqual(normalize_version('7.1.10 DXP FP15'), '7.1.10-fp15')
        self.assertEqual(normalize_version('7.0.0 DXP FP82'), '7.0.10-de82')
        self.assertEqual(normalize_version('7.1.10 DXP GA1'), '7.1.10-ga1')
        self.assertEqual(normalize_version('7.0.0 DXP GA1'), '7.0.10-ga1')
        self.assertEqual(normalize_version('7.0.0 M1'), '7.0.10-ga1')
        self.assertEqual(normalize_version('7.0.0 M2'), '7.0.10-ga1')
        self.assertEqual(normalize_version('7.0.0 M7'), '7.0.10-ga1')
        self.assertEqual(normalize_version('7.0.1 CE GA2'), '7.0.10-ga1')
        self.assertEqual(normalize_version('7.0.5 CE GA6'), '7.0.10-ga1')
        self.assertEqual(normalize_version('7.0.0 CE RC1'), '7.0.10-ga1')
        self.assertEqual(normalize_version('7.0.0 RC1'), '7.0.10-ga1')
        self.assertEqual(normalize_version('7.1.0 RC1'), '7.1.10-ga1')
        self.assertEqual(normalize_version('7.2.0 RC1'), '7.2.10-ga1')
        self.assertEqual(normalize_version('7.3.0 RC1'), '7.3.10-ga1')
        self.assertEqual(normalize_version('7.4.0 RC1'), '7.4.13-ga1')
        self.assertEqual(normalize_version('7.0.0 Alpha 1'), '7.0.10-ga1')
        self.assertEqual(normalize_version('7.0.0 Alpha 3'), '7.0.10-ga1')
        self.assertEqual(normalize_version('7.0.0 Beta 2'), '7.0.10-ga1')
        self.assertEqual(normalize_version('7.0.0 Beta 4'), '7.0.10-ga1')
        self.assertEqual(normalize_version('7.1.0 Alpha'), '7.1.10-ga1')
        self.assertEqual(normalize_version('7.2.0 Alpha 1'), '7.2.10-ga1')

    def test_get_standard_ulevel_70_and_71(self):
        self.assertEqual(get_standard_ulevel('7.0.10-de60'), 60)
        self.assertEqual(get_standard_ulevel('7.1.10-fp3'), 3)
        self.assertEqual(get_standard_ulevel('7.0.10-ga1'), 0)
        self.assertEqual(get_standard_ulevel('7.1.10-ga1'), 0)

    def test_older_versions_stream_fixes_70_and_71(self):
        # LPE-16733 is fixed in DE-82 (7.0.10-de82) and FP-12 (7.1.10-fp12)
        # 1. 7.0 tests
        d_70_81 = get_target_version_data('7.0.10-de81')
        self.assertEqual(d_70_81['sev-3'].get('LPE-16733'), ['7.0.10-de82'])

        d_70_82 = get_target_version_data('7.0.10-de82')
        for group in ['sev-1', 'sev-2', 'sev-3', 'unknown']:
            self.assertNotIn('LPE-16733', d_70_82[group])

        # 2. 7.1 tests
        d_71_11 = get_target_version_data('7.1.10-fp11')
        self.assertEqual(d_71_11['sev-3'].get('LPE-16733'), ['7.1.10-fp12'])

        d_71_12 = get_target_version_data('7.1.10-fp12')
        for group in ['sev-1', 'sev-2', 'sev-3', 'unknown']:
            self.assertNotIn('LPE-16733', d_71_12[group])

    def test_70_milestone_fix_releases(self):
        # LPE-13050 is linked to LPSA-34026 which was fixed in 7.0.0 M2.
        # It should be recognized as fixed in 7.0 GA and not affect any 7.0 release.
        d_ga1 = get_target_version_data('7.0.10-ga1')
        for group in ['sev-1', 'sev-2', 'sev-3', 'unknown']:
            self.assertNotIn('LPE-13050', d_ga1[group])

        d_de1 = get_target_version_data('7.0.10-de1')
        for group in ['sev-1', 'sev-2', 'sev-3', 'unknown']:
            self.assertNotIn('LPE-13050', d_de1[group])

    def test_rc_fix_releases(self):
        # LPE-14912 is linked to LPSA-36235 which was fixed in 7.0.0 CE RC1.
        # It should be recognized as fixed in 7.0 GA and not affect 7.0 releases.
        d_ga1 = get_target_version_data('7.0.10-ga1')
        for group in ['sev-1', 'sev-2', 'sev-3', 'unknown']:
            self.assertNotIn('LPE-14912', d_ga1[group])

        d_de1 = get_target_version_data('7.0.10-de1')
        for group in ['sev-1', 'sev-2', 'sev-3', 'unknown']:
            self.assertNotIn('LPE-14912', d_de1[group])

    def test_ga1_fix_does_not_affect_de_releases(self):
        # LPE-13662 has 7.0.10-ga1 in its fix versions (via linked LPSA-47521 fixed in 7.0.0 M5),
        # but also links to a regression ticket fixed in 7.0.10-de33.
        # Because it is fixed in GA1, it must not affect GA1 or any DE releases.
        d_ga1 = get_target_version_data('7.0.10-ga1')
        for group in ['sev-1', 'sev-2', 'sev-3', 'unknown']:
            self.assertNotIn('LPE-13662', d_ga1[group])

        for de_ver in ['7.0.10-de1', '7.0.10-de10', '7.0.10-de32']:
            d_de = get_target_version_data(de_ver)
            for group in ['sev-1', 'sev-2', 'sev-3', 'unknown']:
                self.assertNotIn('LPE-13662', d_de[group])

    def test_alpha_fix_releases(self):
        # LPE-13421 was fixed in 7.0.0 Alpha 3. It should be recognized as fixed in 7.0 GA1.
        d_70_ga1 = get_target_version_data('7.0.10-ga1')
        for group in ['sev-1', 'sev-2', 'sev-3', 'unknown']:
            self.assertNotIn('LPE-13421', d_70_ga1[group])

        # LPE-16398 was fixed in 7.1.0 Alpha. It should be recognized as fixed in 7.1 GA1.
        d_71_ga1 = get_target_version_data('7.1.10-ga1')
        for group in ['sev-1', 'sev-2', 'sev-3', 'unknown']:
            self.assertNotIn('LPE-16398', d_71_ga1[group])


    def test_milestone_affects_defaults_to_ga1(self):
        original_open = builtins.open
        
        lpe_data = {
            "LPE-99999": {
                "versions": [{"name": "7.0.0 M3"}],
                "fixVersions": [{"name": "6.1.30 EE GA3"}, {"name": "6.2.10 EE GA1"}],
                "labels": ["sev-3"],
                "issuelinks": []
            }
        }
        
        def mock_open_impl(file, *args, **kwargs):
            if 'security_issue_missing_fix_versions.json' in str(file):
                return mock_open(read_data='{}')()
            if 'releases.json' in str(file):
                return original_open(file, *args, **kwargs)
            if 'LPE.json' in str(file):
                return mock_open(read_data=json.dumps(lpe_data).decode('utf-8'))()
            return mock_open(read_data='{}')()

        # Need to patch os.path.exists so it thinks the json files exist
        original_exists = os.path.exists
        def mock_exists(path):
            if 'security_issue_export' in str(path) and path.endswith('.json'):
                return True
            return original_exists(path)

        with patch('builtins.open', side_effect=mock_open_impl), \
             patch('os.path.exists', side_effect=mock_exists):
            security_issue_fix_versions._PRECOMPUTED_DATA = None
            data = security_issue_fix_versions.get_precomputed_data()
            
            # Since 7.0.0 M3 is affected, and only 6.1 and 6.2 fixes are provided, 7.0.10-ga1 should be added.
            self.assertIn('7.0.10-ga1', data['LPE-99999']['fix_versions'])
            
            # If we test target version 7.0.10-ga1, it should NOT be affected
            target_data = security_issue_fix_versions.get_target_version_data('7.0.10-ga1')
            self.assertNotIn('LPE-99999', target_data['sev-3'])

            # 7.0.10-de1 should NOT be affected either
            de1_data = security_issue_fix_versions.get_target_version_data('7.0.10-de1')
            self.assertNotIn('LPE-99999', de1_data['sev-3'])
            
            # Restore _PRECOMPUTED_DATA to None so it doesn't affect other tests
            security_issue_fix_versions._PRECOMPUTED_DATA = None

if __name__ == '__main__':
    unittest.main()

