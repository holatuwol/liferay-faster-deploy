#!/usr/bin/env python3
import unittest
from security_issue_fix_versions import get_issue_fix_versions, is_applicable_fix_version

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
        self.assertEqual(res_1, {'7.3.10 DXP U24'})

    def test_get_issue_fix_versions_customfield_list(self):
        # 2. customfield_10886 as a list of dicts
        issue_2 = {
            'customfield_10886': [
                {'name': '7.0.X EE'},
                {'name': '7.0.10.12 DXP SP12'},
                {'name': '7.1.x'}
            ]
        }
        res_2 = get_issue_fix_versions(issue_2)
        self.assertEqual(res_2, {'7.0.10.12 DXP SP12'})

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

if __name__ == '__main__':
    unittest.main()
