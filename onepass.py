#!/usr/bin/env python

import json
import os
from subprocess import Popen, PIPE

try:
    from subprocess import DEVNULL
except ImportError:
    import os
    DEVNULL = open(os.devnull, 'wb')

def _op(cmd, args):
    pipe = Popen(['op', cmd] + list(args), stdout=PIPE, stderr=PIPE)
    out, err = pipe.communicate()
    return out.decode('UTF-8', 'replace').strip()

def item(uuid, fields):
    data = _op('item', ['get', uuid, '--reveal', '--format', 'json', '--fields', fields])

    if data[0] == '[':
        return {item['id']: item['value'] for item in json.loads(data)}
    else:
        item = json.loads(data)
        return {item['id']: item['value']}