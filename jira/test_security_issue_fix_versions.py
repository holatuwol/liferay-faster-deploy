#!/usr/bin/env python3
import unittest
from security_issue_fix_versions import get_issue_fix_versions, is_applicable_fix_version, normalize_version, get_standard_ulevel, get_target_version_data

class TestSecurityIssueFixVersions(unittest.TestCase):

    def test_get_issue_fix_versions_excludes_x(self):
        # 1. Standard fixVersions with .X and non-.X
        issue_1 = {
            'fixVersions': [
                {'name': '7.3.X EE'},
                {'name': '7.3.10 DXP U24'},
                {'name': '7.4.x'}
            ]
        }
        res_1 = get_issue_fix_versions(issue_1)
        self.assertEqual(res_1, {'7.3.10-u24'})

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
        self.assertEqual(res_4, set())

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

if __name__ == '__main__':
    unittest.main()
