#!/usr/bin/env python3

from unittest.mock import patch, mock_open
import orjson as json
import builtins
import os
import security_issue_fix_versions
import unittest

from security_issue_fix_versions import get_issue_fix_versions, is_applicable_fix_version, keep_latest_fix_version_per_stream, normalize_version, get_standard_ulevel, get_target_version_data, ALL_VERSIONS, parse_product_line

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

    def test_normalize_version_72_service_packs(self):
        self.assertEqual(normalize_version('7.2.10 DXP SP1'), '7.2.10-fp2')
        self.assertEqual(normalize_version('7.2.10.3 DXP SP3'), '7.2.10-fp8')
        self.assertEqual(normalize_version('7.2.10-sp6'), '7.2.10-fp17')
        self.assertEqual(normalize_version('7.2.10 DXP SP8'), '7.2.10-fp20')
        self.assertIsNone(normalize_version('7.2.10 DXP SP9'))

    def test_normalize_version_hyphenated_fix_packs(self):
        self.assertEqual(normalize_version('7.2.10-dxp-17'), '7.2.10-fp17')
        self.assertEqual(normalize_version('7.1.10-dxp-27'), '7.1.10-fp27')
        self.assertEqual(normalize_version('7.0.10-de-65'), '7.0.10-de65')

    def test_normalize_version_74_ce_gas(self):
        self.assertEqual(normalize_version('7.4.3.120 CE GA120'), '7.4.13-u120')
        self.assertEqual(normalize_version('7.4.13.125 CE GA125'), '7.4.13-u125')
        self.assertEqual(normalize_version('7.4.3.100 GA100'), '7.4.13-u100')
        self.assertEqual(normalize_version('7.4.3.10 CE GA10'), '7.4.13-u6')
        self.assertEqual(normalize_version('7.4.3.4 CE GA4'), '7.4.13-ga1')
        self.assertEqual(normalize_version('7.4.3.4-ga4'), '7.4.13-ga1')

    def test_normalize_version_milestones(self):
        self.assertEqual(normalize_version('7.0.0 M3'), '7.0.10-ga1')
        self.assertEqual(normalize_version('7.1.0 M1'), '7.1.10-ga1')
        self.assertEqual(normalize_version('7.1.0 M2'), '7.1.10-ga1')
        self.assertEqual(normalize_version('7.2.0 M2'), '7.2.10-ga1')
        self.assertEqual(normalize_version('7.3.0 Milestone 1'), '7.3.10-ga1')
        self.assertEqual(normalize_version('7.4.0 CE M1'), '7.4.13-ga1')

    def test_normalize_version_73_ce_gas(self):
        self.assertEqual(normalize_version('7.3.1 CE GA2'), '7.3.10-ga1')
        self.assertEqual(normalize_version('7.3.5 CE GA6'), '7.3.10-ga1')
        self.assertEqual(normalize_version('7.3.5-ga6'), '7.3.10-ga1')
        self.assertEqual(normalize_version('7.3.6 CE GA7'), '7.3.10-u1')
        self.assertEqual(normalize_version('7.3.6-ga7'), '7.3.10-u1')
        self.assertEqual(normalize_version('7.3.7 CE GA8'), '7.3.10-u2')
        self.assertIsNone(normalize_version('7.3.8 CE GA9'))

    def test_normalize_version_first_ce_gas(self):
        self.assertEqual(normalize_version('7.1.0 CE GA1'), '7.1.10-ga1')
        self.assertEqual(normalize_version('7.1.0-ga1'), '7.1.10-ga1')
        self.assertEqual(normalize_version('7.2.0 GA1'), '7.2.10-ga1')
        self.assertEqual(normalize_version('7.2.0 CE GA1'), '7.2.10-ga1')
        self.assertEqual(normalize_version('7.2.0-ga1'), '7.2.10-ga1')
        self.assertEqual(normalize_version('7.3.0 CE GA1'), '7.3.10-ga1')
        self.assertEqual(normalize_version('7.3.0-ga1'), '7.3.10-ga1')
        self.assertEqual(normalize_version('7.4.0 CE GA1'), '7.4.13-ga1')
        self.assertEqual(normalize_version('7.4.1 CE GA2'), '7.4.13-ga1')
        self.assertEqual(normalize_version('7.4.2 CE GA3'), '7.4.13-ga1')
        self.assertEqual(normalize_version('7.4.2-ga3'), '7.4.13-ga1')
        self.assertIsNone(normalize_version('7.2.1 CE GA2'))

    def test_normalize_version_70_service_packs(self):
        self.assertEqual(normalize_version('7.0.10 DXP SP1'), '7.0.10-de7')
        self.assertEqual(normalize_version('7.0.10.10 DXP SP11'), '7.0.10-de80')
        self.assertEqual(normalize_version('7.0.10-sp9'), '7.0.10-de60')
        self.assertEqual(normalize_version('7.0.10 DXP SP17'), '7.0.10-de102')
        self.assertIsNone(normalize_version('7.0.10 DXP SP18'))

    def test_normalize_version_71_service_packs(self):
        self.assertEqual(normalize_version('7.1.10 DXP SP1'), '7.1.10-fp5')
        self.assertEqual(normalize_version('7.1.10.3 SP3'), '7.1.10-fp15')
        self.assertEqual(normalize_version('7.1.10-sp6'), '7.1.10-fp23')
        self.assertEqual(normalize_version('7.1.10 DXP SP8'), '7.1.10-fp28')
        self.assertIsNone(normalize_version('7.1.10 DXP SP9'))

    def test_normalize_version_73_service_packs(self):
        self.assertEqual(normalize_version('7.3.10 DXP SP1'), '7.3.10-u1')
        self.assertEqual(normalize_version('7.3.10.3 DXP SP3'), '7.3.10-u3')
        self.assertEqual(normalize_version('7.3.10-sp2'), '7.3.10-u2')
        self.assertIsNone(normalize_version('7.3.10 DXP SP4'))

    def test_get_issue_fix_versions_service_packs(self):
        issue = {'fixVersions': [{'name': '7.2.10.4 DXP SP4'}, {'name': '7.1.10.2 SP2'}, {'name': '7.0.10.13 DXP SP14'}, {'name': '7.3.10 DXP U5'}]}
        self.assertEqual(get_issue_fix_versions(issue), {'7.2.10-fp11', '7.1.10-fp10', '7.0.10-de93', '7.3.10-u5'})

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

    def test_x_fix_version_uses_linked_ticket_fix_version(self):
        # LPE-17586 only has 7.4.X EE for 7.4, but linked LPD-2861 is fixed in 7.4.3.125 CE GA125,
        # so 7.4.X EE should not be resolved to the latest 7.4 update
        d_u124 = get_target_version_data('7.4.13-u124')
        fixes_u124 = [fv for group in d_u124.values() for fv in group.get('LPE-17586', [])]
        self.assertIn('7.4.13-u125', fixes_u124)
        self.assertNotIn('7.4.13-u155', fixes_u124)

        d_u125 = get_target_version_data('7.4.13-u125')
        for group in ['sev-1', 'sev-2', 'sev-3', 'unknown']:
            self.assertNotIn('LPE-17586', d_u125[group])

    def test_keep_latest_fix_version_per_stream(self):
        # Several fix versions in the same stream keep only the latest, comparing
        # patch levels numerically (2025.q1.9 is older than 2025.q1.10)
        self.assertEqual(
            keep_latest_fix_version_per_stream({
                '2024.q1.26', '2024.q1.27', '2025.q1.9', '2025.q1.10',
                '7.4.13-u148', '7.4.13-u149', '7.3.10-u24'}),
            {'2024.q1.27', '2025.q1.10', '7.4.13-u149', '7.3.10-u24'})

        # A 7.0 GA1 fix is kept over later DE releases, since it means no DE release is affected
        self.assertEqual(
            keep_latest_fix_version_per_stream({'7.0.10-ga1', '7.0.10-de33', '7.1.10-fp12'}),
            {'7.0.10-ga1', '7.1.10-fp12'})

    def test_linked_ticket_fix_versions_keep_latest_per_stream(self):
        # LPE-18523 only names streams (DXP 2025.Q1), so its fix versions come from linked
        # LPD-84426, which is fixed in both 2025.Q1.23 and 2025.Q1.24. Only the latest is kept.
        d_q1_20 = get_target_version_data('2025.q1.20')
        fixes_q1_20 = [fv for group in d_q1_20.values() for fv in group.get('LPE-18523', [])]
        self.assertEqual(fixes_q1_20, ['2025.q1.24'])

        # 2025.q1.23 is still affected, since the complete fix is in 2025.q1.24
        d_q1_23 = get_target_version_data('2025.q1.23')
        fixes_q1_23 = [fv for group in d_q1_23.values() for fv in group.get('LPE-18523', [])]
        self.assertEqual(fixes_q1_23, ['2025.q1.24'])

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

    def test_lsv_x_line_fix_versions(self):
        get_lsv_fvs = security_issue_fix_versions.get_lsv_x_line_fix_versions

        lsv_issues = {
            'LSV-1': {'customfield_10978': [{'name': '7.4.13-u77'}, {'name': '2025.q1.5'}]},
        }

        # A .x line without a concrete fix version takes the LSV's release on
        # that line, and nothing from the LSV's other lines

        self.assertEqual(get_lsv_fvs(set(), {'7.4'}, {'LSV-1'}, lsv_issues), {'7.4.13-u77'})

        # A line with a concrete fix version of its own keeps it

        self.assertEqual(get_lsv_fvs({'7.4.13-u80'}, {'7.4'}, {'LSV-1'}, lsv_issues), set())

        # Without a .x fix version, the LSV's fix versions are not used

        self.assertEqual(get_lsv_fvs(set(), set(), {'LSV-1'}, lsv_issues), set())
        self.assertEqual(get_lsv_fvs(set(), {'7.4'}, {'LSV-2'}, lsv_issues), set())

    def test_quarterly_baseline_fixes(self):
        add_baseline = security_issue_fix_versions.add_quarterly_baseline_fixes

        # A fix in the first release of a quarterly line was already in the
        # 7.4.13 update the line is based on (2024.q1 has no .0 release)

        self.assertEqual(add_baseline({'2025.q2.0'}), {'2025.q2.0', '7.4.13-u135'})
        self.assertEqual(add_baseline({'2024.q1.1'}), {'2024.q1.1', '7.4.13-u112'})

        # A later quarterly release says nothing about the baseline

        self.assertEqual(add_baseline({'2025.q2.3'}), {'2025.q2.3'})

        # A 7.4 fix that is already named is kept as is

        self.assertEqual(add_baseline({'2025.q2.0', '7.4.13-u130'}), {'2025.q2.0', '7.4.13-u130'})

        # A later quarterly line that needed a backport already existed when the
        # issue was fixed, so the first release is not evidence of the baseline

        self.assertEqual(add_baseline({'2025.q2.0', '2025.q3.4'}), {'2025.q2.0', '2025.q3.4'})
        self.assertEqual(add_baseline({'2025.q2.0', '2025.q1.4'}), {'2025.q2.0', '2025.q1.4', '7.4.13-u135'})

        # The baseline is a concrete 7.4 fix, so a 7.4.x fix version does not
        # resolve to the latest 7.4 release

        self.assertEqual(
            security_issue_fix_versions.resolve_x_lines(add_baseline({'2025.q2.0'}), {'7.4'}),
            {'2025.q2.0', '7.4.13-u135'})

    def test_fix_versions_by_line_quarterly_from_74(self):
        by_line = security_issue_fix_versions.get_fix_versions_by_line

        # Without the inference, only the recorded lines are returned

        self.assertEqual(by_line({'7.4.13-u147', '2025.q1.18'}), {'7.4': '7.4.13-u147', '2025.Q1': '2025.q1.18'})

        # 2026.q2 is based on u149 and 2026.q1 on u147, so a u147 fix is in
        # their first releases, while 2025.q4 (u143) keeps needing its own fix

        inferred = by_line({'7.4.13-u147', '2025.q1.18'}, include_quarterly_from_74=True)

        self.assertEqual(inferred['2025.Q1'], '2025.q1.18')
        self.assertEqual(inferred['2026.Q1'], '2026.q1.0')
        self.assertEqual(inferred['2026.Q2'], '2026.q2.0')
        self.assertNotIn('2025.Q4', inferred)

        # 2024.q1 has no .0 release

        self.assertEqual(by_line({'7.4.13-u52'}, include_quarterly_from_74=True)['2024.Q1'], '2024.q1.1')

        # A 7.4.13 GA1 fix came before every update, so it is in every quarterly line

        ga1 = by_line({'7.4.13-ga1'}, include_quarterly_from_74=True)

        self.assertEqual(ga1['2023.Q3'], '2023.q3.0')
        self.assertEqual(ga1['2024.Q1'], '2024.q1.1')
        self.assertEqual(ga1['2026.Q4'], '2026.q4.0')

    def test_lsv_resolving_tickets(self):
        resolving_tickets = security_issue_fix_versions.get_lsv_resolving_tickets

        def lsv(*names):
            return {'customfield_10978': [{'name': name} for name in names]}

        precomputed = {
            'LPE-1': {'fix_versions': ['7.4.13-u154', '2025.q1.28', '2026.q1.13']},
            'LPE-2': {'fix_versions': ['7.4.13-u154', '2025.q1.30', '2026.q1.14']},
            'LPE-3': {'fix_versions': []},
            'LPE-4': {'fix_versions': ['7.4.13-u52']},
            'LPE-5': {'fix_versions': ['7.3.10-u36']},
            'LPE-6': {'fix_versions': ['2025.q1.27', '2026.q1.12']},
        }

        lsv_issues = {
            'LSV-1': lsv('2025.Q1.28', '2026.Q1.13'),
            'LSV-2': lsv('2025.Q1.30', '2026.Q1.14'),
            'LSV-3': lsv('2024.Q1.1', '2025.Q1.0'),
            'LSV-4': lsv('2025.Q1.29', '2026.Q2.5'),
            'LSV-5': lsv(),
            'LSV-6': lsv('2025.Q1.30'),
        }

        lsv_tickets = {
            'LSV-1': ['LPE-1', 'LPE-2', 'LPE-3'],
            'LSV-2': ['LPE-1', 'LPE-2'],
            'LSV-3': ['LPE-4', 'LPE-5'],
            'LSV-4': ['LPE-2', 'LPE-3'],
            'LSV-5': ['LPE-1', 'LPE-2'],
            'LSV-6': ['LPE-1', 'LPE-6'],
        }

        result = resolving_tickets(precomputed, lsv_issues, lsv_tickets)

        # Only the LSV's own release lines are checked, but the resolving
        # ticket's fix on another line (7.4) also resolves the LSV there

        self.assertEqual(result['LSV-1'], {'tickets': ['LPE-1'], 'fix_versions': ['7.4.13-u154', '2025.q1.28', '2026.q1.13'], 'insufficient_tickets': ['LPE-2', 'LPE-3']})

        # A ticket fixed earlier qualifies, but the exact match is preferred

        self.assertEqual(result['LSV-2']['tickets'], ['LPE-2'])

        # A 7.4.13 fix covers the quarterly lines based on a later update

        self.assertEqual(result['LSV-3']['tickets'], ['LPE-4'])

        # No ticket is fixed by 2025.q1.29 and on 2026.q2, and an LSV without
        # fix versions is not checked

        self.assertNotIn('LSV-4', result)
        self.assertNotIn('LSV-5', result)

        # Without an exact match, every ticket fixed at or before the LSV's
        # fix versions is kept, and a line the LSV has no fix versions on is
        # only resolved if every one of them is fixed there (LPE-6 has no 7.4
        # fix, and 2026.q1 uses the later of the two fixes)

        self.assertEqual(result['LSV-6'], {'tickets': ['LPE-1', 'LPE-6'], 'fix_versions': ['2025.q1.30', '2026.q1.13']})

    def test_insufficient_tickets(self):
        def issue(*linked_keys):
            return {'issuelinks': [{'type': {'name': 'Relationship'}, 'outwardIssue': {'key': key}} for key in linked_keys]}

        # LSV-1793: LPE-18800 alone resolves it, LPE-18843 is a follow-up
        issues = {
            'LPE-18800': issue('LPD-104695', 'LRHC-1'),
            'LPE-18843': issue('LPD-105462', 'LPD-104695', 'LRHC-2'),
            'LPD-104695': issue('LPE-18800', 'LPE-18843', 'LSV-1793', 'LPD-105461', 'LPD-105462'),
            'LPD-105461': issue('LPD-104695', 'LSV-1793'),
            'LPD-105462': issue('LPD-104695', 'LSV-1793', 'LPE-18843'),
        }

        # The follow-up and its own LPD don't fix the LSV. The resolving LPE's LPD
        # (linked to both LPEs), an LPD linked to neither, and tickets that aren't
        # development tickets (LRHC) are left out

        self.assertEqual(
            security_issue_fix_versions.get_insufficient_tickets('LPE-18800', ['LPE-18843'], issues),
            ['LPD-105462', 'LPE-18843'])

        # Without the cached issues, only the other tickets themselves are known

        self.assertEqual(security_issue_fix_versions.get_insufficient_tickets('LPE-18800', ['LPE-18843'], {}), ['LPE-18843'])

    def test_duplicate_tickets_prefer_recorded_74_fix(self):
        # One duplicate records u145, and the other only has the u147 baseline
        # inferred from 2026.q1.0, so the recorded u145 is kept

        precomputed = {
            'LPE-1': {'fix_versions': ['7.4.13-u145'], 'affects_versions': [], 'baseline_fix_versions': []},
            'LPE-2': {'fix_versions': ['2026.q1.0', '7.4.13-u147'], 'affects_versions': [], 'baseline_fix_versions': ['7.4.13-u147']},
        }

        security_issue_fix_versions.apply_duplicate_tickets(precomputed, [['LPE-1', 'LPE-2']])

        self.assertEqual(sorted(precomputed['LPE-2']['fix_versions']), ['2026.q1.0', '7.4.13-u145'])
        self.assertEqual(precomputed['LPE-2']['baseline_fix_versions'], [])

        # Without a recorded 7.4 fix version, the inferred baseline is kept

        precomputed = {
            'LPE-1': {'fix_versions': ['2025.q1.20'], 'affects_versions': [], 'baseline_fix_versions': []},
            'LPE-2': {'fix_versions': ['2026.q1.0', '7.4.13-u147'], 'affects_versions': [], 'baseline_fix_versions': ['7.4.13-u147']},
        }

        security_issue_fix_versions.apply_duplicate_tickets(precomputed, [['LPE-1', 'LPE-2']])

        self.assertEqual(sorted(precomputed['LPE-1']['fix_versions']), ['2025.q1.20', '2026.q1.0', '7.4.13-u147'])

    def test_duplicate_tickets_prefer_recorded_fix_over_x_line(self):
        # One duplicate records 2024.q1.24, and the other only has the latest
        # 2024.q1 release assumed for DXP 2024.Q1, so the recorded one is kept

        precomputed = {
            'LPE-1': {'fix_versions': ['2024.q1.24'], 'affects_versions': [], 'baseline_fix_versions': [], 'x_line_fix_versions': []},
            'LPE-2': {'fix_versions': ['2024.q1.33', '2026.q1.0'], 'affects_versions': [], 'baseline_fix_versions': [], 'x_line_fix_versions': ['2024.q1.33']},
        }

        security_issue_fix_versions.apply_duplicate_tickets(precomputed, [['LPE-1', 'LPE-2']])

        self.assertEqual(sorted(precomputed['LPE-1']['fix_versions']), ['2024.q1.24', '2026.q1.0'])
        self.assertEqual(precomputed['LPE-1']['x_line_fix_versions'], [])

        # Without a recorded release on that line, the assumed one is kept

        precomputed = {
            'LPE-1': {'fix_versions': ['2026.q1.0'], 'affects_versions': [], 'baseline_fix_versions': [], 'x_line_fix_versions': []},
            'LPE-2': {'fix_versions': ['2024.q1.33'], 'affects_versions': [], 'baseline_fix_versions': [], 'x_line_fix_versions': ['2024.q1.33']},
        }

        security_issue_fix_versions.apply_duplicate_tickets(precomputed, [['LPE-1', 'LPE-2']])

        self.assertEqual(sorted(precomputed['LPE-1']['fix_versions']), ['2024.q1.33', '2026.q1.0'])

    def test_line_versions_are_x_lines(self):
        get_fvs = security_issue_fix_versions.get_issue_fix_versions_and_x_lines

        # A version for a whole product line means the same as a .x version

        self.assertEqual(get_fvs({'fixVersions': [{'name': '7.4 DXP (7.4.13)'}]}), (set(), {'7.4'}))
        self.assertEqual(get_fvs({'fixVersions': [{'name': '7.3 DXP (7.3.10)'}]}), (set(), {'7.3'}))
        self.assertEqual(get_fvs({'fixVersions': [{'name': 'DXP 2024.Q1'}]}), (set(), {'2024.Q1'}))

    def test_duplicate_tickets_share_fix_versions(self):
        original_open = builtins.open

        # LPE-99998 upgrades the same dependency as LPE-99997, but was never
        # given a 2025.q1 fix version

        lpe_data = {
            "LPE-99997": {
                "versions": [{"name": "2025.Q1.0"}],
                "fixVersions": [{"name": "2025.Q1.20"}],
                "labels": ["sev-2"],
                "issuelinks": []
            },
            "LPE-99998": {
                "versions": [{"name": "2025.Q1.0"}],
                "fixVersions": [],
                "labels": ["sev-2"],
                "issuelinks": []
            },
            "LPE-99999": {
                "versions": [{"name": "2025.Q1.0"}],
                "fixVersions": [],
                "labels": ["sev-2"],
                "issuelinks": []
            }
        }

        def mock_open_impl(file, *args, **kwargs):
            if 'releases.json' in str(file):
                return original_open(file, *args, **kwargs)
            if 'LPE.json' in str(file):
                return mock_open(read_data=json.dumps(lpe_data).decode('utf-8'))()
            if 'security_issue_duplicate_tickets.json' in str(file):
                return mock_open(read_data='[["LPE-99997", "LPE-99998"]]')()
            return mock_open(read_data='{}')()

        original_exists = os.path.exists
        def mock_exists(path):
            if 'security_issue_export' in str(path) and path.endswith('.json'):
                return True
            return original_exists(path)

        with patch('builtins.open', side_effect=mock_open_impl), \
             patch('os.path.exists', side_effect=mock_exists):
            security_issue_fix_versions._PRECOMPUTED_DATA = None
            data = security_issue_fix_versions.get_precomputed_data()

            # The duplicate gets the other ticket's fix version, while a ticket
            # outside the group keeps having none

            self.assertEqual(data['LPE-99998']['fix_versions'], ['2025.q1.20'])
            self.assertEqual(data['LPE-99997']['fix_versions'], ['2025.q1.20'])
            self.assertEqual(data['LPE-99999']['fix_versions'], [])

            before_fix = security_issue_fix_versions.get_target_version_data('2025.q1.10')
            self.assertEqual(before_fix['sev-2']['LPE-99998'], ['2025.q1.20'])
            self.assertEqual(before_fix['sev-2']['LPE-99999'], [])

            after_fix = security_issue_fix_versions.get_target_version_data('2025.q1.25')
            self.assertNotIn('LPE-99998', after_fix['sev-2'])
            self.assertIn('LPE-99999', after_fix['sev-2'])

            security_issue_fix_versions._PRECOMPUTED_DATA = None

    def test_affects_version_gaps(self):
        precomputed = {
            # Only the supported lines are listed, with no old product line (like LPE-19127)
            'LPE-1': {
                'group': 'sev-1',
                'affects_versions': ['7.4 DXP (7.4.13)', 'DXP 2024.Q1', 'DXP 2025.Q1', 'DXP 2025.Q4'],
                'fix_versions': ['7.4.13-u155', '2024.q1.33', '2025.q1.30', '2025.q4.12'],
            },
            # Starts at a quarterly line: earlier lines aren't expected
            'LPE-2': {
                'group': 'sev-2',
                'affects_versions': ['DXP 2025.Q1', 'DXP 2025.Q3'],
                'fix_versions': ['2025.q1.30', '2025.q3.10'],
            },
            # An old product line: every line from 7.4 on is expected
            'LPE-3': {
                'group': 'sev-2',
                'affects_versions': ['7.3 DXP (7.3.10)', 'DXP 2024.Q1'],
                'fix_versions': ['2024.q1.33'],
            },
            # No gaps
            'LPE-4': {
                'group': 'sev-3',
                'affects_versions': ['DXP 2025.Q3', 'DXP 2025.Q4'],
                'fix_versions': ['2025.q3.10', '2025.q4.12'],
            },
            # No later product line
            'LPE-5': {
                'group': 'sev-3',
                'affects_versions': ['7.3 DXP (7.3.10)'],
                'fix_versions': ['7.3.10-u36'],
            },
        }

        gaps = security_issue_fix_versions.get_affects_version_gaps(precomputed)

        self.assertEqual(list(gaps), ['LPE-1', 'LPE-2', 'LPE-3'])
        self.assertEqual(gaps['LPE-1']['unfixed_missing_lines'], ['2023.q3', '2023.q4', '2024.q2', '2024.q3', '2024.q4', '2025.q2', '2025.q3'])
        self.assertEqual(gaps['LPE-2']['missing_lines'], ['2025.q2'])
        self.assertEqual(gaps['LPE-3']['unfixed_missing_lines'], ['7.4', '2023.q3', '2023.q4'])

    def test_baseline_affects_versions(self):
        get = security_issue_fix_versions.get_baseline_affects_versions

        # Affected from u120 (2024.q2's baseline) until the fix in u143 (2025.q4's baseline)
        self.assertEqual(
            get(['7.4.13 DXP U120', 'DXP 2025.Q1'], ['7.4.13-u143']),
            {'DXP 2024.Q2', 'DXP 2024.Q3', 'DXP 2024.Q4', 'DXP 2025.Q1', 'DXP 2025.Q2', 'DXP 2025.Q3'})

        # Only u92 (the oldest patched update) or no 7.4.13 update listed, with a 7.4 fix: affected since GA1
        lines_before_u112 = {'DXP 2023.Q3', 'DXP 2023.Q4'}
        self.assertEqual(get(['7.4.13 DXP U92'], ['7.4.13-u112']), lines_before_u112)
        self.assertEqual(get(['7.4 DXP (7.4.13)', 'DXP 2024.Q1'], ['7.4.13-u112']), lines_before_u112)
        self.assertEqual(get([], ['7.4.13-u112']), lines_before_u112)

        # Without a 7.4 fix, every later line is affected
        self.assertEqual(get(['7.4.13-u149'], []), {'DXP 2026.Q2', 'DXP 2026.Q3', 'DXP 2026.Q4'})

        # Nothing to go on: no 7.4.13 update affected and no 7.4 fix
        self.assertEqual(get(['7.4 DXP (7.4.13)', 'DXP 2025.Q1'], ['2025.q1.30']), set())

if __name__ == '__main__':
    unittest.main()

