#!/usr/bin/env python

from collections import defaultdict
import json
import os
from pathlib import Path
from subprocess import Popen, PIPE

try:
    from subprocess import DEVNULL
except ImportError:
    import os

    DEVNULL = open(os.devnull, "wb")


def _get_windows_binary():
    windows_home = os.environ.get('WINDOWS_HOME')

    if windows_home is None or len(windows_home) == 0:
        return None

    matches = list(Path('%s/AppData/Local/Microsoft/WinGet/Packages' % windows_home).rglob('op.exe'))

    if matches:
        return matches[0]

    return None

def _op(cmd, args):
    op_binary = None

    if os.path.exists('/usr/bin/op'):
        op_binary = '/usr/bin/op'
    else:
        op_binary = _get_windows_binary()

    pipe = Popen([op_binary, cmd] + list(args), stdout=PIPE, stderr=PIPE)
    out, err = pipe.communicate()
    return out.decode("UTF-8", "replace").strip()


def item(uuid, fields):
    data = _op(
        "item", ["get", uuid, "--reveal", "--format", "json", "--fields", fields]
    )

    fields_dict = defaultdict(str)

    if len(data) == 0:
        return fields_dict
    elif data[0] == "[":
        fields_dict.update({item["id"]: item["value"] for item in json.loads(data)})
    else:
        item = json.loads(data)
        fields_dict.update({item["id"]: item["value"]})

    return fields_dict