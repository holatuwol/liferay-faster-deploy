#!/usr/bin/env python3
import unittest
from security_issue_fix_versions import get_issue_fix_versions, is_applicable_fix_version, normalize_version, get_standard_ulevel

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

if __name__ == '__main__':
    unittest.main()
