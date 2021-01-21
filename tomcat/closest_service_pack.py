#!/usr/bin/env python

import sys

service_packs = {
	'portal-0': '6.2.10',
	'portal-45': '6.2.10.12',
	'portal-63': '6.2.10.13',
	'portal-69': '6.2.10.14',
	'portal-77': '6.2.10.15',
	'portal-114': '6.2.10.16',
	'portal-121': '6.2.10.17',
	'portal-128': '6.2.10.18',
	'portal-138': '6.2.10.19',
	'portal-148': '6.2.10.20',
	'portal-154': '6.2.10.21',
	'de-0': '7.0.10',
	'de-7': '7.0.10.1',
	'de-12': '7.0.10.2',
	'de-14': '7.0.10.3',
	'de-22': '7.0.10.4',
	'de-30': '7.0.10.5',
	'de-32': '7.0.10.6',
	'de-40': '7.0.10.7',
	'de-50': '7.0.10.8',
	'de-60': '7.0.10.9',
	'de-70': '7.0.10.10',
	'de-80': '7.0.10.11',
	'de-87': '7.0.10.12',
	'de-90': '7.0.10.13',
	'de-93': '7.0.10.14',
	'de-96': '7.0.10.15',
	'dxp-0-7110': '7.1.10',
	'dxp-5-7110': '7.1.10.1',
	'dxp-10-7110': '7.1.10.2',
	'dxp-15-7110': '7.1.10.3',
	'dxp-17-7110': '7.1.10.4',
	'dxp-20-7110': '7.1.10.5',
	'dxp-0-7210': '7.2.10',
	'dxp-2-7210': '7.2.10.1',
	'dxp-5-7210': '7.2.10.2',
	'dxp-8-7210': '7.2.10.3',
	'dxp-0-7310': '7.3.10'
}

def get_closest_service_pack(patch_id):
	if patch_id in service_packs:
		return service_packs[patch_id]

	if patch_id.find('portal-') == 0:
		for id in range(int(patch_id.split('-')[1]), -1, -1):
			candidate_id = 'portal-%d' % id

			if candidate_id in service_packs:
				return service_packs[candidate_id]

	if patch_id.find('de-') == 0:
		for id in range(int(patch_id.split('-')[1]), -1, -1):
			candidate_id = 'de-%d' % id

			if candidate_id in service_packs:
				return service_packs[candidate_id]

	if patch_id.find('dxp-') == 0:
		release_version = patch_id.split('-')[2]

		for id in range(int(patch_id.split('-')[1]), -1, -1):
			candidate_id = 'dxp-%d-%s' % (id, release_id)

			if candidate_id in service_packs:
				return service_packs[candidate_id]

	if patch_id[-5] != '-':
		return ''

	release_version = patch_id[-4:]

	if release_version == '6130':
		return '6.1.30'

	if release_version == '6210':
		return '6.2.10'

	if release_version == '7010':
		return '7.0.10'

	if release_version == '7110':
		return '7.1.10'

	if release_version == '7210':
		return '7.2.10'

	if release_version == '7310':
		return '7.3.10'

if __name__ == '__main__':
	print(get_closest_service_pack(sys.argv[1]))